// Node.js test setup for server-side tests
const {
  TestDataManager,
  DEFAULT_TEST_CONFIG,
  DEFAULT_USER,
  DEFAULT_ARTICLE_DATA,
  DEFAULT_SITE_CONFIG,
  createTestConfig,
  createWebhookPayload,
  generateTestSignature,
  TestConfig,
  TestUserData,
  TestArticleData,
  TestSiteConfig,
  WebhookPayload,
  WebhookRequest,
  MockServerConfig
} = require('./test-utils.js')

// Set up Node.js test environment
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

// Set up test timeout
jest.setTimeout(DEFAULT_TEST_CONFIG.timeout)

// Mock global Node.js APIs if needed
global.fetch = jest.fn()

// Test utilities for Node.js environment
class NodeTestHelpers {
  static createTestDataManager() {
    return new TestDataManager()
  }

  static createTestConfig(overrides = {}) {
    return createTestConfig(overrides)
  }

  static createWebhookPayload(event, data, signature) {
    return createWebhookPayload(event, data, signature)
  }

  static generateTestSignature(payload, secret) {
    return generateTestSignature(payload, secret)
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

  static async waitForServer(url, timeout = 5000, interval = 1000) {
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
}

module.exports = {
  TestDataManager,
  TestConfig,
  TestUserData,
  TestArticleData,
  TestSiteConfig,
  WebhookPayload,
  WebhookRequest,
  MockServerConfig,
  DEFAULT_TEST_CONFIG,
  DEFAULT_USER,
  DEFAULT_ARTICLE_DATA,
  DEFAULT_SITE_CONFIG,
  NodeTestHelpers,
  createTestConfig,
  createWebhookPayload,
  generateTestSignature,

  // For backward compatibility
  testDataManager: new TestDataManager(),
  createTestDataManager: () => new TestDataManager()
}