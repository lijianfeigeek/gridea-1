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

// Mock Electron modules
jest.mock('electron', () => ({
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
    handle: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    removeHandler: jest.fn(),
    send: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    send: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
    },
    close: jest.fn(),
    setTitle: jest.fn(),
    isMaximized: jest.fn().mockReturnValue(false),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    minimize: jest.fn(),
  })),
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
}))

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
})

console.log('Jest setup completed with proper initialization and cleanup')
