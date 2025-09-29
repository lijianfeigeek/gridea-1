const {
  TestDataManager,
  ArticleFactory,
  ConfigFactory,
  WebhookPayloadFactory,
  MockHelpers,
  DEFAULT_TEST_CONFIG,
  createTestConfig,
  createWebhookPayload,
  generateTestSignature,
  testDataManager,
  setupJestMocks
} = require('../helpers/test-utils.js')

// Set up Jest mocks
setupJestMocks()

describe('Test Utilities for Gridea REST API', () => {
  beforeEach(() => {
    // Clear test data
    testDataManager.clearAll()
  })

  describe('TestDataManager', () => {
    test('should create a user with default values', () => {
      const user = testDataManager.createUser()

      expect(user).toMatchObject({
        id: expect.stringContaining('user-'),
        name: 'Test User',
        email: 'test@example.com'
      })
    })

    test('should create a user with custom values', () => {
      const user = testDataManager.createUser({
        name: 'Custom User',
        email: 'custom@example.com'
      })

      expect(user).toMatchObject({
        name: 'Custom User',
        email: 'custom@example.com'
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
        author: expect.any(Object)
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
        author: expect.any(Object)
      })
    })

    test('should manage webhook requests', () => {
      const webhookRequest = {
        id: 'test-webhook-1',
        timestamp: new Date(),
        headers: {},
        body: createWebhookPayload('test.event', { data: 'test' }),
        method: 'POST',
        url: '/webhook'
      }

      testDataManager.addWebhookRequest(webhookRequest)
      const webhooks = testDataManager.getWebhooks()

      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]).toEqual(webhookRequest)

      testDataManager.clearWebhooks()
      expect(testDataManager.getWebhooks()).toHaveLength(0)
    })

    test('should generate invalid article data', () => {
      const invalidData = testDataManager.generateInvalidArticleData()

      expect(invalidData).toHaveLength(6)
      expect(invalidData[0]).toEqual({ title: '' })
      expect(invalidData[1]).toEqual({ content: '' })
    })
  })

  describe('ArticleFactory', () => {
    test('should create articles with default values', () => {
      const article = ArticleFactory.create()

      expect(article).toMatchObject({
        id: expect.stringContaining('article-'),
        title: expect.stringContaining('Test Article'),
        content: expect.stringContaining('# Test Article'),
        tags: expect.arrayContaining(['test', 'article']),
        published: false,
        author: expect.any(Object)
      })
    })

    test('should create multiple articles', () => {
      // Reset counter to ensure predictable test results
      ArticleFactory.counter = 0
      const articles = ArticleFactory.createMany(3)

      expect(articles).toHaveLength(3)
      expect(articles[0].title).toContain('Test Article 1')
      expect(articles[1].title).toContain('Test Article 2')
      expect(articles[2].title).toContain('Test Article 3')
    })

    test('should create published articles', () => {
      const article = ArticleFactory.createPublished()

      expect(article.published).toBe(true)
      expect(article.publishedAt).toBeDefined()
    })

    test('should create draft articles', () => {
      const article = ArticleFactory.createDraft()

      expect(article.published).toBe(false)
    })

    test('should generate invalid data', () => {
      const invalidData = ArticleFactory.generateInvalidData()

      expect(invalidData.length).toBeGreaterThan(0)
      expect(invalidData[0]).toEqual({ title: '' })
    })
  })

  describe('ConfigFactory', () => {
    test('should create site configs with default values', () => {
      const config = ConfigFactory.create()

      expect(config).toMatchObject({
        name: expect.stringContaining('Test Site'),
        description: expect.stringContaining('test site'),
        domain: expect.stringContaining('example.com'),
        theme: 'default',
        language: 'zh-CN',
        postsPerPage: 10,
        author: expect.any(Object)
      })
    })

    test('should generate invalid data', () => {
      const invalidData = ConfigFactory.generateInvalidData()

      expect(invalidData.length).toBeGreaterThan(0)
      expect(invalidData[0]).toEqual({ name: '' })
    })
  })

  describe('WebhookPayloadFactory', () => {
    test('should create article created payload', () => {
      const article = ArticleFactory.create()
      const payload = WebhookPayloadFactory.createArticleCreated(article)

      expect(payload).toMatchObject({
        event: 'article.created',
        data: article,
        timestamp: expect.any(String),
        signature: expect.any(String)
      })
    })

    test('should create article updated payload', () => {
      const article = ArticleFactory.create()
      const changes = { title: 'Updated Title' }
      const payload = WebhookPayloadFactory.createArticleUpdated(article, changes)

      expect(payload).toMatchObject({
        event: 'article.updated',
        data: {
          article,
          changes: { title: 'Updated Title' },
          updatedAt: expect.any(String)
        }
      })
    })

    test('should create deployment payloads', () => {
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

  describe('MockHelpers', () => {
    test('should create mock request', () => {
      const request = MockHelpers.createMockRequest()

      expect(request.id).toMatch(/req-\d+/)
      expect(request.method).toBe('POST')
      expect(request.url).toBe('/webhook')
      expect(request.body.event).toBe('test.event')
    })

    test('should create mock response', () => {
      const response = MockHelpers.createMockResponse()

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(typeof response.json).toBe('function')
    })

    test('should wait for condition', async () => {
      let conditionMet = false

      // Set condition to be met after 100ms
      setTimeout(() => {
        conditionMet = true
      }, 100)

      await MockHelpers.waitFor(() => conditionMet, 1000, 50)
      expect(conditionMet).toBe(true)
    })

    test('should timeout waiting for condition', async () => {
      let conditionMet = false

      await expect(MockHelpers.waitFor(() => conditionMet, 200, 50))
        .rejects.toThrow('Condition not met within 200ms')
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
        apiUrl: 'http://localhost:3000'
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
        signature: 'test-signature'
      })
    })

    test('should generate test signature', () => {
      const signature = generateTestSignature('test-payload', 'test-secret')

      expect(typeof signature).toBe('string')
      expect(signature.length).toBeGreaterThan(0)
    })
  })

  describe('Integration Tests', () => {
    test('should work with all factories together', () => {
      // Create test data using factories
      const user = testDataManager.createUser()
      const article = ArticleFactory.create({ author: user })
      const config = ConfigFactory.create({ author: user })
      const payload = WebhookPayloadFactory.createArticleCreated(article)

      // Verify all data is properly created
      expect(user.id).toBeDefined()
      expect(article.author.id).toBe(user.id)
      expect(config.author.id).toBe(user.id)
      expect(payload.data.id).toBe(article.id)
      expect(payload.event).toBe('article.created')
    })

    test('should handle webhook request lifecycle', () => {
      // Create test data
      const article = ArticleFactory.create()
      const payload = WebhookPayloadFactory.createArticleCreated(article)

      // Create webhook request
      const webhookRequest = MockHelpers.createMockRequest({
        body: payload
      })

      // Add to test data manager
      testDataManager.addWebhookRequest(webhookRequest)

      // Verify webhook was recorded
      const webhooks = testDataManager.getWebhooks()
      expect(webhooks).toHaveLength(1)
      expect(webhooks[0].body.event).toBe('article.created')
      expect(webhooks[0].body.data.id).toBe(article.id)

      // Clear and verify
      testDataManager.clearWebhooks()
      expect(testDataManager.getWebhooks()).toHaveLength(0)
    })

    test('should generate various types of test data', () => {
      // Create multiple users
      const users = [
        testDataManager.createUser({ name: 'User 1' }),
        testDataManager.createUser({ name: 'User 2' }),
        testDataManager.createUser({ name: 'User 3' })
      ]

      // Create multiple articles with different authors
      const articles = users.map((user, index) =>
        ArticleFactory.create({
          author: user,
          title: `Article ${index + 1}`,
          published: index % 2 === 0 // Every other article is published
        })
      )

      // Create multiple configs
      const configs = users.map(user =>
        ConfigFactory.create({
          author: user,
          name: `${user.name}'s Site`
        })
      )

      // Verify data relationships
      expect(users).toHaveLength(3)
      expect(articles).toHaveLength(3)
      expect(configs).toHaveLength(3)

      // Verify first article is published
      expect(articles[0].published).toBe(true)
      expect(articles[1].published).toBe(false)
      expect(articles[2].published).toBe(true)

      // Verify author relationships
      expect(articles[0].author.name).toBe('User 1')
      expect(configs[0].author.name).toBe('User 1')
      expect(articles[1].author.name).toBe('User 2')
      expect(configs[1].author.name).toBe('User 2')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid article data generation', () => {
      const invalidData = testDataManager.generateInvalidArticleData()

      expect(invalidData).toHaveLength(6)
      expect(invalidData.every(item =>
        typeof item === 'object' && item !== null
      )).toBe(true)
    })

    test('should handle invalid user data generation', () => {
      const invalidData = testDataManager.generateInvalidUserData()

      expect(invalidData).toHaveLength(4)
      expect(invalidData.some(item => item.email === 'invalid-email')).toBe(true)
    })

    test('should create articles with unique IDs', () => {
      // Reset counter to ensure unique IDs
      ArticleFactory.counter = 0
      const articles = ArticleFactory.createMany(10)

      const ids = articles.map(article => article.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(10)
    })

    test('should handle custom overrides properly', () => {
      const customUser = {
        name: 'Custom User',
        email: 'custom@example.com',
        id: 'custom-user-id'
      }

      const article = ArticleFactory.create({
        author: customUser,
        title: 'Custom Title',
        published: true,
        tags: ['custom', 'test']
      })

      expect(article.author.id).toBe('custom-user-id')
      expect(article.author.name).toBe('Custom User')
      expect(article.title).toBe('Custom Title')
      expect(article.published).toBe(true)
      expect(article.tags).toContain('custom')
    })
  })
})