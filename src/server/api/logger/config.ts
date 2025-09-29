import { LoggerConfig } from './structured-logger'

// Default logging configuration for development
export const defaultLoggingConfig: LoggerConfig = {
  level: 'info',
  format: 'json',
  enableRequestId: true,
  enableUserTracking: true,
  enableRequestLogging: true,
  enableResponseTime: true,
  enableErrorTracking: true,
  output: 'console',
}

// Development configuration with verbose logging
export const developmentLoggingConfig: LoggerConfig = {
  level: 'debug',
  format: 'text',
  enableRequestId: true,
  enableUserTracking: true,
  enableRequestLogging: true,
  enableResponseTime: true,
  enableErrorTracking: true,
  output: 'console',
}

// Production configuration with file logging
export const productionLoggingConfig: LoggerConfig = {
  level: 'info',
  format: 'json',
  enableRequestId: true,
  enableUserTracking: true,
  enableRequestLogging: true,
  enableResponseTime: true,
  enableErrorTracking: true,
  output: 'both',
  filePath: './logs/api.log',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
}

// Test configuration
export const testLoggingConfig: LoggerConfig = {
  level: 'debug',
  format: 'text',
  enableRequestId: true,
  enableUserTracking: true,
  enableRequestLogging: true,
  enableResponseTime: true,
  enableErrorTracking: true,
  output: 'console',
}

// Get configuration based on environment
export function getLoggingConfig(env: string = process.env.NODE_ENV || 'development'): LoggerConfig {
  switch (env.toLowerCase()) {
    case 'production':
      return productionLoggingConfig
    case 'test':
      return testLoggingConfig
    case 'development':
    default:
      return developmentLoggingConfig
  }
}

// Environment-specific configuration helpers
export const loggingConfigs = {
  development: developmentLoggingConfig,
  production: productionLoggingConfig,
  test: testLoggingConfig,
  default: defaultLoggingConfig,
}

// Log level validation
export function isValidLogLevel(level: string): level is 'debug' | 'info' | 'warn' | 'error' {
  return ['debug', 'info', 'warn', 'error'].includes(level)
}

// Log format validation
export function isValidLogFormat(format: string): format is 'json' | 'text' {
  return ['json', 'text'].includes(format)
}

// Output type validation
export function isValidOutputType(output: string): output is 'console' | 'file' | 'both' {
  return ['console', 'file', 'both'].includes(output)
}
