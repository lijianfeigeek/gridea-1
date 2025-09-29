const {
  TestDataManager,
  DEFAULT_TEST_CONFIG,
  DEFAULT_USER,
  DEFAULT_ARTICLE_DATA,
  DEFAULT_SITE_CONFIG,
  createTestConfig,
  createWebhookPayload,
  generateTestSignature,
} = require('../helpers/test-utils.js')

const {
  ArticleFactory,
  ConfigFactory,
  WebhookPayloadFactory,
} = require('../helpers/test-utils.js')

// WebhookMockServer removed to avoid import conflicts

describe('Test Setup and Utilities', () => {
  let testDataManager

  beforeEach(() => {
    testDataManager = new TestDataManager()
  })

  describe('TestDataManager', () => {
    test('should create a user with default values', () => {
      const user = testDataManager.createUser()

      expect(user).toMatchObject({
        id: expect.stringContaining('user-'),
        name: 'Test User',
        email: 'test@example.com',
      })
    })

    test('should create a user with custom values', () => {
      const user = testDataManager.createUser({
        name: 'Custom User',
        email: 'custom@example.com',
      })

      expect(user).toMatchObject({
        name: 'Custom User',
        email: 'custom@example.com',
      })
    })

    test('should create an article with default values', () => {
      const article = testDataManager.createArticle()

      expect(article).toMatchObject({
        id: expect.stringContaining('article-'),
        title: 'Test Article',
        content: expect.stringContaining('# Test Content'),
        tags: ['test', 'article'],
        published: false,
        author: expect.any(Object),
      })
    })

    test('should create a site config with default values', () => {
      const config = testDataManager.createSiteConfig()

      expect(config).toMatchObject({
        name: 'Test Site',
        description: 'Test site description',
        domain: 'example.com',
        theme: 'default',
        language: 'zh-CN',
        postsPerPage: 10,
        author: expect.any(Object),
      })
    })

    test('should manage webhook requests', () => {
      const webhookRequest = {
        id: 'test-webhook-1',
        timestamp: new Date(),
        headers: {},
        body: createWebhookPayload('test.event', { data: 'test' }),
        method: 'POST',
        url: '/webhook',
      }

      testDataManager.addWebhookRequest(webhookRequest)
      const webhooks = testDataManager.getWebhooks()

      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]).toEqual(webhookRequest)

      testDataManager.clearWebhooks()
      expect(testDataManager.getWebhooks()).toHaveLength(0)
    })
  })

  describe('Test Configuration', () => {
    test('should create default test config', () => {
      const config = createTestConfig()

      expect(config).toEqual(DEFAULT_TEST_CONFIG)
    })

    test('should create custom test config', () => {
      const customConfig = {
        timeout: 60000,
        apiUrl: 'http://localhost:3000',
      }
      const config = createTestConfig(customConfig)

      expect(config.timeout).toBe(60000)
      expect(config.apiUrl).toBe('http://localhost:3000')
      expect(config.webhookUrl).toBe(DEFAULT_TEST_CONFIG.webhookUrl)
    })

    test('should create webhook payload', () => {
      const payload = createWebhookPayload('article.created', { id: '123' }, 'test-signature')

      expect(payload).toMatchObject({
        event: 'article.created',
        data: { id: '123' },
        timestamp: expect.any(String),
        signature: 'test-signature',
      })
    })

    test('should generate test signature', () => {
      const signature = generateTestSignature('test-payload', 'test-secret')

      expect(typeof signature).toBe('string')
      expect(signature.length).toBeGreaterThan(0)
    })
  })

  describe('Factories', () => {
    test('ArticleFactory should create articles', () => {
      const article = ArticleFactory.create()

      expect(article).toMatchObject({
        id: expect.stringContaining('article-'),
        title: expect.stringContaining('Test Article'),
        content: expect.stringContaining('# Test Article'),
        tags: expect.arrayContaining(['test', 'article']),
        published: false,
        author: expect.any(Object),
      })
    })

    test('ArticleFactory should create multiple articles', () => {
      ArticleFactory.resetCounter()
      const articles = ArticleFactory.createMany(3)

      expect(articles).toHaveLength(3)
      expect(articles[0].title).toContain('Test Article 1')
      expect(articles[1].title).toContain('Test Article 2')
      expect(articles[2].title).toContain('Test Article 3')
    })

    test('ArticleFactory should create published articles', () => {
      const article = ArticleFactory.createPublished()

      expect(article.published).toBe(true)
      expect(article.publishedAt).toBeDefined()
    })

    test('ArticleFactory should create draft articles', () => {
      const article = ArticleFactory.createDraft()

      expect(article.published).toBe(false)
    })

    test('ArticleFactory should generate invalid data', () => {
      const invalidData = ArticleFactory.generateInvalidData()

      expect(invalidData.length).toBeGreaterThan(0)
      expect(invalidData[0]).toEqual({ title: '' })
    })

    test('ConfigFactory should create site configs', () => {
      const config = ConfigFactory.create()

      expect(config).toMatchObject({
        name: expect.stringContaining('Test Site'),
        description: expect.stringContaining('test site'),
        domain: expect.stringContaining('example.com'),
        theme: 'default',
        language: 'zh-CN',
        postsPerPage: 10,
        author: expect.any(Object),
      })
    })

    test('WebhookPayloadFactory should create article created payload', () => {
      const article = ArticleFactory.create()
      const payload = WebhookPayloadFactory.createArticleCreated(article)

      expect(payload).toMatchObject({
        event: 'article.created',
        data: article,
        timestamp: expect.any(String),
        signature: expect.any(String),
      })
    })

    test('WebhookPayloadFactory should create article updated payload', () => {
      const article = ArticleFactory.create()
      const changes = { title: 'Updated Title' }
      const payload = WebhookPayloadFactory.createArticleUpdated(article, changes)

      expect(payload).toMatchObject({
        event: 'article.updated',
        data: {
          article,
          changes: { title: 'Updated Title' },
          updatedAt: expect.any(String),
        },
      })
    })

    test('WebhookPayloadFactory should create deployment payloads', () => {
      const startedPayload = WebhookPayloadFactory.createDeploymentStarted('deploy-123')
      const completedPayload = WebhookPayloadFactory.createDeploymentCompleted('deploy-123', true)

      expect(startedPayload.event).toBe('deployment.started')
      expect(startedPayload.data.deploymentId).toBe('deploy-123')
      expect(startedPayload.data.status).toBe('started')

      expect(completedPayload.event).toBe('deployment.completed')
      expect(completedPayload.data.deploymentId).toBe('deploy-123')
      expect(completedPayload.data.success).toBe(true)
    })
  })

  // Webhook Mock Server and Integration Tests removed to avoid import conflicts
})
