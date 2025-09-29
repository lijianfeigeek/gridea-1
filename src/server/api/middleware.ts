import { Request, Response, NextFunction } from 'express'
import { APIError } from './types'
import { createLoggerMiddlewareWithOptions } from './logger/middleware'

export class MiddlewareManager {
  private config: any

  private loggerMiddlewares: any

  constructor(config: any) {
    this.config = config
    this.loggerMiddlewares = createLoggerMiddlewareWithOptions(config.logging)
  }

  public setupCORS() {
    return (req: Request, res: Response, next: NextFunction) => {
      const { origin } = req.headers
      const allowedOrigins = Array.isArray(this.config.cors.origin)
        ? this.config.cors.origin
        : [this.config.cors.origin]

      if (!origin || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
        res.setHeader('Access-Control-Allow-Credentials', this.config.cors.credentials.toString())

        if (req.method === 'OPTIONS') {
          res.status(200).end()
          return
        }
      }
      next()
    }
  }

  public setupBodyParser() {
    const bodyParser = require('body-parser')
    return bodyParser.json({
      limit: this.config.body.limit,
      extended: this.config.body.extended,
    })
  }

  public setupUrlEncodedParser() {
    const bodyParser = require('body-parser')
    return bodyParser.urlencoded({
      limit: this.config.body.limit,
      extended: this.config.body.extended,
    })
  }

  public setupSecurity() {
    return (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      next()
    }
  }

  public setupCompression() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.headers['x-no-compression']) {
        return next()
      }
      next()
    }
  }

  public setupAuthentication() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.auth.enabled) {
        return next()
      }

      const authHeader = req.headers.authorization
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Access token is required',
            statusCode: 401,
            error: 'Unauthorized',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        })
      }

      try {
        if (this.config.auth.secretKey && token) {
          (req as any).user = {
            id: 'temp-user',
            username: 'api-user',
            role: 'user',
          }
        }
        next()
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or expired token',
            statusCode: 401,
            error: 'Unauthorized',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  public setupRequestLogging() {
    return this.loggerMiddlewares.logger
  }

  public setupRateLimit() {
    const requestCounts = new Map<string, { count: number; resetTime: number }>()

    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || req.connection.remoteAddress || 'unknown'
      const now = Date.now()
      const windowMs = 15 * 60 * 1000 // 15 minutes
      const maxRequests = 100

      let clientData = requestCounts.get(clientId)

      if (!clientData || now > clientData.resetTime) {
        clientData = {
          count: 1,
          resetTime: now + windowMs,
        }
        requestCounts.set(clientId, clientData)
      } else {
        clientData.count++
      }

      if (clientData.count > maxRequests) {
        return res.status(429).json({
          success: false,
          error: {
            message: 'Too many requests from this IP, please try again later',
            statusCode: 429,
            error: 'Too Many Requests',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        })
      }

      next()
    }
  }

  public errorHandler() {
    return this.loggerMiddlewares.errorLogger
  }

  public notFoundHandler() {
    return (req: Request, res: Response) => {
      const apiError: APIError = {
        message: `Route ${req.originalUrl} not found`,
        statusCode: 404,
        error: 'NotFound',
        timestamp: new Date().toISOString(),
      }

      res.status(404).json({
        success: false,
        error: apiError,
        timestamp: new Date().toISOString(),
      })
    }
  }

  private getLogLevel(statusCode: number): 'debug' | 'info' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error'
    if (statusCode >= 400) return 'warn'
    if (statusCode >= 300) return 'info'
    return 'debug'
  }
}
