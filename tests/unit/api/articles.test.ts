import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest'

import { createTestServer } from '../utils/test-server'
import { ArticlePublishRequest, ArticlePublishResponse, ApiResponse } from '../../../src/server/api/types'
import { IPost } from '../../../src/server/interfaces/post'
// Using global mocks from setup.ts

describe('文章发布API测试', () => {
  let server: any
  let baseUrl: string
  let testApiKey: string

  // 设置较短的测试超时
  vi.setConfig({ testTimeout: 8000, hookTimeout: 5000 })

  beforeEach(async () => {
    // 增加超时保护
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Server startup timeout')), 5000)
    })

    server = await Promise.race([
      createTestServer(),
      timeoutPromise,
    ]) as any

    baseUrl = `http://localhost:${server.port}`
    testApiKey = 'test-api-key-12345'
  })

  afterEach(async () => {
    if (server) {
      // 增加关闭超时保护
      const closePromise = server.close()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Server close timeout')), 3000)
      })

      await Promise.race([closePromise, timeoutPromise]).catch(() => {
        console.warn('Server close timeout, forcing cleanup')
      })
    }
  })

  describe('文章发布成功测试', () => {
    it('应该成功发布有效文章', async () => {
      const articleData: ArticlePublishRequest = {
        title: '测试文章标题',
        content: '# 测试文章\n\n这是一篇测试文章的内容。',
        tags: ['测试', '文章'],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      const result: ApiResponse<ArticlePublishResponse> = await response.json()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.articleId).toBeDefined()
      expect(result.data.articleId).toMatch(/^[a-f0-9-]{36}$/)
      expect(result.data.fileName).toBeDefined()
      expect(result.data.fileName).toMatch(/\.md$/)
      expect(result.data.published).toBe(true)
      expect(result.data.publishedAt).toBeDefined()
      expect(result.data.deploymentStatus).toBe('pending')
    })

    it('返回数据格式应该符合规范', async () => {
      const articleData: ArticlePublishRequest = {
        title: '格式测试',
        content: '测试内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      const result: ApiResponse<ArticlePublishResponse> = await response.json()

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('timestamp')

      expect(result.data).toHaveProperty('articleId')
      expect(result.data).toHaveProperty('fileName')
      expect(result.data).toHaveProperty('published')
      expect(result.data).toHaveProperty('publishedAt')
      expect(result.data).toHaveProperty('deploymentStatus')
      expect(result.data).toHaveProperty('deployUrl', null)
    })

    it('应该生成唯一的文章ID', async () => {
      const articleData1: ArticlePublishRequest = {
        title: '文章1',
        content: '内容1',
        tags: [],
        autoDeploy: false,
      }

      const articleData2: ArticlePublishRequest = {
        title: '文章2',
        content: '内容2',
        tags: [],
        autoDeploy: false,
      }

      const response1 = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData1),
      })

      const response2 = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData2),
      })

      const result1: ApiResponse<ArticlePublishResponse> = await response1.json()
      const result2: ApiResponse<ArticlePublishResponse> = await response2.json()

      expect(result1.data.articleId).not.toBe(result2.data.articleId)
      expect(result1.data.fileName).not.toBe(result2.data.fileName)
    })
  })

  describe('参数验证测试', () => {
    it('应该拒绝缺失标题的请求', async () => {
      const invalidData = {
        content: '缺少标题的文章',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toContain('标题')
    })

    it('应该拒绝缺失内容的请求', async () => {
      const invalidData = {
        title: '缺少内容的文章',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toContain('内容')
    })

    it('应该拒绝空标题的请求', async () => {
      const invalidData = {
        title: '',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
    })

    it('应该拒绝只有空格的标题', async () => {
      const invalidData = {
        title: '   ',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
    })

    it('应该处理空标签数组', async () => {
      const validData = {
        title: '空标签测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(validData),
      })

      expect(response.status).toBe(200)

      const result: ApiResponse<ArticlePublishResponse> = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.tags).toBeDefined()
      expect(Array.isArray(result.data.tags)).toBe(true)
    })

    it('应该拒绝过长的标题', async () => {
      const invalidData = {
        title: 'a'.repeat(201),
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
    })

    it('应该拒绝过长的内容', async () => {
      const invalidData = {
        title: '标题',
        content: 'a'.repeat(1000001),
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(invalidData),
      })

      // 由于body-parser的1MB限制，可能返回400或413
      expect([400, 413]).toContain(response.status)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(['REQUEST_TOO_LARGE', 'VALIDATION_ERROR']).toContain(result.error)
    })
  })

  describe('认证测试', () => {
    it('应该拒绝无认证的请求', async () => {
      const articleData: ArticlePublishRequest = {
        title: '无认证测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(401)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('AUTH_REQUIRED')
    })

    it('应该拒绝无效API密钥', async () => {
      const articleData: ArticlePublishRequest = {
        title: '无效密钥测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(401)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_API_KEY')
    })

    it('应该拒绝格式错误的认证头', async () => {
      const articleData: ArticlePublishRequest = {
        title: '格式错误测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'InvalidFormat',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(401)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_AUTH_FORMAT')
    })

    it('应该防止认证绕过', async () => {
      const articleData: ArticlePublishRequest = {
        title: '绕过测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(401)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
    })
  })

  describe('自动部署测试', () => {
    it('应该在启用自动部署时开始部署流程', async () => {
      const articleData: ArticlePublishRequest = {
        title: '自动部署测试',
        content: '内容',
        tags: ['部署'],
        autoDeploy: true,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      const result: ApiResponse<ArticlePublishResponse> = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.deploymentStatus).toBe('started')
      expect(result.data.autoDeploy).toBe(true)
    })

    it('应该在禁用自动部署时设置为pending状态', async () => {
      const articleData: ArticlePublishRequest = {
        title: '手动部署测试',
        content: '内容',
        tags: ['手动'],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      const result: ApiResponse<ArticlePublishResponse> = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.deploymentStatus).toBe('pending')
      expect(result.data.autoDeploy).toBe(false)
    })

    it('应该返回部署状态信息', async () => {
      const articleData: ArticlePublishRequest = {
        title: '部署状态测试',
        content: '内容',
        tags: ['状态'],
        autoDeploy: true,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      const result: ApiResponse<ArticlePublishResponse> = await response.json()
      expect(result.data).toHaveProperty('deploymentStatus')
      expect(result.data).toHaveProperty('deployUrl')
      expect(result.data).toHaveProperty('tags')

      if (result.data.autoDeploy) {
        expect(result.data).toHaveProperty('deployedAt')
      }
    })

    it('应该处理部署失败的情况', async () => {
      const articleData: ArticlePublishRequest = {
        title: '部署失败测试',
        content: '内容',
        tags: ['失败'],
        autoDeploy: true,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      const result: ApiResponse<ArticlePublishResponse> = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.deploymentStatus).toBe('failed')
      expect(result.data.deploymentError).toBeDefined()
    })
  })

  describe('错误处理测试', () => {
    it('应该处理服务器内部错误', async () => {
      const articleData: ArticlePublishRequest = {
        title: '服务器错误测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(500)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('INTERNAL_SERVER_ERROR')
      expect(result.message).toBeDefined()
    })

    it('应该处理网络错误', async () => {
      const articleData: ArticlePublishRequest = {
        title: '网络错误测试',
        content: '内容',
        tags: [],
        autoDeploy: true,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      const result: ApiResponse<ArticlePublishResponse> = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.deploymentStatus).toBe('network_error')
      expect(result.data.deploymentError).toContain('网络')
    })

    it('应该处理数据库错误', async () => {
      const articleData: ArticlePublishRequest = {
        title: '数据库错误测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(500)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('DATABASE_ERROR')
    })

    it('应该处理文件系统错误', async () => {
      const articleData: ArticlePublishRequest = {
        title: '文件系统错误测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(500)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('FILE_SYSTEM_ERROR')
    })

    it('应该处理并发发布冲突', async () => {
      const articleData: ArticlePublishRequest = {
        title: '并发测试',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      const promises = Array(5).fill(null).map(() => fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(articleData),
      }))

      const responses = await Promise.all(promises)
      const results = await Promise.all(responses.map(r => r.json()))

      const successCount = results.filter((r: any) => r.success).length
      const conflictCount = results.filter((r: any) => r.error === 'CONFLICT_ERROR').length

      expect(successCount + conflictCount).toBe(5)
      expect(conflictCount).toBeGreaterThan(0)
    })

    it('应该处理JSON解析错误', async () => {
      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: 'invalid json',
      })

      expect(response.status).toBe(400)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_JSON')
    })

    it('应该处理超大请求体', async () => {
      const largeData = {
        title: 'a'.repeat(1000),
        content: 'a'.repeat(1000000),
        tags: Array(100).fill('tag'),
        autoDeploy: false,
      }

      const response = await fetch(`${baseUrl}/api/v1/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify(largeData),
      })

      // 由于body-parser的1MB限制，可能返回400或413
      expect([400, 413]).toContain(response.status)

      const result: ApiResponse = await response.json()
      expect(result.success).toBe(false)
      expect(['REQUEST_TOO_LARGE', 'VALIDATION_ERROR']).toContain(result.error)
    })
  })
})
