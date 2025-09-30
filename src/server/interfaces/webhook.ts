export interface WebhookConfig {
  id: string
  url: string
  secret?: string
  enabled: boolean
  events: WebhookEventType[]
  headers?: Record<string, string>
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  createdAt: Date
  updatedAt: Date
}

export interface WebhookEvent {
  id: string
  type: WebhookEventType
  payload: any
  timestamp: Date
  source: string
  attempt: number
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  eventId: string
  url: string
  status: 'pending' | 'delivered' | 'failed' | 'retrying'
  statusCode?: number
  response?: string
  error?: string
  attempt: number
  timestamp: Date
  nextRetryAt?: Date
}

export interface WebhookSubscription {
  id: string
  webhookId: string
  eventType: WebhookEventType
  filter?: WebhookFilter
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WebhookFilter {
  property?: string
  operator?: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex'
  value?: string
}

export interface WebhookDeliveryResult {
  success: boolean
  statusCode: number
  response: string
  duration: number
  headers?: Record<string, string>
}

export interface WebhookStats {
  totalWebhooks: number
  enabledWebhooks: number
  totalDeliveries: number
  successfulDeliveries: number
  failedDeliveries: number
  pendingDeliveries: number
  averageResponseTime: number
  lastDelivery?: Date
}

export interface WebhookTestResult {
  webhookId: string
  url: string
  success: boolean
  statusCode?: number
  response?: string
  error?: string
  duration: number
  timestamp: Date
}

export type WebhookEventType =
  | 'post.published'
  | 'post.updated'
  | 'post.deleted'
  | 'post.draft_created'
  | 'post.draft_updated'
  | 'post.draft_deleted'
  | 'deployment.started'
  | 'deployment.completed'
  | 'deployment.failed'
  | 'site.settings_updated'
  | 'theme.changed'
  | 'tag.created'
  | 'tag.updated'
  | 'tag.deleted'
  | 'menu.updated'
  | 'system.error'
  | 'system.warning'
  | 'system.info'

export interface WebhookEventData {
  post?: {
    id: string
    title: string
    content: string
    published: boolean
    date: string
    tags: string[]
    fileName: string
  }
  deployment?: {
    id: string
    status: string
    startTime: Date
    endTime?: Date
    error?: string
    deployUrl?: string
  }
  site?: {
    domain: string
    title: string
    description: string
  }
  theme?: {
    name: string
    version: string
  }
  tag?: {
    id: string
    name: string
    count: number
  }
  error?: {
    message: string
    stack?: string
    type: string
  }
  system?: {
    level: 'error' | 'warning' | 'info'
    message: string
    component: string
  }
}

export interface WebhookPayload {
  id: string
  event: WebhookEventType
  timestamp: Date
  source: string
  data: WebhookEventData
  metadata?: {
    requestId: string
    sessionId?: string
    version: string
  }
}
