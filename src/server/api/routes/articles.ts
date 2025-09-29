import { Router } from 'express'
import { ArticlesController } from '../controllers/articles'
import { AuthMiddleware } from '../middleware/auth'
import { LoggerMiddleware } from '../logger/middleware'
import { ArticlePublishRequest, ArticlePublishResponse } from '../types'

export class ArticlesRoutes {
  private router: Router

  private controller: ArticlesController

  private authMiddleware: AuthMiddleware

  private loggerMiddleware: LoggerMiddleware

  constructor(appInstance: any, authConfig: any) {
    this.router = Router()
    this.controller = new ArticlesController(appInstance)
    this.authMiddleware = new AuthMiddleware(authConfig)
    this.loggerMiddleware = new LoggerMiddleware()
    this.setupRoutes()
  }

  private setupRoutes(): void {
    this.router.post(
      '/publish',
      this.loggerMiddleware.middleware(),
      this.authMiddleware.authenticate(),
      this.validatePublishRequest.bind(this),
      (req, res) => this.controller.publishArticle(req as any, res),
    )

    this.router.get(
      '/health',
      (req, res) => {
        res.json({
          success: true,
          message: 'Articles API is healthy',
          timestamp: new Date().toISOString(),
        })
      },
    )
  }

  private validatePublishRequest(req: any, res: any, next: any): void {
    const { title, content, tags } = req.body

    const errors: string[] = []

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string')
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      errors.push('Content is required and must be a non-empty string')
    }

    if (title && title.length > 200) {
      errors.push('Title must be less than 200 characters')
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        errors.push('Tags must be an array')
      } else {
        const invalidTags = tags.filter((tag: any) => typeof tag !== 'string' || tag.trim().length === 0)
        if (invalidTags.length > 0) {
          errors.push('All tags must be non-empty strings')
        }

        if (tags.length > 10) {
          errors.push('Maximum 10 tags allowed')
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          statusCode: 400,
          error: 'BadRequest',
          details: errors,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    }

    next()
  }

  public getRouter(): Router {
    return this.router
  }
}
