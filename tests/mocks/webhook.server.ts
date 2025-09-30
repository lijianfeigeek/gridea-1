import http from 'http'
import { URL } from 'url'
import {
  WebhookRequest,
  WebhookPayload,
  MockServerConfig
} from '../helpers/test-setup'

export interface WebhookServerOptions {
  port: number
  host?: string
  delay?: number
  simulateErrors?: boolean
  responseCodes?: Record<string, number>
  validateSignatures?: boolean
  webhookSecret?: string
  maxPayloadSize?: number
  enableLogging?: boolean
}

export interface WebhookServerStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastRequestTime?: Date
  uptime: number
  eventsByType: Record<string, number>
}

export interface WebhookEvent {
  id: string
  timestamp: Date
  eventType: string
  payload: WebhookPayload
  headers: Record<string, string>
  responseCode: number
  responseTime: number
  error?: string
}

export class WebhookMockServer {
  private server: http.Server | null = null
  private isRunning = false
  private requests: WebhookRequest[] = []
  private events: WebhookEvent[] = []
  private startTime: Date | null = null
  private requestTimes: number[] = []
  private config: Required<WebhookServerOptions>

  constructor(options: WebhookServerOptions) {
    this.config = {
      host: options.host || 'localhost',
      delay: options.delay || 0,
      simulateErrors: options.simulateErrors || false,
      responseCodes: options.responseCodes || {},
      validateSignatures: options.validateSignatures || false,
      webhookSecret: options.webhookSecret || 'test-webhook-secret',
      maxPayloadSize: options.maxPayloadSize || 1024 * 1024, // 1MB
      enableLogging: options.enableLogging || false,
      ...options
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running')
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.handleRequest.bind(this))

      this.server.listen(this.config.port, this.config.host, () => {
        this.isRunning = true
        this.startTime = new Date()
        if (this.config.enableLogging) {
          console.log(`Webhook mock server started on http://${this.config.host}:${this.config.port}`)
        }
        resolve()
      })

      this.server.on('error', (error) => {
        reject(error)
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false
        this.startTime = null
        if (this.config.enableLogging) {
          console.log('Webhook mock server stopped')
        }
        resolve()
      })
    })
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const startTime = Date.now()
    const requestId = this.generateRequestId()
    const requestUrl = req.url || '/'

    if (this.config.enableLogging) {
      console.log(`[${requestId}] ${req.method} ${requestUrl}`)
    }

    // Collect request data
    let requestBody = ''

    req.on('data', (chunk) => {
      requestBody += chunk.toString()

      // Check payload size
      if (Buffer.byteLength(requestBody) > this.config.maxPayloadSize) {
        this.sendErrorResponse(res, 413, 'Payload too large', requestId, startTime)
        return
      }
    })

    req.on('end', () => {
      try {
        const requestTime = Date.now() - startTime
        this.requestTimes.push(requestTime)

        // Parse request
        const parsedUrl = new URL(requestUrl, `http://${req.headers.host}`)
        const path = parsedUrl.pathname
        const method = req.method || 'GET'

        // Create request record
        const request: WebhookRequest = {
          id: requestId,
          timestamp: new Date(),
          headers: this.normalizeHeaders(req.headers),
          body: this.parseRequestBody(requestBody, req.headers['content-type']),
          method,
          url: requestUrl
        }

        this.requests.push(request)

        // Handle the request
        this.handleWebhookRequest(request, req, res, startTime)
          .catch((error) => {
            this.sendErrorResponse(res, 500, 'Internal server error', requestId, startTime, error)
          })
      } catch (error) {
        this.sendErrorResponse(res, 400, 'Bad request', requestId, startTime, error)
      }
    })

    req.on('error', (error) => {
      this.sendErrorResponse(res, 400, 'Request error', requestId, startTime, error)
    })
  }

  private async handleWebhookRequest(
    request: WebhookRequest,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    startTime: number
  ): Promise<void> {
    const { method, body, headers } = request

    // Only handle POST requests for webhooks
    if (method !== 'POST') {
      this.sendErrorResponse(res, 405, 'Method not allowed', request.id, startTime)
      return
    }

    // Validate webhook payload
    if (!body || !body.event) {
      this.sendErrorResponse(res, 400, 'Invalid webhook payload', request.id, startTime)
      return
    }

    // Validate signature if enabled
    if (this.config.validateSignatures) {
      const signature = headers['x-webhook-signature'] || headers['x-hub-signature-256']
      if (!signature || !this.validateSignature(body, signature)) {
        this.sendErrorResponse(res, 401, 'Invalid signature', request.id, startTime)
        return
      }
    }

    // Simulate delay if configured
    if (this.config.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.delay))
    }

    // Simulate errors if enabled
    if (this.config.simulateErrors && Math.random() < 0.1) {
      this.sendErrorResponse(res, 500, 'Simulated server error', request.id, startTime)
      return
    }

    // Determine response code
    const responseCode = this.config.responseCodes[body.event] || 200

    // Create event record
    const requestTime = Date.now() - startTime
    const event: WebhookEvent = {
      id: request.id,
      timestamp: new Date(),
      eventType: body.event,
      payload: body,
      headers,
      responseCode,
      responseTime: requestTime
    }

    this.events.push(event)

    // Send success response
    const responseBody = {
      success: true,
      requestId: request.id,
      event: body.event,
      timestamp: new Date().toISOString(),
      processingTime: requestTime
    }

    this.sendSuccessResponse(res, responseCode, responseBody, request.id, startTime)
  }

  private parseRequestBody(body: string, contentType?: string): any {
    if (!body) {
      return {}
    }

    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(body)
      } catch (error) {
        throw new Error('Invalid JSON payload')
      }
    }

    // Default to form data parsing
    const formData: Record<string, string> = {}
    const pairs = body.split('&')

    for (const pair of pairs) {
      const [key, value] = pair.split('=')
      if (key && value) {
        formData[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '))
      }
    }

    return formData
  }

  private validateSignature(payload: WebhookPayload, signature: string): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex')

    return signature === `sha256=${expectedSignature}`
  }

  private normalizeHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
    const normalized: Record<string, string> = {}

    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value
      } else if (Array.isArray(value)) {
        normalized[key.toLowerCase()] = value.join(', ')
      }
    }

    return normalized
  }

  private sendSuccessResponse(
    res: http.ServerResponse,
    statusCode: number,
    body: any,
    requestId: string,
    startTime: number
  ): void {
    const requestTime = Date.now() - startTime

    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Response-Time': `${requestTime}ms`
    })

    res.end(JSON.stringify(body))

    if (this.config.enableLogging) {
      console.log(`[${requestId}] Response: ${statusCode} (${requestTime}ms)`)
    }
  }

  private sendErrorResponse(
    res: http.ServerResponse,
    statusCode: number,
    message: string,
    requestId: string,
    startTime: number,
    error?: any
  ): void {
    const requestTime = Date.now() - startTime

    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Response-Time': `${requestTime}ms`
    })

    const errorBody = {
      success: false,
      error: message,
      requestId,
      timestamp: new Date().toISOString(),
      processingTime: requestTime
    }

    res.end(JSON.stringify(errorBody))

    if (this.config.enableLogging) {
      console.error(`[${requestId}] Error: ${statusCode} - ${message} (${requestTime}ms)`)
      if (error) {
        console.error(`[${requestId}] Error details:`, error)
      }
    }

    // Record error event
    const event: WebhookEvent = {
      id: requestId,
      timestamp: new Date(),
      eventType: 'error',
      payload: {
        error: message,
        statusCode,
        details: error && error.message
      },
      headers: {},
      responseCode: statusCode,
      responseTime: requestTime,
      error: message
    }

    this.events.push(event)
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public API methods

  getRequests(): WebhookRequest[] {
    return [...this.requests]
  }

  getEvents(): WebhookEvent[] {
    return [...this.events]
  }

  getEventsByType(eventType: string): WebhookEvent[] {
    return this.events.filter(event => event.eventType === eventType)
  }

  getStats(): WebhookServerStats {
    const successfulRequests = this.events.filter(e => e.responseCode >= 200 && e.responseCode < 300).length
    const failedRequests = this.events.filter(e => e.responseCode >= 400).length
    const averageResponseTime = this.requestTimes.length > 0
      ? this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
      : 0

    const eventsByType: Record<string, number> = {}
    this.events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1
    })

    const lastRequestTime = this.requests.length > 0
      ? this.requests[this.requests.length - 1].timestamp
      : undefined

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0

    return {
      totalRequests: this.requests.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      lastRequestTime,
      uptime,
      eventsByType
    }
  }

  clearRequests(): void {
    this.requests = []
    this.events = []
    this.requestTimes = []
  }

  waitForEvent(eventType: string, timeout: number = 5000): Promise<WebhookEvent> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkForEvent = () => {
        const event = this.events.find(e => e.eventType === eventType)
        if (event) {
          resolve(event)
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for event: ${eventType}`))
          return
        }

        setTimeout(checkForEvent, 100)
      }

      checkForEvent()
    })
  }

  waitForRequestCount(count: number, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkForCount = () => {
        if (this.requests.length >= count) {
          resolve()
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for ${count} requests`))
          return
        }

        setTimeout(checkForCount, 100)
      }

      checkForCount()
    })
  }

  setSimulateErrors(simulate: boolean): void {
    this.config.simulateErrors = simulate
  }

  setDelay(delay: number): void {
    this.config.delay = delay
  }

  setResponseCodes(codes: Record<string, number>): void {
    this.config.responseCodes = codes
  }

  isServerRunning(): boolean {
    return this.isRunning
  }

  getUrl(): string {
    return `http://${this.config.host}:${this.config.port}`
  }
}

export {
  WebhookServerOptions,
  WebhookServerStats,
  WebhookEvent
}