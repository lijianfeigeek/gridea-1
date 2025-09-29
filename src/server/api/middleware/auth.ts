import { Request, Response, NextFunction } from 'express'
import { APIError } from '../types'
import { StructuredLogger } from '../logger/structured-logger'

export interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    role: string
  }
  logger?: StructuredLogger
  requestId?: string
}

export interface AuthConfig {
  enabled: boolean
  bearerToken?: string
  apiKey?: string
  tokenExpiry?: string
}

export class AuthMiddleware {
  private config: AuthConfig

  constructor(config: AuthConfig) {
    this.config = config
  }

  public authenticate() {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        req.user = {
          id: 'default-user',
          username: 'api-user',
          role: 'user',
        }
        if (req.logger) {
          req.logger.logAuthSuccess(req.user.id, 'default')
        }
        return next()
      }

      const authHeader = req.headers.authorization
      const apiKey = req.headers['x-api-key'] as string

      let isAuthenticated = false
      let authMethod = ''

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        isAuthenticated = this.validateBearerToken(token)
        authMethod = 'bearer_token'
      }

      if (!isAuthenticated && apiKey) {
        isAuthenticated = this.validateApiKey(apiKey)
        authMethod = 'api_key'
      }

      if (!isAuthenticated) {
        const failureReason = 'No valid authentication credentials provided'

        if (req.logger) {
          req.logger.logAuthFailure(failureReason, 'none', {
            hasBearerToken: !!authHeader,
            hasApiKey: !!apiKey,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          })
        }

        const authError: APIError = {
          message: 'Authentication required. Please provide a valid Bearer token or API key.',
          statusCode: 401,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
        }

        return res.status(401).json({
          success: false,
          error: authError,
          timestamp: new Date().toISOString(),
        })
      }

      req.user = {
        id: 'authenticated-user',
        username: 'api-user',
        role: 'user',
      }

      if (req.logger) {
        req.logger.logAuthSuccess(req.user.id, authMethod)
      }

      next()
    }
  }

  public requireRole(roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        const authError: APIError = {
          message: 'Authentication required',
          statusCode: 401,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
        }

        return res.status(401).json({
          success: false,
          error: authError,
          timestamp: new Date().toISOString(),
        })
      }

      if (!roles.includes(req.user.role)) {
        const authError: APIError = {
          message: 'Insufficient permissions',
          statusCode: 403,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
        }

        return res.status(403).json({
          success: false,
          error: authError,
          timestamp: new Date().toISOString(),
        })
      }

      next()
    }
  }

  private validateBearerToken(token: string): boolean {
    if (!this.config.bearerToken) {
      return false
    }

    return token === this.config.bearerToken
  }

  private validateApiKey(apiKey: string): boolean {
    if (!this.config.apiKey) {
      return false
    }

    return apiKey === this.config.apiKey
  }

  public static handleError(error: Error, req: Request, res: Response, next: NextFunction) {
    console.error('Authentication Error:', error)

    const authError: APIError = {
      message: 'Authentication service error',
      statusCode: 500,
      error: 'InternalServerError',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }

    res.status(500).json({
      success: false,
      error: authError,
      timestamp: new Date().toISOString(),
    })
  }
}
