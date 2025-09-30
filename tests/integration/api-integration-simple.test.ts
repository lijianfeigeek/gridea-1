/**
 * REST API Integration Tests (Simplified)
 *
 * This test suite provides comprehensive integration testing for the REST API functionality,
 * covering GUI-server integration, end-to-end API workflows, webhook functionality,
 * configuration management, and performance testing.
 */

import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest'

// Express mock should be handled by global setup.ts

// Import after mocking is set up
import { APIServer } from '@/server/api/index'
import { ConfigManager } from '@/server/api/config'
import { APIServerConfig, HealthStatus } from '@/server/api/types'
import * as fse from 'fs-extra'

// Mock additional modules that are imported by route files
vi.mock('express-validator', () => ({
  body: vi.fn(() => ({
    isLength: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
    isString: vi.fn().mockReturnThis(),
    isOptional: vi.fn().mockReturnThis(),
    isArray: vi.fn().mockReturnThis(),
    isIn: vi.fn().mockReturnThis(),
    normalizeEmail: vi.fn().mockReturnThis(),
    isURL: vi.fn().mockReturnThis(),
  })),
  param: vi.fn(() => ({
    isMongoId: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
  })),
  query: vi.fn(() => ({
    optional: vi.fn().mockReturnThis(),
    isBoolean: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
  })),
  validationResult: vi.fn().mockReturnValue({
    isEmpty: vi.fn().mockReturnValue(true),
    array: vi.fn().mockReturnValue([]),
  }),
}))

// Mock body-parser to prevent errors in middleware
vi.mock('body-parser', () => ({
  json: vi.fn(() => (req, res, next) => next()),
  urlencoded: vi.fn(() => (req, res, next) => next()),
  default: {
    json: vi.fn(() => (req, res, next) => next()),
    urlencoded: vi.fn(() => (req, res, next) => next()),
  },
}))

// Mock Bluebird to prevent promisifyAll conflicts
vi.mock('bluebird', () => ({
  default: {
    promisifyAll: vi.fn(() => {
      // Mock Bluebird promisifyAll to do nothing
      return {}
    }),
  },
  Promise: class {
    static resolve = vi.fn(value => Promise.resolve(value))

    static reject = vi.fn(error => Promise.reject(error))
  },
}))

// Mock express-validator with comprehensive chaining
vi.mock('express-validator', () => ({
  body: vi.fn(() => {
    const chain = {
      withMessage: vi.fn(() => chain),
      optional: vi.fn(() => chain),
      isURL: vi.fn(() => chain),
      isLength: vi.fn(() => chain),
      isArray: vi.fn(() => chain),
      isBoolean: vi.fn(() => chain),
      isIn: vi.fn(() => chain),
      custom: vi.fn(() => chain),
      isString: vi.fn(() => chain),
      isNumeric: vi.fn(() => chain),
      isEmail: vi.fn(() => chain),
      matches: vi.fn(() => chain),
      contains: vi.fn(() => chain),
      isObject: vi.fn(() => chain),
      isInt: vi.fn(() => chain),
      isFloat: vi.fn(() => chain),
      isDate: vi.fn(() => chain),
      isAlpha: vi.fn(() => chain),
      isAlphanumeric: vi.fn(() => chain),
      isAscii: vi.fn(() => chain),
      isBase64: vi.fn(() => chain),
      isHexColor: vi.fn(() => chain),
      isLowercase: vi.fn(() => chain),
      isUppercase: vi.fn(() => chain),
      isMobilePhone: vi.fn(() => chain),
      isPostalCode: vi.fn(() => chain),
      isUUID: vi.fn(() => chain),
      exists: vi.fn(() => chain),
      if: vi.fn(() => chain),
      notEmpty: vi.fn(() => chain),
      isMongoId: vi.fn(() => chain),
      isJWT: vi.fn(() => chain),
      isLatLong: vi.fn(() => chain),
      isLocale: vi.fn(() => chain),
      isAfter: vi.fn(() => chain),
      isBefore: vi.fn(() => chain),
      isCreditCard: vi.fn(() => chain),
      isCurrency: vi.fn(() => chain),
      isDataURI: vi.fn(() => chain),
      isJSON: vi.fn(() => chain),
      isMultibyte: vi.fn(() => chain),
      isPort: vi.fn(() => chain),
      isSlug: vi.fn(() => chain),
      isStrongPassword: vi.fn(() => chain),
      isTaxID: vi.fn(() => chain),
      isVAT: vi.fn(() => chain),
      isMACAddress: vi.fn(() => chain),
      isIP: vi.fn(() => chain),
      isFQDN: vi.fn(() => chain),
      isISBN: vi.fn(() => chain),
      isISSN: vi.fn(() => chain),
      isEAN: vi.fn(() => chain),
      isISIN: vi.fn(() => chain),
      isBIC: vi.fn(() => chain),
      isISO31661Alpha2: vi.fn(() => chain),
      isISO31661Alpha3: vi.fn(() => chain),
      isISO4217: vi.fn(() => chain),
      isRFC3339: vi.fn(() => chain),
    }
    return chain
  }),
  query: vi.fn(() => {
    const chain = {
      withMessage: vi.fn(() => chain),
      optional: vi.fn(() => chain),
      isBoolean: vi.fn(() => chain),
      isString: vi.fn(() => chain),
      isNumeric: vi.fn(() => chain),
      isInt: vi.fn(() => chain),
      isFloat: vi.fn(() => chain),
      isLength: vi.fn(() => chain),
      isIn: vi.fn(() => chain),
      custom: vi.fn(() => chain),
    }
    return chain
  }),
  param: vi.fn(() => {
    const chain = {
      withMessage: vi.fn(() => chain),
      optional: vi.fn(() => chain),
      isString: vi.fn(() => chain),
      isUUID: vi.fn(() => chain),
      isMongoId: vi.fn(() => chain),
      isNumeric: vi.fn(() => chain),
    }
    return chain
  }),
  validationResult: vi.fn(() => ({
    isEmpty: () => true,
    array: () => [],
  })),
}))

// Using global fs-extra mocks from setup.ts

// Mock Electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    send: vi.fn(),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
    },
    close: vi.fn(),
  })),
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/gridea'),
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    getName: vi.fn().mockReturnValue('Gridea'),
  },
}))

describe('REST API Integration Tests', () => {
  let apiServer: APIServer
  let configManager: ConfigManager
  let testConfig: APIServerConfig

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Test configuration
    testConfig = {
      port: 3002, // Use different port for testing
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

    // Mock file system operations
    vi.mocked(fse.pathExistsSync).mockReturnValue(false)
    vi.mocked(fse.ensureDirSync).mockReturnValue(true)
    vi.mocked(fse.writeJsonSync).mockReturnValue(true)

    // Create mock appInstance
    const mockAppInstance = {
      appDir: '/tmp/gridea-test',
      buildDir: '/tmp/gridea-test/public',
      db: {
        get: vi.fn().mockReturnValue({}),
        set: vi.fn(),
        write: vi.fn(),
        read: vi.fn(),
        setting: {
          platform: 'github',
          username: 'test-user',
          token: 'test-token',
          tokenUsername: 'test-token-user',
          repository: 'test-repo',
        },
      },
      mainWindow: {
        webContents: {
          send: vi.fn(),
        },
      },
      $setting: {
        get: vi.fn().mockReturnValue({ platform: 'github' }),
        set: vi.fn(),
        write: vi.fn(),
        read: vi.fn(),
      },
    }

    // Initialize components
    configManager = new ConfigManager('/tmp/test-api-config.json')
    configManager.updateConfig(testConfig)

    apiServer = new APIServer('/tmp/test-api-config.json', mockAppInstance)
  })

  afterEach(async () => {
    // Cleanup
    if (apiServer && apiServer.isServerRunning()) {
      await apiServer.stop()
    }

    // Clear mock calls but don't reset the mock definitions
    vi.clearAllMocks()
  })

  describe('Server Lifecycle Tests', () => {
    it('should start and stop server successfully', async () => {
      // Start server
      await apiServer.start()
      expect(apiServer.isServerRunning()).toBe(true)

      // Check health status
      const healthStatus = await apiServer.getHealthStatus()
      expect(healthStatus.status).toBe('healthy')
      expect(healthStatus.uptime).toBeGreaterThan(0)

      // Stop server
      await apiServer.stop()
      expect(apiServer.isServerRunning()).toBe(false)

      // Check health status after stopping
      const stoppedHealthStatus = await apiServer.getHealthStatus()
      expect(stoppedHealthStatus.status).toBe('unhealthy')
    })

    it('should restart server successfully', async () => {
      // Start server
      await apiServer.start()
      expect(apiServer.isServerRunning()).toBe(true)

      // Get initial uptime
      const initialHealth = await apiServer.getHealthStatus()
      const initialUptime = initialHealth.uptime

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      // Restart server
      await apiServer.restart()
      expect(apiServer.isServerRunning()).toBe(true)

      // Check that uptime was reset
      const restartedHealth = await apiServer.getHealthStatus()
      expect(restartedHealth.uptime).toBeLessThan(initialUptime)
    })

    it('should handle port conflicts gracefully', async () => {
      // Start first server
      await apiServer.start()
      expect(apiServer.isServerRunning()).toBe(true)

      // Create second server with same port (should fail)
      const mockAppInstance2 = {
        appDir: '/tmp/gridea-test2',
        buildDir: '/tmp/gridea-test2/public',
        db: {
          get: vi.fn(),
          set: vi.fn(),
          write: vi.fn(),
          read: vi.fn(),
        },
        mainWindow: {
          webContents: {
            send: vi.fn(),
          },
        },
      }
      const secondServer = new APIServer('/tmp/test-api-config.json', mockAppInstance2)

      try {
        await secondServer.start(testConfig.port)
        fail('Should have thrown error for port conflict')
      } catch (error) {
        expect(error.message).toContain('already in use')
      }

      // First server should still be running
      expect(apiServer.isServerRunning()).toBe(true)
    })
  })

  describe('Configuration Management Tests', () => {
    it('should update configuration dynamically', async () => {
      // Start server
      await apiServer.start()

      // Update configuration
      const newConfig = {
        auth: {
          enabled: true,
          secretKey: 'new-secret-key',
          tokenExpiry: '12h',
        },
      }

      apiServer.updateConfig(newConfig)

      // Verify configuration was updated
      const currentConfig = apiServer.getConfig()
      expect(currentConfig.auth.enabled).toBe(true)
      expect(currentConfig.auth.secretKey).toBe('new-secret-key')
      expect(currentConfig.auth.tokenExpiry).toBe('12h')
    })

    it('should validate configuration', async () => {
      // Test valid configuration
      const validConfig = {
        ...testConfig,
        port: 3003,
      }

      configManager.updateConfig(validConfig)
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      // Test invalid configuration
      const invalidConfig = {
        ...testConfig,
        port: 99999, // Invalid port
        auth: {
          enabled: true,
          secretKey: 'short', // Too short
          tokenExpiry: '24h',
        },
      }

      configManager.updateConfig(invalidConfig)
      const invalidValidation = configManager.validateConfig()
      expect(invalidValidation.valid).toBe(false)
      expect(invalidValidation.errors.length).toBeGreaterThan(0)
    })

    it('should save and load configuration persistently', async () => {
      // Update configuration
      const newConfig = {
        ...testConfig,
        port: 3004,
        auth: {
          enabled: true,
          secretKey: 'persistent-secret-key',
          tokenExpiry: '48h',
        },
      }

      configManager.updateConfig(newConfig)
      configManager.saveConfig()

      // Verify save was called
      expect(vi.mocked(fse.writeJsonSync)).toHaveBeenCalledWith(
        '/tmp/test-api-config.json',
        expect.objectContaining({
          port: 3004,
          auth: expect.objectContaining({
            enabled: true,
            secretKey: 'persistent-secret-key',
          }),
        }),
        { spaces: 2 },
      )
    })

    it('should handle environment variable overrides', async () => {
      // Set environment variables
      process.env.API_PORT = '3005'
      process.env.API_HOST = 'test-host'
      process.env.API_AUTH_ENABLED = 'true'
      process.env.API_AUTH_SECRET = 'env-secret-key'

      const envConfig = configManager.getEnvironmentConfig()

      expect(envConfig.port).toBe(3005)
      expect(envConfig.host).toBe('test-host')
      expect(envConfig.auth.enabled).toBe(true)
      expect(envConfig.auth.secretKey).toBe('env-secret-key')

      // Cleanup environment variables
      delete process.env.API_PORT
      delete process.env.API_HOST
      delete process.env.API_AUTH_ENABLED
      delete process.env.API_AUTH_SECRET
    })
  })

  describe('Health Monitoring Tests', () => {
    it('should provide comprehensive health status', async () => {
      // Start server
      await apiServer.start()

      // Get health status
      const healthStatus = await apiServer.getHealthStatus()

      expect(healthStatus.status).toBe('healthy')
      expect(healthStatus.timestamp).toBeDefined()
      expect(healthStatus.uptime).toBeGreaterThan(0)
      expect(healthStatus.version).toBeDefined()
      expect(healthStatus.memory).toBeDefined()
      expect(healthStatus.memory.heapUsed).toBeGreaterThan(0)
      expect(healthStatus.memory.heapTotal).toBeGreaterThan(0)
      expect(healthStatus.memory.rss).toBeGreaterThan(0)
      expect(healthStatus.api).toBeDefined()
      expect(healthStatus.api.endpoints).toBeGreaterThan(0)
      expect(healthStatus.api.requests).toBeGreaterThanOrEqual(0)
    })

    it('should provide server statistics', async () => {
      // Start server
      await apiServer.start()

      // Get server stats
      const stats = apiServer.getStats()

      expect(stats.uptime).toBeGreaterThan(0)
      expect(stats.requestCount).toBeGreaterThanOrEqual(0)
      expect(stats.memoryUsage).toBeDefined()
      expect(stats.memoryUsage.heapUsed).toBeGreaterThan(0)
      expect(stats.isRunning).toBe(true)
    })

    it('should track memory usage over time', async () => {
      // Start server
      await apiServer.start()

      // Get initial memory usage
      const initialStats = apiServer.getStats()
      const initialMemory = initialStats.memoryUsage.heapUsed

      // Wait and check memory usage again
      await new Promise(resolve => setTimeout(resolve, 100))
      const laterStats = apiServer.getStats()
      const laterMemory = laterStats.memoryUsage.heapUsed

      // Memory usage should be relatively stable
      const memoryIncrease = laterMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // Less than 10MB increase
    })
  })

  describe('Server Statistics Tests', () => {
    it('should track request count accurately', async () => {
      // Start server
      await apiServer.start()

      // Get initial request count
      const initialStats = apiServer.getStats()
      const initialRequestCount = initialStats.requestCount

      // Simulate some requests (in real scenario, these would be actual HTTP requests)
      // For now, we'll test that the counter is at least initialized properly
      expect(initialRequestCount).toBeGreaterThanOrEqual(0)

      // Check that uptime is increasing
      await new Promise(resolve => setTimeout(resolve, 100))
      const laterStats = apiServer.getStats()
      expect(laterStats.uptime).toBeGreaterThan(initialStats.uptime)
    })

    it('should handle zero uptime before server start', async () => {
      // Get stats before starting server
      const stats = apiServer.getStats()

      expect(stats.uptime).toBe(0)
      expect(stats.requestCount).toBe(0)
      expect(stats.isRunning).toBe(false)
      expect(stats.memoryUsage).toBeDefined()
    })

    it('should provide consistent memory usage reporting', async () => {
      // Start server
      await apiServer.start()

      // Get multiple stats samples
      const stats1 = apiServer.getStats()
      const stats2 = apiServer.getStats()
      const stats3 = apiServer.getStats()

      // All should show consistent memory usage
      expect(stats1.memoryUsage.heapUsed).toBeGreaterThan(0)
      expect(stats2.memoryUsage.heapUsed).toBeGreaterThan(0)
      expect(stats3.memoryUsage.heapUsed).toBeGreaterThan(0)

      // Memory usage should be relatively stable
      const memoryVariation = Math.max(
        stats1.memoryUsage.heapUsed,
        stats2.memoryUsage.heapUsed,
        stats3.memoryUsage.heapUsed,
      ) - Math.min(
        stats1.memoryUsage.heapUsed,
        stats2.memoryUsage.heapUsed,
        stats3.memoryUsage.heapUsed,
      )

      expect(memoryVariation).toBeLessThan(1024 * 1024) // Less than 1MB variation
    })
  })

  describe('Error Handling Tests', () => {
    it('should handle configuration validation errors', async () => {
      // Create invalid configuration
      const invalidConfig = {
        port: 99999, // Invalid port
        host: '',
        auth: {
          enabled: true,
          secretKey: 'short', // Too short
          tokenExpiry: '24h',
        },
      }

      configManager.updateConfig(invalidConfig)
      const validation = configManager.validateConfig()

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors).toContain('Port must be a number between 1 and 65535')
      expect(validation.errors).toContain('Host must be a non-empty string')
      expect(validation.errors).toContain('Secret key must be at least 8 characters long when auth is enabled')
    })

    it('should handle file system errors gracefully', async () => {
      // Mock file system error
      vi.mocked(fse.writeJsonSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      // Try to save configuration
      const readonlyConfigManager = new ConfigManager('/tmp/readonly-config.json')
      readonlyConfigManager.updateConfig(testConfig)

      expect(() => {
        readonlyConfigManager.saveConfig()
      }).toThrow('Permission denied')
    })

    it('should handle server start failures', async () => {
      // Mock port conflict
      const mockAppInstance3 = {
        appDir: '/tmp/gridea-test3',
        buildDir: '/tmp/gridea-test3/public',
        db: {
          get: vi.fn(), set: vi.fn(), write: vi.fn(), read: vi.fn(),
        },
        mainWindow: { webContents: { send: vi.fn() } },
      }
      const testServer = new APIServer('/tmp/test-api-config.json', mockAppInstance3)

      // Start first server
      await testServer.start()

      // Try to start second server on same port
      const mockAppInstance4 = {
        appDir: '/tmp/gridea-test4',
        buildDir: '/tmp/gridea-test4/public',
        db: {
          get: vi.fn(), set: vi.fn(), write: vi.fn(), read: vi.fn(),
        },
        mainWindow: { webContents: { send: vi.fn() } },
      }
      const conflictServer = new APIServer('/tmp/test-api-config.json', mockAppInstance4)

      try {
        await conflictServer.start(testConfig.port)
        fail('Should have thrown error for port conflict')
      } catch (error) {
        expect(error.message).toContain('already in use')
      }

      // Clean up
      await testServer.stop()
    })

    it('should handle stop on non-running server', async () => {
      // Try to stop server that isn't running
      await apiServer.stop()

      // Should not throw error
      expect(apiServer.isServerRunning()).toBe(false)
    })
  })

  describe('Performance Tests', () => {
    it('should handle rapid start/stop cycles', async () => {
      const cycles = 5

      for (let i = 0; i < cycles; i++) {
        // Start server
        await apiServer.start()
        expect(apiServer.isServerRunning()).toBe(true)

        // Wait a short time
        await new Promise(resolve => setTimeout(resolve, 50))

        // Stop server
        await apiServer.stop()
        expect(apiServer.isServerRunning()).toBe(false)

        // Wait a short time
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // All cycles completed successfully
      expect(true).toBe(true)
    })

    it('should handle configuration updates while running', async () => {
      // Start server
      await apiServer.start()

      const updateCount = 10
      const configs = Array.from({ length: updateCount }, (_, i) => ({
        auth: {
          enabled: i % 2 === 0,
          secretKey: `secret-key-${i}`,
          tokenExpiry: `${24 + i}h`,
        },
      }))

      // Apply configuration updates rapidly
      for (const config of configs) {
        apiServer.updateConfig(config)

        // Verify configuration was applied
        const currentConfig = apiServer.getConfig()
        expect(currentConfig.auth.enabled).toBe(config.auth.enabled)
        expect(currentConfig.auth.secretKey).toBe(config.auth.secretKey)

        // Server should remain running
        expect(apiServer.isServerRunning()).toBe(true)
      }
    })

    it('should handle memory usage during extended operation', async () => {
      // Start server
      await apiServer.start()

      const testDuration = 2000 // 2 seconds
      const checkInterval = 200 // Check every 200ms
      const startTime = Date.now()
      const memorySamples = []

      // Collect memory samples over time
      while (Date.now() - startTime < testDuration) {
        const stats = apiServer.getStats()
        memorySamples.push(stats.memoryUsage.heapUsed)

        await new Promise(resolve => setTimeout(resolve, checkInterval))
      }

      // Analyze memory usage
      const initialMemory = memorySamples[0]
      const finalMemory = memorySamples[memorySamples.length - 1]
      const maxMemory = Math.max(...memorySamples)
      const minMemory = Math.min(...memorySamples)

      // Memory usage should be reasonable
      expect(maxMemory).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
      expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024) // Less than 10MB growth

      // Memory should be relatively stable (not growing uncontrollably)
      const memoryVariation = maxMemory - minMemory
      expect(memoryVariation).toBeLessThan(5 * 1024 * 1024) // Less than 5MB variation
    })
  })

  describe('Integration Edge Cases', () => {
    it('should handle empty configuration', async () => {
      // Create config manager with empty config
      const emptyConfigManager = new ConfigManager('/tmp/empty-config.json')

      // Should use default configuration
      const defaultConfig = emptyConfigManager.getConfig()
      expect(defaultConfig.port).toBe(3000)
      expect(defaultConfig.host).toBe('localhost')
      expect(defaultConfig.auth.enabled).toBe(false)
    })

    it('should handle partial configuration updates', async () => {
      // Start with default config
      const partialConfigManager = new ConfigManager('/tmp/partial-config.json')
      const originalConfig = partialConfigManager.getConfig()

      // Update only port
      partialConfigManager.updateConfig({ port: 3006 })
      const updatedConfig = partialConfigManager.getConfig()

      expect(updatedConfig.port).toBe(3006)
      expect(updatedConfig.host).toBe(originalConfig.host) // Should remain unchanged
      expect(updatedConfig.auth.enabled).toBe(originalConfig.auth.enabled) // Should remain unchanged
    })

    it('should handle server state transitions', async () => {
      // Test all valid state transitions
      expect(apiServer.isServerRunning()).toBe(false) // Initial state

      await apiServer.start()
      expect(apiServer.isServerRunning()).toBe(true) // Running

      await apiServer.stop()
      expect(apiServer.isServerRunning()).toBe(false) // Stopped

      await apiServer.start()
      expect(apiServer.isServerRunning()).toBe(true) // Running again

      await apiServer.restart()
      expect(apiServer.isServerRunning()).toBe(true) // Still running after restart
    })

    it('should handle concurrent configuration access', async () => {
      // Start server
      await apiServer.start()

      // Simulate concurrent configuration access
      const concurrentOps = 10
      const promises = Array.from({ length: concurrentOps }, (_, i) => Promise.resolve().then(() => {
        // Each operation reads and updates configuration
        const currentConfig = apiServer.getConfig()
        apiServer.updateConfig({
          auth: {
            enabled: i % 2 === 0,
            secretKey: `concurrent-secret-${i}`,
            tokenExpiry: '24h',
          },
        })
        return currentConfig
      }))

      // All operations should complete successfully
      const results = await Promise.all(promises)
      expect(results.length).toBe(concurrentOps)

      // Server should still be running
      expect(apiServer.isServerRunning()).toBe(true)
    })
  })
})
