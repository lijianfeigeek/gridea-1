import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest'
import axios from 'axios'
import { WebhookService } from '../../../src/server/services/webhook'
import { WebhookEventType, WebhookEventData } from '../../../src/server/interfaces/webhook'

vi.mock('axios')
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
}))

const mockedAxios = vi.mocked(axios)

describe('WebhookService', () => {
  let webhookService: WebhookService

  beforeEach(() => {
    webhookService = new WebhookService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    webhookService.shutdown()
  })

  describe('Webhook Management', () => {
    it('should create a webhook successfully', async () => {
      const webhookConfig = {
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'] as WebhookEventType[],
      }

      const webhook = await webhookService.createWebhook(webhookConfig)

      expect(webhook).toMatchObject({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })
      expect(webhook.id).toBeDefined()
      expect(webhook.createdAt).toBeInstanceOf(Date)
      expect(webhook.updatedAt).toBeInstanceOf(Date)

      const retrieved = webhookService.getWebhook(webhook.id)
      expect(retrieved).toEqual(webhook)
    })

    it('should update a webhook successfully', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await webhookService.updateWebhook(webhook.id, {
        enabled: false,
        events: ['post.published', 'post.updated'],
      })

      expect(updated.enabled).toBe(false)
      expect(updated.events).toEqual(['post.published', 'post.updated'])
      expect(updated.updatedAt.getTime()).toBeGreaterThan(webhook.createdAt.getTime())
    })

    it('should delete a webhook successfully', async () => {
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

    it('should get all webhooks', async () => {
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

      const webhooks = webhookService.getAllWebhooks()
      expect(webhooks).toHaveLength(2)
    })

    it('should get enabled webhooks', async () => {
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

      const enabledWebhooks = webhookService.getEnabledWebhooks()
      expect(enabledWebhooks).toHaveLength(1)
      expect(enabledWebhooks[0].enabled).toBe(true)
    })
  })

  describe('Webhook Delivery', () => {
    it('should deliver webhook successfully', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      })

      await webhookService.subscribeToEvent(webhook.id, 'post.published')

      const eventData: WebhookEventData = {
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

      await webhookService.emitEvent('post.published', eventData)

      await new Promise(resolve => setTimeout(resolve, 100))

      const deliveries = webhookService.getWebhookDeliveries(webhook.id)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0].status).toBe('delivered')
      expect(deliveries[0].statusCode).toBe(200)
    })

    it('should handle webhook delivery failure', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
        retryAttempts: 1,
        retryDelay: 50,
      })

      mockedAxios.mockRejectedValue(new Error('Network error'))

      await webhookService.subscribeToEvent(webhook.id, 'post.published')

      const eventData: WebhookEventData = {
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

      await webhookService.emitEvent('post.published', eventData)

      await new Promise(resolve => setTimeout(resolve, 300))

      const deliveries = webhookService.getWebhookDeliveries(webhook.id)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0].status).toBe('failed')
      expect(deliveries[0].attempt).toBe(1)
    })

    it('should schedule retry for failed delivery', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
        retryAttempts: 2,
        retryDelay: 100,
      })

      mockedAxios.mockRejectedValue(new Error('Network error'))

      await webhookService.subscribeToEvent(webhook.id, 'post.published')

      const eventData: WebhookEventData = {
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

      await webhookService.emitEvent('post.published', eventData)

      await new Promise(resolve => setTimeout(resolve, 200))

      const deliveries = webhookService.getWebhookDeliveries(webhook.id)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0].status).toBe('retrying')
      expect(deliveries[0].attempt).toBe(1)
      expect(deliveries[0].nextRetryAt).toBeInstanceOf(Date)
    })
  })

  describe('Event Subscription', () => {
    it('should subscribe to event successfully', async () => {
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

      const subscriptions = webhookService.getSubscriptions(webhook.id)
      expect(subscriptions).toHaveLength(1)
      expect(subscriptions[0]).toEqual(subscription)
    })

    it('should unsubscribe from event successfully', async () => {
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

    it('should filter events based on subscription filter', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      await webhookService.subscribeToEvent(webhook.id, 'post.published', {
        property: 'post.title',
        operator: 'contains',
        value: 'Important',
      })

      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      })

      const eventData1: WebhookEventData = {
        post: {
          id: 'test-post-1',
          title: 'Important Post',
          content: 'Test content',
          published: true,
          date: new Date().toISOString(),
          tags: ['test'],
          fileName: 'test-post-1.md',
        },
      }

      const eventData2: WebhookEventData = {
        post: {
          id: 'test-post-2',
          title: 'Regular Post',
          content: 'Test content',
          published: true,
          date: new Date().toISOString(),
          tags: ['test'],
          fileName: 'test-post-2.md',
        },
      }

      await webhookService.emitEvent('post.published', eventData1)
      await webhookService.emitEvent('post.published', eventData2)

      await new Promise(resolve => setTimeout(resolve, 100))

      const deliveries = webhookService.getWebhookDeliveries(webhook.id)
      expect(deliveries).toHaveLength(1)
    })
  })

  describe('Webhook Testing', () => {
    it('should test webhook successfully', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      })

      const result = await webhookService.testWebhook(webhook.id)

      expect(result).toMatchObject({
        webhookId: webhook.id,
        url: webhook.url,
        success: true,
        statusCode: 200,
      })
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should handle webhook test failure', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      mockedAxios.mockRejectedValue(new Error('Network error'))

      const result = await webhookService.testWebhook(webhook.id)

      expect(result).toMatchObject({
        webhookId: webhook.id,
        url: webhook.url,
        success: false,
        error: 'Network error',
      })
    })
  })

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      const webhook1 = await webhookService.createWebhook({
        url: 'https://example.com/webhook1',
        enabled: true,
        events: ['post.published'],
      })

      const webhook2 = await webhookService.createWebhook({
        url: 'https://example.com/webhook2',
        enabled: false,
        events: ['post.updated'],
      })

      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      })

      await webhookService.subscribeToEvent(webhook1.id, 'post.published')

      const eventData: WebhookEventData = {
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

      await webhookService.emitEvent('post.published', eventData)

      await new Promise(resolve => setTimeout(resolve, 100))

      const stats = webhookService.getStats()

      expect(stats).toMatchObject({
        totalWebhooks: 2,
        enabledWebhooks: 1,
        successfulDeliveries: 1,
        failedDeliveries: 0,
        pendingDeliveries: 0,
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid webhook ID', async () => {
      await expect(webhookService.updateWebhook('invalid-id', { enabled: false }))
        .rejects.toThrow('Webhook not found: invalid-id')

      await expect(webhookService.testWebhook('invalid-id'))
        .rejects.toThrow('Webhook not found: invalid-id')
    })

    it('should handle unsubscribe from non-existent subscription', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      const result = await webhookService.unsubscribeFromEvent(webhook.id, 'invalid-subscription-id')
      expect(result).toBe(false)
    })
  })

  describe('Signature Generation', () => {
    it('should generate correct signature', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
        secret: 'test-secret',
      })

      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      })

      await webhookService.subscribeToEvent(webhook.id, 'post.published')

      const eventData: WebhookEventData = {
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

      await webhookService.emitEvent('post.published', eventData)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Gridea-Signature': expect.stringMatching(/^sha256=/),
          }),
        }),
      )
    })

    it('should not generate signature without secret', async () => {
      const webhook = await webhookService.createWebhook({
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['post.published'],
      })

      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      })

      await webhookService.subscribeToEvent(webhook.id, 'post.published')

      const eventData: WebhookEventData = {
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

      await webhookService.emitEvent('post.published', eventData)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Gridea-Signature': '',
          }),
        }),
      )
    })
  })
})
