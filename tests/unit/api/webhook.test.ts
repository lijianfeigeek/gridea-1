import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest'
import request from 'supertest'
import express from 'express'
import { WebhookController } from '../../../src/server/api/controllers/webhook'
import { WebhookService } from '../../../src/server/services/webhook'
import { authenticateRequest } from '../../../src/server/api/middleware/auth'
import { logger } from '../../../src/server/api/logger/structured-logger'

// Mock dependencies
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
}))

// Simple mock for authenticateRequest
const mockAuthenticateRequest = vi.fn((req, res, next) => {
  req.user = { id: 'test-user', role: 'admin' }
  next()
})

vi.mock('../../../src/server/api/middleware/auth', () => ({
  authenticateRequest: () => mockAuthenticateRequest,
}))

vi.mock('../../../src/server/api/logger/structured-logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('Webhook API', () => {
  let app: express.Application
  let webhookService: WebhookService
  let webhookController: WebhookController

  beforeEach(() => {
    vi.clearAllMocks()

    webhookService = new WebhookService()
    webhookController = new WebhookController(webhookService)

    // Setup Express app
    app = express()
    app.use(express.json())

    // Mock authentication is already set up above

    // Setup routes
    const router = express.Router()

    // Webhook routes
    router.post('/', webhookController.createWebhook)
    router.get('/', webhookController.getWebhooks)
    router.get('/:id', webhookController.getWebhook)
    router.put('/:id', webhookController.updateWebhook)
    router.delete('/:id', webhookController.deleteWebhook)
    router.post('/:id/test', webhookController.testWebhook)
    router.post('/:id/enable', webhookController.enableWebhook)
    router.post('/:id/disable', webhookController.disableWebhook)
    router.get('/stats', webhookController.getStats)

    app.use('/api/webhooks', mockAuthenticateRequest, router)
  })

  afterEach(() => {
    webhookService.shutdown()
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
      await webhookService.createWebhook({
        url: 'https://example.com/webhook1',
        enabled: true,
        events: ['post.published'],
      })

      await webhookService.createWebhook({
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
      await webhookService.createWebhook({
        url: 'https://example.com/webhook1',
        enabled: true,
        events: ['post.published'],
      })

      await webhookService.createWebhook({
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
      const webhook = await webhookService.createWebhook({
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
      const webhook = await webhookService.createWebhook({
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
      const webhook = await webhookService.createWebhook({
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
      const webhook = await webhookService.createWebhook({
        url: 'https://httpbin.org/post', // Use httpbin for testing
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
      const webhook = await webhookService.createWebhook({
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
      const webhook = await webhookService.createWebhook({
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
      await webhookService.createWebhook({
        url: 'https://example.com/webhook1',
        enabled: true,
        events: ['post.published'],
      })

      await webhookService.createWebhook({
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
