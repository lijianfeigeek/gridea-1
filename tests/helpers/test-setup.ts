import { Global } from '@jest/types'

export interface TestConfig {
  timeout: number
  retries: number
  slowThreshold: number
  apiUrl: string
  webhookUrl: string
  testPort: number
  webhookPort: number
}

export interface TestUserData {
  id: string
  name: string
  email: string
  avatar?: string
  token?: string
}

export interface TestArticleData {
  id: string
  title: string
  content: string
  html?: string
  tags: string[]
  published: boolean
  createdAt: string
  updatedAt: string
  author: TestUserData
  slug: string
  summary?: string
  featuredImage?: string
  template?: string
  customMeta?: Record<string, any>
}

export interface TestSiteConfig {
  name: string
  description: string
  domain: string
  theme: string
  language: string
  author: TestUserData
  postsPerPage: number
  customConfig?: Record<string, any>
}

export interface WebhookPayload {
  event: string
  data: any
  timestamp: string
  signature?: string
}

export interface WebhookRequest {
  id: string
  timestamp: Date
  headers: Record<string, string>
  body: WebhookPayload
  method: string
  url: string
}

export interface MockServerConfig {
  port: number
  host: string
  delay: number
  simulateErrors: boolean
  responseCodes: Record<string, number>
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  timeout: 30000,
  retries: 3,
  slowThreshold: 5000,
  apiUrl: 'http://localhost:4000',
  webhookUrl: 'http://localhost:4001',
  testPort: 4000,
  webhookPort: 4001
}

export const DEFAULT_USER: TestUserData = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  token: 'test-token-123'
}

export const DEFAULT_ARTICLE_DATA: Partial<TestArticleData> = {
  title: 'Test Article',
  content: '# Test Content\n\nThis is a test article content.',
  tags: ['test', 'article'],
  published: false,
  summary: 'Test article summary',
  template: 'post'
}

export const DEFAULT_SITE_CONFIG: Partial<TestSiteConfig> = {
  name: 'Test Site',
  description: 'Test site description',
  domain: 'example.com',
  theme: 'default',
  language: 'zh-CN',
  postsPerPage: 10
}

class TestDataManager {
  private users: TestUserData[] = []
  private articles: TestArticleData[] = []
  private configs: TestSiteConfig[] = []
  private webhooks: WebhookRequest[] = []

  createUser(overrides: Partial<TestUserData> = {}): TestUserData {
    const user: TestUserData = {
      ...DEFAULT_USER,
      ...overrides,
      id: overrides.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    this.users.push(user)
    return user
  }

  createArticle(overrides: Partial<TestArticleData> = {}): TestArticleData {
    const user = this.createUser()
    const article: TestArticleData = {
      ...DEFAULT_ARTICLE_DATA,
      id: overrides.id || `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: overrides.createdAt || new Date().toISOString(),
      updatedAt: overrides.updatedAt || new Date().toISOString(),
      slug: overrides.slug || `test-article-${Date.now()}`,
      author: overrides.author || user,
      published: overrides.published || false,
      ...overrides
    } as TestArticleData
    this.articles.push(article)
    return article
  }

  createSiteConfig(overrides: Partial<TestSiteConfig> = {}): TestSiteConfig {
    const user = this.createUser()
    const config: TestSiteConfig = {
      ...DEFAULT_SITE_CONFIG,
      author: overrides.author || user,
      ...overrides
    } as TestSiteConfig
    this.configs.push(config)
    return config
  }

  addWebhookRequest(request: WebhookRequest): void {
    this.webhooks.push(request)
  }

  getWebhooks(): WebhookRequest[] {
    return [...this.webhooks]
  }

  clearWebhooks(): void {
    this.webhooks = []
  }

  clearAll(): void {
    this.users = []
    this.articles = []
    this.configs = []
    this.webhooks = []
  }

  generateInvalidArticleData(): Partial<TestArticleData>[] {
    return [
      { title: '' },
      { content: '' },
      { title: 'a'.repeat(1001) },
      { tags: 'invalid-tags' as any },
      { published: 'invalid-boolean' as any },
      { createdAt: 'invalid-date' as any }
    ]
  }

  generateInvalidUserData(): Partial<TestUserData>[] {
    return [
      { email: 'invalid-email' },
      { name: '' },
      { email: '' },
      { id: '' }
    ]
  }
}

export const testDataManager = new TestDataManager()

export async function waitForServer(
  url: string,
  timeout: number = DEFAULT_TEST_CONFIG.timeout,
  interval: number = 1000
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(interval)
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

export async function waitForWebhook(
  expectedCount: number,
  timeout: number = DEFAULT_TEST_CONFIG.timeout,
  interval: number = 500
): Promise<WebhookRequest[]> {
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

export function createTestConfig(overrides: Partial<TestConfig> = {}): TestConfig {
  return {
    ...DEFAULT_TEST_CONFIG,
    ...overrides
  }
}

export function createWebhookPayload(
  event: string,
  data: any,
  signature?: string
): WebhookPayload {
  return {
    event,
    data,
    timestamp: new Date().toISOString(),
    signature
  }
}

export function generateTestSignature(payload: string, secret: string): string {
  const crypto = require('crypto')
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

export function setupTestEnvironment(): void {
  jest.setTimeout(DEFAULT_TEST_CONFIG.timeout)

  beforeAll(async () => {
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

export function teardownTestEnvironment(): void {
  afterAll(() => {
    if (global.testDataManager) {
      global.testDataManager.clearAll()
    }
  })
}

// Legacy setup - keeping for backward compatibility
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

Object.defineProperty(window, 'getSelection', {
  value: () => ({
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
    toString: () => '',
  }),
})

global.window = Object.assign(window, {
  require: jest.fn((module) => {
    if (module === 'electron') {
      return {
        ipcRenderer: {
          on: jest.fn(),
          send: jest.fn(),
          removeAllListeners: jest.fn(),
        },
        remote: {
          app: {
            getLocale: () => 'en-US',
            getPath: () => '/tmp',
          },
          getCurrentWindow: () => ({
            setTitle: jest.fn(),
            on: jest.fn(),
            webContents: {
              send: jest.fn(),
            },
          }),
        },
        shell: {
          openExternal: jest.fn(),
        },
      }
    }
    return {}
  }),
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})

declare global {
  var testConfig: TestConfig
  var testDataManager: TestDataManager
}

export {
  TestDataManager,
  TestConfig,
  TestUserData,
  TestArticleData,
  TestSiteConfig,
  WebhookPayload,
  WebhookRequest,
  MockServerConfig
}
