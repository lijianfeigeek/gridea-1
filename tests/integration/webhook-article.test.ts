import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest'
import request from 'supertest'
import express from 'express'
import { WebhookService } from '../../src/server/services/webhook'
import { WebhookController } from '../../src/server/api/controllers/webhook'
import { ArticlesController } from '../../src/server/api/controllers/articles'
import { authenticateRequest } from '../../src/server/api/middleware/auth'
import { DeploymentService } from '../../src/server/api/services/deployment'

// Mock dependencies
vi.mock('../../src/server/api/middleware/auth')
vi.mock('../../src/server/api/logger/structured-logger')
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
}))

const mockAuthenticateRequest = vi.mocked(authenticateRequest)

describe('Webhook and Article API Integration', () => {
  let app: express.Application
  let webhookService: WebhookService
  let webhookController: WebhookController
  let articleController: ArticlesController
  let deploymentService: DeploymentService

  beforeEach(() => {
    vi.clearAllMocks()

    webhookService = new WebhookService()
    webhookController = new WebhookController(webhookService)
    deploymentService = new DeploymentService({})
    articleController = new ArticlesController({}) // Mock app instance

    // Setup Express app
    app = express()
    app.use(express.json())

    // Mock authentication
    mockAuthenticateRequest.mockImplementation((req, res, next) => {
      req.user = { id: 'test-user', role: 'admin' }
      next()
    })

    // Setup routes
    const apiRouter = express.Router()

    // Article routes
    apiRouter.post('/articles', articleController.publishArticle)

    // Webhook routes
    apiRouter.post('/webhooks', webhookController.createWebhook)
    apiRouter.get('/webhooks', webhookController.getWebhooks)
    apiRouter.post('/webhooks/:id/subscriptions', webhookController.subscribeToEvent)
    apiRouter.get('/webhooks/:id/deliveries', webhookController.getDeliveries)
    apiRouter.get('/webhooks/stats', webhookController.getStats)

    app.use('/api', mockAuthenticateRequest, apiRouter)
  })

  afterEach(() => {
    webhookService.shutdown()
  })

  describe('Article Publishing with Webhook Integration', () => {
    it('should trigger webhook when article is published', async () => {
      // Create a webhook
      const webhookResponse = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://httpbin.org/post',
          enabled: true,
          events: ['post.published'],
        })
        .expect(201)

      const webhookId = webhookResponse.body.data.id

      // Subscribe to post.published event
      await request(app)
        .post(`/api/webhooks/${webhookId}/subscriptions`)
        .send({
          eventType: 'post.published',
        })
        .expect(201)

      // Publish an article
      const articleData = {
        title: 'Test Article with Webhook',
        content: '# Test Content\n\nThis is a test article.',
        tags: ['test', 'webhook'],
        published: true,
        autoDeploy: false,
      }

      const articleResponse = await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(201)

      expect(articleResponse.body.success).toBe(true)
      expect(articleResponse.body.data.title).toBe(articleData.title)

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check webhook deliveries
      const deliveriesResponse = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .expect(200)

      expect(deliveriesResponse.body.success).toBe(true)
      expect(deliveriesResponse.body.data.deliveries).toHaveLength(1)
      expect(deliveriesResponse.body.data.deliveries[0].status).toBe('delivered')
    })

    it('should not trigger webhook for non-subscribed events', async () => {
      // Create a webhook
      const webhookResponse = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://httpbin.org/post',
          enabled: true,
          events: ['deployment.completed'], // Only subscribed to deployment events
        })
        .expect(201)

      const webhookId = webhookResponse.body.data.id

      // Subscribe to deployment.completed event
      await request(app)
        .post(`/api/webhooks/${webhookId}/subscriptions`)
        .send({
          eventType: 'deployment.completed',
        })
        .expect(201)

      // Publish an article (should not trigger webhook)
      const articleData = {
        title: 'Test Article No Webhook',
        content: '# Test Content\n\nThis should not trigger webhook.',
        tags: ['test'],
        published: true,
        autoDeploy: false,
      }

      await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(201)

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check webhook deliveries (should be empty)
      const deliveriesResponse = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .expect(200)

      expect(deliveriesResponse.body.success).toBe(true)
      expect(deliveriesResponse.body.data.deliveries).toHaveLength(0)
    })

    it('should trigger deployment webhook when autoDeploy is enabled', async () => {
      // Create a webhook for deployment events
      const webhookResponse = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://httpbin.org/post',
          enabled: true,
          events: ['deployment.started', 'deployment.completed'],
        })
        .expect(201)

      const webhookId = webhookResponse.body.data.id

      // Subscribe to deployment events
      await request(app)
        .post(`/api/webhooks/${webhookId}/subscriptions`)
        .send({
          eventType: 'deployment.started',
        })
        .expect(201)

      await request(app)
        .post(`/api/webhooks/${webhookId}/subscriptions`)
        .send({
          eventType: 'deployment.completed',
        })
        .expect(201)

      // Mock deployment service to simulate deployment
      vi.spyOn(deploymentService, 'deployArticle').mockResolvedValue({
        id: 'test-deployment-id',
        articleId: 'test-article-id',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        logs: ['Deployment completed successfully'],
      } as any)

      // Publish an article with autoDeploy enabled
      const articleData = {
        title: 'Test Article with Auto Deploy',
        content: '# Test Content\n\nThis should trigger deployment webhook.',
        tags: ['test', 'deployment'],
        published: true,
        autoDeploy: true,
      }

      await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(201)

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check webhook deliveries
      const deliveriesResponse = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .expect(200)

      expect(deliveriesResponse.body.success).toBe(true)
      expect(deliveriesResponse.body.data.deliveries.length).toBeGreaterThan(0)
    })

    it('should apply event filters correctly', async () => {
      // Create a webhook with filter
      const webhookResponse = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://httpbin.org/post',
          enabled: true,
          events: ['post.published'],
        })
        .expect(201)

      const webhookId = webhookResponse.body.data.id

      // Subscribe with filter for specific title
      await request(app)
        .post(`/api/webhooks/${webhookId}/subscriptions`)
        .send({
          eventType: 'post.published',
          filter: {
            property: 'post.title',
            operator: 'contains',
            value: 'Important',
          },
        })
        .expect(201)

      // Publish article that matches filter
      const articleData1 = {
        title: 'Important: Critical Update',
        content: '# Important Content\n\nThis should trigger webhook.',
        tags: ['important'],
        published: true,
        autoDeploy: false,
      }

      await request(app)
        .post('/api/articles')
        .send(articleData1)
        .expect(201)

      // Publish article that doesn't match filter
      const articleData2 = {
        title: 'Regular Update',
        content: '# Regular Content\n\nThis should not trigger webhook.',
        tags: ['regular'],
        published: true,
        autoDeploy: false,
      }

      await request(app)
        .post('/api/articles')
        .send(articleData2)
        .expect(201)

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check webhook deliveries (should only have one delivery)
      const deliveriesResponse = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .expect(200)

      expect(deliveriesResponse.body.success).toBe(true)
      expect(deliveriesResponse.body.data.deliveries).toHaveLength(1)
    })

    it('should update webhook statistics correctly', async () => {
      // Get initial stats
      const initialStatsResponse = await request(app)
        .get('/api/webhooks/stats')
        .expect(200)

      const initialStats = initialStatsResponse.body.data

      // Create multiple webhooks
      await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://httpbin.org/webhook1',
          enabled: true,
          events: ['post.published'],
        })
        .expect(201)

      await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://httpbin.org/webhook2',
          enabled: false,
          events: ['post.updated'],
        })
        .expect(201)

      // Get updated stats
      const updatedStatsResponse = await request(app)
        .get('/api/webhooks/stats')
        .expect(200)

      const updatedStats = updatedStatsResponse.body.data

      expect(updatedStats.totalWebhooks).toBe(initialStats.totalWebhooks + 2)
      expect(updatedStats.enabledWebhooks).toBe(initialStats.enabledWebhooks + 1)
    })

    it('should handle disabled webhooks correctly', async () => {
      // Create a disabled webhook
      const webhookResponse = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://httpbin.org/post',
          enabled: false, // Disabled
          events: ['post.published'],
        })
        .expect(201)

      const webhookId = webhookResponse.body.data.id

      // Subscribe to event
      await request(app)
        .post(`/api/webhooks/${webhookId}/subscriptions`)
        .send({
          eventType: 'post.published',
        })
        .expect(201)

      // Publish an article
      const articleData = {
        title: 'Test Article Disabled Webhook',
        content: '# Test Content\n\nWebhook is disabled.',
        tags: ['test'],
        published: true,
        autoDeploy: false,
      }

      await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(201)

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check webhook deliveries (should be empty)
      const deliveriesResponse = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .expect(200)

      expect(deliveriesResponse.body.success).toBe(true)
      expect(deliveriesResponse.body.data.deliveries).toHaveLength(0)
    })

    it('should handle webhook delivery failures gracefully', async () => {
      // Create a webhook with invalid URL
      const webhookResponse = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://invalid-url-that-does-not-exist.com/webhook',
          enabled: true,
          events: ['post.published'],
          retryAttempts: 1, // Only retry once for faster testing
        })
        .expect(201)

      const webhookId = webhookResponse.body.data.id

      // Subscribe to event
      await request(app)
        .post(`/api/webhooks/${webhookId}/subscriptions`)
        .send({
          eventType: 'post.published',
        })
        .expect(201)

      // Publish an article
      const articleData = {
        title: 'Test Article Failed Webhook',
        content: '# Test Content\n\nThis should fail.',
        tags: ['test'],
        published: true,
        autoDeploy: false,
      }

      await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(201)

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check webhook deliveries (should show failed status)
      const deliveriesResponse = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .expect(200)

      expect(deliveriesResponse.body.success).toBe(true)
      expect(deliveriesResponse.body.data.deliveries).toHaveLength(1)
      expect(deliveriesResponse.body.data.deliveries[0].status).toBe('failed')
    })
  })
})
