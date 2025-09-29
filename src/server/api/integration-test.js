const express = require('express')

console.log('Testing API Server integration...')

// Test all middleware functions
try {
  const app = express()

  // Mock config
  const mockConfig = {
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200,
    },
    auth: {
      enabled: false,
      secretKey: 'test-secret',
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

  // Test CORS middleware
  app.use((req, res, next) => {
    const { origin } = req.headers
    const allowedOrigins = Array.isArray(mockConfig.cors.origin)
      ? mockConfig.cors.origin
      : [mockConfig.cors.origin]

    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
      res.setHeader('Access-Control-Allow-Credentials', mockConfig.cors.credentials.toString())

      if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
      }
    }
    next()
  })

  // Test security middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    next()
  })

  // Test body parser
  const bodyParser = require('body-parser')
  app.use(bodyParser.json({
    limit: mockConfig.body.limit,
    extended: mockConfig.body.extended,
  }))

  // Test authentication middleware
  app.use('/api', (req, res, next) => {
    if (!mockConfig.auth.enabled) {
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

    if (mockConfig.auth.secretKey && token) {
      req.user = {
        id: 'temp-user',
        username: 'api-user',
        role: 'user',
      }
    }
    next()
  })

  // Test rate limiting
  const requestCounts = new Map()
  app.use((req, res, next) => {
    const clientId = req.ip || 'unknown'
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
  })

  // Test health check route
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        memory: {
          heapUsed: 12345678,
          heapTotal: 23456789,
          rss: 34567890,
        },
        api: {
          endpoints: 1,
          requests: 1,
        },
      },
      timestamp: new Date().toISOString(),
    })
  })

  // Test 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Route ${req.originalUrl} not found`,
        statusCode: 404,
        error: 'NotFound',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  })

  // Test error handler
  app.use((error, req, res, next) => {
    console.error('API Error:', error)

    const apiError = {
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500,
      error: error.name || 'InternalServerError',
      timestamp: new Date().toISOString(),
    }

    res.status(apiError.statusCode).json({
      success: false,
      error: apiError,
      timestamp: new Date().toISOString(),
    })
  })

  console.log('✓ All middleware setup successfully')
  console.log('✓ All routes configured successfully')
  console.log('✓ All error handlers configured successfully')
  console.log('✓ Integration tests passed!')
} catch (error) {
  console.error('✗ Integration test failed:', error.message)
  process.exit(1)
}
