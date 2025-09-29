export interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: Record<string, any>
  requestId?: string
  userId?: string
  userAgent?: string
  ip?: string
  method?: string
  path?: string
  statusCode?: number
  responseTime?: number
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  meta?: Record<string, any>
  [key: string]: any
}

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  format: 'json' | 'text'
  enableRequestId: boolean
  enableUserTracking: boolean
  enableRequestLogging: boolean
  enableResponseTime: boolean
  enableErrorTracking: boolean
  output: 'console' | 'file' | 'both'
  filePath?: string
  maxFileSize?: number
  maxFiles?: number
}

export class StructuredLogger {
  private config: LoggerConfig

  private requestId?: string

  private requestStartTime?: number

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      format: 'json',
      enableRequestId: true,
      enableUserTracking: true,
      enableRequestLogging: true,
      enableResponseTime: true,
      enableErrorTracking: true,
      output: 'console',
      ...config,
    }
  }

  // Create child logger with request context
  public withRequest(requestId: string, startTime?: number): StructuredLogger {
    const child = new StructuredLogger(this.config)
    child.requestId = requestId
    child.requestStartTime = startTime
    return child
  }

  // Logging methods
  public debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context)
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context)
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context)
  }

  public error(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
    this.log('error', message, context, error)
  }

  // Specialized logging methods for API operations
  public logRequest(method: string, path: string, userAgent?: string, ip?: string): void {
    if (!this.config.enableRequestLogging) return

    this.info('API request received', {
      method,
      path,
      userAgent,
      ip,
      type: 'request_start',
    })
  }

  public logResponse(statusCode: number, responseData?: any): void {
    if (!this.config.enableRequestLogging) return

    const responseTime = this.config.enableResponseTime && this.requestStartTime
      ? Date.now() - this.requestStartTime
      : undefined

    this.info('API response sent', {
      statusCode,
      responseTime,
      type: 'request_end',
      responseData: responseData ? typeof responseData : undefined,
    })
  }

  public logAuthSuccess(userId: string, method: string): void {
    this.info('Authentication successful', {
      userId,
      method,
      type: 'auth_success',
    })
  }

  public logAuthFailure(reason: string, method: string, details?: Record<string, any>): void {
    this.warn('Authentication failed', {
      reason,
      method,
      type: 'auth_failure',
      ...details,
    })
  }

  public logValidationFailure(field: string, value: any, reason: string): void {
    this.warn('Validation failed', {
      field,
      value,
      reason,
      type: 'validation_failure',
    })
  }

  public logDeploymentStart(articleId: string, autoDeploy: boolean): void {
    this.info('Deployment started', {
      articleId,
      autoDeploy,
      type: 'deployment_start',
    })
  }

  public logDeploymentSuccess(articleId: string, deployUrl?: string, duration?: number): void {
    this.info('Deployment successful', {
      articleId,
      deployUrl,
      duration,
      type: 'deployment_success',
    })
  }

  public logDeploymentFailure(articleId: string, error: string, duration?: number): void {
    this.error('Deployment failed', { error }, {
      articleId,
      duration,
      type: 'deployment_failure',
    })
  }

  public logApiError(error: Error, statusCode: number, path: string, method: string): void {
    this.error('API error occurred', error, {
      statusCode,
      path,
      method,
      type: 'api_error',
    })
  }

  public logPerformance(operation: string, duration: number, details?: Record<string, any>): void {
    this.info('Performance metric', {
      operation,
      duration,
      type: 'performance',
      ...details,
    })
  }

  public logSecurityEvent(event: string, details: Record<string, any>): void {
    this.warn('Security event', {
      event,
      type: 'security',
      ...details,
    })
  }

  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>,
    error?: Error | Record<string, any>,
  ): void {
    // Skip if log level is below configured level
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.buildBaseContext(),
      ...context,
    }

    // Add error information if provided
    if (error && this.config.enableErrorTracking) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } else if (typeof error === 'object') {
        entry.error = error as any
      }
    }

    this.outputEntry(entry)
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const configLevel = levels.indexOf(this.config.level)
    const messageLevel = levels.indexOf(level)
    return messageLevel >= configLevel
  }

  private buildBaseContext(): Record<string, any> {
    const context: Record<string, any> = {}

    if (this.config.enableRequestId && this.requestId) {
      context.requestId = this.requestId
    }

    if (this.requestStartTime) {
      context.responseTime = Date.now() - this.requestStartTime
    }

    return context
  }

  private outputEntry(entry: LogEntry): void {
    const formatted = this.config.format === 'json'
      ? JSON.stringify(entry)
      : this.formatAsText(entry)

    if (this.config.output === 'console' || this.config.output === 'both') {
      if (entry.level === 'error') {
        console.error(formatted)
      } else if (entry.level === 'warn') {
        console.warn(formatted)
      } else if (entry.level === 'debug') {
        console.debug(formatted)
      } else {
        console.log(formatted)
      }
    }

    if (this.config.output === 'file' || this.config.output === 'both') {
      this.writeToFile(formatted)
    }
  }

  private formatAsText(entry: LogEntry): string {
    const { timestamp } = entry
    const level = entry.level.toUpperCase().padEnd(5)
    const { message } = entry
    const context = Object.keys(entry)
      .filter(key => !['timestamp', 'level', 'message', 'error'].includes(key))
      .reduce((acc, key) => {
        if (entry[key] !== undefined) {
          acc[key] = entry[key]
        }
        return acc
      }, {} as Record<string, any>)

    let text = `${timestamp} [${level}] ${message}`

    if (Object.keys(context).length > 0) {
      text += ` ${JSON.stringify(context)}`
    }

    if (entry.error) {
      text += ` Error: ${entry.error.name}: ${entry.error.message}`
      if (entry.error.stack && this.config.level === 'debug') {
        text += `\n${entry.error.stack}`
      }
    }

    return text
  }

  private writeToFile(formatted: string): void {
    // Basic file writing - in production, use a proper logging library
    if (this.config.filePath) {
      require('fs').appendFileSync(this.config.filePath, `${formatted}\n`)
    }
  }
}

// Create default logger instance
export const defaultLogger = new StructuredLogger()

// Request ID generation utility
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Logger middleware factory
export function createLoggerMiddleware(config?: Partial<LoggerConfig>) {
  const logger = new StructuredLogger(config)

  return (req: any, res: any, next: any) => {
    const requestId = generateRequestId()
    const startTime = Date.now()

    // Create request-specific logger
    const requestLogger = logger.withRequest(requestId, startTime)

    // Attach logger to request object
    req.logger = requestLogger
    req.requestId = requestId

    // Log incoming request
    requestLogger.logRequest(
      req.method,
      req.path,
      req.get('User-Agent'),
      req.ip,
    )

    // Override res.end to log response
    const originalEnd = res.end
    res.end = function (chunk?: any, encoding?: any) {
      requestLogger.logResponse(res.statusCode)
      return originalEnd.call(this, chunk, encoding)
    }

    next()
  }
}
