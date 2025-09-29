import { Router } from 'express'
import { HealthStatus, APIResponse } from './types'

export class APIRoutes {
  private router: Router

  private requestCount: number = 0

  private startTime: number = Date.now()

  constructor() {
    this.router = Router()
    this.setupRoutes()
  }

  private setupRoutes() {
    this.router.get('/health', this.healthCheck.bind(this))
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
        endpoints: 1,
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
