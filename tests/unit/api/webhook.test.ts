import request from 'supertest'

// Using global express mock from setup.ts

import express from 'express'

// Now import after mocking
import { WebhookController } from '../../../src/server/api/controllers/webhook'
import { WebhookService } from '../../../src/server/services/webhook'
// Using global express mock from setup.ts

// Mock all dependencies before importing
jest.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
}))

jest.mock('axios', () => ({
  default: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true },
    headers: {},
  }),
}))

jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-signature'),
  }),
}))

jest.mock('express-validator', () => ({
  validationResult: jest.fn().mockImplementation((req) => {
    // Check if the request has validation errors based on the data
    const { url, events } = req.body

    const errors = []

    // Check for invalid URL
    if (url && typeof url === 'string' && !url.startsWith('http')) {
      errors.push({ msg: 'URL must be a valid URL', param: 'url' })
    }

    // Check for missing events
    if (!events || !Array.isArray(events) || events.length === 0) {
      errors.push({ msg: 'Events must be an array', param: 'events' })
    }

    // Check for invalid event types
    if (events && Array.isArray(events)) {
      const validEventTypes = [
        'post.published', 'post.updated', 'post.deleted',
        'deployment.started', 'deployment.completed', 'deployment.failed',
        'media.uploaded', 'media.deleted',
        'user.created', 'user.updated', 'user.deleted',
        'settings.updated', 'theme.changed',
        'system.backup', 'system.restore', 'system.error',
      ]

      events.forEach((event) => {
        if (!validEventTypes.includes(event)) {
          errors.push({ msg: 'Invalid event type', param: 'events' })
        }
      })
    }

    return {
      isEmpty: () => errors.length === 0,
      array: () => errors,
    }
  }),
}))

vi.mock('../../../src/server/api/middleware/auth', () => ({
  authenticateRequest: vi.fn((req, res, next) => {
    req.user = { id: 'test-user', role: 'admin' }
    next()
  }),
}))

// Create mock authenticate request function
const mockAuthenticateRequest = vi.fn((req, res, next) => {
  req.user = { id: 'test-user', role: 'admin' }
  next()
})

// Mock WebhookService to avoid starting event processor
const mockWebhookService = {
  createWebhook: vi.fn().mockImplementation((config) => {
    // Validate URL
    try {
      // eslint-disable-next-line no-new
      new URL(config.url)
    } catch {
      throw new Error('Invalid webhook URL')
    }

    // Validate events array
    if (!config.events || !Array.isArray(config.events) || config.events.length === 0) {
      throw new Error('Events must be a non-empty array')
    }

    // Validate event types
    const validEventTypes = [
      'post.published', 'post.updated', 'post.deleted',
      'deployment.started', 'deployment.completed', 'deployment.failed',
      'media.uploaded', 'media.deleted',
      'user.created', 'user.updated', 'user.deleted',
      'settings.updated', 'theme.changed',
      'system.backup', 'system.restore', 'system.error',
    ]

    for (const event of config.events) {
      if (!validEventTypes.includes(event)) {
        throw new Error(`Invalid event type: ${event}`)
      }
    }

    return Promise.resolve({
      id: `webhook-${Math.random().toString(36).substr(2, 9)}`,
      url: config.url,
      enabled: config.enabled !== undefined ? config.enabled : true,
      events: config.events,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }),
  getWebhooks: vi.fn().mockImplementation(() => {
    const webhooks = []
    return Promise.resolve(webhooks)
  }),
  getWebhook: vi.fn().mockImplementation((id) => {
    if (id === 'non-existent-id') {
      return Promise.resolve(null)
    }
    return Promise.resolve({
      id,
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }),
  updateWebhook: vi.fn().mockImplementation((id, updates) => {
    if (id === 'non-existent-id') {
      throw new Error('Webhook not found')
    }
    return Promise.resolve({
      id,
      url: updates.url || 'https://example.com/webhook',
      enabled: updates.enabled !== undefined ? updates.enabled : true,
      events: updates.events || ['post.published'],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }),
  deleteWebhook: vi.fn().mockImplementation((id) => {
    if (id === 'non-existent-id') {
      throw new Error('Webhook not found')
    }
    return Promise.resolve(true)
  }),
  testWebhook: vi.fn().mockImplementation((id) => {
    if (id === 'non-existent-id') {
      throw new Error('Webhook not found')
    }
    // Simulate webhook test with timing information
    return Promise.resolve({
      success: true,
      webhookId: id,
      url: 'https://example.com/webhook-test',
      duration: 150,
      timestamp: new Date().toISOString(),
      response: {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
        },
        body: { success: true },
      },
    })
  }),
  enableWebhook: vi.fn().mockImplementation((id) => {
    if (id === 'non-existent-id') {
      throw new Error('Webhook not found')
    }
    return Promise.resolve(true)
  }),
  disableWebhook: vi.fn().mockImplementation((id) => {
    if (id === 'non-existent-id') {
      throw new Error('Webhook not found')
    }
    return Promise.resolve(true)
  }),
  getStats: vi.fn().mockResolvedValue({
    totalWebhooks: 0,
    enabledWebhooks: 0,
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
  }),
  on: vi.fn(),
  emit: vi.fn(),
  shutdown: vi.fn(),
}

vi.mock('../../../src/server/services/webhook', () => ({
  WebhookService: vi.fn().mockImplementation(() => mockWebhookService),
}))

vi.mock('../../../src/server/api/logger/structured-logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../../../src/server/api/helpers/response', () => ({
  createSuccessResponse: vi.fn((data, message) => ({
    success: true,
    data,
    message,
  })),
  createErrorResponse: vi.fn((message, errors) => ({
    success: false,
    message,
    errors,
  })),
}))

describe('Webhook API', () => {
  let app: express.Application
  let webhookController: WebhookController

  // Set longer timeout for webhook tests
  vi.setConfig({ testTimeout: 15000, hookTimeout: 10000 })

  beforeEach(() => {
    vi.clearAllMocks()

    webhookController = new WebhookController(mockWebhookService)

    // Setup Express app
    app = express()
    app.use(express.json())

    // Mock authentication is already set up above

    // Setup a simple test route first to verify Express works
    app.get('/test', (req, res) => {
      res.json({ message: 'test works' })
    })

    // Setup routes
    const router = express.Router()

    // Webhook routes - using mock functions directly for now
    router.post('/', (req, res) => {
      res.status(201).json({ success: true, data: { id: 'test-id', url: req.body.url } })
    })

    app.use('/api/webhooks', mockAuthenticateRequest, router)
  })

  afterEach(() => {
    // Cleanup to prevent memory leaks
    mockWebhookService.shutdown()

    // Clear any remaining timeouts or intervals
    vi.useRealTimers()

    // Reset the Express app to prevent memory leaks
    app = null as any
    webhookController = null as any
  })

  describe('POST /api/webhooks', () => {
    it('should create a webhook successfully', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
        secret: 'test-secret',
      }

      const response = await request(app)
        .post('/api/webhooks')
        .send(webhookData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        url: webhookData.url,
        enabled: webhookData.enabled,
        events: webhookData.events,
      })
      expect(response.body.data.id).toBeDefined()
      expect(response.body.data.createdAt).toBeDefined()
    })

    it('should reject invalid URL', async () => {
      const webhookData = {
        url: 'invalid-url',
        enabled: true,
        events: ['post.published'],
      }

      const response = await request(app)
        .post('/api/webhooks')
        .send(webhookData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('URL must be a valid URL')
    })

    it('should reject missing events', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        enabled: true,
      }

      const response = await request(app)
        .post('/api/webhooks')
        .send(webhookData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Events must be an array')
    })

    it('should reject invalid event types', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['invalid.event'],
      }

      const response = await request(app)
        .post('/api/webhooks')
        .send(webhookData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Invalid event types')
    })
  })

  describe('GET /api/webhooks', () => {
    it('should get all webhooks', async () => {
      // Create test webhooks
      await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook1',
        enabled: true,
        events: ['post.published'],
      })

      await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook2',
        enabled: false,
        events: ['post.updated'],
      })

      const response = await request(app)
        .get('/api/webhooks')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.webhooks).toHaveLength(2)
      expect(response.body.data.total).toBe(2)
    })

    it('should get only enabled webhooks', async () => {
      // Create test webhooks
      await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook1',
        enabled: true,
        events: ['post.published'],
      })

      await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook2',
        enabled: false,
        events: ['post.updated'],
      })

      const response = await request(app)
        .get('/api/webhooks?enabled=true')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.webhooks).toHaveLength(1)
      expect(response.body.data.webhooks[0].enabled).toBe(true)
    })
  })

  describe('GET /api/webhooks/:id', () => {
    it('should get a specific webhook', async () => {
      const webhook = await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
        secret: 'test-secret',
      })

      const response = await request(app)
        .get(`/api/webhooks/${webhook.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        id: webhook.id,
        url: webhook.url,
        enabled: webhook.enabled,
        events: webhook.events,
        secret: '***', // Secret should be masked
      })
    })

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .get('/api/webhooks/non-existent-id')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Webhook not found')
    })
  })

  describe('PUT /api/webhooks/:id', () => {
    it('should update a webhook', async () => {
      const webhook = await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const updateData = {
        enabled: false,
        events: ['post.published', 'post.updated'],
      }

      const response = await request(app)
        .put(`/api/webhooks/${webhook.id}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        id: webhook.id,
        enabled: false,
        events: ['post.published', 'post.updated'],
      })
    })

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .put('/api/webhooks/non-existent-id')
        .send({ enabled: false })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Webhook not found')
    })
  })

  describe('DELETE /api/webhooks/:id', () => {
    it('should delete a webhook', async () => {
      const webhook = await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const response = await request(app)
        .delete(`/api/webhooks/${webhook.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Webhook deleted successfully')

      // Verify webhook is deleted
      const getResponse = await request(app)
        .get(`/api/webhooks/${webhook.id}`)
        .expect(404)
    })

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .delete('/api/webhooks/non-existent-id')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Webhook not found')
    })
  })

  describe('POST /api/webhooks/:id/test', () => {
    it('should test a webhook', async () => {
      const webhook = await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook-test', // Use mock URL for testing
        enabled: true,
        events: ['post.published'],
      })

      const response = await request(app)
        .post(`/api/webhooks/${webhook.id}/test`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        webhookId: webhook.id,
        url: webhook.url,
      })
      expect(response.body.data.duration).toBeGreaterThanOrEqual(0)
    })

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/non-existent-id/test')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Webhook not found')
    })
  })

  describe('POST /api/webhooks/:id/enable', () => {
    it('should enable a webhook', async () => {
      const webhook = await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: false,
        events: ['post.published'],
      })

      const response = await request(app)
        .post(`/api/webhooks/${webhook.id}/enable`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.enabled).toBe(true)
    })

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/non-existent-id/enable')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Webhook not found')
    })
  })

  describe('POST /api/webhooks/:id/disable', () => {
    it('should disable a webhook', async () => {
      const webhook = await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const response = await request(app)
        .post(`/api/webhooks/${webhook.id}/disable`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.enabled).toBe(false)
    })

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/non-existent-id/disable')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Webhook not found')
    })
  })

  describe('GET /api/webhooks/stats', () => {
    it('should get webhook statistics', async () => {
      // Create test webhooks
      await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook1',
        enabled: true,
        events: ['post.published'],
      })

      await mockWebhookService.createWebhook({
        url: 'https://example.com/webhook2',
        enabled: false,
        events: ['post.updated'],
      })

      const response = await request(app)
        .get('/api/webhooks/stats')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        totalWebhooks: 2,
        enabledWebhooks: 1,
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0,
        averageResponseTime: 0,
      })
    })
  })
})
