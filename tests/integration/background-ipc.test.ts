import { vi } from 'vitest'
import { app, ipcMain, BrowserWindow } from 'electron'

// Now import the mocked modules
import {
  initializeIPCHandlers,
  cleanupAPIServer,
  setAPIServerInstance,
  setConfigManagerInstance,
  setAppInstance,
  resetIPCHandlers,
  clearIPCHandlers,
} from '../../src/background/ipc-handlers'
import { APIServer } from '../../src/server/api/index'
import { ConfigManager } from '../../src/server/api/config'

// Mock server modules before importing them
vi.mock('../../src/server/api/index', () => ({
  APIServer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(),
    stop: vi.fn().mockResolvedValue(),
    isServerRunning: vi.fn().mockReturnValue(false),
    getHealthStatus: vi.fn().mockResolvedValue({
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
    }),
    getConfig: vi.fn().mockReturnValue({}),
  })),
}))

vi.mock('../../src/server/api/config', () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    getEnvironmentConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn(),
    saveConfig: vi.fn().mockResolvedValue(true),
  })),
}))

// Integration test for background process and IPC handlers
describe('Background Process IPC Integration', () => {
  let mockApiServer: any
  let mockConfigManager: any
  let mockWindow: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset IPC handlers and singletons
    clearIPCHandlers()
    resetIPCHandlers()

    // Create mock instances
    const MockAPIServer = APIServer as any
    const MockConfigManager = ConfigManager as any
    const MockBrowserWindow = BrowserWindow as any

    mockApiServer = new MockAPIServer()
    mockConfigManager = new MockConfigManager()
    mockWindow = new MockBrowserWindow()

    // Inject mock instances using setter functions
    setAPIServerInstance(mockApiServer)
    setConfigManagerInstance(mockConfigManager)
    setAppInstance({ db: { get: vi.fn(), set: vi.fn() } })

    // Ensure mock methods are available for dynamic modification during tests
    // These methods are already defined in vi.mock but we need to ensure they're accessible

    // Mock window webContents
    mockWindow.webContents = {
      send: vi.fn(),
    } as any

    // Mock app methods
    (app as any).getPath = vi.fn().mockReturnValue('/tmp/gridea');
    (app as any).getLocale = vi.fn().mockReturnValue('zh-CN')
  })

  afterEach(async () => {
    // Clean up after each test
    try {
      await cleanupAPIServer()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
    vi.clearAllMocks()
  })

  describe('IPC Handler Initialization', () => {
    test('should initialize IPC handlers without errors', () => {
      expect(() => {
        initializeIPCHandlers()
      }).not.toThrow()

      // Verify handlers were registered
      expect(ipcMain.handle).toHaveBeenCalledWith('start-api-server', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('stop-api-server', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('get-api-server-status', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('save-api-settings', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('test-webhook', expect.any(Function))
    })

    test('should register event listeners for bidirectional communication', () => {
      initializeIPCHandlers()

      expect(ipcMain.on).toHaveBeenCalledWith('api-server-status-changed', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('api-server-started', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('api-server-stopped', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('api-server-error', expect.any(Function))
    })

    test('should handle multiple initializations gracefully', () => {
      expect(() => {
        initializeIPCHandlers()
        initializeIPCHandlers()
        initializeIPCHandlers()
      }).not.toThrow()
    })
  })

  describe('Start API Server Integration', () => {
    test('should handle start-api-server invoke with valid configuration', async () => {
      initializeIPCHandlers()

      // Get the handler function
      const handleCalls = (ipcMain.handle as any).mock.calls
      const startHandlerObj = handleCalls.find(call => call[0] === 'start-api-server')
      const startHandler = startHandlerObj ? startHandlerObj[1] : undefined

      expect(startHandler).toBeDefined()

      if (startHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const config = {
          port: 3000,
          auth: 'test-api-key',
          cors: {
            enabled: true,
            origins: ['http://localhost:3000'],
          },
        }

        const result = await startHandler(mockEvent, config)

        expect(result).toEqual({
          success: true,
          url: 'http://localhost:3000',
        })

        // Verify renderer was notified
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-started', {
          success: true,
          url: 'http://localhost:3000',
        })
      }
    })

    test('should handle start-api-server invoke with invalid configuration', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const startHandlerObj = handleCalls.find(call => call[0] === 'start-api-server')
      const startHandler = startHandlerObj ? startHandlerObj[1] : undefined

      expect(startHandler).toBeDefined()

      if (startHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const invalidConfigs = [
          { port: 80 }, // Invalid port
          { port: 70000 }, // Invalid port
          {}, // Missing port
        ]

        // Test each invalid config in parallel instead of sequentially
        const results = await Promise.all(
          invalidConfigs.map(config => startHandler(mockEvent, config)),
        )
        results.forEach((result) => {
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      }
    })
  })

  describe('Stop API Server Integration', () => {
    test('should handle stop-api-server invoke successfully', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const stopHandlerObj = handleCalls.find(call => call[0] === 'stop-api-server')
      const stopHandler = stopHandlerObj ? stopHandlerObj[1] : undefined

      expect(stopHandler).toBeDefined()

      if (stopHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const result = await stopHandler(mockEvent)

        expect(result).toEqual({ success: true })

        // Verify renderer was notified
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-stopped')
      }
    })

    test('should handle stop-api-server invoke with errors', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const stopHandlerObj = handleCalls.find(call => call[0] === 'stop-api-server')
      const stopHandler = stopHandlerObj ? stopHandlerObj[1] : undefined

      expect(stopHandler).toBeDefined()

      if (stopHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        // Mock server stop failure
        mockApiServer.stop.mockRejectedValue(new Error('Server not running'))

        const result = await stopHandler(mockEvent)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Server not running')

        // Verify renderer was notified of error
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-error', {
          message: 'Server not running',
        })
      }
    })
  })

  describe('Get Status Integration', () => {
    test('should handle get-api-server-status invoke correctly', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const statusHandlerObj = handleCalls.find(call => call[0] === 'get-api-server-status')
      const statusHandler = statusHandlerObj ? statusHandlerObj[1] : undefined

      expect(statusHandler).toBeDefined()

      if (statusHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        // Test when server is not running
        mockApiServer.isServerRunning.mockReturnValue(false)
        let result = await statusHandler(mockEvent)

        expect(result.running).toBe(false)
        expect(result.url).toBe('')

        // Test when server is running
        mockApiServer.isServerRunning.mockReturnValue(true)
        result = await statusHandler(mockEvent)

        expect(result.running).toBe(true)
        expect(result.url).toContain('localhost')
        expect(result.health).toBeDefined()
      }
    })
  })

  describe('Save Settings Integration', () => {
    test('should handle save-api-settings invoke with valid settings', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const saveHandlerObj = handleCalls.find(call => call[0] === 'save-api-settings')
      const saveHandler = saveHandlerObj ? saveHandlerObj[1] : undefined

      expect(saveHandler).toBeDefined()

      if (saveHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const settings = {
          enabled: true,
          port: 3001,
          auth: {
            enabled: true,
            secretKey: 'test-secret-key',
          },
          cors: {
            enabled: true,
            origins: ['http://localhost:3001'],
          },
          autoDeploy: false,
        }

        const result = await saveHandler(mockEvent, settings)

        expect(result.success).toBe(true)
        expect(mockConfigManager.saveConfig).toHaveBeenCalledWith(settings)
      }
    })

    test('should handle save-api-settings invoke with invalid settings', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const saveHandlerObj = handleCalls.find(call => call[0] === 'save-api-settings')
      const saveHandler = saveHandlerObj ? saveHandlerObj[1] : undefined

      expect(saveHandler).toBeDefined()

      if (saveHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const invalidSettings = [
          null, // Not an object
          'invalid', // Not an object
          { enabled: 'not-a-boolean' }, // Invalid type
          { enabled: true, port: 80 }, // Invalid port
        ]

        // Test each invalid settings in parallel instead of sequentially
        const results = await Promise.all(
          invalidSettings.map(settings => saveHandler(mockEvent, settings as any)),
        )
        results.forEach((result) => {
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      }
    })
  })

  describe('Webhook Testing Integration', () => {
    test('should handle test-webhook invoke correctly', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const webhookHandlerObj = handleCalls.find(call => call[0] === 'test-webhook')
      const webhookHandler = webhookHandlerObj ? webhookHandlerObj[1] : undefined

      expect(webhookHandler).toBeDefined()

      if (webhookHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const webhookConfig = {
          url: 'https://httpbin.org/post',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }

        const result = await webhookHandler(mockEvent, webhookConfig)

        expect(result.success).toBe(true)
        expect(result.status).toBe(200)
      }
    })

    test('should handle test-webhook invoke with invalid URL', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const webhookHandlerObj = handleCalls.find(call => call[0] === 'test-webhook')
      const webhookHandler = webhookHandlerObj ? webhookHandlerObj[1] : undefined

      expect(webhookHandler).toBeDefined()

      if (webhookHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const invalidConfigs = [
          { url: '' }, // Empty URL
          { url: 'not-a-url' }, // Invalid URL format
          {}, // Missing URL
        ]

        // Test each invalid config in parallel instead of sequentially
        const results = await Promise.all(
          invalidConfigs.map(config => webhookHandler(mockEvent, config as any)),
        )
        results.forEach((result) => {
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      }
    })
  })

  describe('Event Listener Integration', () => {
    test('should handle api-server-status-changed event', () => {
      initializeIPCHandlers()

      const onCalls = (ipcMain.on as any).mock.calls
      const statusHandlerObj = onCalls.find(call => call[0] === 'api-server-status-changed')
      const statusHandler = statusHandlerObj ? statusHandlerObj[1] : undefined

      expect(statusHandler).toBeDefined()

      if (statusHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const status = {
          running: true,
          loading: false,
          url: 'http://localhost:3000',
          error: '',
        }

        statusHandler(mockEvent, status)

        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-status-changed', status)
      }
    })

    test('should handle api-server-started event', () => {
      initializeIPCHandlers()

      const onCalls = (ipcMain.on as any).mock.calls
      const startedHandlerObj = onCalls.find(call => call[0] === 'api-server-started')
      const startedHandler = startedHandlerObj ? startedHandlerObj[1] : undefined

      expect(startedHandler).toBeDefined()

      if (startedHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const result = {
          success: true,
          url: 'http://localhost:3000',
        }

        startedHandler(mockEvent, result)

        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-started', result)
      }
    })

    test('should handle api-server-stopped event', () => {
      initializeIPCHandlers()

      const onCalls = (ipcMain.on as any).mock.calls
      const stoppedHandlerObj = onCalls.find(call => call[0] === 'api-server-stopped')
      const stoppedHandler = stoppedHandlerObj ? stoppedHandlerObj[1] : undefined

      expect(stoppedHandler).toBeDefined()

      if (stoppedHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        stoppedHandler(mockEvent)

        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-stopped')
      }
    })

    test('should handle api-server-error event', () => {
      initializeIPCHandlers()

      const onCalls = (ipcMain.on as any).mock.calls
      const errorHandlerObj = onCalls.find(call => call[0] === 'api-server-error')
      const errorHandler = errorHandlerObj ? errorHandlerObj[1] : undefined

      expect(errorHandler).toBeDefined()

      if (errorHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        const error = {
          message: 'Test error message',
          code: 'TEST_ERROR',
        }

        errorHandler(mockEvent, error)

        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-error', error)
      }
    })
  })

  describe('Cleanup Integration', () => {
    test('should cleanup API server and handlers without errors', async () => {
      initializeIPCHandlers()

      // Simulate server running
      mockApiServer.isServerRunning.mockReturnValue(true)

      await expect(cleanupAPIServer()).resolves.not.toThrow()

      // Verify cleanup was called
      expect(mockApiServer.stop).toHaveBeenCalled()
    })

    test('should handle cleanup when server is not running', async () => {
      initializeIPCHandlers()

      // Simulate server not running
      mockApiServer.isServerRunning.mockReturnValue(false)

      await expect(cleanupAPIServer()).resolves.not.toThrow()

      // Verify stop was not called
      expect(mockApiServer.stop).not.toHaveBeenCalled()
    })

    test('should handle cleanup errors gracefully', async () => {
      initializeIPCHandlers()

      // Simulate server running and stop failure
      mockApiServer.isServerRunning.mockReturnValue(true)
      mockApiServer.stop.mockRejectedValue(new Error('Cleanup failed'))

      await expect(cleanupAPIServer()).resolves.not.toThrow()

      // Verify stop was attempted
      expect(mockApiServer.stop).toHaveBeenCalled()
    })
  })

  describe('Full Lifecycle Integration', () => {
    test('should handle complete API server lifecycle', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const startHandlerObj = handleCalls.find(call => call[0] === 'start-api-server')
      const startHandler = startHandlerObj ? startHandlerObj[1] : undefined
      const stopHandlerObj = handleCalls.find(call => call[0] === 'stop-api-server')
      const stopHandler = stopHandlerObj ? stopHandlerObj[1] : undefined
      const statusHandlerObj = handleCalls.find(call => call[0] === 'get-api-server-status')
      const statusHandler = statusHandlerObj ? statusHandlerObj[1] : undefined

      expect(startHandler).toBeDefined()
      expect(stopHandler).toBeDefined()
      expect(statusHandler).toBeDefined()

      if (startHandler && stopHandler && statusHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        // Initial status - server not running
        mockApiServer.isServerRunning.mockReturnValue(false)
        let status = await statusHandler(mockEvent)
        expect(status.running).toBe(false)

        // Start server
        mockApiServer.isServerRunning.mockReturnValue(true)
        const startResult = await startHandler(mockEvent, {
          port: 3000,
          auth: 'test-key',
          cors: { enabled: true, origins: ['*'] },
        })

        expect(startResult.success).toBe(true)
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-started', startResult)

        // Check status after start
        status = await statusHandler(mockEvent)
        expect(status.running).toBe(true)

        // Stop server
        mockApiServer.isServerRunning.mockReturnValue(false)
        const stopResult = await stopHandler(mockEvent)

        expect(stopResult.success).toBe(true)
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('api-server-stopped')

        // Final status check
        status = await statusHandler(mockEvent)
        expect(status.running).toBe(false)
      }
    })

    test('should handle concurrent operations safely', async () => {
      initializeIPCHandlers()

      const handleCalls = (ipcMain.handle as any).mock.calls
      const startHandlerObj = handleCalls.find(call => call[0] === 'start-api-server')
      const startHandler = startHandlerObj ? startHandlerObj[1] : undefined
      const statusHandlerObj = handleCalls.find(call => call[0] === 'get-api-server-status')
      const statusHandler = statusHandlerObj ? statusHandlerObj[1] : undefined

      expect(startHandler).toBeDefined()
      expect(statusHandler).toBeDefined()

      if (startHandler && statusHandler) {
        const mockEvent = {
          sender: mockWindow.webContents,
        }

        // Simulate concurrent operations
        const operations = Promise.all([
          startHandler(mockEvent, { port: 3000, auth: 'key1', cors: { enabled: true, origins: ['*'] } }),
          statusHandler(mockEvent),
          startHandler(mockEvent, { port: 3001, auth: 'key2', cors: { enabled: true, origins: ['*'] } }),
          statusHandler(mockEvent),
        ])

        await expect(operations).resolves.not.toThrow()
      }
    })
  })
})
