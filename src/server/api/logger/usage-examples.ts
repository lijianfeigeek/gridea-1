import { StructuredLogger } from './structured-logger'
import { getLoggingConfig } from './config'

// Example 1: Basic logger usage
export function basicLoggerExample() {
  const logger = new StructuredLogger(getLoggingConfig('development'))

  // Basic logging
  logger.debug('Debug message', { userId: '123' })
  logger.info('Information message', { action: 'user_login' })
  logger.warn('Warning message', { deprecated: true })
  logger.error('Error message', new Error('Something went wrong'))

  // Specialized logging
  logger.logAuthSuccess('user123', 'bearer_token')
  logger.logAuthFailure('Invalid token', 'bearer_token', { ip: '192.168.1.1' })
  logger.logValidationFailure('email', 'invalid@email', 'Invalid email format')
  logger.logDeploymentStart('article-123', true)
  logger.logDeploymentSuccess('article-123', 'https://example.com', 5000)
  logger.logDeploymentFailure('article-123', 'Network error', 3000)
  logger.logPerformance('database_query', 150, { query: 'SELECT * FROM articles' })
  logger.logSecurityEvent('suspicious_request', { ip: '192.168.1.1', path: '/admin' })
}

// Example 2: Request-specific logger
export function requestLoggerExample() {
  const logger = new StructuredLogger(getLoggingConfig('production'))
  const requestLogger = logger.withRequest('req_123456', Date.now())

  // Log request lifecycle
  requestLogger.logRequest('POST', '/api/articles/publish', 'Mozilla/5.0', '192.168.1.1')
  requestLogger.info('Article publish attempt', { title: 'Test Article' })
  requestLogger.logValidationFailure('content', '# Test', 'Content too short')
  requestLogger.logResponse(400)
}

// Example 3: Performance monitoring
export function performanceMonitoringExample() {
  const logger = new StructuredLogger(getLoggingConfig('production'))

  // Monitor API performance
  const startTime = Date.now()

  // Simulate some work
  setTimeout(() => {
    const duration = Date.now() - startTime
    logger.logPerformance('api_request', duration, {
      endpoint: '/api/articles/publish',
      method: 'POST',
      statusCode: 200,
    })
  }, 100)
}

// Example 4: Security event logging
export function securityLoggingExample() {
  const logger = new StructuredLogger(getLoggingConfig('production'))

  // Log security events
  logger.logSecurityEvent('authentication_failure', {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    attemptCount: 5,
  })

  logger.logSecurityEvent('suspicious_request', {
    ip: '192.168.1.1',
    path: '/api/admin',
    method: 'POST',
    payload: { cmd: 'rm -rf /' },
  })

  logger.logSecurityEvent('rate_limit_exceeded', {
    ip: '192.168.1.1',
    endpoint: '/api/articles/publish',
    requestsPerMinute: 150,
  })
}

// Example 5: Error tracking
export function errorTrackingExample() {
  const logger = new StructuredLogger(getLoggingConfig('production'))

  try {
    // Simulate an error
    throw new Error('Database connection failed')
  } catch (error) {
    logger.error('Database operation failed', error as Error, {
      operation: 'save_article',
      articleId: 'article-123',
      userId: 'user-456',
    })
  }
}

// Example 6: Business logic logging
export function businessLogicExample() {
  const logger = new StructuredLogger(getLoggingConfig('production'))

  // Article publishing workflow
  const articleId = 'article-123'
  const userId = 'user-456'

  logger.info('Article publish workflow started', {
    articleId,
    userId,
    workflow: 'article_publish',
  })

  logger.logDeploymentStart(articleId, true)

  // Simulate deployment
  setTimeout(() => {
    const success = Math.random() > 0.5

    if (success) {
      logger.logDeploymentSuccess(articleId, 'https://example.com/article-123', 3000)
      logger.info('Article publish workflow completed', {
        articleId,
        userId,
        status: 'success',
        deployUrl: 'https://example.com/article-123',
      })
    } else {
      logger.logDeploymentFailure(articleId, 'Deployment timeout', 3000)
      logger.warn('Article publish workflow failed', {
        articleId,
        userId,
        status: 'failed',
        error: 'Deployment timeout',
      })
    }
  }, 100)
}

// Example 7: Configuration-based logging
export function configurationExample() {
  const environments = ['development', 'test', 'production']

  environments.forEach((env) => {
    const config = getLoggingConfig(env)
    const logger = new StructuredLogger(config)

    console.log(`\n=== ${env.toUpperCase()} Logging Example ===`)
    logger.info('Configuration test', { environment: env })
  })
}

// Run all examples
export function runAllExamples() {
  console.log('🚀 Running Logger Usage Examples\n')

  console.log('1. Basic Logger Example:')
  basicLoggerExample()

  console.log('\n2. Request Logger Example:')
  requestLoggerExample()

  console.log('\n3. Performance Monitoring Example:')
  performanceMonitoringExample()

  console.log('\n4. Security Logging Example:')
  securityLoggingExample()

  console.log('\n5. Error Tracking Example:')
  errorTrackingExample()

  console.log('\n6. Business Logic Example:')
  businessLogicExample()

  console.log('\n7. Configuration Example:')
  configurationExample()

  console.log('\n✅ All logger examples completed!')
}

// Export examples for testing
export const LoggerExamples = {
  basicLoggerExample,
  requestLoggerExample,
  performanceMonitoringExample,
  securityLoggingExample,
  errorTrackingExample,
  businessLogicExample,
  configurationExample,
  runAllExamples,
}
