import { Request, Response, NextFunction } from 'express'
import { StructuredLogger, createLoggerMiddleware, generateRequestId } from './structured-logger'

export interface RequestWithLogger extends Request {
  logger: StructuredLogger
  requestId: string
  startTime: number
}

export class LoggerMiddleware {
  private logger: StructuredLogger

  constructor(config?: any) {
    this.logger = new StructuredLogger(config)
  }

  // Main logging middleware
  public middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = generateRequestId()
      const startTime = Date.now()

      // Create request-specific logger
      const requestLogger = this.logger.withRequest(requestId, startTime)

      // Attach to request object
      const reqWithLogger = req as RequestWithLogger
      reqWithLogger.logger = requestLogger
      reqWithLogger.requestId = requestId
      reqWithLogger.startTime = startTime

      // Log incoming request
      this.logIncomingRequest(reqWithLogger)

      // Override res.end to log response
      this.setupResponseLogging(reqWithLogger, res)

      next()
    }
  }

  // Error logging middleware
  public errorMiddleware(): (error: Error, req: Request, res: Response, next: NextFunction) => void {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const reqWithLogger = req as RequestWithLogger
      if (reqWithLogger.logger) {
        reqWithLogger.logger.logApiError(
          error,
          res.statusCode || 500,
          reqWithLogger.path,
          reqWithLogger.method,
        )
      } else {
        // Fallback to default logger
        this.logger.error('Unhandled API error', error, {
          path: reqWithLogger.path,
          method: reqWithLogger.method,
          statusCode: res.statusCode,
        })
      }

      next(error)
    }
  }

  // Performance monitoring middleware
  public performanceMiddleware(): (req: RequestWithLogger, res: Response, next: NextFunction) => void {
    return (req: RequestWithLogger, res: Response, next: NextFunction) => {
      const startTime = Date.now()

      res.on('finish', () => {
        const duration = Date.now() - startTime

        if (req.logger) {
          req.logger.logPerformance('request_complete', duration, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
          })
        }
      })

      next()
    }
  }

  // Security event logging middleware
  public securityMiddleware(): (req: RequestWithLogger, res: Response, next: NextFunction) => void {
    return (req: RequestWithLogger, res: Response, next: NextFunction) => {
      // Log suspicious request patterns
      this.logSecurityEvents(req)

      next()
    }
  }

  private logIncomingRequest(req: RequestWithLogger): void {
    req.logger.logRequest(
      req.method,
      req.path,
      req.get('User-Agent'),
      req.ip,
    )

    // Log headers for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      req.logger.debug('Request headers', {
        headers: req.headers,
      })
    }

    // Log body for POST/PUT/PATCH requests (only in development)
    if (process.env.NODE_ENV === 'development' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const sensitiveFields = ['password', 'token', 'secret', 'key']
      const sanitizedBody = { ...req.body }

      // Sanitize sensitive data
      Object.keys(sanitizedBody).forEach((key) => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitizedBody[key] = '[REDACTED]'
        }
      })

      req.logger.debug('Request body', {
        body: sanitizedBody,
      })
    }
  }

  private setupResponseLogging(req: RequestWithLogger, res: Response): void {
    const originalEnd = res.end
    const originalJson = res.json

    // Override res.json to log response data
    res.json = function (body: any) {
      if (req.logger) {
        // Sanitize response data if needed
        const sanitizedResponse = req.logger && process.env.NODE_ENV === 'development'
          ? body
          : { success: body.success, timestamp: body.timestamp }

        req.logger.debug('Response data', {
          response: sanitizedResponse,
        })
      }

      return originalJson.call(this, body)
    }

    // Override res.end to log completion
    res.end = function (chunk?: any, encoding?: any) {
      if (req.logger) {
        req.logger.logResponse(res.statusCode)
      }

      return originalEnd.call(this, chunk, encoding)
    }
  }

  private logSecurityEvents(req: RequestWithLogger): void {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/i, // XSS attempts
      /javascript:/i, // JavaScript protocol
      /union.*select/i, // SQL injection attempts
      /(\.\.\/|\/\.\.)/, // Directory traversal
      /etc\/passwd/i, // System file access
      /cmd\.exe/i, // Windows command execution
      /\/bin\/sh/i, // Unix shell execution
    ]

    const checkString = (str: string) => {
      return suspiciousPatterns.some(pattern => pattern.test(str))
    }

    // Check query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === 'string' && checkString(value)) {
        req.logger.logSecurityEvent('suspicious_query_parameter', {
          parameter: key,
          value: value.substring(0, 100), // Truncate long values
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        })
      }
    })

    // Check request body
    if (req.body && typeof req.body === 'object') {
      Object.entries(req.body).forEach(([key, value]) => {
        if (typeof value === 'string' && checkString(value)) {
          req.logger.logSecurityEvent('suspicious_body_parameter', {
            parameter: key,
            value: value.substring(0, 100),
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          })
        }
      })
    }

    // Check headers
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string' && checkString(value)) {
        req.logger.logSecurityEvent('suspicious_header', {
          header: key,
          value: value.substring(0, 100),
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        })
      }
    })

    // Log high-frequency requests from same IP
    const { ip } = req
    const { path } = req
    const now = Date.now()

    // Simple rate limiting detection (in production, use Redis)
    const key = `${ip}:${path}:${Math.floor(now / 60000)}` // per minute
    // This would need proper storage in production
  }
}

// Export factory function for easier usage
export function createLoggerMiddlewareWithOptions(config?: any) {
  const middleware = new LoggerMiddleware(config)
  return {
    logger: middleware.middleware(),
    errorLogger: middleware.errorMiddleware(),
    performance: middleware.performanceMiddleware(),
    security: middleware.securityMiddleware(),
  }
}

// Export default instance
export const loggerMiddleware = new LoggerMiddleware()
