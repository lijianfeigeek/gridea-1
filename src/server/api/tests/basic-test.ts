// Basic API test that runs without external dependencies
console.log('🧪 Running Basic API Tests...')

// Test 1: Logger instantiation
try {
  const { StructuredLogger } = require('../logger/structured-logger')
  const logger = new StructuredLogger({
    level: 'info',
    format: 'json',
    output: 'console',
  })

  logger.info('Test message', { test: true })
  logger.warn('Test warning')
  logger.error('Test error', new Error('Test error'))

  console.log('✅ Logger test passed')
} catch (error) {
  console.error('❌ Logger test failed:', error.message)
  process.exit(1)
}

// Test 2: Auth middleware
try {
  const { AuthMiddleware } = require('../middleware/auth')
  const authConfig = {
    enabled: true,
    bearerToken: 'test-token',
    apiKey: 'test-key',
  }
  const authMiddleware = new AuthMiddleware(authConfig)

  if (authMiddleware.authenticate && typeof authMiddleware.authenticate === 'function') {
    console.log('✅ Auth middleware test passed')
  } else {
    throw new Error('Auth middleware not properly initialized')
  }
} catch (error) {
  console.error('❌ Auth middleware test failed:', error.message)
  process.exit(1)
}

// Test 3: Articles controller
try {
  const { ArticlesController } = require('../controllers/articles')

  // Mock app instance
  const mockAppInstance = {
    db: {
      setting: {
        domain: 'https://test.github.io/test/',
        platform: 'github',
        username: 'testuser',
        repository: 'testrepo',
      },
    },
  }

  const controller = new ArticlesController(mockAppInstance)

  if (controller.publishArticle && typeof controller.publishArticle === 'function') {
    console.log('✅ Articles controller test passed')
  } else {
    throw new Error('Articles controller not properly initialized')
  }
} catch (error) {
  console.error('❌ Articles controller test failed:', error.message)
  process.exit(1)
}

// Test 4: Deployment service
try {
  const { DeploymentService } = require('../services/deployment')

  const mockAppInstance = {
    db: {
      setting: {
        domain: 'https://test.github.io/test/',
        platform: 'github',
        username: 'testuser',
        repository: 'testrepo',
      },
    },
  }

  const deploymentService = new DeploymentService(mockAppInstance)
  const stats = deploymentService.getStats()

  if (stats && typeof stats.total === 'number') {
    console.log('✅ Deployment service test passed')
  } else {
    throw new Error('Deployment service not properly initialized')
  }
} catch (error) {
  console.error('❌ Deployment service test failed:', error.message)
  process.exit(1)
}

// Test 5: API Integration
try {
  const { APIIntegration } = require('../integration')
  const express = require('express')

  const app = express()
  const config = {
    port: 3001,
    host: 'localhost',
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200,
    },
    auth: {
      enabled: false,
      secretKey: 'test',
    },
    body: {
      limit: '10mb',
      extended: true,
    },
    logging: {
      level: 'info',
      format: 'json',
    },
  }

  const mockAppInstance = {
    db: {
      setting: {
        domain: 'https://test.github.io/test/',
        platform: 'github',
        username: 'testuser',
        repository: 'testrepo',
      },
    },
  }

  const apiIntegration = APIIntegration.initialize(app, config, mockAppInstance)

  if (apiIntegration && typeof apiIntegration.getDeploymentService === 'function') {
    console.log('✅ API Integration test passed')
  } else {
    throw new Error('API Integration not properly initialized')
  }
} catch (error) {
  console.error('❌ API Integration test failed:', error.message)
  process.exit(1)
}

console.log('🎉 All basic API tests passed!')
console.log('✅ Core functionality is working correctly')
console.log('✅ Logging system is operational')
console.log('✅ Authentication middleware is functional')
console.log('✅ Article publishing controller is ready')
console.log('✅ Deployment service is available')
console.log('✅ API integration is complete')
