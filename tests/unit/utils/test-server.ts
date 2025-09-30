import { vi } from 'vitest'

// Using global mocks from setup.ts

export interface TestServer {
  app: any
  server: any
  port: number
  close: () => Promise<void>
}

// 模拟中间件函数
function configureMiddleware(app: any) {
  // 加载body-parser模块以确保mock生效
  const bodyParser = require('body-parser')

  // 配置body-parser限制来测试大请求体
  app.use(bodyParser.json({ limit: '1mb' }))
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }))

  // 错误处理中间件 - JSON解析错误
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JSON',
        message: '无效的JSON格式',
        timestamp: new Date().toISOString(),
      })
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        error: 'REQUEST_TOO_LARGE',
        message: '请求体过大',
        timestamp: new Date().toISOString(),
      })
    }
    next(err)
  })

  // 模拟认证中间件
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: '需要认证',
        timestamp: new Date().toISOString(),
      })
    }

    if (!authHeader.startsWith('Bearer ') || authHeader.length <= 7) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_AUTH_FORMAT',
        message: '无效的认证格式',
        timestamp: new Date().toISOString(),
      })
    }

    const token = authHeader.substring(7)
    if (token === 'invalid-key') {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: '无效的API密钥',
        timestamp: new Date().toISOString(),
      })
    }

    next()
  })
}

// 模拟路由设置
function setupRoutes(app: express.Application) {
  // 文章发布端点
  app.post('/api/v1/articles/publish', (req, res) => {
    try {
      const {
        title, content, tags, autoDeploy,
      } = req.body

      // 模拟服务器错误测试
      if (title === '服务器错误测试') {
        return res.status(500).json({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: '服务器内部错误',
          timestamp: new Date().toISOString(),
        })
      }

      // 模拟数据库错误测试
      if (title === '数据库错误测试') {
        return res.status(500).json({
          success: false,
          error: 'DATABASE_ERROR',
          message: '数据库连接失败',
          timestamp: new Date().toISOString(),
        })
      }

      // 模拟文件系统错误测试
      if (title === '文件系统错误测试') {
        return res.status(500).json({
          success: false,
          error: 'FILE_SYSTEM_ERROR',
          message: '文件系统错误',
          timestamp: new Date().toISOString(),
        })
      }

      // 模拟部署失败测试
      if (title === '部署失败测试') {
        const articleId = require('uuid').v4()
        const fileName = `${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}.md`

        return res.json({
          success: true,
          data: {
            articleId,
            fileName,
            published: true,
            publishedAt: new Date().toISOString(),
            deploymentStatus: 'failed',
            autoDeploy: true,
            deployUrl: null,
            tags: tags || [],
            deployedAt: null,
            deploymentError: '部署失败：远程仓库连接失败',
          },
          message: '文章发布成功，但部署失败',
          timestamp: new Date().toISOString(),
        })
      }

      // 模拟网络错误测试
      if (title === '网络错误测试') {
        const articleId = require('uuid').v4()
        const fileName = `${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}.md`

        return res.json({
          success: true,
          data: {
            articleId,
            fileName,
            published: true,
            publishedAt: new Date().toISOString(),
            deploymentStatus: 'network_error',
            autoDeploy: true,
            deployUrl: null,
            tags: tags || [],
            deployedAt: null,
            deploymentError: '网络错误：无法连接到部署服务器',
          },
          message: '文章发布成功，但网络错误',
          timestamp: new Date().toISOString(),
        })
      }

      // 并发冲突测试 - 检测相同的并发测试标题
      if (title === '并发测试') {
        // 模拟50%的并发冲突率
        if (Math.random() > 0.5) {
          return res.status(409).json({
            success: false,
            error: 'CONFLICT_ERROR',
            message: '并发冲突：检测到重复发布',
            timestamp: new Date().toISOString(),
          })
        }
      }

      // 参数验证
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '标题不能为空',
          timestamp: new Date().toISOString(),
        })
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '内容不能为空',
          timestamp: new Date().toISOString(),
        })
      }

      if (title.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '标题长度不能超过200个字符',
          timestamp: new Date().toISOString(),
        })
      }

      if (content.length > 1000000) {
        return res.status(413).json({
          success: false,
          error: 'REQUEST_TOO_LARGE',
          message: '请求体过大',
          timestamp: new Date().toISOString(),
        })
      }

      // 生成文章ID和文件名
      const articleId = require('uuid').v4()
      const fileName = `${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}.md`

      // 模拟发布结果
      const result = {
        articleId,
        fileName,
        published: true,
        publishedAt: new Date().toISOString(),
        deploymentStatus: autoDeploy ? 'started' : 'pending',
        autoDeploy: !!autoDeploy,
        deployUrl: autoDeploy ? 'https://example.com/article' : null,
        tags: tags || [],
        deployedAt: autoDeploy ? new Date().toISOString() : null,
        deploymentError: null,
      }

      res.json({
        success: true,
        data: result,
        message: '文章发布成功',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
        timestamp: new Date().toISOString(),
      })
    }
  })

  // 健康检查端点
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      message: 'API服务器运行正常',
      timestamp: new Date().toISOString(),
    })
  })
}

export async function createTestServer(): Promise<TestServer> {
  // Load modules inside the function to ensure mocks are applied
  const express = require('express')
  const { createServer } = require('http')
  const bodyParser = require('body-parser')

  const app = express()
  const server = createServer(app)

  // 配置中间件
  configureMiddleware(app)

  // 设置路由
  setupRoutes(app)

  return new Promise((resolve, reject) => {
    // 设置更快的启动超时
    const startupTimeout = setTimeout(() => {
      reject(new Error('Test server startup timeout'))
    }, 3000)

    server.listen(0, () => {
      clearTimeout(startupTimeout)
      const { port } = server.address()
      resolve({
        app,
        server,
        port,
        close: () => new Promise((resolveCallback) => {
          // 设置快速关闭超时
          const closeTimeout = setTimeout(() => {
            console.warn('Server close timeout, forcing cleanup')
            resolveCallback()
          }, 2000)

          server.close(() => {
            clearTimeout(closeTimeout)
            resolveCallback()
          })
        }),
      })
    })
  })
}

export async function createTestServerWithConfig(config: any = {}): Promise<TestServer> {
  // Load modules inside the function to ensure mocks are applied
  const express = require('express')
  const { createServer } = require('http')

  const app = express()
  const server = createServer(app)

  // 配置中间件
  configureMiddleware(app)

  // 设置路由
  setupRoutes(app)

  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const { port } = server.address()
      resolve({
        app,
        server,
        port,
        close: () => new Promise((resolveCallback) => {
          server.close(resolveCallback)
        }),
      })
    })
  })
}

// 模拟API响应
export function createMockResponse<T>(data: T, success = true): any {
  return {
    success,
    data,
    message: success ? '操作成功' : '操作失败',
    timestamp: new Date().toISOString(),
  }
}

// 模拟错误响应
export function createErrorResponse(error: string, message: string): any {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString(),
  }
}
