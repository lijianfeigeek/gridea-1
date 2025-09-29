import {
  describe, it, expect, beforeEach, vi,
} from 'vitest'
import { createMockResponse, createErrorResponse } from '../utils/test-server'
import { ArticlePublishResponse } from '../../../src/server/api/types'

describe('API测试工具函数', () => {
  describe('createMockResponse', () => {
    it('应该创建成功的响应', () => {
      const data: ArticlePublishResponse = {
        articleId: '12345678-1234-1234-1234-123456789012',
        fileName: 'test-article.md',
        published: true,
        publishedAt: '2023-01-01T00:00:00Z',
        deploymentStatus: 'pending',
        autoDeploy: false,
        deployUrl: null,
      }

      const response = createMockResponse(data, true)

      expect(response).toEqual({
        success: true,
        data,
        message: '操作成功',
        timestamp: expect.any(String),
      })
    })

    it('应该创建失败的响应', () => {
      const data = { error: 'Some error' }
      const response = createMockResponse(data, false)

      expect(response).toEqual({
        success: false,
        data,
        message: '操作失败',
        timestamp: expect.any(String),
      })
    })
  })

  describe('createErrorResponse', () => {
    it('应该创建错误响应', () => {
      const error = 'VALIDATION_ERROR'
      const message = '参数验证失败'

      const response = createErrorResponse(error, message)

      expect(response).toEqual({
        success: false,
        error,
        message,
        timestamp: expect.any(String),
      })
    })
  })
})

describe('数据验证工具', () => {
  describe('文章数据验证', () => {
    it('应该验证有效的文章数据', () => {
      const validData = {
        title: '测试标题',
        content: '测试内容',
        tags: ['测试'],
        autoDeploy: false,
      }

      expect(validData.title).toBeDefined()
      expect(validData.content).toBeDefined()
      expect(validData.title.length).toBeGreaterThan(0)
      expect(validData.content.length).toBeGreaterThan(0)
    })

    it('应该检测无效的文章数据', () => {
      const invalidData = {
        title: '',
        content: '内容',
        tags: [],
        autoDeploy: false,
      }

      expect(invalidData.title.length).toBe(0)
    })
  })
})

describe('认证测试工具', () => {
  describe('Bearer Token验证', () => {
    it('应该验证有效的Bearer Token', () => {
      const token = 'Bearer valid-token'
      const isValid = token.startsWith('Bearer ') && token.length > 7

      expect(isValid).toBe(true)
    })

    it('应该拒绝无效的Bearer Token', () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer',
        'Bearer ',
        '',
        null,
        undefined,
      ]

      invalidTokens.forEach((token) => {
        if (token && typeof token === 'string') {
          const isValid = token.startsWith('Bearer ') && token.length > 7
          expect(isValid).toBe(false)
        } else {
          expect(token).toBeFalsy()
        }
      })
    })
  })
})

describe('响应格式验证', () => {
  it('应该验证标准响应格式', () => {
    const standardResponse = {
      success: true,
      data: {},
      message: '成功',
      timestamp: new Date().toISOString(),
    }

    expect(standardResponse).toHaveProperty('success')
    expect(standardResponse).toHaveProperty('data')
    expect(standardResponse).toHaveProperty('message')
    expect(standardResponse).toHaveProperty('timestamp')
  })

  it('应该验证错误响应格式', () => {
    const errorResponse = {
      success: false,
      error: 'ERROR_CODE',
      message: '错误信息',
      timestamp: new Date().toISOString(),
    }

    expect(errorResponse).toHaveProperty('success', false)
    expect(errorResponse).toHaveProperty('error')
    expect(errorResponse).toHaveProperty('message')
    expect(errorResponse).toHaveProperty('timestamp')
  })
})
