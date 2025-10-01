/**
 * Configuration Integration Tests
 *
 * This test suite focuses on testing the configuration management system
 * with proper mocking and integration testing.
 */

import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest'
import { ConfigManager } from '@/server/api/config'
import { APIServerConfig } from '@/server/api/types'

// Mock fs-extra with consistent behavior from setup.ts
vi.mock('fs-extra', () => {
  const fsExtraMock = {
    pathExistsSync: vi.fn(),
    readJsonSync: vi.fn(),
    writeJsonSync: vi.fn(),
    ensureDirSync: vi.fn(),
    removeSync: vi.fn(),
    copySync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    mkdirsSync: vi.fn(),
    outputFileSync: vi.fn(),
    readJSONSync: vi.fn(),
    writeJSONSync: vi.fn(),
  }

  // Export both default and named exports for compatibility
  return {
    default: fsExtraMock,
    ...fsExtraMock,
  }
})

// Get the mocked module for test control
const fsExtra = await import('fs-extra')

describe('Configuration Integration Tests', () => {
  let configManager: ConfigManager
  let testConfig: APIServerConfig

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

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

    // Setup default mock behaviors using the mocked fs-extra
    vi.mocked(fsExtra).pathExistsSync.mockReturnValue(false)
    vi.mocked(fsExtra).ensureDirSync.mockReturnValue(true)
    vi.mocked(fsExtra).writeJsonSync.mockReturnValue(true)

    // Initialize config manager
    configManager = new ConfigManager('/tmp/test-api-config.json')
  })

  describe('Configuration Validation Tests', () => {
    it('should validate correct configuration', () => {
      configManager.updateConfig(testConfig)
      const validation = configManager.validateConfig()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid port numbers', () => {
      const invalidPorts = [-1, 0, 65536, 99999, 'invalid', null, undefined]

      invalidPorts.forEach((port) => {
        const invalidConfig = { ...testConfig, port }
        configManager.updateConfig(invalidConfig)
        const validation = configManager.validateConfig()

        expect(validation.valid).toBe(false)
        expect(validation.errors.some(error => error.includes('Port must be a number between 1 and 65535'))).toBe(true)
      })
    })

    it('should validate port boundaries', () => {
      // Test minimum valid port
      const minPortConfig = { ...testConfig, port: 1 }
      configManager.updateConfig(minPortConfig)
      let validation = configManager.validateConfig()
      expect(validation.valid).toBe(true)

      // Test maximum valid port
      const maxPortConfig = { ...testConfig, port: 65535 }
      configManager.updateConfig(maxPortConfig)
      validation = configManager.validateConfig()
      expect(validation.valid).toBe(true)
    })

    it('should validate host is not empty', () => {
      const invalidHosts = ['', '   ', null, undefined]

      invalidHosts.forEach((host) => {
        const invalidConfig = { ...testConfig, host }
        configManager.updateConfig(invalidConfig)
        const validation = configManager.validateConfig()

        expect(validation.valid).toBe(false)
        expect(validation.errors.some(error => error.includes('Host must be a non-empty string'))).toBe(true)
      })
    })

    it('should validate CORS origin format', () => {
      const validOrigins = [
        ['http://localhost:3000'],
        'http://localhost:3000',
        ['http://localhost:3000', 'http://localhost:8080'],
        '*',
      ]

      validOrigins.forEach((origin) => {
        const validConfig = { ...testConfig, cors: { ...testConfig.cors, origin } }
        configManager.updateConfig(validConfig)
        const validation = configManager.validateConfig()

        expect(validation.valid).toBe(true)
      })

      const invalidOrigins = [123, {}, [], null, undefined]

      invalidOrigins.forEach((origin) => {
        const invalidConfig = { ...testConfig, cors: { ...testConfig.cors, origin } }
        configManager.updateConfig(invalidConfig)
        const validation = configManager.validateConfig()

        expect(validation.valid).toBe(false)
        expect(validation.errors.some(error => error.includes('CORS origin must be a string or array of strings'))).toBe(true)
      })
    })

    it('should validate auth secret key length when enabled', () => {
      const shortSecrets = ['', 'a', 'abc', '1234567'] // All less than 8 characters

      shortSecrets.forEach((secret) => {
        const invalidConfig = {
          ...testConfig,
          auth: {
            enabled: true,
            secretKey: secret,
            tokenExpiry: '24h',
          },
        }
        configManager.updateConfig(invalidConfig)
        const validation = configManager.validateConfig()

        expect(validation.valid).toBe(false)
        expect(validation.errors.some(error => error.includes('Secret key must be at least 8 characters long'))).toBe(true)
      })

      // Valid secret key
      const validConfig = {
        ...testConfig,
        auth: {
          enabled: true,
          secretKey: 'valid-secret-key',
          tokenExpiry: '24h',
        },
      }
      configManager.updateConfig(validConfig)
      const validation = configManager.validateConfig()

      expect(validation.valid).toBe(true)
    })

    it('should validate body limit format', () => {
      const validLimits = ['10mb', '1kb', '100b', '50gb']
      const invalidLimits = [123, {}, [], null, undefined, '']

      validLimits.forEach((limit) => {
        const validConfig = { ...testConfig, body: { ...testConfig.body, limit } }
        configManager.updateConfig(validConfig)
        const validation = configManager.validateConfig()

        expect(validation.valid).toBe(true)
      })

      invalidLimits.forEach((limit) => {
        const invalidConfig = { ...testConfig, body: { ...testConfig.body, limit } }
        configManager.updateConfig(invalidConfig)
        const validation = configManager.validateConfig()

        expect(validation.valid).toBe(false)
        expect(validation.errors.some(error => error.includes('Body limit must be a string'))).toBe(true)
      })
    })

    it('should collect all validation errors', () => {
      const completelyInvalidConfig = {
        port: 99999,
        host: '',
        cors: { origin: 123 },
        auth: { enabled: true, secretKey: 'short', tokenExpiry: '24h' },
        body: { limit: 123, extended: true },
        logging: { level: 'info', format: 'json' },
      }

      configManager.updateConfig(completelyInvalidConfig)
      const validation = configManager.validateConfig()

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(3) // Should have multiple errors
      expect(validation.errors).toContain('Port must be a number between 1 and 65535')
      expect(validation.errors).toContain('Host must be a non-empty string')
      expect(validation.errors).toContain('CORS origin must be a string or array of strings')
      expect(validation.errors).toContain('Secret key must be at least 8 characters long when auth is enabled')
      expect(validation.errors).toContain('Body limit must be a string')
    })
  })

  describe('Configuration Persistence Tests', () => {
    it('should save configuration to file', () => {
      configManager.updateConfig(testConfig)
      configManager.saveConfig()

      expect(vi.mocked(fsExtra).writeJsonSync).toHaveBeenCalledWith(
        '/tmp/test-api-config.json',
        expect.objectContaining({
          port: testConfig.port,
          host: testConfig.host,
        }),
        { spaces: 2 },
      )
    })

    it('should load configuration from file when it exists', () => {
      const savedConfig = {
        ...testConfig,
        port: 3003,
        auth: {
          enabled: true,
          secretKey: 'saved-secret-key',
          tokenExpiry: '48h',
        },
      }

      mockFs.pathExistsSync.mockReturnValue(true)
      mockFs.readJsonSync.mockReturnValue(savedConfig)

      const newConfigManager = new ConfigManager('/tmp/test-api-config.json')
      const loadedConfig = newConfigManager.getConfig()

      expect(loadedConfig.port).toBe(3003)
      expect(loadedConfig.auth.enabled).toBe(true)
      expect(loadedConfig.auth.secretKey).toBe('saved-secret-key')
      expect(loadedConfig.auth.tokenExpiry).toBe('48h')
    })

    it('should use default configuration when file does not exist', () => {
      vi.mocked(fsExtra).pathExistsSync.mockReturnValue(false)

      const newConfigManager = new ConfigManager('/tmp/nonexistent-config.json')
      const defaultConfig = newConfigManager.getConfig()

      expect(defaultConfig.port).toBe(3000) // Default port
      expect(defaultConfig.host).toBe('localhost') // Default host
      expect(defaultConfig.auth.enabled).toBe(false) // Default auth disabled
    })

    it('should handle file system errors gracefully', () => {
      vi.mocked(fsExtra).pathExistsSync.mockReturnValue(true)
      vi.mocked(fsExtra).readJsonSync.mockImplementation(() => {
        throw new Error('File read error')
      })

      // Should not throw error, should use defaults
      const newConfigManager = new ConfigManager('/tmp/error-config.json')
      const config = newConfigManager.getConfig()

      expect(config.port).toBe(3000) // Should fall back to default
    })

    it('should handle write errors gracefully', () => {
      vi.mocked(fsExtra).writeJsonSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => {
        configManager.saveConfig()
      }).toThrow('Permission denied')
    })
  })

  describe('Configuration Update Tests', () => {
    it('should update configuration partially', () => {
      configManager.updateConfig(testConfig)

      // Update only port
      configManager.updateConfig({ port: 3004 })
      const config = configManager.getConfig()

      expect(config.port).toBe(3004)
      expect(config.host).toBe(testConfig.host) // Should remain unchanged
      expect(config.auth.enabled).toBe(testConfig.auth.enabled) // Should remain unchanged

      // Update only auth
      configManager.updateConfig({
        auth: {
          enabled: true,
          secretKey: 'new-secret-key',
          tokenExpiry: '12h',
        },
      })

      const updatedConfig = configManager.getConfig()
      expect(updatedConfig.port).toBe(3004) // Should remain changed
      expect(updatedConfig.auth.enabled).toBe(true)
      expect(updatedConfig.auth.secretKey).toBe('new-secret-key')
      expect(updatedConfig.auth.tokenExpiry).toBe('12h')
    })

    it('should merge configuration with defaults', () => {
      // Start with empty config
      vi.mocked(fsExtra).pathExistsSync.mockReturnValue(false)
      const minimalConfigManager = new ConfigManager('/tmp/minimal-config.json')

      // Update with partial config
      minimalConfigManager.updateConfig({
        port: 3005,
        auth: {
          enabled: true,
          secretKey: 'minimal-secret',
        },
      })

      const config = minimalConfigManager.getConfig()

      expect(config.port).toBe(3005)
      expect(config.host).toBe('localhost') // Default value
      expect(config.auth.enabled).toBe(true)
      expect(config.auth.secretKey).toBe('minimal-secret')
      expect(config.auth.tokenExpiry).toBe('24h') // Default value
      expect(config.cors).toBeDefined() // Should have default CORS
      expect(config.body).toBeDefined() // Should have default body config
      expect(config.logging).toBeDefined() // Should have default logging config
    })

    it('should handle nested object updates', () => {
      configManager.updateConfig(testConfig)

      // Update nested cors configuration
      configManager.updateConfig({
        cors: {
          origin: ['http://localhost:3000'],
          credentials: false,
        },
      })

      const config = configManager.getConfig()
      expect(config.cors.origin).toEqual(['http://localhost:3000'])
      expect(config.cors.credentials).toBe(false)
      expect(config.cors.optionsSuccessStatus).toBe(200) // Should remain unchanged

      // Update nested auth configuration
      configManager.updateConfig({
        auth: {
          enabled: true,
          secretKey: 'nested-secret-key',
        },
      })

      const updatedConfig = configManager.getConfig()
      expect(updatedConfig.auth.enabled).toBe(true)
      expect(updatedConfig.auth.secretKey).toBe('nested-secret-key')
      expect(updatedConfig.auth.tokenExpiry).toBe('24h') // Should remain unchanged
    })

    it('should handle configuration updates with validation', () => {
      configManager.updateConfig(testConfig)

      // Try to update with invalid configuration
      expect(() => {
        configManager.updateConfig({ port: 99999 })
      }).not.toThrow() // Should not throw, but validation should fail

      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(false)
    })

    it('should maintain configuration consistency', () => {
      configManager.updateConfig(testConfig)

      // Apply multiple updates
      const updates = [
        { port: 3006 },
        { auth: { enabled: true, secretKey: 'consistent-secret' } },
        { logging: { level: 'debug' } },
        { cors: { origin: ['http://localhost:3000'] } },
      ]

      updates.forEach((update) => {
        configManager.updateConfig(update)
      })

      const finalConfig = configManager.getConfig()

      expect(finalConfig.port).toBe(3006)
      expect(finalConfig.auth.enabled).toBe(true)
      expect(finalConfig.auth.secretKey).toBe('consistent-secret')
      expect(finalConfig.logging.level).toBe('debug')
      expect(finalConfig.cors.origin).toEqual(['http://localhost:3000'])
    })
  })

  describe('Environment Variable Tests', () => {
    afterEach(() => {
      // Clean up environment variables
      delete process.env.API_PORT
      delete process.env.API_HOST
      delete process.env.API_CORS_ORIGIN
      delete process.env.API_AUTH_ENABLED
      delete process.env.API_AUTH_SECRET
      delete process.env.API_LOG_LEVEL
    })

    it('should override configuration with environment variables', () => {
      process.env.API_PORT = '3007'
      process.env.API_HOST = 'env-host'
      process.env.API_AUTH_ENABLED = 'true'
      process.env.API_AUTH_SECRET = 'env-secret-key'

      const envConfig = configManager.getEnvironmentConfig()

      expect(envConfig.port).toBe(3007)
      expect(envConfig.host).toBe('env-host')
      expect(envConfig.auth.enabled).toBe(true)
      expect(envConfig.auth.secretKey).toBe('env-secret-key')
    })

    it('should parse environment variable values correctly', () => {
      process.env.API_PORT = '3008'
      process.env.API_AUTH_ENABLED = 'false'
      process.env.API_CORS_ORIGIN = 'http://localhost:3000,http://localhost:8080'

      const envConfig = configManager.getEnvironmentConfig()

      expect(envConfig.port).toBe(3008)
      expect(envConfig.auth.enabled).toBe(false)
      expect(envConfig.cors.origin).toEqual([
        'http://localhost:3000',
        'http://localhost:8080',
      ])
    })

    it('should handle invalid environment variable values gracefully', () => {
      process.env.API_PORT = 'invalid-port' // Not a number
      process.env.API_AUTH_ENABLED = 'yes' // Not a boolean
      process.env.API_LOG_LEVEL = 'invalid-level' // Not a valid log level

      const envConfig = configManager.getEnvironmentConfig()

      // Should not crash, but should handle gracefully
      expect(envConfig).toBeDefined()
      expect(envConfig.port).toBe(NaN) // Will be NaN for invalid number
      expect(envConfig.auth.enabled).toBe(false) // Will be false for invalid boolean
      expect(envConfig.logging.level).toBe('info') // Will remain default
    })

    it('should handle missing environment variables', () => {
      // Don't set any environment variables
      const envConfig = configManager.getEnvironmentConfig()

      // Should use configuration values
      expect(envConfig.port).toBe(testConfig.port)
      expect(envConfig.host).toBe(testConfig.host)
      expect(envConfig.auth.enabled).toBe(testConfig.auth.enabled)
    })

    it('should handle partial environment variable overrides', () => {
      process.env.API_PORT = '3009'
      // Only override port, other env vars not set

      const envConfig = configManager.getEnvironmentConfig()

      expect(envConfig.port).toBe(3009)
      expect(envConfig.host).toBe(testConfig.host) // Should remain from config
      expect(envConfig.auth.enabled).toBe(testConfig.auth.enabled) // Should remain from config
    })

    it('should prioritize environment variables over file configuration', () => {
      // Set environment variables
      process.env.API_PORT = '3010'
      process.env.API_HOST = 'env-priority-host'

      const envConfig = configManager.getEnvironmentConfig()

      expect(envConfig.port).toBe(3010) // From environment
      expect(envConfig.host).toBe('env-priority-host') // From environment
    })
  })

  describe('Configuration Integration Tests', () => {
    it('should handle configuration migration scenarios', () => {
      // Simulate old configuration format with missing fields
      const oldConfig = {
        port: 3011,
        host: 'localhost',
        // Missing new fields like auth, cors, etc.
      }

      vi.mocked(fsExtra).pathExistsSync.mockReturnValue(true)
      vi.mocked(fsExtra).readJsonSync.mockReturnValue(oldConfig)

      const migrationConfigManager = new ConfigManager('/tmp/migration-config.json')
      const migratedConfig = migrationConfigManager.getConfig()

      // Should merge with defaults
      expect(migratedConfig.port).toBe(3011)
      expect(migratedConfig.host).toBe('localhost')
      expect(migratedConfig.auth).toBeDefined() // Should have default auth
      expect(migratedConfig.cors).toBeDefined() // Should have default CORS
      expect(migratedConfig.body).toBeDefined() // Should have default body config
      expect(migratedConfig.logging).toBeDefined() // Should have default logging
    })

    it('should handle configuration version compatibility', () => {
      // Simulate configuration with future/unknown fields
      const futureConfig = {
        ...testConfig,
        port: 3012,
        futureFeature: {
          enabled: true,
          config: 'future-value',
        },
      }

      vi.mocked(fsExtra).pathExistsSync.mockReturnValue(true)
      vi.mocked(fsExtra).readJsonSync.mockReturnValue(futureConfig)

      const futureConfigManager = new ConfigManager('/tmp/future-config.json')
      const config = futureConfigManager.getConfig()

      // Should handle gracefully
      expect(config.port).toBe(3012)
      expect(config.auth).toBeDefined() // Should still have standard fields
    })

    it('should handle concurrent configuration access', async () => {
      configManager.updateConfig(testConfig)

      // Simulate concurrent configuration operations
      const concurrentOps = 10
      const promises = Array.from({ length: concurrentOps }, (_, i) => Promise.resolve().then(() => {
        // Each operation reads and updates configuration
        const currentConfig = configManager.getConfig()
        configManager.updateConfig({
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

      // Final configuration should be valid
      const validation = configManager.validateConfig()
      expect(validation.valid).toBe(true)
    })

    it('should handle configuration validation performance', () => {
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        configManager.validateConfig()
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete quickly (less than 1 second for 1000 validations)
      expect(duration).toBeLessThan(1000)
    })

    it('should handle configuration update performance', () => {
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        configManager.updateConfig({
          port: 3013 + (i % 100),
          auth: {
            enabled: i % 2 === 0,
            secretKey: `perf-secret-${i}`,
            tokenExpiry: '24h',
          },
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete quickly (less than 1 second for 1000 updates)
      expect(duration).toBeLessThan(1000)
    })
  })
})
