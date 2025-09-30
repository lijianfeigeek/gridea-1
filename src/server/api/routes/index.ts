import { Router } from 'express'
import { HealthStatus, APIResponse } from '../types'
import { createArticlesRouter } from './articles'
import { createWebhookRouter } from './webhook'

export class APIRoutes {
  private router: Router

  private requestCount: number = 0

  private startTime: number = Date.now()

  private appInstance: any

  constructor(appInstance?: any) {
    this.appInstance = appInstance
    this.router = Router()
    this.setupRoutes()
  }

  private setupRoutes() {
    // Health check route
    this.router.get('/health', this.healthCheck.bind(this))

    // API routes - pass appInstance to route creators
    this.router.use('/articles', createArticlesRouter(this.appInstance))
    this.router.use('/webhooks', createWebhookRouter(this.appInstance))
  }

  private healthCheck(req: any, res: any) {
    this.requestCount++

    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
      },
      api: {
        endpoints: 3, // health, articles, webhooks
        requests: this.requestCount,
      },
    }

    const response: APIResponse<HealthStatus> = {
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString(),
    }

    res.json(response)
  }

  public getRouter(): Router {
    return this.router
  }

  public incrementRequestCount() {
    this.requestCount++
  }

  public getRequestCount(): number {
    return this.requestCount
  }
}
