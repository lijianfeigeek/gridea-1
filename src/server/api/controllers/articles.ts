import { Request, Response } from 'express'
import moment from 'moment'
import Bluebird from 'bluebird'
import Posts from '../../posts'
import Deploy from '../../deploy'
import Renderer from '../../renderer'
import Tags from '../../tags'
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

  private tags: Tags

  constructor(appInstance: any) {
    this.posts = new Posts(appInstance)
    this.deploy = new Deploy(appInstance)
    this.renderer = new Renderer(appInstance)
    this.tags = new Tags(appInstance)
    this.validator = new MarkdownValidator({
      maxContentLength: 1000000,
      maxLineLength: 10000,
      requireTitle: true,
    })
  }

  /**
   * Notify frontend that posts have been updated
   */
  private notifyPostsUpdated(articleData: any, success: boolean = true): void {
    try {
      // Send IPC event to notify frontend to refresh posts list
      const allWindows = (require('electron') as any).BrowserWindow && (require('electron') as any).BrowserWindow.getAllWindows ? (require('electron') as any).BrowserWindow.getAllWindows() : []

      allWindows.forEach((window: any) => {
        if (window && !window.isDestroyed() && window.webContents) {
          console.log('📢 [GUI_SYNC] Sending posts-updated event to frontend')
          window.webContents.send('posts-updated', {
            success,
            article: {
              fileName: articleData.fileName,
              title: articleData.title,
              published: articleData.published,
              date: articleData.date,
              tags: articleData.tags,
            },
            timestamp: new Date().toISOString(),
            postsCount: (this.renderer.db.posts && this.renderer.db.posts.length) || 0,
          })
        }
      })

      console.log('✅ [GUI_SYNC] Posts update notification sent successfully')
    } catch (error) {
      console.warn('⚠️ [GUI_SYNC] Failed to send posts update notification:', error)
    }
  }

  public async publishArticle(req: RequestWithLogger, res: Response): Promise<void> {
    console.log('🚀 [ARTICLE_PUBLISH] Starting article publish process')
    console.log(`📝 [ARTICLE_PUBLISH] Request received at: ${new Date().toISOString()}`)

    try {
      const {
        title, content, tags = [], autoDeploy = false,
      }: ArticlePublishRequest = req.body

      console.log('📋 [ARTICLE_PUBLISH] Article publish request details:', {
        title,
        tags,
        autoDeploy,
        contentLength: (content && content.length) || 0,
        hasContent: !!content,
        tagsCount: tags ? tags.length : 0,
        requestId: req.requestId,
      })

      // Enhanced tag logging
      console.log('🏷️ [TAGS_DEBUG] Received tags from API request:', {
        rawTags: tags,
        tagsType: typeof tags,
        tagsIsArray: Array.isArray(tags),
        tagsLength: tags ? tags.length : 0,
        tagsContent: tags ? JSON.stringify(tags) : 'null',
        requestId: req.requestId,
      })

      // Process tags
      const processedTags: string[] = []
      if (tags && Array.isArray(tags)) {
        processedTags.push(...tags.map(tag => tag.trim()).filter(tag => tag.length > 0))
        console.log('🏷️ [TAGS_DEBUG] Processed array tags:', {
          originalTags: tags,
          processedTags: processedTags,
          trimmedAndFiltered: tags.map(tag => tag.trim()).filter(tag => tag.length > 0),
          requestId: req.requestId,
        })
      } else if (tags && typeof tags === 'string') {
        const splitTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        processedTags.push(...splitTags)
        console.log('🏷️ [TAGS_DEBUG] Processed string tags:', {
          originalTagString: tags,
          splitTags: splitTags,
          processedTags: processedTags,
          requestId: req.requestId,
        })
      } else {
        console.log('🏷️ [TAGS_DEBUG] No valid tags provided:', {
          tagsValue: tags,
          tagsType: typeof tags,
          requestId: req.requestId,
        })
      }

      if (processedTags.length > 0) {
        console.log('🏷️ [TAGS_DEBUG] Final processed tags for article:', {
          articleTitle: title,
          processedTags: processedTags,
          tagsCount: processedTags.length,
          tagsList: processedTags.join(', '),
          requestId: req.requestId,
        })
      }

      // Log article publish attempt
      req.logger.info('Article publish attempt', {
        title,
        tags: processedTags,
        autoDeploy,
        contentLength: (content && content.length) || 0,
      })

      const validation = this.validatePublishRequest(title, content, processedTags)
      console.log('🔍 [ARTICLE_PUBLISH] Validation result:', {
        isValid: validation.isValid,
        errorsCount: validation.errors.length,
        warningsCount: validation.warnings.length,
        errors: validation.errors,
        warnings: validation.warnings,
        validatedTags: processedTags,
        tagsInValidation: validation.errors.filter(e => e.includes('tag')),
      })

      console.log('🏷️ [TAGS_DEBUG] Tag validation completed:', {
        isValid: validation.isValid,
        tagErrors: validation.errors.filter(e => e.includes('tag')),
        validatedTags: processedTags,
        requestId: req.requestId,
      })

      if (!validation.isValid) {
        console.log('❌ [ARTICLE_PUBLISH] Validation failed, returning error response')
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

      console.log('✅ [ARTICLE_PUBLISH] Basic validation passed')

      const markdownValidation = this.validator.validate(content)
      console.log('📝 [ARTICLE_PUBLISH] Markdown validation result:', {
        isValid: markdownValidation.isValid,
        errorsCount: markdownValidation.errors.length,
        warningsCount: markdownValidation.warnings.length,
        errors: markdownValidation.errors,
        warnings: markdownValidation.warnings,
      })

      if (!markdownValidation.isValid) {
        console.log('❌ [ARTICLE_PUBLISH] Markdown validation failed, returning error response')
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

      console.log('✅ [ARTICLE_PUBLISH] Markdown validation passed')

      const fileName = this.generateFileName(title)
      console.log(`📂 [ARTICLE_PUBLISH] Generated filename: ${fileName}`)

      const articleData = this.createArticleData(title, content, processedTags, fileName)
      console.log('📋 [ARTICLE_PUBLISH] Article data created:', {
        fileName: articleData.fileName,
        title: articleData.title,
        tags: articleData.tags,
        date: articleData.date,
        published: articleData.published,
        contentLength: articleData.content.length,
      })

      console.log('🏷️ [TAGS_DEBUG] Article data creation completed:', {
        articleTitle: articleData.title,
        articleFileName: articleData.fileName,
        tagsInArticleData: articleData.tags,
        tagsType: typeof articleData.tags,
        tagsIsArray: Array.isArray(articleData.tags),
        requestId: req.requestId,
      })

      console.log('💾 [ARTICLE_PUBLISH] Starting to save article...')
      const saveStartTime = Date.now()
      const saveResult = await this.saveArticle(articleData)
      const saveDuration = Date.now() - saveStartTime

      console.log(`📊 [ARTICLE_PUBLISH] Article save process completed in ${saveDuration}ms`, {
        success: saveResult,
        fileName: articleData.fileName,
      })

      if (!saveResult) {
        console.log('❌ [ARTICLE_PUBLISH] Failed to save article, returning error response')
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

      console.log('✅ [ARTICLE_PUBLISH] Article saved successfully to file and database')

      let deploymentStatus: 'pending' | 'started' | 'completed' | 'failed' | 'network_error' = 'pending'
      let deployUrl: string | null = null
      let deploymentError: string | null = null
      let deployedAt: string | null = null

      try {
        console.log('🔄 [SYNCHRONIZATION] Starting synchronization process')

        // Force reload posts database to ensure latest article is included
        console.log(`📊 [SYNCHRONIZATION] Current renderer posts count: ${this.renderer.db.posts.length}`)
        req.logger.info('Reloading posts database before rendering', {
          fileName,
          currentPostsCount: this.renderer.db.posts.length,
        })

        console.log('📚 [SYNCHRONIZATION] Step 1: Reloading posts database to include latest article...')
        const reloadStartTime = Date.now()

        // Reload posts to ensure the latest article is included and capture the return value
        const reloadedPosts = await this.posts.reloadPosts()

        const reloadDuration = Date.now() - reloadStartTime
        console.log(`📊 [SYNCHRONIZATION] Database reload completed in ${reloadDuration}ms`)

        // Update renderer database reference using the returned array
        console.log('🔄 [SYNCHRONIZATION] Step 2: Updating renderer database reference...')
        const oldPostsCount = this.renderer.db.posts.length

        // CRITICAL FIX: Use the returned reloadedPosts array to ensure synchronization
        this.renderer.db.posts = reloadedPosts
        this.posts.db.posts = reloadedPosts // Also update posts.db.posts for consistency
        this.renderer.db.themeConfig.domain = this.renderer.db.setting.domain
        const newPostsCount = this.renderer.db.posts.length

        console.log('📊 [SYNCHRONIZATION] Renderer database updated:', {
          oldPostsCount,
          newPostsCount,
          postsAdded: newPostsCount - oldPostsCount,
          domain: this.renderer.db.themeConfig.domain,
          newPostsArrayLength: reloadedPosts.length,
          rendererDbPostsLength: this.renderer.db.posts.length,
          postsDbPostsLength: this.posts.db.posts.length,
        })

        // Verify synchronization by checking if the latest article is in the array
        const latestArticle = reloadedPosts.find((post: any) => post.fileName === fileName)
        console.log('🔍 [SYNCHRONIZATION] Latest article verification:', {
          fileName,
          found: !!latestArticle,
          title: (latestArticle && latestArticle.data && latestArticle.data.title) || 'Not found',
          published: (latestArticle && latestArticle.data && latestArticle.data.published) || false,
        })

        req.logger.info('Posts database reloaded', {
          fileName,
          newPostsCount: this.renderer.db.posts.length,
        })

        // CRITICAL FIX: Synchronize tags to ensure renderer.db.tags is updated
        console.log('🏷️ [TAGS_SYNC] Starting tags synchronization...')
        try {
          // Force refresh Tags instance's LowDB cache to read latest posts from disk
          console.log('🔄 [TAGS_SYNC] Refreshing Tags database cache...')
          this.tags.$posts.read()
          console.log('✅ [TAGS_SYNC] Tags database cache refreshed')

          // Use Tags.list() to get the latest tags after cache refresh
          const updatedTags = await this.tags.list()
          console.log('✅ [TAGS_SYNC] Tags synchronization completed successfully')

          // Update both renderer.db.tags and posts.db.tags with the latest tags
          this.renderer.db.tags = updatedTags
          this.posts.db.tags = updatedTags

          console.log('🏷️ [TAGS_DEBUG] Tags synchronization details:', {
            fileName,
            updatedTagsCount: Array.isArray(updatedTags) ? updatedTags.length : 0,
            updatedTagsSample: Array.isArray(updatedTags)
              ? updatedTags.slice(0, 5).map(tag => `${tag.name || tag}(${tag.slug || 'N/A'})`).join(', ')
              : 'N/A',
            rendererDbTagsLength: this.renderer.db.tags ? this.renderer.db.tags.length : 0,
            postsDbTagsLength: this.posts.db.tags ? this.posts.db.tags.length : 0,
            newTagsFound: updatedTags.filter(tag => ['完整', '发布', '部署'].includes(tag.name || tag)).map(tag => tag.name || tag),
          })

          req.logger.info('Tags synchronized', {
            fileName,
            tagsCount: Array.isArray(updatedTags) ? updatedTags.length : 0,
            newTags: updatedTags.filter(tag => ['完整', '发布', '部署'].includes(tag.name || tag)).map(tag => tag.name || tag),
          })
        } catch (error) {
          console.error('❌ [TAGS_SYNC] Tags synchronization failed:', error)
          req.logger.error('Tags synchronization failed', {
            fileName,
            error: (error as Error).message,
          })
        }

        // Always generate static website to ensure article is visible
        console.log('🌐 [SYNCHRONIZATION] Step 3: Starting website generation process...')
        req.logger.info('Starting website generation process', {
          fileName,
          autoDeploy,
          outputDir: this.renderer.outputDir,
          themePath: this.renderer.themePath,
          postsCount: this.renderer.db.posts.length,
        })

        // Set domain for rendering
        console.log(`🌐 [SYNCHRONIZATION] Domain configured for rendering: ${this.renderer.db.themeConfig.domain}`)
        req.logger.info('Domain set for rendering', {
          domain: this.renderer.db.themeConfig.domain,
        })

        // Verification: Ensure latest tags are available before rendering
        console.log('🔍 [RENDER_VERIFY] Verifying tag data before renderAll()...', {
          rendererDbTagsCount: this.renderer.db.tags ? this.renderer.db.tags.length : 0,
          postsDbTagsCount: this.posts.db.tags ? this.posts.db.tags.length : 0,
          expectedNewTags: ['完整', '发布', '部署'],
          actualTags: this.renderer.db.tags
            ? this.renderer.db.tags.filter(tag => ['完整', '发布', '部署'].includes(tag.name || tag)).map(tag => tag.name || tag) : [],
          tagsSlugInfo: this.renderer.db.tags
            ? this.renderer.db.tags.filter(tag => ['完整', '发布', '部署'].includes(tag.name || tag)).map(tag => `${tag.name || tag}(${tag.slug || 'N/A'})`) : [],
        })

        console.log('🎨 [SYNCHRONIZATION] Step 4: Calling renderAll() method to generate static website...')
        req.logger.info('Calling renderAll() method', {
          method: 'renderAll',
          timeout: 60000, // 60 second timeout expectation
          autoDeploy,
          tagsCount: this.renderer.db.tags ? this.renderer.db.tags.length : 0,
          newTagsAvailable: this.renderer.db.tags
            ? this.renderer.db.tags.filter(tag => ['完整', '发布', '部署'].includes(tag.name || tag)).length : 0,
        })

        const renderStartTime = Date.now()
        await this.renderer.renderAll()
        const renderDuration = Date.now() - renderStartTime

        console.log(`🎉 [SYNCHRONIZATION] Static website generated successfully in ${renderDuration}ms`)
        req.logger.info('Static website generated successfully', {
          fileName,
          autoDeploy,
          renderDuration,
          outputDir: this.renderer.outputDir,
        })

        console.log(`📋 [SYNCHRONIZATION] Final posts count in database: ${this.renderer.db.posts.length}`)

        if (autoDeploy) {
          // Step 2: Deploy to remote (only if autoDeploy is enabled)
          req.logger.logDeploymentStart(fileName, true)
          deploymentStatus = 'started'

          req.logger.info('Starting deployment process', { fileName })

          console.log('🚀 [DEPLOY] Starting deployment process for article:', fileName)
          const deployStartTime = Date.now()
          const deployResult = await this.deploy.publish()
          const deployDuration = Date.now() - deployStartTime

          console.log('📊 [DEPLOY] Deployment result received:', {
            success: deployResult.success,
            duration: `${deployDuration}ms`,
            fileName,
            timestamp: new Date().toISOString(),
          })

          if (deployResult.success) {
            deploymentStatus = 'completed'
            deployedAt = new Date().toISOString()
            deployUrl = this.getDeployUrl()

            console.log('🎉 [DEPLOY] Deployment successful!', {
              fileName,
              deployUrl,
              duration: `${deployDuration}ms`,
              deployedAt,
              pushData: deployResult.data || null,
            })

            // Log detailed push information if available
            if (deployResult.data && deployResult.data.ok) {
              console.log('✅ [DEPLOY] Push operation details:', {
                success: true,
                refs: deployResult.data.refs || {},
                server: deployResult.data.headers ? {
                  server: deployResult.data.headers.server,
                  date: deployResult.data.headers.date,
                } : {},
                totalDuration: `${deployDuration}ms`,
              })
            }

            req.logger.logDeploymentSuccess(fileName, deployUrl || undefined, deployDuration)
          } else {
            deploymentStatus = 'failed'
            deploymentError = deployResult.message || 'Deployment failed'

            console.error('❌ [DEPLOY] Deployment failed!', {
              fileName,
              error: deploymentError,
              duration: `${deployDuration}ms`,
              pushData: deployResult.data || null,
              timestamp: new Date().toISOString(),
            })

            req.logger.logDeploymentFailure(fileName, deploymentError, deployDuration)
          }
        } else {
          deploymentStatus = 'pending'
          req.logger.info('Article saved and website generated without deployment', {
            fileName,
            renderDuration,
          })
        }
      } catch (error) {
        const deployDuration = Date.now() - (req.startTime || Date.now())
        deploymentStatus = 'network_error'
        deploymentError = error instanceof Error ? error.message : 'Unknown website generation error'

        req.logger.error('Website generation failed', error instanceof Error ? error : new Error(String(error)), {
          fileName,
          autoDeploy,
          deploymentStatus,
          deployDuration,
          errorType: typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        })
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

      console.log('🎉 [ARTICLE_PUBLISH] Article publish process completed successfully!', {
        articleId: fileName,
        title: articleData.title,
        deploymentStatus,
        autoDeploy,
        deployUrl,
        tags,
        totalDuration: Date.now() - (req.startTime || Date.now()),
      })

      console.log('🏷️ [TAGS_DEBUG] Final response tags:', {
        articleTitle: articleData.title,
        responseTags: tags,
        tagsType: typeof tags,
        tagsIsArray: Array.isArray(tags),
        tagsLength: tags ? tags.length : 0,
        tagsInResponse: JSON.stringify(tags),
        requestId: req.requestId,
      })

      // CRITICAL: Notify frontend GUI to update posts list
      console.log('🔄 [GUI_SYNC] Notifying frontend to update posts list...')
      this.notifyPostsUpdated({
        fileName,
        title: articleData.title,
        published: articleData.published,
        date: articleData.date,
        tags: articleData.tags,
      }, true)

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

      console.log('📤 [ARTICLE_PUBLISH] Sending success response to client')
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

    // Create a slug that works for both English and Chinese titles
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s\u4e00-\u9fff-]/g, '') // Allow alphanumeric, spaces, Chinese characters, and hyphens
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // If slug is empty after processing, use a default
    if (!slug) {
      slug = 'untitled'
    }

    // For Chinese titles, use a hash of the title to create a short, unique identifier
    // This avoids long URL-encoded filenames while ensuring uniqueness
    if (/[\u4e00-\u9fff]/.test(slug)) {
      // Contains Chinese characters
      const hash = this.createSimpleHash(title)
      const englishPart = slug.replace(/[\u4e00-\u9fff]/g, '').replace(/-+/g, '-').trim()
      if (englishPart) {
        slug = `${englishPart}-${hash}`
      } else {
        slug = `chinese-${hash}`
      }
    }

    return `${timestamp}-${slug}`
  }

  private createSimpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash * 31 + char) // Alternative to ((hash << 5) - hash)
    }
    return Math.abs(hash).toString(36).substring(0, 6)
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16)
      const v = c === 'x' ? r : ((r % 4) + 8)
      return v.toString(16)
    })
  }

  private createArticleData(title: string, content: string, tags: string[], fileName: string): any {
    console.log('🏷️ [TAGS_DEBUG] createArticleData called:', {
      inputTitle: title,
      inputTags: tags,
      inputFileName: fileName,
      tagsType: typeof tags,
      tagsIsArray: Array.isArray(tags),
      tagsLength: tags ? tags.length : 0,
    })

    const helper = new ContentHelper()
    const formattedContent = helper.changeImageUrlLocalToDomain(content, (this.posts.db && this.posts.db.setting && this.posts.db.setting.domain) || '')
    const date = moment().format('YYYY-MM-DD HH:mm:ss')
    const uuid = this.generateUUID()

    const articleData = {
      _id: uuid,
      creation: date,
      date: date,
      updated: date,
      published: true,
      content: formattedContent,
      htmlContent: '',
      markdownContent: content,
      link: fileName,
      status: 'show',
      title: title,
      slug: fileName,
      tags: tags, // Use processed tags
      categories: [],
      type: 'post',
      featureImage: {
        name: '',
        path: '',
        isExternal: false,
      },
      hideInList: false,
      isTop: false,
      passwordProtected: false,
      password: '',
      template: '',
      fileName: fileName,
      featureImagePath: null, // Explicitly set to null to avoid empty feature field
      coverImage: '',
      theme: {
        style: '',
        iconfont: '',
        icon: '',
      },
      comments: [],
      externalUrl: '',
      isExternalUrl: false,
      lastSyncTime: date,
      summary: '',
      wordCount: 0,
      readingTime: 0,
      copyrightText: '',
      license: '',
      resources: [],
      metadata: {},
    }

    console.log('🏷️ [TAGS_DEBUG] createArticleData completed:', {
      articleTitle: articleData.title,
      articleFileName: articleData.fileName,
      tagsInArticleData: articleData.tags,
      tagsType: typeof articleData.tags,
      tagsIsArray: Array.isArray(articleData.tags),
    })

    return articleData
  }

  private async saveArticle(articleData: any): Promise<boolean> {
    console.log('💾 [SAVE_ARTICLE] Starting save article process')
    console.log('📋 [SAVE_ARTICLE] Article data:', {
      fileName: articleData.fileName,
      title: articleData.title,
      tags: articleData.tags,
      published: articleData.published,
      date: articleData.date,
    })

    console.log('🏷️ [TAGS_DEBUG] saveArticle called with detailed tag info:', {
      articleTitle: articleData.title,
      articleFileName: articleData.fileName,
      articleTags: articleData.tags,
      tagsType: typeof articleData.tags,
      tagsIsArray: Array.isArray(articleData.tags),
      tagsLength: articleData.tags ? articleData.tags.length : 0,
      tagsContent: articleData.tags ? JSON.stringify(articleData.tags) : 'null',
      postsDir: this.posts.postDir,
      appDir: this.posts.appDir,
    })

    try {
      console.log('📝 [SAVE_ARTICLE] Step 1: Saving article to file...')
      const fileSaveStartTime = Date.now()
      const result = await this.posts.savePostToFile(articleData)
      const fileSaveDuration = Date.now() - fileSaveStartTime

      console.log(`📊 [SAVE_ARTICLE] File save completed in ${fileSaveDuration}ms`, {
        success: result !== null,
        fileName: articleData.fileName,
      })

      if (result !== null) {
        console.log('🗄️ [SAVE_ARTICLE] Step 2: Updating posts database...')
        const dbUpdateStartTime = Date.now()

        // Update database after saving article file
        console.log('🔄 [SAVE_ARTICLE] Updating posts database after saving article:', articleData.fileName)
        const updateResult = await this.posts.savePosts()
        const dbUpdateDuration = Date.now() - dbUpdateStartTime

        console.log(`📊 [SAVE_ARTICLE] Database update completed in ${dbUpdateDuration}ms`, {
          success: updateResult,
          fileName: articleData.fileName,
        })
        console.log('✅ [SAVE_ARTICLE] Database update result:', updateResult)

        console.log('🎉 [SAVE_ARTICLE] Article saved successfully!')
        // Note: Website rendering is now handled in publishArticle method to avoid
        // double rendering and race conditions. Each article should only be rendered
        // once after successful save to ensure the correct content is published.
      } else {
        console.log('❌ [SAVE_ARTICLE] Failed to save article to file')
      }

      return result !== null
    } catch (error) {
      console.error('❌ [SAVE_ARTICLE] Error saving article:', error)
      console.error('❌ [SAVE_ARTICLE] Error details:', {
        fileName: articleData.fileName,
        title: articleData.title,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      })
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
