import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest'
import { WebhookController } from '../../../src/server/api/controllers/webhook'
import { WebhookService } from '../../../src/server/services/webhook'
import { createSuccessResponse, createErrorResponse } from '../../../src/server/api/helpers'

// Mock dependencies
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Webhook Controller Simple Tests', () => {
  let webhookService: WebhookService
  let webhookController: WebhookController

  beforeEach(() => {
    vi.clearAllMocks()

    webhookService = new WebhookService()
    webhookController = new WebhookController(webhookService)
  })

  afterEach(() => {
    webhookService.shutdown()
  })

  describe('Webhook Creation', () => {
    it('should create webhook through service', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
        secret: 'test-secret',
      })

      expect(webhook).toMatchObject({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })
      expect(webhook.id).toBeDefined()
      expect(webhook.createdAt).toBeInstanceOf(Date)
    })

    it('should validate webhook URL', async () => {
      await expect(webhookService.createWebhook({
        url: 'invalid-url',
        enabled: true,
        events: ['post.published'],
      })).rejects.toThrow()
    })

    it('should require events array', async () => {
      await expect(webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: [] as any[],
      })).rejects.toThrow()
    })
  })

  describe('Webhook Management', () => {
    it('should update webhook', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const updated = await webhookService.updateWebhook(webhook.id, {
        enabled: false,
        events: ['post.published', 'post.updated'],
      })

      expect(updated.enabled).toBe(false)
      expect(updated.events).toEqual(['post.published', 'post.updated'])
    })

    it('should delete webhook', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const deleted = await webhookService.deleteWebhook(webhook.id)
      expect(deleted).toBe(true)

      const retrieved = webhookService.getWebhook(webhook.id)
      expect(retrieved).toBeUndefined()
    })

    it('should get webhook statistics', async () => {
      const stats = webhookService.getStats()

      expect(stats).toMatchObject({
        totalWebhooks: 0,
        enabledWebhooks: 0,
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0,
        averageResponseTime: 0,
      })
    })
  })

  describe('Event Subscription', () => {
    it('should subscribe to event', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const subscription = await webhookService.subscribeToEvent(webhook.id, 'post.published')

      expect(subscription).toMatchObject({
        webhookId: webhook.id,
        eventType: 'post.published',
        enabled: true,
      })
      expect(subscription.id).toBeDefined()
    })

    it('should unsubscribe from event', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const subscription = await webhookService.subscribeToEvent(webhook.id, 'post.published')
      const unsubscribed = await webhookService.unsubscribeFromEvent(webhook.id, subscription.id)

      expect(unsubscribed).toBe(true)

      const subscriptions = webhookService.getSubscriptions(webhook.id)
      expect(subscriptions).toHaveLength(0)
    })
  })

  describe('Helper Functions', () => {
    it('should create success response', () => {
      const data = { id: 'test', name: 'Test' }
      const response = createSuccessResponse(data, 'Success message')

      expect(response).toMatchObject({
        success: true,
        data,
        message: 'Success message',
      })
      expect(response.timestamp).toBeDefined()
    })

    it('should create error response', () => {
      const response = createErrorResponse('Error message')

      expect(response).toMatchObject({
        success: false,
        data: null,
        message: 'Error message',
      })
      expect(response.timestamp).toBeDefined()
    })
  })

  describe('Event Emission', () => {
    it('should emit event and trigger webhook', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      await webhookService.subscribeToEvent(webhook.id, 'post.published')

      const eventData = {
        post: {
          id: 'test-post',
          title: 'Test Post',
          content: 'Test content',
          published: true,
          date: new Date().toISOString(),
          tags: ['test'],
          fileName: 'test-post.md',
        },
      }

      // Mock the delivery to avoid actual HTTP requests
      vi.spyOn(webhookService as any, 'deliverWebhook').mockResolvedValue({
        success: true,
        statusCode: 200,
        response: 'OK',
        duration: 100,
      })

      await webhookService.emitEvent('post.published', eventData)

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(webhookService.getWebhookDeliveries(webhook.id)).toHaveLength(1)
    })
  })
})
