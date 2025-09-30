import {
  describe, it, expect, beforeEach, vi,
} from 'vitest'

// Mock all dependencies before importing
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
}))

vi.mock('axios', () => ({
  default: vi.fn().mockResolvedValue({
    status: 200,
    data: { success: true },
    headers: {},
  }),
}))

vi.mock('crypto', () => ({
  createHmac: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mock-signature'),
  }),
}))

vi.mock('express-validator', () => ({
  validationResult: vi.fn().mockReturnValue({
    isEmpty: () => true,
    array: () => [],
  }),
}))

vi.mock('../../../src/server/api/middleware/auth', () => ({
  authenticateRequest: vi.fn((req, res, next) => {
    req.user = { id: 'test-user', role: 'admin' }
    next()
  }),
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

describe('Webhook Service Simple Test', () => {
  let WebhookService: any

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Import after mocking
    const { WebhookService: WS } = await import('../../../src/server/services/webhook')
    WebhookService = WS
  })

  it('should create webhook service instance', () => {
    const service = new WebhookService()
    expect(service).toBeDefined()
    expect(service.configs).toBeDefined()
    expect(service.deliveries).toBeDefined()
    expect(service.subscriptions).toBeDefined()
  })

  it('should create webhook successfully', async () => {
    const service = new WebhookService()

    const webhookConfig = {
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
    }

    const webhook = await service.createWebhook(webhookConfig)

    expect(webhook).toBeDefined()
    expect(webhook.id).toBeDefined()
    expect(webhook.url).toBe(webhookConfig.url)
    expect(webhook.enabled).toBe(webhookConfig.enabled)
    expect(webhook.events).toEqual(webhookConfig.events)
    expect(webhook.createdAt).toBeDefined()
    expect(webhook.updatedAt).toBeDefined()
  })

  it('should reject invalid URL', async () => {
    const service = new WebhookService()

    const webhookConfig = {
      url: 'invalid-url',
      enabled: true,
      events: ['post.published'],
    }

    await expect(service.createWebhook(webhookConfig)).rejects.toThrow('Invalid webhook URL')
  })

  it('should reject missing events', async () => {
    const service = new WebhookService()

    const webhookConfig = {
      url: 'https://example.com/webhook',
      enabled: true,
      events: [],
    }

    await expect(service.createWebhook(webhookConfig)).rejects.toThrow('Events must be a non-empty array')
  })

  it('should get webhook by id', async () => {
    const service = new WebhookService()

    const webhookConfig = {
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
    }

    const createdWebhook = await service.createWebhook(webhookConfig)
    const retrievedWebhook = service.getWebhook(createdWebhook.id)

    expect(retrievedWebhook).toBeDefined()
    expect(retrievedWebhook && retrievedWebhook.id).toBe(createdWebhook.id)
  })

  it('should get all webhooks', async () => {
    const service = new WebhookService()

    await service.createWebhook({
      url: 'https://example.com/webhook1',
      enabled: true,
      events: ['post.published'],
    })

    await service.createWebhook({
      url: 'https://example.com/webhook2',
      enabled: false,
      events: ['post.updated'],
    })

    const webhooks = service.getAllWebhooks()

    expect(webhooks).toHaveLength(2)
  })

  it('should update webhook', async () => {
    const service = new WebhookService()

    const webhookConfig = {
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
    }

    const webhook = await service.createWebhook(webhookConfig)

    const updatedWebhook = await service.updateWebhook(webhook.id, {
      enabled: false,
      events: ['post.published', 'post.updated'],
    })

    expect(updatedWebhook.enabled).toBe(false)
    expect(updatedWebhook.events).toEqual(['post.published', 'post.updated'])
  })

  it('should delete webhook', async () => {
    const service = new WebhookService()

    const webhookConfig = {
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
    }

    const webhook = await service.createWebhook(webhookConfig)

    const deleted = await service.deleteWebhook(webhook.id)

    expect(deleted).toBe(true)

    const retrievedWebhook = service.getWebhook(webhook.id)
    expect(retrievedWebhook).toBeUndefined()
  })

  it('should shutdown properly', () => {
    const service = new WebhookService()

    expect(() => {
      service.shutdown()
    }).not.toThrow()
  })
})
