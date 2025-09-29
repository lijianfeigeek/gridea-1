import express from 'express'
import { APIServerConfig } from './types'
import { MiddlewareManager } from './middleware'
import { ArticlesRoutes } from './routes/articles'
import { DeploymentService } from './services/deployment'
import { ErrorHandlerMiddleware } from './middleware/errorHandler'
import { AuthMiddleware } from './middleware/auth'

export class APIIntegration {
  private app: express.Application

  private config: APIServerConfig

  private middlewareManager: MiddlewareManager

  private errorHandler: ErrorHandlerMiddleware

  private authMiddleware: AuthMiddleware

  private deploymentService: DeploymentService

  constructor(app: express.Application, config: APIServerConfig, appInstance: any) {
    this.app = app
    this.config = config
    this.middlewareManager = new MiddlewareManager(config)
    this.errorHandler = new ErrorHandlerMiddleware(process.env.NODE_ENV === 'production')
    this.authMiddleware = new AuthMiddleware(config.auth)
    this.deploymentService = new DeploymentService(appInstance)

    this.setupMiddleware()
    this.setupRoutes()
    this.setupErrorHandling()
  }

  private setupMiddleware(): void {
    this.app.use(this.middlewareManager.setupCORS())
    this.app.use(this.middlewareManager.setupBodyParser())
    this.app.use(this.middlewareManager.setupUrlEncodedParser())
    this.app.use(this.middlewareManager.setupSecurity())
    this.app.use(this.middlewareManager.setupCompression())
    this.app.use(this.middlewareManager.setupRequestLogging())
    this.app.use(this.middlewareManager.setupRateLimit())

    if (this.config.auth.enabled) {
      this.app.use('/api/articles', this.authMiddleware.authenticate())
    }
  }

  private setupRoutes(): void {
    const articlesRoutes = new ArticlesRoutes(
      this.app.locals.appInstance,
      this.config.auth,
    )

    this.app.use('/api/articles', articlesRoutes.getRouter())

    this.app.use('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        deployment: this.deploymentService.getStats(),
      })
    })

    this.app.use('/api/deployment/stats', (req, res) => {
      res.json({
        success: true,
        data: this.deploymentService.getStats(),
        timestamp: new Date().toISOString(),
      })
    })
  }

  private setupErrorHandling(): void {
    this.app.use(this.errorHandler.handleNotFound())
    this.app.use(this.errorHandler.handleErrors())
  }

  public getDeploymentService(): DeploymentService {
    return this.deploymentService
  }

  public getAuthMiddleware(): AuthMiddleware {
    return this.authMiddleware
  }

  public getErrorHandler(): ErrorHandlerMiddleware {
    return this.errorHandler
  }

  public static initialize(app: express.Application, config: APIServerConfig, appInstance: any): APIIntegration {
    app.locals.appInstance = appInstance
    return new APIIntegration(app, config, appInstance)
  }
}
