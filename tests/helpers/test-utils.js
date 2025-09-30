// Test utilities for Node.js environment (REST API testing)
const crypto = require('crypto')

// Core test configuration
const DEFAULT_TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  slowThreshold: 5000,
  apiUrl: 'http://localhost:4000',
  webhookUrl: 'http://localhost:4001',
  testPort: 4000,
  webhookPort: 4001
}

const DEFAULT_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  token: 'test-token-123'
}

const DEFAULT_ARTICLE_DATA = {
  title: 'Test Article',
  content: '# Test Content\n\nThis is a test article content.',
  tags: ['test', 'article'],
  published: false,
  summary: 'Test article summary',
  template: 'post'
}

const DEFAULT_SITE_CONFIG = {
  name: 'Test Site',
  description: 'Test site description',
  domain: 'example.com',
  theme: 'default',
  language: 'zh-CN',
  postsPerPage: 10
}

class TestDataManager {
  constructor() {
    this.users = []
    this.articles = []
    this.configs = []
    this.webhooks = []
  }

  createUser(overrides = {}) {
    const user = {
      ...DEFAULT_USER,
      ...overrides,
      id: overrides.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    this.users.push(user)
    return user
  }

  createArticle(overrides = {}) {
    const user = this.createUser()
    const article = {
      ...DEFAULT_ARTICLE_DATA,
      id: overrides.id || `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: overrides.createdAt || new Date().toISOString(),
      updatedAt: overrides.updatedAt || new Date().toISOString(),
      slug: overrides.slug || `test-article-${Date.now()}`,
      author: overrides.author || user,
      published: overrides.published || false,
      ...overrides
    }
    this.articles.push(article)
    return article
  }

  createSiteConfig(overrides = {}) {
    const user = this.createUser()
    const config = {
      ...DEFAULT_SITE_CONFIG,
      author: overrides.author || user,
      ...overrides
    }
    this.configs.push(config)
    return config
  }

  addWebhookRequest(request) {
    this.webhooks.push(request)
  }

  getWebhooks() {
    return [...this.webhooks]
  }

  clearWebhooks() {
    this.webhooks = []
  }

  clearAll() {
    this.users = []
    this.articles = []
    this.configs = []
    this.webhooks = []
  }

  generateInvalidArticleData() {
    return [
      { title: '' },
      { content: '' },
      { title: 'a'.repeat(1001) },
      { tags: 'invalid-tags' },
      { published: 'invalid-boolean' },
      { createdAt: 'invalid-date' }
    ]
  }

  generateInvalidUserData() {
    return [
      { email: 'invalid-email' },
      { name: '' },
      { email: '' },
      { id: '' }
    ]
  }
}

// Article Factory
class ArticleFactory {
  static create(overrides = {}) {
    if (!this.counter) this.counter = 0
    const counter = ++this.counter
    const user = overrides.author || {
      id: `author-${counter}`,
      name: `Author ${counter}`,
      email: `author${counter}@example.com`
    }

    const title = overrides.title || `Test Article ${counter}`
    const slug = overrides.slug || `test-article-${counter}`

    const article = {
      id: overrides.id || `article-${counter}`,
      title,
      content: overrides.content || `# Test Article ${counter}

This is the content of test article ${counter}. It contains **markdown** formatting and various elements.

## Section 1

Some text content here.

### Subsection

More content...

## Code Example

\`\`\`javascript
function test() {
  return 'Hello World';
}
\`\`\`

> This is a blockquote

- List item 1
- List item 2
- List item 3

---

*End of article*`,
      tags: overrides.tags || ['test', 'article', `tag-${counter}`],
      published: false, // Default to false, will be overridden by the spread operator
      createdAt: overrides.createdAt || new Date(Date.now() - counter * 86400000).toISOString(),
      updatedAt: overrides.updatedAt || new Date().toISOString(),
      author: user,
      slug,
      summary: overrides.summary || `This is a summary for test article ${counter}.`,
      featuredImage: overrides.featuredImage || `https://example.com/images/article-${counter}.jpg`,
      template: overrides.template || 'post',
      customMeta: overrides.customMeta || {
        seoTitle: `${title} - SEO Optimized`,
        seoDescription: `SEO description for article ${counter}`,
        keywords: ['test', 'article', `keyword-${counter}`]
      },
      ...overrides // Apply overrides after defaults so they take precedence
    }

    return article
  }

  static createMany(count, overrides = {}) {
    const articles = []
    for (let i = 0; i < count; i++) {
      const articleOverrides = { ...overrides }
      if (overrides.title) {
        articleOverrides.title = `${overrides.title} ${i + 1}`
      }
      articles.push(this.create(articleOverrides))
    }
    return articles
  }

  static createPublished(overrides = {}) {
    return this.create({
      ...overrides,
      published: true,
      publishedAt: new Date().toISOString()
    })
  }

  static createDraft(overrides = {}) {
    return this.create({
      ...overrides,
      published: false
    })
  }

  static generateInvalidData() {
    return [
      { title: '' },
      { content: '' },
      { title: 'a'.repeat(1001) },
      { tags: 'not-an-array' },
      { published: 'not-a-boolean' },
      { createdAt: 'invalid-date' }
    ]
  }

  static resetCounter() {
    this.counter = 0
  }
}

// Config Factory
class ConfigFactory {
  static create(overrides = {}) {
    const counter = ++this.counter || 1
    const user = overrides.author || {
      id: `config-author-${counter}`,
      name: `Config Author ${counter}`,
      email: `config.author${counter}@example.com`
    }

    const config = {
      name: overrides.name || `Test Site ${counter}`,
      description: overrides.description || `This is test site ${counter} description for testing purposes.`,
      domain: overrides.domain || `test-site-${counter}.example.com`,
      theme: overrides.theme || 'default',
      language: overrides.language || 'zh-CN',
      author: user,
      postsPerPage: overrides.postsPerPage || 10,
      customConfig: overrides.customConfig || {
        seo: {
          title: `${overrides.name || `Test Site ${counter}`} - SEO Optimized`,
          description: `SEO description for test site ${counter}`,
          keywords: ['test', 'site', `site-${counter}`]
        },
        social: {
          twitter: `@testsite${counter}`,
          github: `testsite${counter}`
        }
      }
    }

    return config
  }

  static generateInvalidData() {
    return [
      { name: '' },
      { domain: '' },
      { postsPerPage: 0 },
      { language: 'invalid-lang-code' }
    ]
  }
}

// Webhook Payload Factory
class WebhookPayloadFactory {
  static createArticleCreated(article) {
    return {
      event: 'article.created',
      data: article,
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'article.created', data: article }))
    }
  }

  static createArticleUpdated(article, changes) {
    return {
      event: 'article.updated',
      data: {
        article,
        changes,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'article.updated', data: { article, changes } }))
    }
  }

  static createDeploymentStarted(deploymentId) {
    return {
      event: 'deployment.started',
      data: {
        deploymentId,
        startedAt: new Date().toISOString(),
        status: 'started'
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'deployment.started', data: { deploymentId } }))
    }
  }

  static createDeploymentCompleted(deploymentId, success) {
    return {
      event: 'deployment.completed',
      data: {
        deploymentId,
        completedAt: new Date().toISOString(),
        status: success ? 'success' : 'failed',
        success
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'deployment.completed', data: { deploymentId, success } }))
    }
  }

  static generateSignature(payload) {
    return crypto
      .createHmac('sha256', 'test-webhook-secret')
      .update(payload)
      .digest('hex')
  }
}

// Test utility functions
function createTestConfig(overrides = {}) {
  return {
    ...DEFAULT_TEST_CONFIG,
    ...overrides
  }
}

function createWebhookPayload(event, data, signature) {
  return {
    event,
    data,
    timestamp: new Date().toISOString(),
    signature
  }
}

function generateTestSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

async function waitForServer(url, timeout = 30000, interval = 1000) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: (AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(interval) : undefined) || undefined
      })
      if (response.ok) {
        return
      }
    } catch (error) {
      // Connection failed, continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Server ${url} did not start within ${timeout}ms`)
}

async function waitForWebhook(expectedCount, timeout = 30000, interval = 500) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const webhooks = testDataManager.getWebhooks()
    if (webhooks.length >= expectedCount) {
      return webhooks
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Expected ${expectedCount} webhooks, but received ${testDataManager.getWebhooks().length} within ${timeout}ms`)
}

// Mock helpers
class MockHelpers {
  static createMockRequest(overrides = {}) {
    return {
      id: `req-${Date.now()}`,
      timestamp: new Date(),
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent'
      },
      body: createWebhookPayload('test.event', { data: 'test' }),
      method: 'POST',
      url: '/webhook',
      ...overrides
    }
  }

  static createMockResponse(overrides = {}) {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map(),
      json: async () => ({ success: true }),
      text: async () => JSON.stringify({ success: true }),
      ...overrides
    }
  }

  static mockFetchImplementation(mockResponses = []) {
    global.fetch.mockImplementation((url, options) => {
      const mockResponse = mockResponses.shift() || {
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      }
      return Promise.resolve(mockResponse)
    })
  }

  static clearFetchMock() {
    global.fetch.mockClear()
  }

  static resetFetchMock() {
    global.fetch.mockReset()
  }

  static async waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error(`Condition not met within ${timeout}ms`)
  }
}

// Create global instance
const testDataManager = new TestDataManager()

// Set up global test environment
function setupTestEnvironment() {
  beforeAll(() => {
    testDataManager.clearAll()
    global.testConfig = createTestConfig()
    global.testDataManager = testDataManager
  })

  afterAll(() => {
    testDataManager.clearAll()
  })

  beforeEach(() => {
    testDataManager.clearWebhooks()
  })
}

// Set up Jest mocks
function setupJestMocks() {
  beforeEach(() => {
    // Mock fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore()
    }
  })
}

// Export everything
module.exports = {
  // Core classes
  TestDataManager,
  ArticleFactory,
  ConfigFactory,
  WebhookPayloadFactory,
  MockHelpers,

  // Configuration
  DEFAULT_TEST_CONFIG,
  DEFAULT_USER,
  DEFAULT_ARTICLE_DATA,
  DEFAULT_SITE_CONFIG,

  // Functions
  createTestConfig,
  createWebhookPayload,
  generateTestSignature,
  waitForServer,
  waitForWebhook,
  setupTestEnvironment,
  setupJestMocks,

  // Global instance
  testDataManager,

  // Types/Interfaces for documentation
  TestConfig: {
    timeout: 'number',
    retries: 'number',
    slowThreshold: 'number',
    apiUrl: 'string',
    webhookUrl: 'string',
    testPort: 'number',
    webhookPort: 'number'
  },
  TestUserData: {
    id: 'string',
    name: 'string',
    email: 'string',
    avatar: 'string (optional)',
    token: 'string (optional)'
  },
  TestArticleData: {
    id: 'string',
    title: 'string',
    content: 'string',
    tags: 'string[]',
    published: 'boolean',
    createdAt: 'string',
    updatedAt: 'string',
    author: 'TestUserData',
    slug: 'string',
    summary: 'string (optional)',
    featuredImage: 'string (optional)',
    template: 'string (optional)',
    customMeta: 'object (optional)'
  },
  TestSiteConfig: {
    name: 'string',
    description: 'string',
    domain: 'string',
    theme: 'string',
    language: 'string',
    author: 'TestUserData',
    postsPerPage: 'number',
    customConfig: 'object (optional)'
  },
  WebhookPayload: {
    event: 'string',
    data: 'any',
    timestamp: 'string',
    signature: 'string (optional)'
  },
  WebhookRequest: {
    id: 'string',
    timestamp: 'Date',
    headers: 'Record<string, string>',
    body: 'WebhookPayload',
    method: 'string',
    url: 'string'
  }
}

// Export the TestDataManager instance for test files
export const testDataManager = new TestDataManager()