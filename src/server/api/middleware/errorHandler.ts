import { Request, Response, NextFunction } from 'express'
import {
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DeploymentError,
  ValidationErrorDetail,
} from '../types'

export class ErrorHandlerMiddleware {
  private isProduction: boolean

  constructor(isProduction: boolean = false) {
    this.isProduction = isProduction
  }

  public handleErrors() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      })

      const apiError = this.normalizeError(error)
      const response = this.formatErrorResponse(apiError)

      res.status(apiError.statusCode).json(response)
    }
  }

  public handleNotFound() {
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

  private normalizeError(error: Error): APIError {
    if (this.isAPIError(error)) {
      return error as unknown as APIError
    }

    switch (error.name) {
      case 'ValidationError':
        return this.createValidationError(error)
      case 'AuthenticationError':
        return this.createAuthenticationError(error)
      case 'AuthorizationError':
        return this.createAuthorizationError(error)
      case 'DeploymentError':
        return this.createDeploymentError(error)
      case 'SyntaxError':
        return this.createSyntaxError(error)
      case 'TypeError':
        return this.createTypeError(error)
      case 'RangeError':
        return this.createRangeError(error)
      default:
        return this.createGenericError(error)
    }
  }

  private isAPIError(error: Error): boolean {
    const errorObj = error as any
    return errorObj.statusCode !== undefined
      && errorObj.error !== undefined
      && errorObj.timestamp !== undefined
      && typeof errorObj.statusCode === 'number'
      && typeof errorObj.error === 'string'
      && typeof errorObj.timestamp === 'string'
  }

  private createValidationError(error: Error): ValidationError {
    const details: ValidationErrorDetail[] = []

    if (error.message.includes('title')) {
      details.push({
        field: 'title',
        message: 'Title validation failed',
        value: this.extractValueFromMessage(error.message, 'title'),
      })
    }

    if (error.message.includes('content')) {
      details.push({
        field: 'content',
        message: 'Content validation failed',
        value: this.extractValueFromMessage(error.message, 'content'),
      })
    }

    return {
      message: 'Validation failed',
      statusCode: 400,
      error: 'BadRequest',
      type: 'validation',
      details,
      timestamp: new Date().toISOString(),
    }
  }

  private createAuthenticationError(error: Error): AuthenticationError {
    return {
      message: 'Authentication failed',
      statusCode: 401,
      error: 'Unauthorized',
      type: 'authentication',
      timestamp: new Date().toISOString(),
    }
  }

  private createAuthorizationError(error: Error): AuthorizationError {
    return {
      message: 'Authorization failed',
      statusCode: 403,
      error: 'Forbidden',
      type: 'authorization',
      timestamp: new Date().toISOString(),
    }
  }

  private createDeploymentError(error: Error): DeploymentError {
    return {
      message: 'Deployment failed',
      statusCode: 500,
      error: 'DeploymentError',
      type: 'deployment',
      timestamp: new Date().toISOString(),
    }
  }

  private createSyntaxError(error: Error): APIError {
    return {
      message: 'Invalid request syntax',
      statusCode: 400,
      error: 'BadRequest',
      details: this.isProduction ? undefined : error.stack,
      timestamp: new Date().toISOString(),
    }
  }

  private createTypeError(error: Error): APIError {
    return {
      message: 'Invalid request data type',
      statusCode: 400,
      error: 'BadRequest',
      details: this.isProduction ? undefined : error.stack,
      timestamp: new Date().toISOString(),
    }
  }

  private createRangeError(error: Error): APIError {
    return {
      message: 'Request data out of range',
      statusCode: 400,
      error: 'BadRequest',
      details: this.isProduction ? undefined : error.stack,
      timestamp: new Date().toISOString(),
    }
  }

  private createGenericError(error: Error): APIError {
    return {
      message: this.isProduction ? 'Internal server error' : error.message,
      statusCode: 500,
      error: 'InternalServerError',
      details: this.isProduction ? undefined : error.stack,
      timestamp: new Date().toISOString(),
    }
  }

  private formatErrorResponse(apiError: APIError) {
    const response: any = {
      success: false,
      error: {
        message: apiError.message,
        statusCode: apiError.statusCode,
        error: apiError.error,
        timestamp: apiError.timestamp,
      },
      timestamp: new Date().toISOString(),
    }

    if (apiError.details) {
      response.error.details = apiError.details
    }

    if (apiError.type) {
      response.error.type = apiError.type
    }

    return response
  }

  private extractValueFromMessage(message: string, field: string): any {
    const regex = new RegExp(`${field}\\s*[:=]\\s*([^\\s,]+)`, 'i')
    const match = message.match(regex)
    return match ? match[1] : undefined
  }

  public static createValidationError(field: string, message: string, value?: any): ValidationError {
    return {
      message: `Validation failed for ${field}`,
      statusCode: 400,
      error: 'BadRequest',
      type: 'validation',
      details: [{
        field,
        message,
        value,
      }],
      timestamp: new Date().toISOString(),
    }
  }

  public static createAuthenticationError(message: string, method?: 'bearer_token' | 'api_key'): AuthenticationError {
    return {
      message,
      statusCode: 401,
      error: 'Unauthorized',
      type: 'authentication',
      method,
      timestamp: new Date().toISOString(),
    }
  }

  public static createAuthorizationError(message: string, requiredRole?: string, userRole?: string): AuthorizationError {
    return {
      message,
      statusCode: 403,
      error: 'Forbidden',
      type: 'authorization',
      requiredRole,
      userRole,
      timestamp: new Date().toISOString(),
    }
  }

  public static createDeploymentError(message: string, stage?: 'preparation' | 'upload' | 'verification' | 'network', retryAttempt?: number, maxRetries?: number): DeploymentError {
    return {
      message,
      statusCode: 500,
      error: 'DeploymentError',
      type: 'deployment',
      stage,
      retryAttempt,
      maxRetries,
      timestamp: new Date().toISOString(),
    }
  }
}
