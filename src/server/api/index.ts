import express, { Express } from 'express'
import { createServer, Server as HTTPServer } from 'http'
import { ConfigManager } from './config'
import { MiddlewareManager } from './middleware'
import { APIRoutes } from './routes'
import { APIServerConfig, HealthStatus, APIResponse } from './types'

export class APIServer {
  private app: Express

  private server: HTTPServer | null = null

  private configManager: ConfigManager

  private middlewareManager: MiddlewareManager

  private routes: APIRoutes

  private isRunning: boolean = false

  private startTime: number = 0

  constructor(configPath?: string) {
    this.configManager = new ConfigManager(configPath)
    const config = this.configManager.getConfig()
    this.middlewareManager = new MiddlewareManager(config)
    this.routes = new APIRoutes()
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(this.middlewareManager.setupSecurity())
    this.app.use(this.middlewareManager.setupCORS())
    this.app.use(this.middlewareManager.setupCompression())
    this.app.use(this.middlewareManager.setupRequestLogging())
    this.app.use(this.middlewareManager.setupRateLimit())
    this.app.use(this.middlewareManager.setupBodyParser())
    this.app.use(this.middlewareManager.setupUrlEncodedParser())
    this.app.use('/api', (req, res, next) => {
      this.middlewareManager.setupAuthentication()(req, res, next)
    })
  }

  private setupRoutes(): void {
    this.app.use('/api', this.routes.getRouter())
    this.app.use(this.middlewareManager.notFoundHandler())
    this.app.use(this.middlewareManager.errorHandler())
  }

  public async start(port?: number): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running')
    }

    const config = this.configManager.getEnvironmentConfig()
    const serverPort = port || config.port

    const validation = this.configManager.validateConfig()
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app)
        this.startTime = Date.now()

        this.server.listen(serverPort, config.host, () => {
          this.isRunning = true
          console.log(`API Server is running on ${config.host}:${serverPort}`)
          console.log(`Health check available at: http://${config.host}:${serverPort}/api/health`)
          resolve()
        })

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            console.warn(`Port ${serverPort} is already in use, trying port ${serverPort + 1}`)
            this.start(serverPort + 1).then(resolve).catch(reject)
          } else {
            this.isRunning = false
            console.error('Server error:', error)
            reject(error)
          }
        })

        this.server.on('close', () => {
          this.isRunning = false
          console.log('API Server stopped')
        })
      } catch (error) {
        this.isRunning = false
        reject(error)
      }
    })
  }

  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false
        console.log('API Server gracefully stopped')
        resolve()
      })
    })
  }

  public async restart(): Promise<void> {
    if (this.isRunning) {
      await this.stop()
    }
    await this.start()
  }

  public getServer(): HTTPServer | null {
    return this.server
  }

  public getApp(): Express {
    return this.app
  }

  public isServerRunning(): boolean {
    return this.isRunning
  }

  public getConfig(): APIServerConfig {
    return this.configManager.getConfig()
  }

  public updateConfig(config: Partial<APIServerConfig>): void {
    this.configManager.updateConfig(config)
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    const uptime = this.startTime ? Date.now() - this.startTime : 0

    return {
      status: this.isRunning ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
      },
      api: {
        endpoints: 1,
        requests: this.routes.getRequestCount(),
      },
    }
  }

  public getStats(): {
    uptime: number
    requestCount: number
    memoryUsage: NodeJS.MemoryUsage
    isRunning: boolean
    } {
    return {
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      requestCount: this.routes.getRequestCount(),
      memoryUsage: process.memoryUsage(),
      isRunning: this.isRunning,
    }
  }
}

export default APIServer
