/* eslint-disable no-await-in-loop */
import EventEmitter from 'events'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { Omit } from 'utility-types'
import {
  WebhookConfig,
  WebhookEvent,
  WebhookDelivery,
  WebhookSubscription,
  WebhookFilter,
  WebhookDeliveryResult,
  WebhookStats,
  WebhookTestResult,
  WebhookEventType,
  WebhookEventData,
  WebhookPayload,
} from '../interfaces/webhook'

export class WebhookService extends EventEmitter {
  private configs: Map<string, WebhookConfig> = new Map()

  private deliveries: Map<string, WebhookDelivery> = new Map()

  private subscriptions: Map<string, WebhookSubscription[]> = new Map()

  private eventQueue: WebhookEvent[] = []

  private processing = false

  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  private defaultConfig = {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 5000,
    maxConcurrentDeliveries: 10,
    maxEventQueueSize: 1000,
  }

  constructor() {
    super()
    this.startEventProcessor()
    this.setupEventHandlers()
  }

  public async createWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookConfig> {
    // Validate URL
    try {
      // eslint-disable-next-line no-new
      new URL(config.url)
    } catch {
      throw new Error('Invalid webhook URL')
    }

    // Validate events array
    if (!config.events || !Array.isArray(config.events) || config.events.length === 0) {
      throw new Error('Events must be a non-empty array')
    }

    // Validate event types
    const validEventTypes = [
      'post.published', 'post.updated', 'post.deleted',
      'deployment.started', 'deployment.completed', 'deployment.failed',
      'media.uploaded', 'media.deleted',
      'user.created', 'user.updated', 'user.deleted',
      'settings.updated', 'theme.changed',
      'system.backup', 'system.restore', 'system.error',
    ]

    for (const event of config.events) {
      if (!validEventTypes.includes(event)) {
        throw new Error(`Invalid event type: ${event}`)
      }
    }

    const webhook: WebhookConfig = {
      ...config,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.configs.set(webhook.id, webhook)
    this.subscriptions.set(webhook.id, [])

    this.emit('webhookCreated', webhook)
    console.log(`Webhook created: ${webhook.id} - ${webhook.url}`)

    return webhook
  }

  public async updateWebhook(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const webhook = this.configs.get(id)
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`)
    }

    const updatedWebhook: WebhookConfig = {
      ...webhook,
      ...updates,
      id,
      createdAt: webhook.createdAt,
      updatedAt: new Date(),
    }

    this.configs.set(id, updatedWebhook)
    this.emit('webhookUpdated', updatedWebhook)
    console.log(`Webhook updated: ${id}`)

    return updatedWebhook
  }

  public async deleteWebhook(id: string): Promise<boolean> {
    const webhook = this.configs.get(id)
    if (!webhook) {
      return false
    }

    this.configs.delete(id)
    this.subscriptions.delete(id)

    this.cancelPendingDeliveries(id)
    this.emit('webhookDeleted', webhook)
    console.log(`Webhook deleted: ${id}`)

    return true
  }

  public getWebhook(id: string): WebhookConfig | undefined {
    return this.configs.get(id)
  }

  public getAllWebhooks(): WebhookConfig[] {
    return Array.from(this.configs.values())
  }

  public getEnabledWebhooks(): WebhookConfig[] {
    return this.getAllWebhooks().filter(webhook => webhook.enabled)
  }

  public async enableWebhook(id: string): Promise<WebhookConfig> {
    return this.updateWebhook(id, { enabled: true })
  }

  public async disableWebhook(id: string): Promise<WebhookConfig> {
    return this.updateWebhook(id, { enabled: false })
  }

  public async testWebhook(id: string): Promise<WebhookTestResult> {
    const webhook = this.getWebhook(id)
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`)
    }

    const testEvent: WebhookEvent = {
      id: uuidv4(),
      type: 'system.info',
      payload: { message: 'Webhook test' },
      timestamp: new Date(),
      source: 'webhook-service',
      attempt: 1,
    }

    try {
      const result = await this.deliverWebhook(webhook, testEvent)

      return {
        webhookId: id,
        url: webhook.url,
        success: result.success,
        statusCode: result.statusCode,
        response: result.response,
        duration: result.duration,
        timestamp: new Date(),
      }
    } catch (error) {
      return {
        webhookId: id,
        url: webhook.url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
        timestamp: new Date(),
      }
    }
  }

  public async subscribeToEvent(
    webhookId: string,
    eventType: WebhookEventType,
    filter?: WebhookFilter,
  ): Promise<WebhookSubscription> {
    const webhook = this.getWebhook(webhookId)
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`)
    }

    const subscriptions = this.subscriptions.get(webhookId) || []

    const subscription: WebhookSubscription = {
      id: uuidv4(),
      webhookId,
      eventType,
      filter,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    subscriptions.push(subscription)
    this.subscriptions.set(webhookId, subscriptions)

    this.emit('subscriptionCreated', subscription)
    console.log(`Subscription created: ${subscription.id} for ${eventType}`)

    return subscription
  }

  public async unsubscribeFromEvent(webhookId: string, subscriptionId: string): Promise<boolean> {
    const subscriptions = this.subscriptions.get(webhookId) || []
    const index = subscriptions.findIndex(sub => sub.id === subscriptionId)

    if (index === -1) {
      return false
    }

    const subscription = subscriptions[index]
    subscriptions.splice(index, 1)
    this.subscriptions.set(webhookId, subscriptions)

    this.emit('subscriptionDeleted', subscription)
    console.log(`Subscription deleted: ${subscriptionId}`)

    return true
  }

  public getSubscriptions(webhookId: string): WebhookSubscription[] {
    return this.subscriptions.get(webhookId) || []
  }

  public async emitEvent(
    type: WebhookEventType,
    payload: WebhookEventData,
    source: string = 'gridea',
  ): Promise<void> {
    const event: WebhookEvent = {
      id: uuidv4(),
      type,
      payload,
      timestamp: new Date(),
      source,
      attempt: 1,
    }

    this.eventQueue.push(event)

    if (this.eventQueue.length > this.defaultConfig.maxEventQueueSize) {
      this.eventQueue.shift()
    }

    this.emit('eventQueued', event)
    console.log(`Event queued: ${type} - ${event.id}`)
  }

  public getDelivery(id: string): WebhookDelivery | undefined {
    return this.deliveries.get(id)
  }

  public getWebhookDeliveries(webhookId: string): WebhookDelivery[] {
    return Array.from(this.deliveries.values()).filter(delivery => delivery.webhookId === webhookId)
  }

  public getEventDeliveries(eventId: string): WebhookDelivery[] {
    return Array.from(this.deliveries.values()).filter(delivery => delivery.eventId === eventId)
  }

  public getAllDeliveries(): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
  }

  public getStats(): WebhookStats {
    const deliveries = Array.from(this.deliveries.values())
    const successfulDeliveries = deliveries.filter(d => d.status === 'delivered')
    const failedDeliveries = deliveries.filter(d => d.status === 'failed')
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending' || d.status === 'retrying')

    const totalResponseTime = successfulDeliveries.reduce((sum, d) => {
      return sum + (this.getDeliveryDuration(d.id) || 0)
    }, 0)

    return {
      totalWebhooks: this.configs.size,
      enabledWebhooks: this.getEnabledWebhooks().length,
      totalDeliveries: deliveries.length,
      successfulDeliveries: successfulDeliveries.length,
      failedDeliveries: failedDeliveries.length,
      pendingDeliveries: pendingDeliveries.length,
      averageResponseTime: successfulDeliveries.length > 0 ? totalResponseTime / successfulDeliveries.length : 0,
      lastDelivery: deliveries.length > 0 ? deliveries[deliveries.length - 1].timestamp : undefined,
    }
  }

  private async startEventProcessor(): Promise<void> {
    if (this.processing) return

    this.processing = true
    this.processEventQueue()
  }

  private async processEventQueue(): Promise<void> {
    while (this.processing && this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (!event) continue

      try {
        await this.processEvent(event)
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        this.emit('eventProcessingError', { event, error })
      }
    }

    if (this.processing) {
      setTimeout(() => this.processEventQueue(), 100)
    }
  }

  private async processEvent(event: WebhookEvent): Promise<void> {
    const enabledWebhooks = this.getEnabledWebhooks()

    for (const webhook of enabledWebhooks) {
      const subscriptions = this.getSubscriptions(webhook.id)
      const matchingSubscriptions = subscriptions.filter(sub => sub.enabled && this.isEventMatchingSubscription(event, sub))

      if (matchingSubscriptions.length > 0) {
        await this.scheduleDelivery(webhook, event)
      }
    }
  }

  private isEventMatchingSubscription(event: WebhookEvent, subscription: WebhookSubscription): boolean {
    if (subscription.eventType !== event.type) {
      return false
    }

    if (!subscription.filter) {
      return true
    }

    return this.applyFilter(event.payload, subscription.filter)
  }

  private applyFilter(payload: any, filter: WebhookFilter): boolean {
    if (!filter.property || !filter.operator || !filter.value) {
      return true
    }

    const propertyValue = this.getPropertyValue(payload, filter.property)
    if (propertyValue === undefined) {
      return false
    }

    const stringValue = String(propertyValue)
    const filterValue = filter.value

    switch (filter.operator) {
      case 'equals':
        return stringValue === filterValue
      case 'contains':
        return stringValue.includes(filterValue)
      case 'starts_with':
        return stringValue.startsWith(filterValue)
      case 'ends_with':
        return stringValue.endsWith(filterValue)
      case 'regex':
        try {
          return new RegExp(filterValue).test(stringValue)
        } catch {
          return false
        }
      default:
        return true
    }
  }

  private getPropertyValue(obj: any, propertyPath: string): any {
    const properties = propertyPath.split('.')
    let value = obj

    for (const prop of properties) {
      if (value === null || value === undefined) {
        return undefined
      }
      value = value[prop]
    }

    return value
  }

  private async scheduleDelivery(webhook: WebhookConfig, event: WebhookEvent): Promise<void> {
    const delivery: WebhookDelivery = {
      id: uuidv4(),
      webhookId: webhook.id,
      eventId: event.id,
      url: webhook.url,
      status: 'pending',
      attempt: 1,
      timestamp: new Date(),
    }

    this.deliveries.set(delivery.id, delivery)
    this.emit('deliveryScheduled', delivery)

    await this.executeDelivery(webhook, event, delivery)
  }

  private async executeDelivery(webhook: WebhookConfig, event: WebhookEvent, delivery: WebhookDelivery): Promise<void> {
    try {
      const result = await this.deliverWebhook(webhook, event)

      delivery.status = 'delivered'
      delivery.statusCode = result.statusCode
      delivery.response = result.response

      this.deliveries.set(delivery.id, delivery)
      this.emit('deliveryDelivered', { delivery, result })

      console.log(`Webhook delivered successfully: ${delivery.id} to ${webhook.url}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (delivery.attempt < (webhook.retryAttempts || this.defaultConfig.retryAttempts)) {
        delivery.status = 'retrying'
        delivery.error = errorMessage
        delivery.nextRetryAt = new Date(Date.now() + this.calculateRetryDelay(delivery.attempt))

        this.deliveries.set(delivery.id, delivery)
        this.emit('deliveryRetry', delivery)

        this.scheduleRetry(webhook, event, delivery)
      } else {
        delivery.status = 'failed'
        delivery.error = errorMessage

        this.deliveries.set(delivery.id, delivery)
        this.emit('deliveryFailed', delivery)

        console.error(`Webhook delivery failed: ${delivery.id} to ${webhook.url} - ${errorMessage}`)
      }
    }
  }

  private async deliverWebhook(webhook: WebhookConfig, event: WebhookEvent): Promise<WebhookDeliveryResult> {
    const startTime = Date.now()

    const payload: WebhookPayload = {
      id: event.id,
      event: event.type,
      timestamp: event.timestamp,
      source: event.source,
      data: event.payload,
      metadata: {
        requestId: uuidv4(),
        version: '1.0',
      },
    }

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: webhook.url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Gridea-Webhook/1.0',
        'X-Webhook-ID': webhook.id,
        'X-Webhook-Event': event.type,
        'X-Webhook-Delivery': event.id,
        'X-Gridea-Timestamp': event.timestamp.toISOString(),
        'X-Gridea-Signature': this.generateSignature(payload, webhook.secret),
        ...webhook.headers,
      },
      data: payload,
      timeout: webhook.timeout || this.defaultConfig.timeout,
      validateStatus: status => status < 500,
    }

    const response: AxiosResponse = await axios(config)
    const duration = Date.now() - startTime

    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      response: JSON.stringify(response.data),
      duration,
      headers: response.headers as Record<string, string>,
    }
  }

  private generateSignature(payload: WebhookPayload, secret?: string): string {
    if (!secret) return ''

    const payloadString = JSON.stringify(payload)
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payloadString)
    return `sha256=${hmac.digest('hex')}`
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.defaultConfig.retryDelay
    return baseDelay * (2 ** (attempt - 1))
  }

  private scheduleRetry(webhook: WebhookConfig, event: WebhookEvent, delivery: WebhookDelivery): void {
    const retryDelay = this.calculateRetryDelay(delivery.attempt)
    const timer = setTimeout(async () => {
      const updatedDelivery = this.deliveries.get(delivery.id)
      if (updatedDelivery && updatedDelivery.status === 'retrying') {
        updatedDelivery.attempt++
        await this.executeDelivery(webhook, event, updatedDelivery)
      }
      this.retryTimers.delete(delivery.id)
    }, retryDelay)

    this.retryTimers.set(delivery.id, timer)
  }

  private cancelPendingDeliveries(webhookId: string): void {
    const pendingDeliveries = this.getWebhookDeliveries(webhookId)
      .filter(d => d.status === 'pending' || d.status === 'retrying')

    pendingDeliveries.forEach((delivery) => {
      const timer = this.retryTimers.get(delivery.id)
      if (timer) {
        clearTimeout(timer)
        this.retryTimers.delete(delivery.id)
      }

      delivery.status = 'failed'
      delivery.error = 'Webhook deleted'
      this.deliveries.set(delivery.id, delivery)
    })
  }

  private getDeliveryDuration(deliveryId: string): number | undefined {
    const delivery = this.deliveries.get(deliveryId)
    if (!delivery) return undefined

    return delivery.timestamp.getTime()
  }

  private setupEventHandlers(): void {
    this.on('webhookCreated', (webhook: WebhookConfig) => {
      console.log(`Webhook created: ${webhook.id}`)
    })

    this.on('webhookUpdated', (webhook: WebhookConfig) => {
      console.log(`Webhook updated: ${webhook.id}`)
    })

    this.on('webhookDeleted', (webhook: WebhookConfig) => {
      console.log(`Webhook deleted: ${webhook.id}`)
    })

    this.on('deliveryDelivered', ({ delivery, result }: { delivery: WebhookDelivery; result: WebhookDeliveryResult }) => {
      console.log(`Delivery succeeded: ${delivery.id} (${result.statusCode})`)
    })

    this.on('deliveryFailed', (delivery: WebhookDelivery) => {
      console.error(`Delivery failed: ${delivery.id} - ${delivery.error}`)
    })

    this.on('deliveryRetry', (delivery: WebhookDelivery) => {
      console.log(`Delivery retry scheduled: ${delivery.id} (attempt ${delivery.attempt})`)
    })
  }

  public shutdown(): void {
    this.processing = false
    this.eventQueue = []

    this.retryTimers.forEach(timer => clearTimeout(timer))
    this.retryTimers.clear()

    console.log('Webhook service shutdown completed')
  }
}
