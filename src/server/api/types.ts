import { Request } from 'express'

export interface APIServerConfig {
  port: number
  host: string
  cors: {
    origin: string | string[]
    credentials: boolean
    optionsSuccessStatus: number
  }
  auth: {
    enabled: boolean
    secretKey?: string
    tokenExpiry?: string
  }
  body: {
    limit: string
    extended: boolean
  }
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    format: 'json' | 'text'
  }
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  memory: {
    heapUsed: number
    heapTotal: number
    rss: number
  }
  api: {
    endpoints: number
    requests: number
  }
}

export interface APIError {
  message: string
  statusCode: number
  error: string
  details?: any
  timestamp: string
  type?: string
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: APIError
  message?: string
  timestamp: string
}

// Legacy type alias for backward compatibility
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message: string
  timestamp: string
}

// Article Publishing Types
export interface ArticlePublishRequest {
  title: string
  content: string
  tags?: string[]
  autoDeploy?: boolean
}

export interface ArticlePublishResponse {
  articleId: string
  fileName: string
  published: boolean
  publishedAt: string
  deploymentStatus: 'pending' | 'started' | 'completed' | 'failed' | 'network_error'
  autoDeploy: boolean
  deployUrl: string | null
  tags: string[]
  deployedAt?: string | null
  deploymentError?: string | null
}

export interface RequestWithUser extends Request {
  user?: {
    id: string
    username: string
    role: string
  }
}

// Enhanced API Error Types
export interface ValidationErrorDetail {
  field: string
  message: string
  value?: any
}

export interface ValidationError extends APIError {
  type: 'validation'
  details: ValidationErrorDetail[]
}

export interface AuthenticationError extends APIError {
  type: 'authentication'
  method?: 'bearer_token' | 'api_key'
}

export interface AuthorizationError extends APIError {
  type: 'authorization'
  requiredRole?: string
  userRole?: string
}

export interface DeploymentError extends APIError {
  type: 'deployment'
  stage?: 'preparation' | 'upload' | 'verification' | 'network'
  retryAttempt?: number
  maxRetries?: number
}

// Enhanced Article Types
export interface ArticleMetadata {
  wordCount: number
  readingTime: number
  hasImages: boolean
  hasCodeBlocks: boolean
  hasTables: boolean
  linkCount: number
  headingCount: number
}

export interface ArticleDraft {
  id: string
  title: string
  content: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
  publishedAt?: string
  metadata?: ArticleMetadata
}

export interface ArticleUpdateRequest {
  title?: string
  content?: string
  tags?: string[]
  published?: boolean
  hideInList?: boolean
  isTop?: boolean
}

export interface ArticleUpdateResponse {
  success: boolean
  articleId: string
  changes: string[]
  updatedAt: string
  deploymentTriggered: boolean
}

// Deployment Status Types
export interface DeploymentStatus {
  id: string
  articleId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: string
  endTime?: string
  progress: number
  stage: 'preparation' | 'upload' | 'verification' | 'cleanup' | 'network'
  error?: string
  deployUrl?: string
  logs: string[]
  retryAttempt: number
  maxRetries: number
}

export interface DeploymentListResponse {
  deployments: DeploymentStatus[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface DeploymentActionRequest {
  action: 'start' | 'cancel' | 'retry'
  force?: boolean
}

// Pagination Types
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'publishedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Search and Filter Types
export interface ArticleSearchRequest {
  query?: string
  tags?: string[]
  status?: 'draft' | 'published' | 'archived'
  dateFrom?: string
  dateTo?: string
  author?: string
  pagination?: PaginationParams
}

export interface ArticleSearchResponse extends PaginatedResponse<ArticleDraft> {
  searchMetadata: {
    query: string
    filters: Record<string, any>
    executionTime: number
  }
}

// API Health and Monitoring Types
export interface APIHealthMetrics {
  uptime: number
  memory: {
    heapUsed: number
    heapTotal: number
    rss: number
    external: number
  }
  cpu: {
    usage: number
    count: number
  }
  requests: {
    total: number
    perMinute: number
    errorRate: number
    averageResponseTime: number
  }
  deployment: {
    active: number
    completed: number
    failed: number
    averageDuration: number
  }
}

export interface APIHealthResponse extends HealthStatus {
  metrics: APIHealthMetrics
  environment: string
  nodeVersion: string
  dependencies: Record<string, string>
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  window: string
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}

// Configuration Types
export interface ArticleAPIConfig {
  validation: {
    maxTitleLength: number
    maxContentLength: number
    maxTags: number
    allowedImageFormats: string[]
    allowedLinkProtocols: string[]
  }
  deployment: {
    autoDeployEnabled: boolean
    maxConcurrentDeployments: number
    retryAttempts: number
    retryDelay: number
    timeout: number
  }
  security: {
    enableRateLimiting: boolean
    maxRequestsPerMinute: number
    enableCORS: boolean
    allowedOrigins: string[]
  }
  pagination: {
    defaultPageSize: number
    maxPageSize: number
  }
}
