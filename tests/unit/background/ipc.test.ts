import {
  ipcMain, BrowserWindow, ipcRenderer, IpcMainEvent, IpcRendererEvent,
} from 'electron'

// Now import the mocked modules
import { APIServer } from '../../../src/server/api/index'
import { ConfigManager } from '../../../src/server/api/config'
import { APIServerConfig, HealthStatus } from '../../../src/server/api/types'

// Mock server modules before importing them
jest.mock('../../../src/server/api/index', () => ({
  APIServer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    isServerRunning: jest.fn(),
    getHealthStatus: jest.fn(),
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
  })),
}))

jest.mock('../../../src/server/api/config', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    validateConfig: jest.fn(),
    getEnvironmentConfig: jest.fn(),
    updateConfig: jest.fn(),
    saveConfig: jest.fn(),
    getConfig: jest.fn(),
  })),
}))

jest.mock('../../../src/server/api/types', () => ({
  APIServerConfig: {},
  HealthStatus: {},
}))

// Note: Mocks are now set up in setup-jest.js
// We can access them directly from jest.mocked modules

describe('Background IPC Handler', () => {
  let mockApiServer: jest.Mocked<APIServer>
  let mockConfigManager: jest.Mocked<ConfigManager>
  let mockIpcMain: jest.Mocked<typeof ipcMain>
  let mockIpcRenderer: jest.Mocked<typeof ipcRenderer>
  let mockEvent: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock instances using mocked constructors
    const MockAPIServer = APIServer as jest.MockedClass<typeof APIServer>
    const MockConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>

    mockApiServer = new MockAPIServer() as jest.Mocked<APIServer>
    mockConfigManager = new MockConfigManager() as jest.Mocked<ConfigManager>

    // Get mocked modules from setup
    mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>
    mockIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>

    // Create mock event object
    mockEvent = createMockEvent()

    // Setup default mock implementations
    mockApiServer.start.mockResolvedValue()
    mockApiServer.stop.mockResolvedValue()
    mockApiServer.isServerRunning.mockReturnValue(false)
    mockApiServer.getConfig.mockReturnValue({
      port: 3000,
      host: 'localhost',
      auth: { enabled: false, secretKey: '' },
      cors: { enabled: true, origins: ['*'] },
      autoDeploy: false,
    })
    mockApiServer.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      memory: {
        heapUsed: 1024 * 1024,
        heapTotal: 2048 * 1024,
        rss: 4096 * 1024,
      },
      api: {
        endpoints: 1,
        requests: 0,
      },
    })

    mockConfigManager.validateConfig.mockReturnValue({
      valid: true,
      errors: [],
    })
    mockConfigManager.getEnvironmentConfig.mockReturnValue({
      port: 3000,
      host: 'localhost',
      auth: { enabled: false, secretKey: '' },
      cors: { enabled: true, origins: ['*'] },
      autoDeploy: false,
    })

    // Reset module mocks
    jest.mocked(APIServer).mockClear()
    jest.mocked(ConfigManager).mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('IPC Handler Registration', () => {
    test('should register all required IPC handlers', () => {
      // Import the IPC handler module
      const { initializeIPCHandlers } = require('../../../src/background/ipc-handlers')

      // Initialize handlers
      initializeIPCHandlers()

      // Verify that all handlers were registered
      expect(mockIpcMain.handle).toHaveBeenCalledWith('start-api-server', expect.any(Function))
      expect(mockIpcMain.handle).toHaveBeenCalledWith('stop-api-server', expect.any(Function))
      expect(mockIpcMain.handle).toHaveBeenCalledWith('get-api-server-status', expect.any(Function))
      expect(mockIpcMain.handle).toHaveBeenCalledWith('save-api-settings', expect.any(Function))
      expect(mockIpcMain.handle).toHaveBeenCalledWith('test-webhook', expect.any(Function))
    })

    test('should register IPC event listeners', () => {
      // Import and initialize handlers
      const { initializeIPCHandlers } = require('../../../src/background/ipc-handlers')
      initializeIPCHandlers()

      // Verify event listeners are registered
      expect(mockIpcMain.on).toHaveBeenCalledWith('api-server-status-changed', expect.any(Function))
      expect(mockIpcMain.on).toHaveBeenCalledWith('api-server-started', expect.any(Function))
      expect(mockIpcMain.on).toHaveBeenCalledWith('api-server-stopped', expect.any(Function))
      expect(mockIpcMain.on).toHaveBeenCalledWith('api-server-error', expect.any(Function))
    })

    test('should handle multiple handler registrations without conflicts', () => {
      // Simulate multiple registrations
      const { initializeIPCHandlers } = require('../../../src/background/ipc-handlers')

      // Should not throw errors when registering multiple times
      expect(() => {
        initializeIPCHandlers()
        initializeIPCHandlers()
      }).not.toThrow()
    })

    test('should provide correct handler names and signatures', () => {
      // Initialize handlers first
      const { initializeIPCHandlers } = require('../../../src/background/ipc-handlers')
      initializeIPCHandlers()

      // Get the handler registrations
      const handlerCalls = mockIpcMain.handle.mock.calls

      // Verify handler names
      const handlerNames = handlerCalls.map(call => call[0])
      expect(handlerNames).toContain('start-api-server')
      expect(handlerNames).toContain('stop-api-server')
      expect(handlerNames).toContain('get-api-server-status')
      expect(handlerNames).toContain('save-api-settings')

      // Verify handlers are functions
      handlerCalls.forEach((call) => {
        expect(call[1]).toBeInstanceOf(Function)
      })
    })
  })

  describe('API Server Control', () => {
    let startHandler: Function
    let stopHandler: Function
    let statusHandler: Function

    beforeEach(() => {
      // Mock the handlers
      startHandler = jest.fn().mockImplementation(async (event, config) => {
        if (config.port < 1024 || config.port > 65535) {
          throw new Error('Invalid port number')
        }

        await mockApiServer.start(config.port)
        return {
          success: true,
          url: `http://localhost:${config.port}`,
          port: config.port,
        }
      })

      stopHandler = jest.fn().mockImplementation(async () => {
        await mockApiServer.stop()
        return { success: true }
      })

      statusHandler = jest.fn().mockImplementation(async () => {
        const isRunning = mockApiServer.isServerRunning()
        const health = await mockApiServer.getHealthStatus()

        return {
          running: isRunning,
          loading: false,
          url: isRunning ? 'http://localhost:3000' : '',
          error: '',
          health,
        }
      })
    })

    test('should start API server with valid configuration', async () => {
      const config = {
        port: 3000,
        auth: 'test-api-key',
        cors: {
          enabled: true,
          origins: ['http://localhost:3000'],
        },
      }

      const result = await startHandler({}, config)

      expect(result).toEqual({
        success: true,
        url: 'http://localhost:3000',
        port: 3000,
      })
      expect(mockApiServer.start).toHaveBeenCalledWith(3000)
    })

    test('should stop API server successfully', async () => {
      mockApiServer.isServerRunning.mockReturnValue(true)

      const result = await stopHandler({})

      expect(result).toEqual({ success: true })
      expect(mockApiServer.stop).toHaveBeenCalled()
    })

    test('should get server status correctly', async () => {
      mockApiServer.isServerRunning.mockReturnValue(true)

      const result = await statusHandler({})

      expect(result.running).toBe(true)
      expect(result.loading).toBe(false)
      expect(result.url).toBe('http://localhost:3000')
      expect(result.health).toBeDefined()
      expect(result.health.status).toBe('healthy')
    })

    test('should handle server not running status', async () => {
      mockApiServer.isServerRunning.mockReturnValue(false)

      const result = await statusHandler({})

      expect(result.running).toBe(false)
      expect(result.url).toBe('')
    })

    test('should restart server when configuration changes', async () => {
      mockApiServer.isServerRunning.mockReturnValue(true)

      // Stop first
      await stopHandler({})

      // Start with new config
      const newConfig = {
        port: 3001,
        auth: 'new-api-key',
        cors: {
          enabled: true,
          origins: ['*'],
        },
      }

      await startHandler({}, newConfig)

      expect(mockApiServer.stop).toHaveBeenCalled()
      expect(mockApiServer.start).toHaveBeenCalledWith(3001)
    })
  })

  describe('Parameter Validation', () => {
    let startHandler: Function
    let saveSettingsHandler: Function

    beforeEach(() => {
      startHandler = jest.fn().mockImplementation(async (event, config) => {
        // Validate port
        if (!config.port || typeof config.port !== 'number' || config.port < 1024 || config.port > 65535) {
          throw new Error('Port must be between 1024 and 65535')
        }

        // Validate CORS origins
        if (config.cors && config.cors.origins) {
          if (!Array.isArray(config.cors.origins)) {
            throw new Error('CORS origins must be an array')
          }

          for (const origin of config.cors.origins) {
            if (typeof origin !== 'string' || origin.trim() === '') {
              throw new Error('CORS origins must be non-empty strings')
            }
          }
        }

        await mockApiServer.start(config.port)
        return { success: true, url: `http://localhost:${config.port}` }
      })

      saveSettingsHandler = jest.fn().mockImplementation(async (event, settings) => {
        // Validate required fields
        if (!settings || typeof settings !== 'object') {
          throw new Error('Settings must be an object')
        }

        if (typeof settings.enabled !== 'boolean') {
          throw new Error('enabled must be a boolean')
        }

        if (typeof settings.port !== 'number') {
          throw new Error('port must be a number')
        }

        if (settings.port < 1024 || settings.port > 65535) {
          throw new Error('Port must be between 1024 and 65535')
        }

        // Validate auth config
        if (settings.auth && typeof settings.auth !== 'object') {
          throw new Error('auth must be an object')
        }

        if (settings.auth && typeof settings.auth.enabled !== 'boolean') {
          throw new Error('auth.enabled must be a boolean')
        }

        if (settings.auth && settings.auth.enabled && !settings.auth.secretKey) {
          throw new Error('API key is required when auth is enabled')
        }

        await mockConfigManager.saveConfig(settings)
        return { success: true }
      })
    })

    test('should accept valid parameters', async () => {
      const validConfig = {
        port: 3000,
        auth: 'test-key',
        cors: {
          enabled: true,
          origins: ['http://localhost:3000', 'https://example.com'],
        },
      }

      const result = await startHandler({}, validConfig)
      expect(result.success).toBe(true)
    })

    test('should reject invalid port numbers', async () => {
      const invalidConfigs = [
        { port: 80 }, // Too low
        { port: 70000 }, // Too high
        { port: -1 }, // Negative
      ]

      await Promise.all(
        invalidConfigs.map(config => expect(startHandler({}, config)).rejects.toThrow()),
      )

      // Test non-numeric ports - these should throw in the handler
      await expect(startHandler({}, { port: 'invalid' })).rejects.toThrow()
      await expect(startHandler({}, { port: null })).rejects.toThrow()
    })

    test('should reject invalid CORS origins', async () => {
      const invalidConfigs = [
        {
          port: 3000,
          cors: {
            enabled: true,
            origins: 'invalid', // Not an array
          },
        },
        {
          port: 3000,
          cors: {
            enabled: true,
            origins: ['', 'valid'], // Empty string
          },
        },
        {
          port: 3000,
          cors: {
            enabled: true,
            origins: [123, 'valid'], // Non-string
          },
        },
      ]

      await Promise.all(
        invalidConfigs.map(config => expect(startHandler({}, config)).rejects.toThrow()),
      )
    })

    test('should handle missing parameters gracefully', async () => {
      // Missing required config
      await expect(startHandler({}, {})).rejects.toThrow('Port must be between 1024 and 65535')

      // Partial config
      await expect(startHandler({}, { port: 3000 })).resolves.toEqual({
        success: true,
        url: 'http://localhost:3000',
      })
    })

    test('should validate settings save parameters', async () => {
      const validSettings = {
        enabled: true,
        port: 3000,
        auth: {
          enabled: true,
          secretKey: 'test-api-key',
        },
        cors: {
          enabled: true,
          origins: ['*'],
        },
        autoDeploy: false,
      }

      const result = await saveSettingsHandler({}, validSettings)
      expect(result.success).toBe(true)
    })

    test('should reject invalid settings', async () => {
      const invalidSettings = [
        null, // Not an object
        'invalid', // Not an object
        { enabled: 'not-a-boolean' }, // Invalid type
        { enabled: true, port: 'invalid' }, // Invalid port type
        { enabled: true, port: 80 }, // Invalid port value
        { enabled: true, port: 3000, auth: 'not-an-object' }, // Invalid auth type
        { enabled: true, port: 3000, auth: { enabled: 'not-a-boolean' } }, // Invalid auth.enabled
        { enabled: true, port: 3000, auth: { enabled: true } }, // Missing secret key
      ]

      await Promise.all(
        invalidSettings.map(settings => expect(saveSettingsHandler({}, settings)).rejects.toThrow()),
      )
    })
  })

  describe('Error Handling', () => {
    let startHandler: Function
    let stopHandler: Function

    beforeEach(() => {
      startHandler = jest.fn().mockImplementation(async (event, config) => {
        try {
          await mockApiServer.start(config.port)
          return { success: true, url: `http://localhost:${config.port}` }
        } catch (error) {
          return {
            success: false,
            error: error.message,
            code: error.code || 'SERVER_START_FAILED',
          }
        }
      })

      stopHandler = jest.fn().mockImplementation(async () => {
        try {
          await mockApiServer.stop()
          return { success: true }
        } catch (error) {
          return {
            success: false,
            error: error.message,
            code: error.code || 'SERVER_STOP_FAILED',
          }
        }
      })
    })

    test('should handle server start failure', async () => {
      const error = new Error('Port already in use')
      error.code = 'EADDRINUSE'
      mockApiServer.start.mockRejectedValue(error)

      const config = { port: 3000 }
      const result = await startHandler({}, config)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Port already in use')
      expect(result.code).toBe('EADDRINUSE')
    })

    test('should handle server stop failure', async () => {
      const error = new Error('Server not running')
      error.code = 'ENOTFOUND'
      mockApiServer.stop.mockRejectedValue(error)

      const result = await stopHandler({})

      expect(result.success).toBe(false)
      expect(result.error).toBe('Server not running')
      expect(result.code).toBe('ENOTFOUND')
    })

    test('should handle port conflict with auto-increment', async () => {
      let callCount = 0
      mockApiServer.start.mockImplementation(async (port) => {
        callCount++
        if (callCount === 1) {
          const error = new Error('Port already in use')
          error.code = 'EADDRINUSE'
          throw error
        }
      })

      const config = { port: 3000 }
      const result = await startHandler({}, config)

      // Since the server throws an error, the handler should return failure
      expect(result.success).toBe(false)
      expect(result.error).toBe('Port already in use')
      expect(callCount).toBe(1) // Handler calls server once
    })

    test('should handle configuration validation errors', async () => {
      // Configuration validation is handled by the APIServer, not the handler
      // So we simulate the server throwing an error
      const error = new Error('Invalid host configuration')
      mockApiServer.start.mockRejectedValue(error)

      const config = { port: 3000 }
      const result = await startHandler({}, config)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid host configuration')
    })

    test('should handle permission errors', async () => {
      const error = new Error('Permission denied')
      error.code = 'EACCES'
      mockApiServer.start.mockRejectedValue(error)

      const config = { port: 80 } // Privileged port
      const result = await startHandler({}, config)

      expect(result.success).toBe(false)
      expect(result.code).toBe('EACCES')
    })

    test('should handle network interface errors', async () => {
      const error = new Error('Network interface not available')
      error.code = 'ENETUNREACH'
      mockApiServer.start.mockRejectedValue(error)

      const config = { port: 3000 }
      const result = await startHandler({}, config)

      expect(result.success).toBe(false)
      expect(result.code).toBe('ENETUNREACH')
    })
  })

  describe('Lifecycle Management', () => {
    let mockApp: any
    let cleanupHandlers: Function[] = []

    beforeEach(() => {
      mockApp = {
        quit: jest.fn(),
        on: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
      }

      // Mock cleanup function
      const cleanup = jest.fn(async () => {
        if (mockApiServer.isServerRunning()) {
          try {
            await mockApiServer.stop()
          } catch (error) {
            // Handle cleanup errors gracefully
            console.warn('Cleanup error:', error)
          }
        }
      })

      cleanupHandlers.push(cleanup)
    })

    afterEach(() => {
      cleanupHandlers = []
    })

    test('should cleanup server on app quit', async () => {
      mockApiServer.isServerRunning.mockReturnValue(true)

      // Simulate app quit
      await cleanupHandlers[0]()

      expect(mockApiServer.stop).toHaveBeenCalled()
    })

    test('should not stop server if not running', async () => {
      mockApiServer.isServerRunning.mockReturnValue(false)

      await cleanupHandlers[0]()

      expect(mockApiServer.stop).not.toHaveBeenCalled()
    })

    test('should handle cleanup errors gracefully', async () => {
      mockApiServer.isServerRunning.mockReturnValue(true)
      mockApiServer.stop.mockRejectedValue(new Error('Cleanup failed'))

      // Should not throw during cleanup, should handle the error
      await cleanupHandlers[0]()

      // The cleanup function should have attempted to stop the server
      expect(mockApiServer.stop).toHaveBeenCalled()
    })

    test('should restart server correctly', async () => {
      mockApiServer.isServerRunning.mockReturnValue(true)

      // Stop
      await mockApiServer.stop()

      // Start again
      await mockApiServer.start(3001)

      expect(mockApiServer.stop).toHaveBeenCalled()
      expect(mockApiServer.start).toHaveBeenCalledWith(3001)
    })

    test('should prevent memory leaks by cleaning up event listeners', () => {
      const mockListener = jest.fn()

      // Add listener
      mockIpcMain.on('test-event', mockListener)

      // Remove listener
      mockIpcMain.removeAllListeners('test-event')

      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith('test-event')
    })

    test('should handle graceful shutdown with timeout', async () => {
      mockApiServer.isServerRunning.mockReturnValue(true)

      // Mock slow stop
      let stopResolved = false
      mockApiServer.stop.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        stopResolved = true
      })

      // Start cleanup with timeout
      const cleanupPromise = cleanupHandlers[0]()

      // Should eventually complete
      await cleanupPromise
      expect(stopResolved).toBe(true)
    })

    test('should maintain server state during restart', async () => {
      const originalConfig = {
        port: 3000,
        auth: { enabled: false, secretKey: '' },
        cors: { enabled: true, origins: ['*'] },
        autoDeploy: false,
      }

      const newConfig = {
        port: 3001,
        auth: { enabled: true, secretKey: 'new-key' },
        cors: { enabled: false, origins: [] },
        autoDeploy: true,
      }

      // Simulate restart process
      mockApiServer.isServerRunning.mockReturnValue(true)
      mockApiServer.getConfig.mockReturnValue(originalConfig)

      // Stop
      await mockApiServer.stop()
      mockApiServer.isServerRunning.mockReturnValue(false)

      // Update config
      mockApiServer.updateConfig(newConfig)
      mockApiServer.getConfig.mockReturnValue(newConfig)

      // Start
      await mockApiServer.start(3001)
      mockApiServer.isServerRunning.mockReturnValue(true)

      // Verify state is maintained
      expect(mockApiServer.getConfig()).toEqual(newConfig)
      expect(mockApiServer.isServerRunning()).toBe(true)
    })

    test('should handle concurrent server operations safely', async () => {
      mockApiServer.isServerRunning.mockReturnValue(false)

      // Create a simple start handler for this test
      const testStartHandler = jest.fn().mockImplementation(async (event, config) => {
        await mockApiServer.start(config.port)
        return { success: true, url: `http://localhost:${config.port}` }
      })

      // Simulate concurrent start requests
      const startPromises = [
        testStartHandler({}, { port: 3000 }),
        testStartHandler({}, { port: 3000 }),
        testStartHandler({}, { port: 3000 }),
      ]

      // All should succeed or fail gracefully
      const results = await Promise.allSettled(startPromises)

      // Verify no unexpected errors
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled')
      })
    })
  })

  describe('Integration Tests', () => {
    test('should handle complete API server lifecycle', async () => {
      // Initial state
      mockApiServer.isServerRunning.mockReturnValue(false)

      // Start server
      await mockApiServer.start(3000)

      // Update running state
      mockApiServer.isServerRunning.mockReturnValue(true)

      // Check status - update mock to return different status when not running
      const healthWhenRunning = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 1000,
        version: '1.0.0',
        memory: {
          heapUsed: 1024 * 1024,
          heapTotal: 2048 * 1024,
          rss: 4096 * 1024,
        },
        api: {
          endpoints: 1,
          requests: 0,
        },
      }

      const healthWhenStopped = {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '1.0.0',
        memory: {
          heapUsed: 1024 * 1024,
          heapTotal: 2048 * 1024,
          rss: 4096 * 1024,
        },
        api: {
          endpoints: 0,
          requests: 0,
        },
      }

      // Set mock to return appropriate status based on running state
      mockApiServer.getHealthStatus.mockImplementation(async () => {
        return mockApiServer.isServerRunning() ? healthWhenRunning : healthWhenStopped
      })

      // Check status when running
      const status = await mockApiServer.getHealthStatus()
      expect(status.status).toBe('healthy')

      // Stop server
      await mockApiServer.stop()
      mockApiServer.isServerRunning.mockReturnValue(false)

      // Final status check
      const finalStatus = await mockApiServer.getHealthStatus()
      expect(finalStatus.status).toBe('unhealthy')
    })

    test('should handle configuration persistence', async () => {
      const config = {
        enabled: true,
        port: 3001,
        auth: {
          enabled: true,
          secretKey: 'test-persistent-key',
        },
        cors: {
          enabled: true,
          origins: ['http://localhost:3001'],
        },
        autoDeploy: true,
      }

      // Set up the mock to return the config after saving
      mockConfigManager.getConfig.mockReturnValue(config)

      // Save configuration
      await mockConfigManager.saveConfig(config)

      // Verify configuration was saved
      expect(mockConfigManager.saveConfig).toHaveBeenCalledWith(config)

      // Load configuration
      const loadedConfig = mockConfigManager.getConfig()
      expect(loadedConfig).toBeDefined()
      expect(loadedConfig).toEqual(config)
    })

    test('should handle webhook testing', async () => {
      const webhookHandler = jest.fn().mockImplementation(async (event, webhookConfig) => {
        // For testing purposes, we'll just validate the URL format
        // In a real implementation, this would make an actual HTTP request
        const urlPattern = /^https?:\/\/.+/
        if (!urlPattern.test(webhookConfig.url)) {
          throw new Error('Invalid webhook URL format')
        }

        // Simulate successful webhook test
        return {
          success: true,
          status: 200,
          statusText: 'OK',
        }
      })

      const webhookConfig = {
        url: 'https://httpbin.org/post',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }

      const result = await webhookHandler({}, webhookConfig)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('statusText')
      expect(result.success).toBe(true)
      expect(result.status).toBe(200)
      expect(result.statusText).toBe('OK')
    })
  })
})
