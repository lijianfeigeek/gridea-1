// Jest setup file for IPC testing

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
}

// Setup global test timeout
jest.setTimeout(30000)

// Mock Electron modules with simpler callback tracking
jest.mock('electron', () => {
  // Create callback storage within the mock
  const mockCallbacks = new Map()

  return {
    app: {
      getPath: jest.fn().mockReturnValue('/tmp/gridea'),
      getVersion: jest.fn().mockReturnValue('1.0.0'),
      getName: jest.fn().mockReturnValue('Gridea'),
      getLocale: jest.fn().mockReturnValue('zh-CN'),
      quit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    },
    ipcMain: {
      handle: jest.fn().mockImplementation((channel, handler) => {
        const key = `handle:${channel}`
        if (!mockCallbacks.has(key)) {
          mockCallbacks.set(key, [])
        }
        mockCallbacks.get(key).push(handler)
        return handler
      }),
      on: jest.fn().mockImplementation((channel, handler) => {
        const key = `on:${channel}`
        if (!mockCallbacks.has(key)) {
          mockCallbacks.set(key, [])
        }
        mockCallbacks.get(key).push(handler)
        return handler
      }),
      once: jest.fn().mockImplementation((channel, handler) => {
        const key = `once:${channel}`
        if (!mockCallbacks.has(key)) {
          mockCallbacks.set(key, [])
        }
        mockCallbacks.get(key).push(handler)
        return handler
      }),
      removeAllListeners: jest.fn().mockImplementation((channel) => {
        if (channel) {
          mockCallbacks.delete(`on:${channel}`)
          mockCallbacks.delete(`once:${channel}`)
          mockCallbacks.delete(`handle:${channel}`)
        } else {
          mockCallbacks.clear()
        }
      }),
      removeHandler: jest.fn().mockImplementation((channel) => {
        mockCallbacks.delete(`handle:${channel}`)
      }),
      send: jest.fn(),
      // Helper methods for testing
      _getCallbacks: (channel) => {
        const key = channel.startsWith('handle:') || channel.startsWith('on:') || channel.startsWith('once:')
          ? channel
          : `on:${channel}`
        return mockCallbacks.get(key) || []
      },
      _clearCallbacks: () => mockCallbacks.clear(),
      _getAllCallbacks: () => mockCallbacks,
    },
    ipcRenderer: {
      invoke: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      send: jest.fn(),
    },
    BrowserWindow: jest.fn().mockImplementation(() => {
      const webContentsCallbacks = new Map()
      const browserWindowCallbacks = new Map()

      const webContents = {
        send: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          const key = `wc:${event}`
          if (!webContentsCallbacks.has(key)) {
            webContentsCallbacks.set(key, [])
          }
          webContentsCallbacks.get(key).push(callback)
          return callback
        }),
        once: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        // Helper methods for testing
        _getWebContentsCallbacks: event => webContentsCallbacks.get(`wc:${event}`) || [],
        _clearWebContentsCallbacks: () => webContentsCallbacks.clear(),
      }

      return {
        loadURL: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          const key = `bw:${event}`
          if (!browserWindowCallbacks.has(key)) {
            browserWindowCallbacks.set(key, [])
          }
          browserWindowCallbacks.get(key).push(callback)
          return callback
        }),
        once: jest.fn().mockImplementation((event, callback) => {
          const key = `bw:once:${event}`
          if (!browserWindowCallbacks.has(key)) {
            browserWindowCallbacks.set(key, [])
          }
          browserWindowCallbacks.get(key).push(callback)
          return callback
        }),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        webContents,
        close: jest.fn(),
        setTitle: jest.fn(),
        isMaximized: jest.fn().mockReturnValue(false),
        maximize: jest.fn(),
        unmaximize: jest.fn(),
        minimize: jest.fn(),
        // Helper methods for testing
        _getCallbacks: event => browserWindowCallbacks.get(`bw:${event}`) || [],
        _clearCallbacks: () => browserWindowCallbacks.clear(),
      }
    }),
    protocol: {
      registerSchemesAsPrivileged: jest.fn(),
    },
    Menu: {
      buildFromTemplate: jest.fn().mockReturnValue({
        append: jest.fn(),
      }),
      setApplicationMenu: jest.fn(),
    },
    shell: {
      openExternal: jest.fn(),
    },
    autoUpdater: {
      checkForUpdatesAndNotify: jest.fn(),
      on: jest.fn(),
    },
  }
})

// Mock Sentry
jest.mock('@sentry/electron/dist/main', () => ({
  init: jest.fn(),
}))

// Mock file system with Bluebird.promisifyAll support
jest.mock('fs', () => {
  const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    statSync: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    access: jest.fn(),
    copyFile: jest.fn(),
    rename: jest.fn(),
    rmdir: jest.fn(),
    createReadStream: jest.fn(),
    createWriteStream: jest.fn(),
    watch: jest.fn(),
    unwatchFile: jest.fn(),
    watchFile: jest.fn(),
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      readdir: jest.fn(),
      mkdir: jest.fn(),
      rmdir: jest.fn(),
      unlink: jest.fn(),
      stat: jest.fn(),
      access: jest.fn(),
      copyFile: jest.fn(),
      rename: jest.fn(),
    },
  }

  // Add promisified methods for Bluebird.promisifyAll
  const promisifiedMethods = {}
  Object.keys(mockFs).forEach((key) => {
    if (typeof mockFs[key] === 'function' && !key.startsWith('promises')) {
      promisifiedMethods[`${key}Async`] = jest.fn()
    }
  })

  return {
    ...mockFs,
    ...promisifiedMethods,
    // Additional methods that Bluebird might expect
    open: jest.fn(),
    close: jest.fn(),
    read: jest.fn(),
    write: jest.fn(),
    fstat: jest.fn(),
    ftruncate: jest.fn(),
    futimes: jest.fn(),
    fsync: jest.fn(),
    fdatasync: jest.fn(),
  }
})

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path),
  basename: jest.fn(path => path),
  extname: jest.fn(path => (path.includes('.') ? path.split('.').pop() : '')),
}))

// Mock LowDB
jest.mock('lowdb', () => ({
  Low: jest.fn().mockImplementation(() => ({
    data: {},
    read: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    value: jest.fn(),
  })),
  JSONFile: jest.fn(),
}))

// Mock server modules
jest.mock('../src/server', () => ({
  default: jest.fn().mockReturnValue({
    server: {
      close: jest.fn(),
    },
    app: jest.fn(),
  }),
}))

// Mock server app
jest.mock('../src/server/app', () => {
  return jest.fn().mockImplementation(() => ({
    appDir: '/tmp/gridea',
  }))
})

// Mock server model and dependencies
jest.mock('../src/server/model', () => ({
  default: jest.fn().mockImplementation(() => ({
    appDir: '/tmp/gridea',
    buildDir: '/tmp/gridea/build',
    db: {},
    mainWindow: {},
  })),
}))

// Mock server posts
jest.mock('../src/server/posts', () => ({
  default: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  })),
}))

// Mock WebhookService with comprehensive lifecycle management
jest.mock('../src/server/services/webhook', () => {
  // Create a constructor function that returns an object with all methods
  function MockWebhookService() {
    const webhooks = new Map()
    const subscriptions = new Map()
    const deliveries = new Map()
    let eventProcessorActive = false
    let eventQueue = []

    return {
      // Webhook Management
      createWebhook: jest.fn().mockImplementation(async (config) => {
        // Validate URL
        try {
          // eslint-disable-next-line no-new
          new URL(config.url)
        } catch {
          throw new Error('Invalid webhook URL')
        }

        // Validate events array
        if (!config.events || !Array.isArray(config.events) || config.events.length === 0) {
          throw new Error('Events must be a non-empty array')
        }

        // Validate event types
        const validEventTypes = [
          'post.published', 'post.updated', 'post.deleted',
          'deployment.started', 'deployment.completed', 'deployment.failed',
          'media.uploaded', 'media.deleted',
          'user.created', 'user.updated', 'user.deleted',
          'settings.updated', 'theme.changed',
          'system.backup', 'system.restore', 'system.error',
        ]

        for (const event of config.events) {
          if (!validEventTypes.includes(event)) {
            throw new Error(`Invalid event type: ${event}`)
          }
        }

        const webhook = {
          id: `webhook-${Math.random().toString(36).substr(2, 9)}`,
          url: config.url,
          enabled: config.enabled !== undefined ? config.enabled : true,
          events: config.events,
          secret: config.secret,
          retryAttempts: config.retryAttempts || 3,
          retryDelay: config.retryDelay || 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        webhooks.set(webhook.id, webhook)
        return webhook
      }),

      getWebhook: jest.fn().mockImplementation((id) => {
        return webhooks.get(id)
      }),

      getAllWebhooks: jest.fn().mockImplementation(() => {
        return Array.from(webhooks.values())
      }),

      getEnabledWebhooks: jest.fn().mockImplementation(() => {
        return Array.from(webhooks.values()).filter(w => w.enabled)
      }),

      updateWebhook: jest.fn().mockImplementation(async (id, updates) => {
        const webhook = webhooks.get(id)
        if (!webhook) {
          throw new Error(`Webhook not found: ${id}`)
        }

        const updated = {
          ...webhook,
          ...updates,
          updatedAt: new Date(),
        }

        webhooks.set(id, updated)
        return updated
      }),

      deleteWebhook: jest.fn().mockImplementation(async (id) => {
        const webhook = webhooks.get(id)
        if (!webhook) {
          throw new Error(`Webhook not found: ${id}`)
        }

        webhooks.delete(id)
        subscriptions.delete(id)
        deliveries.delete(id)
        return true
      }),

      // Event Subscription
      subscribeToEvent: jest.fn().mockImplementation(async (webhookId, eventType, filter) => {
        const webhook = webhooks.get(webhookId)
        if (!webhook) {
          throw new Error(`Webhook not found: ${webhookId}`)
        }

        const subscription = {
          id: `subscription-${Math.random().toString(36).substr(2, 9)}`,
          webhookId,
          eventType,
          filter,
          enabled: true,
          createdAt: new Date(),
        }

        if (!subscriptions.has(webhookId)) {
          subscriptions.set(webhookId, [])
        }

        subscriptions.get(webhookId).push(subscription)
        return subscription
      }),

      unsubscribeFromEvent: jest.fn().mockImplementation(async (webhookId, subscriptionId) => {
        const webhookSubscriptions = subscriptions.get(webhookId)
        if (!webhookSubscriptions) {
          return false
        }

        const index = webhookSubscriptions.findIndex(s => s.id === subscriptionId)
        if (index === -1) {
          return false
        }

        webhookSubscriptions.splice(index, 1)
        return true
      }),

      getSubscriptions: jest.fn().mockImplementation((webhookId) => {
        return subscriptions.get(webhookId) || []
      }),

      // Webhook Delivery
      emitEvent: jest.fn().mockImplementation(async (eventType, eventData) => {
        if (!eventProcessorActive) {
          eventQueue.push({ eventType, eventData, timestamp: Date.now() })
          return
        }

        // Process event for all matching webhooks
        for (const webhook of webhooks.values()) {
          if (!webhook.enabled) continue

          const webhookSubscriptions = subscriptions.get(webhook.id) || []
          const matchingSubscriptions = webhookSubscriptions.filter(s => s.eventType === eventType && s.enabled)

          if (matchingSubscriptions.length > 0) {
            // For each matching subscription, create a delivery
            const delivery = {
              id: `delivery-${Math.random().toString(36).substr(2, 9)}`,
              webhookId: webhook.id,
              eventType,
              eventData,
              status: 'delivered',
              attempt: 1,
              maxAttempts: webhook.retryAttempts || 3,
              createdAt: new Date(),
              statusCode: 200,
              response: { success: true },
              completedAt: new Date(),
            }

            if (!deliveries.has(webhook.id)) {
              deliveries.set(webhook.id, [])
            }

            deliveries.get(webhook.id).push(delivery)
          }
        }
      }),

      deliverWebhook: jest.fn().mockImplementation(async (webhookId, eventType, eventData) => {
        const webhook = webhooks.get(webhookId)
        if (!webhook) return

        const delivery = {
          id: `delivery-${Math.random().toString(36).substr(2, 9)}`,
          webhookId,
          eventType,
          eventData,
          status: 'delivered',
          attempt: 1,
          maxAttempts: webhook.retryAttempts || 3,
          createdAt: new Date(),
          statusCode: 200,
          response: { success: true },
          completedAt: new Date(),
        }

        if (!deliveries.has(webhookId)) {
          deliveries.set(webhookId, [])
        }

        deliveries.get(webhookId).push(delivery)
        return delivery
      }),

      getWebhookDeliveries: jest.fn().mockImplementation((webhookId) => {
        return deliveries.get(webhookId) || []
      }),

      // Webhook Testing
      testWebhook: jest.fn().mockImplementation(async (webhookId) => {
        const webhook = webhooks.get(webhookId)
        if (!webhook) {
          throw new Error(`Webhook not found: ${webhookId}`)
        }

        const startTime = Date.now()

        // Simulate webhook test
        const result = {
          webhookId,
          url: webhook.url,
          success: true,
          statusCode: 200,
          statusText: 'OK',
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          response: {
            status: 200,
            statusText: 'OK',
            headers: {
              'content-type': 'application/json',
            },
            body: { success: true },
          },
        }

        return result
      }),

      // Lifecycle Management
      startEventProcessor: jest.fn().mockImplementation(() => {
        if (eventProcessorActive) return

        eventProcessorActive = true

        // Process any queued events
        while (eventQueue.length > 0) {
          const event = eventQueue.shift()
          // Simple event processing without async issues
          for (const webhook of webhooks.values()) {
            if (!webhook.enabled) continue

            const webhookSubscriptions = subscriptions.get(webhook.id) || []
            const matchingSubscriptions = webhookSubscriptions.filter(s => s.eventType === event.eventType && s.enabled)

            if (matchingSubscriptions.length > 0) {
              const delivery = {
                id: `delivery-${Math.random().toString(36).substr(2, 9)}`,
                webhookId: webhook.id,
                eventType: event.eventType,
                eventData: event.eventData,
                status: 'delivered',
                attempt: 1,
                maxAttempts: webhook.retryAttempts || 3,
                createdAt: new Date(),
                statusCode: 200,
                response: { success: true },
                completedAt: new Date(),
              }

              if (!deliveries.has(webhook.id)) {
                deliveries.set(webhook.id, [])
              }

              deliveries.get(webhook.id).push(delivery)
            }
          }
        }
      }),

      shutdown: jest.fn().mockImplementation(() => {
        eventProcessorActive = false
        eventQueue = []
        webhooks.clear()
        subscriptions.clear()
        deliveries.clear()
      }),

      // Statistics
      getStats: jest.fn().mockImplementation(() => {
        const allWebhooks = Array.from(webhooks.values())
        const allDeliveries = Array.from(deliveries.values()).flat()

        return {
          totalWebhooks: allWebhooks.length,
          enabledWebhooks: allWebhooks.filter(w => w.enabled).length,
          totalDeliveries: allDeliveries.length,
          successfulDeliveries: allDeliveries.filter(d => d.status === 'delivered').length,
          failedDeliveries: allDeliveries.filter(d => d.status === 'failed').length,
          pendingDeliveries: allDeliveries.filter(d => d.status === 'pending').length,
          averageResponseTime: 150, // Mock average response time
        }
      }),

      // Lifecycle management methods - removed duplicates (already defined above)

      // EventEmitter methods
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),

      // State access for testing
      _getState: () => ({
        webhooks: Array.from(webhooks.values()),
        subscriptions: Array.from(subscriptions.entries()).map(([id, subs]) => [id, subs]),
        deliveries: Array.from(deliveries.entries()).map(([id, dels]) => [id, dels]),
        eventProcessorActive,
        eventQueue: [...eventQueue],
      }),
    }
  }

  return {
    WebhookService: MockWebhookService,
  }
})

// Mock middleware manager
jest.mock('../src/server/api/middleware', () => ({
  MiddlewareManager: jest.fn().mockImplementation(() => ({
    getMiddleware: jest.fn().mockReturnValue([]),
  })),
}))

// Mock server API modules with comprehensive APIServer mock
jest.mock('../src/server/api/controllers/articles', () => ({
  default: jest.fn().mockImplementation(() => ({
    publish: jest.fn(),
    getStatus: jest.fn(),
    validate: jest.fn(),
  })),
}))

jest.mock('../src/server/api/routes/articles', () => ({
  default: jest.fn(),
}))

// Mock API server with complete implementation
jest.mock('../src/server/api/index', () => {
  // Create a proper mock constructor that returns instances with Jest mock methods
  const MockAPIServer = jest.fn().mockImplementation(() => {
    const apiServerInstance = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isServerRunning: jest.fn().mockReturnValue(false),
      getHealthStatus: jest.fn().mockResolvedValue({
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
      getConfig: jest.fn().mockReturnValue({
        port: 3000,
        host: 'localhost',
        auth: { enabled: false, secretKey: '' },
        cors: { enabled: true, origins: ['*'] },
        autoDeploy: false,
      }),
      updateConfig: jest.fn().mockResolvedValue(undefined),
      restart: jest.fn().mockResolvedValue(undefined),
    }
    return apiServerInstance
  })

  return {
    APIServer: MockAPIServer,
  }
})

jest.mock('../src/server/api/config', () => {
  const MockConfigManager = jest.fn().mockImplementation(() => {
    const configManagerInstance = {
      validateConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      getEnvironmentConfig: jest.fn().mockReturnValue({
        port: 3000,
        host: 'localhost',
        auth: { enabled: false, secretKey: '' },
        cors: { enabled: true, origins: ['*'] },
        autoDeploy: false,
      }),
      updateConfig: jest.fn().mockResolvedValue(undefined),
      saveConfig: jest.fn().mockResolvedValue(undefined),
      getConfig: jest.fn().mockReturnValue({
        port: 3000,
        host: 'localhost',
        auth: { enabled: false, secretKey: '' },
        cors: { enabled: true, origins: ['*'] },
        autoDeploy: false,
      }),
    }
    return configManagerInstance
  })

  return {
    ConfigManager: MockConfigManager,
  }
})

jest.mock('../src/server/api/types', () => ({
  APIServerConfig: {},
  HealthStatus: {},
}))

jest.mock('../src/server/api/routes', () => ({
  APIRoutes: jest.fn().mockImplementation(() => ({
    getRouter: jest.fn().mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      use: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      all: jest.fn(),
    }),
    incrementRequestCount: jest.fn(),
    getRequestCount: jest.fn().mockReturnValue(0),
  })),
}))

// Mock WebhookService for integration tests
jest.mock('../src/server/services/webhook', () => {
  const EventEmitter = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    addListener: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    eventNames: jest.fn(),
    listenerCount: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
  }))

  const WebhookService = jest.fn().mockImplementation(() => {
    // Create instance that inherits from EventEmitter
    const instance = Object.create(EventEmitter.prototype)

    // EventEmitter methods
    instance.on = jest.fn()
    instance.once = jest.fn()
    instance.emit = jest.fn()
    instance.removeListener = jest.fn()
    instance.removeAllListeners = jest.fn()
    instance.addListener = jest.fn()

    // Core lifecycle methods
    instance.startEventProcessor = jest.fn().mockResolvedValue(undefined)
    instance.setupEventHandlers = jest.fn()
    instance.stopEventProcessor = jest.fn().mockResolvedValue(undefined)
    instance.shutdown = jest.fn().mockResolvedValue(undefined)

    // Webhook management methods
    instance.createWebhook = jest.fn().mockResolvedValue({
      id: 'test-webhook-id',
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    instance.getAllWebhooks = jest.fn().mockReturnValue([])
    instance.getEnabledWebhooks = jest.fn().mockReturnValue([])
    instance.getWebhook = jest.fn().mockReturnValue(null)
    instance.updateWebhook = jest.fn().mockResolvedValue({
      id: 'test-webhook-id',
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    instance.deleteWebhook = jest.fn().mockResolvedValue(true)
    instance.testWebhook = jest.fn().mockResolvedValue({
      webhookId: 'test-webhook-id',
      url: 'https://example.com/webhook',
      success: true,
      statusCode: 200,
      response: 'OK',
      error: null,
      duration: 123,
      timestamp: new Date().toISOString(),
    })

    // Event subscription management
    instance.subscribeToEvent = jest.fn().mockResolvedValue({
      id: 'test-subscription-id',
      webhookId: 'test-webhook-id',
      eventType: 'post.published',
      filter: null,
      enabled: true,
      createdAt: new Date().toISOString(),
    })
    instance.getSubscriptions = jest.fn().mockReturnValue([])
    instance.unsubscribeFromEvent = jest.fn().mockResolvedValue(true)
    instance.getWebhookDeliveries = jest.fn().mockReturnValue([])
    instance.getStats = jest.fn().mockReturnValue({
      totalWebhooks: 0,
      enabledWebhooks: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingDeliveries: 0,
      averageResponseTime: 0,
      lastDelivery: null,
    })
    instance.enableWebhook = jest.fn().mockResolvedValue({
      id: 'test-webhook-id',
      enabled: true,
    })
    instance.disableWebhook = jest.fn().mockResolvedValue({
      id: 'test-webhook-id',
      enabled: false,
    })

    // Additional lifecycle methods
    instance.isRunning = jest.fn().mockReturnValue(false)
    instance.getStatus = jest.fn().mockReturnValue('stopped')

    return instance
  })

  return { WebhookService, EventEmitter }
})

// Mock IPC handlers with actual registration logic
jest.mock('../src/background/ipc-handlers', () => {
  const mockHandleStartAPIServer = jest.fn()
  const mockHandleStopAPIServer = jest.fn()
  const mockHandleGetAPIServerStatus = jest.fn()
  const mockHandleSaveAPISettings = jest.fn()
  const mockHandleTestWebhook = jest.fn()

  // Track registration calls
  const registrationCalls = {
    handle: [],
    on: [],
  }

  return {
    initializeIPCHandlers: jest.fn().mockImplementation(() => {
      // Simulate the actual IPC handler registration
      const { ipcMain } = require('electron')
      if (ipcMain && ipcMain.handle && ipcMain.on) {
        // Track handle registrations
        registrationCalls.handle.push(['start-api-server', mockHandleStartAPIServer])
        registrationCalls.handle.push(['stop-api-server', mockHandleStopAPIServer])
        registrationCalls.handle.push(['get-api-server-status', mockHandleGetAPIServerStatus])
        registrationCalls.handle.push(['save-api-settings', mockHandleSaveAPISettings])
        registrationCalls.handle.push(['test-webhook', mockHandleTestWebhook])

        // Track on registrations
        registrationCalls.on.push(['api-server-status-changed', jest.fn()])
        registrationCalls.on.push(['api-server-started', jest.fn()])
        registrationCalls.on.push(['api-server-stopped', jest.fn()])
        registrationCalls.on.push(['api-server-error', jest.fn()])

        // Also call the actual Electron mock methods
        ipcMain.handle('start-api-server', mockHandleStartAPIServer)
        ipcMain.handle('stop-api-server', mockHandleStopAPIServer)
        ipcMain.handle('get-api-server-status', mockHandleGetAPIServerStatus)
        ipcMain.handle('save-api-settings', mockHandleSaveAPISettings)
        ipcMain.handle('test-webhook', mockHandleTestWebhook)

        ipcMain.on('api-server-status-changed', jest.fn())
        ipcMain.on('api-server-started', jest.fn())
        ipcMain.on('api-server-stopped', jest.fn())
        ipcMain.on('api-server-error', jest.fn())
      }
    }),
    handleStartAPIServer: mockHandleStartAPIServer,
    handleStopAPIServer: mockHandleStopAPIServer,
    handleGetAPIServerStatus: mockHandleGetAPIServerStatus,
    handleSaveAPISettings: mockHandleSaveAPISettings,
    handleTestWebhook: mockHandleTestWebhook,
    // Export tracking for tests
    _getRegistrationCalls: () => registrationCalls,
    _clearRegistrationCalls: () => {
      registrationCalls.handle = []
      registrationCalls.on = []
    },
  }
})

// Mock express
jest.mock('express', () => {
  const mockApp = {
    get: jest.fn(),
    post: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
    close: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    all: jest.fn(),
    set: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    engine: jest.fn(),
    route: jest.fn(),
    param: jest.fn(),
  }

  const mockRouter = {
    get: jest.fn(),
    post: jest.fn(),
    use: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    all: jest.fn(),
    param: jest.fn(),
    route: jest.fn(),
  }

  return {
    default: jest.fn(() => mockApp),
    Router: jest.fn(() => mockRouter),
    Express: jest.fn(),
    json: jest.fn(),
    urlencoded: jest.fn(),
    static: jest.fn(),
  }
})

// Mock locales
jest.mock('../src/assets/locales-menu', () => ({
  'zh-CN': {
    edit: '编辑',
    save: '保存',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    delete: '删除',
    selectall: '全选',
    toggledevtools: '开发者工具',
    close: '关闭',
    quit: '退出',
    help: '帮助',
  },
}))

// Mock vue-cli-plugin-electron-builder
jest.mock('vue-cli-plugin-electron-builder/lib', () => ({
  createProtocol: jest.fn(),
}))

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdatesAndNotify: jest.fn(),
    on: jest.fn(),
  },
}))

// Setup global test utilities
global.beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

// Global cleanup
global.afterEach(() => {
  // Clean up any global state
  jest.clearAllMocks()
})

// Export utilities for tests
global.createMockEvent = (sender = {}) => ({
  sender: {
    send: jest.fn(),
    ...sender,
  },
})

global.createMockIpcMain = () => ({
  handle: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
  removeHandler: jest.fn(),
  send: jest.fn(),
})

global.createMockIpcRenderer = () => ({
  invoke: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
  send: jest.fn(),
})

// Mock performance API for Node.js environment
if (!global.performance) {
  global.performance = {
    now: jest.fn().mockReturnValue(Date.now()),
  }
}

// Mock Request/Response for web API testing
global.Request = jest.fn()
global.Response = jest.fn()
global.fetch = jest.fn()

// Global test cleanup and setup
beforeEach(() => {
  // Clear all mock calls before each test
  jest.clearAllMocks()

  // Reset mock implementations
  jest.resetAllMocks()

  // Ensure consistent test environment
  global.testEnvironment = {
    setup: true,
    mockTime: Date.now(),
  }
})

afterEach(() => {
  // Cleanup after each test
  if (global.testEnvironment) {
    global.testEnvironment.cleanupTime = Date.now()
  }

  // Clean up any global references
  if (global.app) {
    global.app = null
  }
  if (global.server) {
    global.server = null
  }

  // Clear Electron mock callbacks - disable ESLint for internal method
  const { ipcMain } = require('electron')
  // eslint-disable-next-line no-underscore-dangle
  if (ipcMain && ipcMain._clearCallbacks) {
    // eslint-disable-next-line no-underscore-dangle
    ipcMain._clearCallbacks()
  }
  // Clear all BrowserWindow instances and mocks
  jest.clearAllMocks()
})

console.log('Jest setup completed with proper initialization and cleanup')
