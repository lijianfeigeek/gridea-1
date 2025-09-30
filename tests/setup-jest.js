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

// Mock file system
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn(),
}))

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

// Mock server API modules
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

jest.mock('../src/server/api/routes', () => ({
  APIRoutes: jest.fn().mockImplementation(() => ({
    getRouter: jest.fn().mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      use: jest.fn(),
    }),
    incrementRequestCount: jest.fn(),
    getRequestCount: jest.fn().mockReturnValue(0),
  })),
}))

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

console.log('Jest setup completed')
