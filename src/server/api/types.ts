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
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: APIError
  timestamp: string
}

export interface RequestWithUser {
  user?: {
    id: string
    username: string
    role: string
  }
}
