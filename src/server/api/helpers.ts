import { APIResponse } from './types'

export function createSuccessResponse<T>(data: T, message = 'Success'): APIResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  }
}

export function createErrorResponse(
  message: string,
  details?: any,
): APIResponse<null> {
  return {
    success: false,
    data: null,
    message,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  }
}

export function createValidationError(
  message: string,
  errors: any[],
): APIResponse<null> {
  return {
    success: false,
    data: null,
    message,
    timestamp: new Date().toISOString(),
    error: {
      message,
      statusCode: 400,
      error: 'ValidationError',
      details: {
        type: 'VALIDATION_ERROR',
        errors,
      },
      timestamp: new Date().toISOString(),
    },
  }
}
