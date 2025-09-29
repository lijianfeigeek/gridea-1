// Core test configuration types
export interface TestConfig {
  timeout: number
  retries: number
  slowThreshold: number
  apiUrl: string
  webhookUrl: string
  testPort: number
  webhookPort: number
  environment: 'test' | 'development' | 'production'
  debug: boolean
  enableLogging: boolean
}

// User-related types
export interface TestUserData {
  id: string
  name: string
  email: string
  avatar?: string
  token?: string
  role?: 'admin' | 'editor' | 'author' | 'subscriber'
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
  preferences?: UserPreferences
}

export interface UserPreferences {
  language: string
  theme: string
  timezone: string
  notifications: NotificationSettings
}

export interface NotificationSettings {
  email: boolean
  browser: boolean
  mobile: boolean
  marketing: boolean
}

// Article-related types
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
  publishedAt?: string
  readingTime?: number
  wordCount?: number
  status: 'draft' | 'published' | 'archived' | 'deleted'
  visibility: 'public' | 'private' | 'password-protected'
  password?: string
  commentsEnabled: boolean
  seoData?: SeoData
}

export interface SeoData {
  title?: string
  description?: string
  keywords?: string[]
  canonicalUrl?: string
  ogImage?: string
  ogTitle?: string
  ogDescription?: string
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  metaRobots?: string
  structuredData?: any
}

// Site configuration types
export interface TestSiteConfig {
  id: string
  name: string
  description: string
  domain: string
  theme: string
  language: string
  author: TestUserData
  postsPerPage: number
  customConfig?: Record<string, any>
  createdAt?: string
  updatedAt?: string
  isActive: boolean
  seo: SiteSeoConfig
  social: SocialMediaConfig
  analytics: AnalyticsConfig
  deployment: DeploymentConfig
  comments: CommentsConfig
  search: SearchConfig
  features: FeatureFlags
}

export interface SiteSeoConfig {
  title?: string
  description?: string
  keywords?: string[]
  author?: string
  robots?: string
  ogType?: string
  ogSiteName?: string
  twitterHandle?: string
  facebookAppId?: string
  googleSiteVerification?: string
  bingSiteVerification?: string
}

export interface SocialMediaConfig {
  twitter?: string
  github?: string
  linkedin?: string
  facebook?: string
  instagram?: string
  youtube?: string
  email?: string
  website?: string
}

export interface AnalyticsConfig {
  googleAnalytics?: string
  googleTagManager?: string
  bingAnalytics?: string
  hotjar?: string
  mixpanel?: string
  amplitude?: string
  plausible?: string
  fathom?: string
  custom?: Record<string, string>
}

export interface DeploymentConfig {
  provider: 'github' | 'netlify' | 'vercel' | 'sftp' | 'custom'
  config: Record<string, any>
  autoDeploy: boolean
  deployOn: ['push'] | ['schedule'] | ['manual']
  branch?: string
  buildCommand?: string
  publishDir?: string
}

export interface CommentsConfig {
  enabled: boolean
  provider: 'disqus' | 'utterances' | 'giscus' | 'custom'
  siteId?: string
  repo?: string
  category?: string
  mapping?: string
  theme?: string
}

export interface SearchConfig {
  enabled: boolean
  provider: 'algolia' | 'lunr' | 'custom'
  appId?: string
  apiKey?: string
  indexName?: string
  fields?: string[]
}

export interface FeatureFlags {
  search: boolean
  comments: boolean
  analytics: boolean
  rss: boolean
  sitemap: boolean
  newsletter: boolean
  darkMode: boolean
  multiLanguage: boolean
  versioning: boolean
  backup: boolean
}

// Webhook types
export interface WebhookPayload {
  event: string
  data: any
  timestamp: string
  signature?: string
  version?: string
  id?: string
}

export interface WebhookRequest {
  id: string
  timestamp: Date
  headers: Record<string, string>
  body: WebhookPayload
  method: string
  url: string
  ip?: string
  userAgent?: string
}

export interface WebhookEvent {
  id: string
  timestamp: Date
  eventType: string
  payload: WebhookPayload
  headers: Record<string, string>
  responseCode: number
  responseTime: number
  error?: string
  processed: boolean
  retryCount: number
}

export interface WebhookSubscription {
  id: string
  url: string
  events: string[]
  secret?: string
  isActive: boolean
  createdAt: string
  lastTriggered?: string
  failureCount: number
}

// Mock server types
export interface MockServerConfig {
  port: number
  host: string
  delay: number
  simulateErrors: boolean
  responseCodes: Record<string, number>
  maxPayloadSize: number
  enableLogging: boolean
  corsEnabled: boolean
  corsOrigins: string[]
  rateLimit: {
    enabled: boolean
    requestsPerMinute: number
  }
}

export interface WebhookServerOptions {
  port: number
  host?: string
  delay?: number
  simulateErrors?: boolean
  responseCodes?: Record<string, number>
  validateSignatures?: boolean
  webhookSecret?: string
  maxPayloadSize?: number
  enableLogging?: boolean
}

export interface WebhookServerStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastRequestTime?: Date
  uptime: number
  eventsByType: Record<string, number>
  requestsByMethod: Record<string, number>
  requestsByPath: Record<string, number>
  errorRate: number
  throughput: number
}

// Factory types
export interface ArticleFactoryOptions {
  title?: string
  content?: string
  tags?: string[]
  published?: boolean
  summary?: string
  featuredImage?: string
  template?: string
  customMeta?: Record<string, any>
  author?: TestUserData
  createdAt?: string
  updatedAt?: string
  slug?: string
  status?: 'draft' | 'published' | 'archived' | 'deleted'
  visibility?: 'public' | 'private' | 'password-protected'
  password?: string
  commentsEnabled?: boolean
  seoData?: SeoData
}

export interface ConfigFactoryOptions {
  name?: string
  description?: string
  domain?: string
  theme?: string
  language?: string
  postsPerPage?: number
  customConfig?: Record<string, any>
  author?: TestUserData
  seo?: SiteSeoConfig
  social?: SocialMediaConfig
  analytics?: AnalyticsConfig
  deployment?: DeploymentConfig
  comments?: CommentsConfig
  search?: SearchConfig
  features?: FeatureFlags
}

// Test data manager types
export interface TestDataManager {
  createUser(overrides?: Partial<TestUserData>): TestUserData
  createArticle(overrides?: Partial<TestArticleData>): TestArticleData
  createSiteConfig(overrides?: Partial<TestSiteConfig>): TestSiteConfig
  addWebhookRequest(request: WebhookRequest): void
  getWebhooks(): WebhookRequest[]
  clearWebhooks(): void
  clearAll(): void
  generateInvalidArticleData(): Partial<TestArticleData>[]
  generateInvalidUserData(): Partial<TestUserData>[]
  generateInvalidSiteConfigData(): Partial<TestSiteConfig>[]
  generateEdgeCaseArticleData(): Partial<TestArticleData>[]
  generateEdgeCaseSiteConfigData(): Partial<TestSiteConfig>[]
}

// Test utilities types
export interface TestHelpers {
  waitForServer(url: string, timeout?: number, interval?: number): Promise<void>
  waitForWebhook(expectedCount: number, timeout?: number, interval?: number): Promise<WebhookRequest[]>
  createTestConfig(overrides?: Partial<TestConfig>): TestConfig
  createWebhookPayload(event: string, data: any, signature?: string): WebhookPayload
  generateTestSignature(payload: string, secret: string): string
  setupTestEnvironment(): void
  teardownTestEnvironment(): void
  generateRequestId(): string
  generateUniqueEmail(): string
  generateUniqueSlug(title: string): string
  generateTestToken(): string
}

// Test suite types
export interface TestSuite {
  name: string
  description?: string
  setup?: () => Promise<void> | void
  teardown?: () => Promise<void> | void
  beforeEach?: () => Promise<void> | void
  afterEach?: () => Promise<void> | void
  tests: TestCase[]
}

export interface TestCase {
  name: string
  description?: string
  timeout?: number
  skip?: boolean
  only?: boolean
  test: () => Promise<void> | void
}

// Mock data types
export interface MockApiResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
  statusCode: number
  headers?: Record<string, string>
  timestamp: string
  requestId?: string
}

export interface MockApiConfig {
  baseUrl: string
  timeout: number
  headers: Record<string, string>
  retryConfig: {
    attempts: number
    delay: number
    backoff: 'linear' | 'exponential'
  }
}

// Error types
export interface TestError extends Error {
  code: string
  statusCode?: number
  details?: any
  timestamp: string
  requestId?: string
}

export interface ValidationError {
  field: string
  message: string
  value: any
  expected?: any
}

export interface AssertionError extends TestError {
  expected: any
  actual: any
  operator: string
}

// Performance monitoring types
export interface PerformanceMetrics {
  requestCount: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  throughput: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  uptime: number
}

export interface TestRunMetadata {
  id: string
  startTime: Date
  endTime?: Date
  duration?: number
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  testFiles: string[]
  environment: string
  config: TestConfig
  performance: PerformanceMetrics
  errors: TestError[]
}

// Assertion helpers
export interface AssertionHelpers {
  deepEqual(actual: any, expected: any, message?: string): void
  notDeepEqual(actual: any, expected: any, message?: string): void
  throws(block: () => any, expected?: Error | RegExp | Function, message?: string): void
  doesNotThrow(block: () => any, expected?: Error | RegExp | Function, message?: string): void
  rejects(promise: Promise<any>, expected?: Error | RegExp | Function, message?: string): Promise<void>
  resolves(promise: Promise<any>, message?: string): Promise<void>
  eventually(condition: () => boolean, timeout?: number, interval?: number): Promise<void>
  contains(actual: any, expected: any, message?: string): void
  notContains(actual: any, expected: any, message?: string): void
  matches(actual: string, pattern: RegExp, message?: string): void
  notMatches(actual: string, pattern: RegExp, message?: string): void
  hasProperty(object: any, property: string, message?: string): void
  notHasProperty(object: any, property: string, message?: string): void
  isType(value: any, type: string, message?: string): void
  isInstanceOf(value: any, constructor: Function, message?: string): void
}

// Export all types
export type {
  // Core types
  TestConfig,
  TestUserData,
  TestArticleData,
  TestSiteConfig,
  WebhookPayload,
  WebhookRequest,
  WebhookEvent,
  WebhookSubscription,

  // Configuration types
  MockServerConfig,
  WebhookServerOptions,
  WebhookServerStats,

  // Factory types
  ArticleFactoryOptions,
  ConfigFactoryOptions,

  // Utility types
  TestDataManager,
  TestHelpers,
  TestSuite,
  TestCase,

  // API types
  MockApiResponse,
  MockApiConfig,

  // Error types
  TestError,
  ValidationError,
  AssertionError,

  // Performance types
  PerformanceMetrics,
  TestRunMetadata,

  // Assertion types
  AssertionHelpers,

  // Sub-types
  UserPreferences,
  NotificationSettings,
  SeoData,
  SiteSeoConfig,
  SocialMediaConfig,
  AnalyticsConfig,
  DeploymentConfig,
  CommentsConfig,
  SearchConfig,
  FeatureFlags
}