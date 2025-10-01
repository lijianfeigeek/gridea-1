/**
 * Simple Configuration Integration Tests
 *
 * Basic tests for configuration management functionality
 */

import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest'
import { ConfigManager } from '@/server/api/config'
import { APIServerConfig } from '@/server/api/types'

// Import mocked modules for testing
import * as fse from 'fs-extra'

describe('Configuration Integration Tests', () => {
  let configManager: ConfigManager
  let testConfig: APIServerConfig

  beforeEach(() => {
    // Reset all mocks to ensure clean state
    vi.clearAllMocks()
    vi.mocked(fse.pathExistsSync).mockReturnValue(false)
    vi.mocked(fse.readJsonSync).mockReturnValue({})
    vi.mocked(fse.writeJsonSync).mockReturnValue(true)
    vi.mocked(fse.ensureDirSync).mockReturnValue(true)
    vi.mocked(fse.removeSync).mockReturnValue(true)
    vi.mocked(fse.copySync).mockReturnValue(true)
    vi.mocked(fse.writeFileSync).mockReturnValue(true)

    // Test configuration
    testConfig = {
      port: 3002,
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

    // Initialize config manager
    configManager = new ConfigManager('/tmp/test-api-config.json')
    configManager.updateConfig(testConfig)
  })

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid port', () => {
      configManager.updateConfig({ port: 99999 })
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(error => error.includes('Port must be a number between 1 and 65535'))).toBe(true)
    })

    it('should detect empty host', () => {
      configManager.updateConfig({ host: '' })
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(error => error.includes('Host must be a non-empty string'))).toBe(true)
    })

    it('should detect invalid CORS origin', () => {
      configManager.updateConfig({
        cors: { origin: 123, credentials: true, optionsSuccessStatus: 200 },
      })
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(error => error.includes('CORS origin must be a string or array of strings'))).toBe(true)
    })

    it('should detect short auth secret key', () => {
      configManager.updateConfig({
        auth: { enabled: true, secretKey: 'short', tokenExpiry: '24h' },
      })
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(error => error.includes('Secret key must be at least 8 characters long'))).toBe(true)
    })

    it('should detect invalid body limit format', () => {
      configManager.updateConfig({
        body: { limit: 123, extended: true },
      })
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(error => error.includes('Body limit must be a string'))).toBe(true)
    })

    it('should collect multiple validation errors', () => {
      configManager.updateConfig({
        port: 99999,
        host: '',
        cors: { origin: 123, credentials: true, optionsSuccessStatus: 200 },
        auth: { enabled: true, secretKey: 'short', tokenExpiry: '24h' },
        body: { limit: 123, extended: true },
      })
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(3)
    })
  })

  describe('Configuration Updates', () => {
    it('should update configuration partially', () => {
      configManager.updateConfig({ port: 3003 })
      const config = configManager.getConfig()
      expect(config.port).toBe(3003)
      expect(config.host).toBe(testConfig.host) // Should remain unchanged
    })

    it('should handle nested configuration updates', () => {
      configManager.updateConfig({
        auth: { enabled: true, secretKey: 'new-secret-key' },
      })
      const config = configManager.getConfig()
      expect(config.auth.enabled).toBe(true)
      expect(config.auth.secretKey).toBe('new-secret-key')
      expect(config.auth.tokenExpiry).toBe('24h') // Should remain unchanged
    })

    it('should maintain configuration consistency', () => {
      const updates = [
        { port: 3004 },
        { auth: { enabled: true, secretKey: 'consistent-secret' } },
        { logging: { level: 'debug' } },
      ]

      updates.forEach((update) => {
        configManager.updateConfig(update)
      })

      const finalConfig = configManager.getConfig()
      expect(finalConfig.port).toBe(3004)
      expect(finalConfig.auth.enabled).toBe(true)
      expect(finalConfig.auth.secretKey).toBe('consistent-secret')
      expect(finalConfig.logging.level).toBe('debug')
    })
  })

  describe('Environment Variables', () => {
    afterEach(() => {
      // Clean up environment variables
      delete process.env.API_PORT
      delete process.env.API_HOST
      delete process.env.API_AUTH_ENABLED
      delete process.env.API_AUTH_SECRET
    })

    it('should override configuration with environment variables', () => {
      process.env.API_PORT = '3005'
      process.env.API_HOST = 'env-host'
      process.env.API_AUTH_ENABLED = 'true'
      process.env.API_AUTH_SECRET = 'env-secret-key'

      const envConfig = configManager.getEnvironmentConfig()

      expect(envConfig.port).toBe(3005)
      expect(envConfig.host).toBe('env-host')
      expect(envConfig.auth.enabled).toBe(true)
      expect(envConfig.auth.secretKey).toBe('env-secret-key')
    })

    it('should parse CORS origins from environment', () => {
      process.env.API_CORS_ORIGIN = 'http://localhost:3000,http://localhost:8080'

      const envConfig = configManager.getEnvironmentConfig()

      expect(envConfig.cors.origin).toEqual([
        'http://localhost:3000',
        'http://localhost:8080',
      ])
    })

    it('should handle invalid environment variable values', () => {
      process.env.API_PORT = 'invalid-port'
      process.env.API_AUTH_ENABLED = 'yes'

      const envConfig = configManager.getEnvironmentConfig()

      // Should handle gracefully
      expect(envConfig).toBeDefined()
    })

    it('should handle missing environment variables', () => {
      const envConfig = configManager.getEnvironmentConfig()

      // Should use configuration values
      expect(envConfig.port).toBe(testConfig.port)
      expect(envConfig.host).toBe(testConfig.host)
    })
  })

  describe('Configuration Persistence', () => {
    it('should save configuration to file', () => {
      configManager.saveConfig()

      expect(fse.writeJsonSync).toHaveBeenCalledWith(
        '/tmp/test-api-config.json',
        testConfig,
        { spaces: 2 },
      )
    })

    it('should load configuration from file', () => {
      const savedConfig = {
        ...testConfig,
        port: 3006,
        auth: { enabled: true, secretKey: 'loaded-secret', tokenExpiry: '48h' },
      }

      vi.mocked(fse.pathExistsSync).mockReturnValue(true)
      vi.mocked(fse.readJsonSync).mockReturnValue(savedConfig)

      const newConfigManager = new ConfigManager('/tmp/load-test-config.json')
      const loadedConfig = newConfigManager.getConfig()

      expect(loadedConfig.port).toBe(3006)
      expect(loadedConfig.auth.enabled).toBe(true)
      expect(loadedConfig.auth.secretKey).toBe('loaded-secret')
      expect(loadedConfig.auth.tokenExpiry).toBe('48h')
    })

    it('should use default configuration when file does not exist', () => {
      vi.mocked(fse.pathExistsSync).mockReturnValue(false)

      const newConfigManager = new ConfigManager('/tmp/nonexistent-config.json')
      const defaultConfig = newConfigManager.getConfig()

      expect(defaultConfig.port).toBe(3000) // Default port
      expect(defaultConfig.host).toBe('0.0.0.0') // Default host
    })

    it('should handle file system errors gracefully', () => {
      vi.mocked(fse.pathExistsSync).mockReturnValue(true)
      vi.mocked(fse.readJsonSync).mockImplementation(() => {
        throw new Error('File read error')
      })

      const newConfigManager = new ConfigManager('/tmp/error-config.json')
      const config = newConfigManager.getConfig()

      expect(config.port).toBe(3000) // Should fall back to default
    })

    it('should handle write errors', () => {
      vi.mocked(fse.writeJsonSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => {
        configManager.saveConfig()
      }).toThrow('Permission denied')
    })
  })

  describe('Configuration Migration', () => {
    it('should handle configuration with missing fields', () => {
      const partialConfig = {
        port: 3007,
        host: 'localhost',
        // Missing other fields
      }

      vi.mocked(fse.pathExistsSync).mockReturnValue(true)
      vi.mocked(fse.readJsonSync).mockReturnValue(partialConfig)

      const migrationConfigManager = new ConfigManager('/tmp/migration-config.json')
      const migratedConfig = migrationConfigManager.getConfig()

      expect(migratedConfig.port).toBe(3007)
      expect(migratedConfig.host).toBe('localhost')
      expect(migratedConfig.auth).toBeDefined() // Should have default auth
      expect(migratedConfig.cors).toBeDefined() // Should have default CORS
      expect(migratedConfig.body).toBeDefined() // Should have default body config
      expect(migratedConfig.logging).toBeDefined() // Should have default logging
    })

    it('should handle configuration with unknown fields', () => {
      const futureConfig = {
        ...testConfig,
        port: 3008,
        futureFeature: {
          enabled: true,
          config: 'future-value',
        },
      }

      vi.mocked(fse.pathExistsSync).mockReturnValue(true)
      vi.mocked(fse.readJsonSync).mockReturnValue(futureConfig)

      const futureConfigManager = new ConfigManager('/tmp/future-config.json')
      const config = futureConfigManager.getConfig()

      expect(config.port).toBe(3008)
      expect(config.auth).toBeDefined() // Should still have standard fields
    })
  })

  describe('Performance Tests', () => {
    it('should handle rapid validation operations', () => {
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        configManager.validateConfig()
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // Less than 1 second
    })

    it('should handle rapid configuration updates', () => {
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        configManager.updateConfig({
          port: 3009 + (i % 100),
          auth: {
            enabled: i % 2 === 0,
            secretKey: `perf-secret-${i}`,
            tokenExpiry: '24h',
          },
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // Less than 1 second
    })

    it('should handle concurrent configuration operations', async () => {
      const concurrentOps = 10
      const promises = Array.from({ length: concurrentOps }, (_, i) => Promise.resolve().then(() => {
        configManager.updateConfig({
          auth: {
            enabled: i % 2 === 0,
            secretKey: `concurrent-secret-${i}`,
            tokenExpiry: '24h',
          },
        })
        return configManager.getConfig()
      }))

      const results = await Promise.all(promises)
      expect(results.length).toBe(concurrentOps)

      // Final configuration should be valid
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(true)
    })
  })
})
