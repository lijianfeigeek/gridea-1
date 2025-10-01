import { Request, Response } from 'express'
import moment from 'moment'
import Bluebird from 'bluebird'
import Posts from '../../posts'
import Deploy from '../../deploy'
import Renderer from '../../renderer'
import { MarkdownValidator, ValidationResult } from '../../validators/markdown'
import {
  ArticlePublishRequest,
  ArticlePublishResponse,
  APIResponse,
  APIError,
  RequestWithUser,
} from '../types'
import ContentHelper from '../../../helpers/content-helper'
import { formatYamlString } from '../../../helpers/utils'
import { StructuredLogger } from '../logger/structured-logger'

interface RequestWithLogger extends RequestWithUser {
  logger: StructuredLogger
  requestId: string
  startTime: number
}

export class ArticlesController {
  private posts: Posts

  private deploy: Deploy

  private renderer: Renderer

  private validator: MarkdownValidator

  constructor(appInstance: any) {
    this.posts = new Posts(appInstance)
    this.deploy = new Deploy(appInstance)
    this.renderer = new Renderer(appInstance)
    this.validator = new MarkdownValidator({
      maxContentLength: 1000000,
      maxLineLength: 10000,
      requireTitle: true,
    })
  }

  public async publishArticle(req: RequestWithLogger, res: Response): Promise<void> {
    try {
      const {
        title, content, tags = [], autoDeploy = false,
      }: ArticlePublishRequest = req.body

      // Log article publish attempt
      req.logger.info('Article publish attempt', {
        title,
        tags,
        autoDeploy,
        contentLength: (content && content.length) || 0,
      })

      const validation = this.validatePublishRequest(title, content, tags)
      if (!validation.isValid) {
        // Log validation errors
        validation.errors.forEach((error) => {
          req.logger.logValidationFailure('general', null, error)
        })

        const validationError: APIError = {
          message: 'Invalid request data',
          statusCode: 400,
          error: 'BadRequest',
          details: validation.errors,
          timestamp: new Date().toISOString(),
        }

        res.status(400).json({
          success: false,
          error: validationError,
          timestamp: new Date().toISOString(),
        })
        return
      }

      const markdownValidation = this.validator.validate(content)
      if (!markdownValidation.isValid) {
        // Log markdown validation errors
        markdownValidation.errors.forEach((error) => {
          req.logger.logValidationFailure('content', content.substring(0, 100), error)
        })

        const validationError: APIError = {
          message: 'Invalid markdown content',
          statusCode: 400,
          error: 'InvalidContent',
          details: markdownValidation.errors,
          timestamp: new Date().toISOString(),
        }

        res.status(400).json({
          success: false,
          error: validationError,
          timestamp: new Date().toISOString(),
        })
        return
      }

      const fileName = this.generateFileName(title)
      const articleData = this.createArticleData(title, content, tags, fileName)

      const saveResult = await this.saveArticle(articleData)
      if (!saveResult) {
        req.logger.error('Failed to save article', {
          fileName,
          articleData: {
            title: articleData.title,
            tags: articleData.tags,
            date: articleData.date,
          },
        })

        const saveError: APIError = {
          message: 'Failed to save article',
          statusCode: 500,
          error: 'SaveFailed',
          timestamp: new Date().toISOString(),
        }

        res.status(500).json({
          success: false,
          error: saveError,
          timestamp: new Date().toISOString(),
        })
        return
      }

      let deploymentStatus: 'pending' | 'started' | 'completed' | 'failed' | 'network_error' = 'pending'
      let deployUrl: string | null = null
      let deploymentError: string | null = null
      let deployedAt: string | null = null

      if (autoDeploy) {
        try {
          req.logger.logDeploymentStart(fileName, true)
          deploymentStatus = 'started'

          // Step 1: Generate static website
          req.logger.info('Starting website generation process', {
            fileName,
            outputDir: this.renderer.outputDir,
            themePath: this.renderer.themePath,
            postsCount: this.renderer.db.posts.length,
          })

          // Set domain for rendering
          this.renderer.db.themeConfig.domain = this.renderer.db.setting.domain
          req.logger.info('Domain set for rendering', {
            domain: this.renderer.db.themeConfig.domain,
          })

          req.logger.info('Calling renderAll() method', {
            method: 'renderAll',
            timeout: 60000, // 60 second timeout expectation
          })

          const renderStartTime = Date.now()
          await this.renderer.renderAll()
          const renderDuration = Date.now() - renderStartTime

          req.logger.info('Static website generated successfully', {
            fileName,
            renderDuration,
            outputDir: this.renderer.outputDir,
          })

          // Step 2: Deploy to remote
          req.logger.info('Starting deployment process', { fileName })
          const deployStartTime = Date.now()
          const deployResult = await this.deploy.publish()
          const deployDuration = Date.now() - deployStartTime

          if (deployResult.success) {
            deploymentStatus = 'completed'
            deployedAt = new Date().toISOString()
            deployUrl = this.getDeployUrl()
            req.logger.logDeploymentSuccess(fileName, deployUrl || undefined, deployDuration)
          } else {
            deploymentStatus = 'failed'
            deploymentError = deployResult.message || 'Deployment failed'
            req.logger.logDeploymentFailure(fileName, deploymentError, deployDuration)
          }
        } catch (error) {
          const deployDuration = Date.now() - (req.startTime || Date.now())
          deploymentStatus = 'network_error'
          deploymentError = error instanceof Error ? error.message : 'Unknown deployment error'

          req.logger.error('Website generation and deployment failed', error instanceof Error ? error : new Error(String(error)), {
            fileName,
            deploymentStatus,
            deployDuration,
            errorType: typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          })
        }
      }

      const response: ArticlePublishResponse = {
        articleId: fileName,
        fileName,
        published: true,
        publishedAt: new Date().toISOString(),
        deploymentStatus,
        autoDeploy,
        deployUrl,
        tags,
        deployedAt,
        deploymentError,
      }

      const apiResponse: APIResponse<ArticlePublishResponse> = {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      }

      // Log successful article publish
      req.logger.info('Article published successfully', {
        articleId: fileName,
        deploymentStatus,
        autoDeploy,
        deployUrl,
        tags,
        responseTime: Date.now() - (req.startTime || Date.now()),
      })

      res.json(apiResponse)
    } catch (error) {
      this.handleError(error, res, req)
    }
  }

  private validatePublishRequest(title: string, content: string, tags: string[]): ValidationResult {
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

    if (tags && !Array.isArray(tags)) {
      errors.push('Tags must be an array')
    }

    if (tags && Array.isArray(tags)) {
      const invalidTags = tags.filter(tag => typeof tag !== 'string' || tag.trim().length === 0)
      if (invalidTags.length > 0) {
        errors.push('All tags must be non-empty strings')
      }

      if (tags.length > 10) {
        errors.push('Maximum 10 tags allowed')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: [],
    }
  }

  private generateFileName(title: string): string {
    const timestamp = moment().format('YYYY-MM-DD-HH-mm-ss')
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    return `${timestamp}-${slug}`
  }

  private createArticleData(title: string, content: string, tags: string[], fileName: string): any {
    const helper = new ContentHelper()
    const formattedContent = helper.changeImageUrlLocalToDomain(content, (this.posts.db && this.posts.db.setting && this.posts.db.setting.domain) || '')

    return {
      title: formatYamlString(title),
      content: formattedContent,
      fileName,
      tags,
      date: moment().format('YYYY-MM-DD HH:mm:ss'),
      published: true,
      hideInList: false,
      isTop: false,
      featureImage: {
        name: '',
        path: '',
        type: '',
      },
      featureImagePath: '',
      deleteFileName: undefined,
    }
  }

  private async saveArticle(articleData: any): Promise<boolean> {
    try {
      const result = await this.posts.savePostToFile(articleData)
      if (result !== null) {
        // Update database after saving article file
        console.log('🔄 Updating posts database after saving article:', articleData.fileName)
        const updateResult = await this.posts.savePosts()
        console.log('✅ Database update result:', updateResult)

        // Regenerate entire website after database update
        console.log('🔄 Starting website regeneration after article save')
        this.renderer.db.themeConfig.domain = this.renderer.db.setting.domain
        await this.renderer.renderAll()
        console.log('✅ Website regeneration completed')
      }
      return result !== null
    } catch (error) {
      console.error('Error saving article:', error)
      return false
    }
  }

  private getDeployUrl(): string | null {
    const setting = this.posts.db && this.posts.db.setting ? this.posts.db.setting : null
    if (!setting) return null

    const domain = setting.domain ? setting.domain : ''
    const platform = setting.platform ? setting.platform : 'github'
    const username = setting.username ? setting.username : ''
    const repository = setting.repository ? setting.repository : ''

    if (!domain && platform === 'github' && username && repository) {
      return `https://${username}.github.io/${repository}/`
    }

    return domain || null
  }

  private handleError(error: unknown, res: Response, req?: RequestWithLogger): void {
    const logger = (req && req.logger) || console

    logger.error('Article publish error', error instanceof Error ? error : new Error(String(error)), {
      errorType: typeof error,
      timestamp: new Date().toISOString(),
    })

    const apiError: APIError = {
      message: error instanceof Error ? error.message : 'Internal server error',
      statusCode: 500,
      error: 'InternalServerError',
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      timestamp: new Date().toISOString(),
    }

    res.status(500).json({
      success: false,
      error: apiError,
      timestamp: new Date().toISOString(),
    })
  }
}
