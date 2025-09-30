import { vi } from 'vitest'

// 模拟全局变量
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
}

// 设置测试环境
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/gridea'),
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    getName: vi.fn().mockReturnValue('Gridea')
  },
  ipcMain: {
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  ipcRenderer: {
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    send: vi.fn()
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn()
    },
    close: vi.fn()
  }))
}))

// 模拟文件系统，支持 Bluebird.promisifyAll
vi.mock('fs', () => {
  // 基础同步方法
  const mockFs = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    statSync: vi.fn(),
    foo: 'bar', // 添加 Bluebird 内部检查需要的属性
  }

  // 基础异步方法 - Bluebird promisifyAll 会自动添加 Async 后缀
  const asyncMethods = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    appendFile: vi.fn(),
    access: vi.fn(),
    copyFile: vi.fn(),
    rename: vi.fn(),
    rmdir: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
    watch: vi.fn(),
    unwatchFile: vi.fn(),
    watchFile: vi.fn(),
  }

  // Promise API
  const promiseMethods = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    rmdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
    copyFile: vi.fn(),
    rename: vi.fn(),
  }

  // 只返回基础方法和 Promise API，让 Bluebird 添加 Async 后缀
  return {
    ...mockFs,
    ...asyncMethods,
    promises: promiseMethods,
  }
})

// 模拟 fs-extra
vi.mock('fs-extra', () => {
  const mockFsExtra = {
    // 同步方法
    pathExistsSync: vi.fn(),
    readJsonSync: vi.fn(),
    writeJsonSync: vi.fn(),
    ensureDirSync: vi.fn(),
    ensureFileSync: vi.fn(),
    removeSync: vi.fn(),
    copySync: vi.fn(),
    moveSync: vi.fn(),
    emptyDirSync: vi.fn(),
    outputJsonSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),

    // 异步方法
    pathExists: vi.fn(),
    readJson: vi.fn(),
    writeJson: vi.fn(),
    ensureDir: vi.fn(),
    ensureFile: vi.fn(),
    remove: vi.fn(),
    copy: vi.fn(),
    move: vi.fn(),
    emptyDir: vi.fn(),
    outputJson: vi.fn(),
    outputFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),

    // Promise 版本
    promises: {
      pathExists: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readJson: vi.fn(),
      writeJson: vi.fn(),
      ensureDir: vi.fn(),
      ensureFile: vi.fn(),
      remove: vi.fn(),
      copy: vi.fn(),
      move: vi.fn(),
      emptyDir: vi.fn(),
      outputJson: vi.fn(),
      outputFile: vi.fn(),
    }
  }

  // 不手动添加 Async 后缀方法，让 Bluebird promisifyAll 自动添加
  return mockFsExtra
})

// 模拟Express及其相关中间件 - Simplified approach for Vitest compatibility
vi.mock('express', () => {
  // Create a simple, reliable mock
  const mockExpress = vi.fn(() => {
    const app = {
      use: vi.fn().mockReturnThis(),
      get: vi.fn().mockReturnThis(),
      post: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      patch: vi.fn().mockReturnThis(),
      all: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      address: vi.fn().mockReturnValue({ port: 3000 }),
      listen: vi.fn().mockImplementation(() => {
        const server = {
          address: () => ({ port: 3000 }),
          close: vi.fn().mockImplementation((cb) => {
            if (cb) setTimeout(cb, 0)
          }),
          on: vi.fn().mockReturnThis(),
          once: vi.fn(),
          emit: vi.fn(),
        }
        setTimeout(() => {
          const args = Array.from(arguments)
          const callback = args.find(arg => typeof arg === 'function')
          if (callback) callback()
        }, 0)
        return server
      }),
    }
    return app
  })

  const mockRouter = vi.fn(() => ({
    use: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    put: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    patch: vi.fn().mockReturnThis(),
    all: vi.fn().mockReturnThis(),
    param: vi.fn().mockReturnThis(),
    route: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnThis(),
      post: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }),
  }))

  // Attach middleware functions
  mockExpress.json = vi.fn(() => (req: any, res: any, next: any) => next())
  mockExpress.urlencoded = vi.fn(() => (req: any, res: any, next: any) => next())
  mockExpress.static = vi.fn(() => (req: any, res: any, next: any) => next())
  mockExpress.Router = mockRouter

  return {
    default: mockExpress,
    Router: mockRouter,
    json: mockExpress.json,
    urlencoded: mockExpress.urlencoded,
    static: mockExpress.static,
  }
})

// 模拟body-parser
vi.mock('body-parser', () => ({
  json: vi.fn().mockReturnValue((req, res, next) => next()),
  urlencoded: vi.fn().mockReturnValue((req, res, next) => next()),
  default: {
    json: vi.fn().mockReturnValue((req, res, next) => next()),
    urlencoded: vi.fn().mockReturnValue((req, res, next) => next()),
  }
}))

// 模拟http模块
vi.mock('http', () => ({
  createServer: vi.fn().mockImplementation((app) => {
    const server = {
      listen: vi.fn().mockImplementation((port, host, callback) => {
        // Handle both (port, callback) and (port, host, callback) signatures
        if (typeof host === 'function') {
          callback = host
          host = 'localhost'
        }

        // Simulate async server startup
        if (typeof callback === 'function') {
          setTimeout(() => callback(), 0)
        }

        return server
      }),
      address: vi.fn().mockReturnValue({ port: 3000 }),
      close: vi.fn().mockImplementation((closeCallback) => {
        // Simulate async server shutdown
        if (typeof closeCallback === 'function') {
          setTimeout(() => closeCallback(), 0)
        }
      }),
      ref: vi.fn(),
      unref: vi.fn(),
      on: vi.fn().mockImplementation((event, handler) => {
        // Store handlers for potential use
        if (event === 'error') {
          ;(server as any)._errorHandler = handler
        }
        if (event === 'close') {
          ;(server as any)._closeHandler = handler
        }
        return server
      }),
      off: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      eventNames: vi.fn(),
      listenerCount: vi.fn(),
      _errorHandler: null as any,
      _closeHandler: null as any,
    }
    return server
  }),
}))

vi.mock('cors', () => vi.fn().mockImplementation(() => (req, res, next) => next()))
vi.mock('helmet', () => vi.fn().mockImplementation(() => (req, res, next) => next()))
vi.mock('express-rate-limit', () => vi.fn().mockImplementation(() => (req, res, next) => next()))
vi.mock('express-validator', () => ({
  body: vi.fn(() => {
    const chain = new Proxy(
      {},
      {
        get: () => {
          // Return a function that always returns the chain (for method chaining)
          return () => chain
        }
      }
    )
    return chain
  }),
  query: vi.fn(() => {
    const chain = new Proxy(
      {},
      {
        get: () => {
          // Return a function that always returns the chain (for method chaining)
          return () => chain
        }
      }
    )
    return chain
  }),
  param: vi.fn(() => {
    const chain = new Proxy(
      {},
      {
        get: () => {
          // Return a function that always returns the chain (for method chaining)
          return () => chain
        }
      }
    )
    return chain
  }),
  validationResult: vi.fn().mockImplementation(() => ({
    isEmpty: () => true,
    array: () => [],
  })),
}))

// 模拟HTTP客户端
vi.mock('axios', () => ({
  default: vi.fn().mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
  }),
}))

// 模拟其他常用依赖
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
}))

vi.mock('crypto', () => ({
  createHmac: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mock-signature'),
  }),
  randomBytes: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue('test-secret'),
  }),
}))

// 模拟LowDB
vi.mock('lowdb', () => ({
  default: vi.fn().mockImplementation((adapter) => ({
    data: {},
    read: vi.fn(),
    write: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    unset: vi.fn(),
    value: vi.fn(),
    push: vi.fn(),
    pop: vi.fn(),
    shift: vi.fn(),
    unshift: vi.fn(),
    assign: vi.fn(),
    clone: vi.fn(),
    cloneDeep: vi.fn(),
    filter: vi.fn(),
    find: vi.fn(),
    findKey: vi.fn(),
    forEach: vi.fn(),
    includes: vi.fn(),
    indexOf: vi.fn(),
    invert: vi.fn(),
    keys: vi.fn(),
    map: vi.fn(),
    omit: vi.fn(),
    pick: vi.fn(),
    reduce: vi.fn(),
    reduceRight: vi.fn(),
    reject: vi.fn(),
    sample: vi.fn(),
    shuffle: vi.fn(),
    size: vi.fn(),
    sortBy: vi.fn(),
    take: vi.fn(),
    takeRight: vi.fn(),
    values: vi.fn(),
    without: vi.fn(),
    zip: vi.fn(),
    zipObject: vi.fn(),
    zipWith: vi.fn(),
  })),
  Low: vi.fn().mockImplementation(() => ({
    data: {},
    read: vi.fn(),
    write: vi.fn()
  })),
  JSONFile: vi.fn().mockImplementation(() => ({
    read: vi.fn(),
    write: vi.fn()
  }))
}))

// 模拟moment
vi.mock('moment', () => ({
  default: vi.fn().mockImplementation(() => ({
    format: vi.fn().mockReturnValue('2024-01-01-12-00-00'),
    diff: vi.fn().mockReturnValue(0),
    add: vi.fn().mockReturnThis(),
    subtract: vi.fn().mockReturnThis(),
    startOf: vi.fn().mockReturnThis(),
    endOf: vi.fn().mockReturnThis(),
    toDate: vi.fn().mockReturnValue(new Date()),
    isValid: vi.fn().mockReturnValue(true),
  }))
}))

// 模拟Posts类
vi.mock('../../../src/server/posts', () => ({
  default: vi.fn().mockImplementation((appInstance) => ({
    db: appInstance?.db || {
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
        domain: 'https://example.com'
      }
    },
    savePostToFile: vi.fn().mockResolvedValue(true),
    deletePost: vi.fn().mockResolvedValue(true),
    getPost: vi.fn().mockReturnValue({}),
    getAllPosts: vi.fn().mockReturnValue([]),
    updatePost: vi.fn().mockResolvedValue(true),
  }))
}))

// 模拟Deploy类
vi.mock('../../../src/server/deploy', () => ({
  default: vi.fn().mockImplementation((appInstance) => ({
    publish: vi.fn().mockResolvedValue({ success: true, message: 'Deployment successful' }),
    deploy: vi.fn().mockResolvedValue(true),
    testConnection: vi.fn().mockResolvedValue(true),
    getStatus: vi.fn().mockReturnValue('idle'),
  }))
}))

// 模拟MarkdownValidator
vi.mock('../../../src/server/validators/markdown', () => ({
  MarkdownValidator: vi.fn().mockImplementation((config) => ({
    validate: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    }),
    validateMarkdown: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    }),
  }))
}))

// 模拟ContentHelper
vi.mock('../../../src/helpers/content-helper', () => ({
  default: vi.fn().mockImplementation(() => ({
    changeImageUrlLocalToDomain: vi.fn().mockReturnValue('processed-content'),
    processContent: vi.fn().mockReturnValue('processed-content'),
    extractImages: vi.fn().mockReturnValue([]),
  }))
}))

// 模拟utils函数
vi.mock('../../../src/helpers/utils', () => ({
  formatYamlString: vi.fn().mockImplementation((str) => str),
  generateSlug: vi.fn().mockReturnValue('test-slug'),
  sanitizeFilename: vi.fn().mockReturnValue('test-filename'),
}))

// 模拟StructuredLogger
vi.mock('../../../src/server/api/logger/structured-logger', () => ({
  StructuredLogger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    logValidationFailure: vi.fn(),
    logDeploymentStart: vi.fn(),
    logDeploymentSuccess: vi.fn(),
    logDeploymentFailure: vi.fn(),
    logArticlePublish: vi.fn(),
  }))
}))

// 模拟AuthMiddleware
vi.mock('../../../src/server/api/middleware/auth', () => ({
  AuthMiddleware: vi.fn().mockImplementation((config) => ({
    authenticate: vi.fn().mockReturnValue((req, res, next) => {
      req.user = { id: 'test-user', role: 'admin' }
      next()
    }),
    verifyToken: vi.fn().mockReturnValue(true),
    generateToken: vi.fn().mockReturnValue('test-token'),
  }))
}))

// 模拟MiddlewareManager
vi.mock('../../../src/server/api/middleware', () => ({
  MiddlewareManager: vi.fn().mockImplementation(() => ({
    setupSecurity: vi.fn().mockReturnValue((req, res, next) => next()),
    setupCORS: vi.fn().mockReturnValue((req, res, next) => next()),
    setupCompression: vi.fn().mockReturnValue((req, res, next) => next()),
    setupRequestLogging: vi.fn().mockReturnValue((req, res, next) => next()),
    setupRateLimit: vi.fn().mockReturnValue((req, res, next) => next()),
    setupBodyParser: vi.fn().mockReturnValue((req, res, next) => next()),
    setupUrlEncodedParser: vi.fn().mockReturnValue((req, res, next) => next()),
    setupAuthentication: vi.fn().mockReturnValue((req, res, next) => {
      req.user = { id: 'test-user', role: 'admin' }
      next()
    }),
    notFoundHandler: vi.fn().mockReturnValue((req, res, next) => {
      res.status(404).json({ error: 'Not found' })
    }),
    errorHandler: vi.fn().mockReturnValue((err, req, res, next) => {
      res.status(500).json({ error: err.message || 'Internal server error' })
    }),
  }))
}))

// 模拟LoggerMiddleware
vi.mock('../../../src/server/api/logger/middleware', () => ({
  LoggerMiddleware: vi.fn().mockImplementation(() => ({
    middleware: vi.fn().mockReturnValue((req, res, next) => {
      req.logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        logValidationFailure: vi.fn(),
        logDeploymentStart: vi.fn(),
        logDeploymentSuccess: vi.fn(),
        logDeploymentFailure: vi.fn(),
        logArticlePublish: vi.fn(),
      }
      req.requestId = 'test-request-id'
      req.startTime = Date.now()
      next()
    }),
  }))
}))

// 模拟WebhookService
vi.mock('../../../src/server/services/webhook', () => ({
  WebhookService: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    createWebhook: vi.fn().mockResolvedValue({
      id: 'test-webhook-id',
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getAllWebhooks: vi.fn().mockReturnValue([]),
    getEnabledWebhooks: vi.fn().mockReturnValue([]),
    getWebhook: vi.fn().mockReturnValue(null),
    updateWebhook: vi.fn().mockResolvedValue({
      id: 'test-webhook-id',
      url: 'https://example.com/webhook',
      enabled: true,
      events: ['post.published'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    deleteWebhook: vi.fn().mockResolvedValue(true),
    testWebhook: vi.fn().mockResolvedValue({
      webhookId: 'test-webhook-id',
      url: 'https://example.com/webhook',
      success: true,
      statusCode: 200,
      response: 'OK',
      error: null,
      duration: 123,
      timestamp: new Date().toISOString(),
    }),
    subscribeToEvent: vi.fn().mockResolvedValue({
      id: 'test-subscription-id',
      webhookId: 'test-webhook-id',
      eventType: 'post.published',
      filter: null,
      enabled: true,
      createdAt: new Date().toISOString(),
    }),
    getSubscriptions: vi.fn().mockReturnValue([]),
    unsubscribeFromEvent: vi.fn().mockResolvedValue(true),
    getWebhookDeliveries: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({
      totalWebhooks: 0,
      enabledWebhooks: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingDeliveries: 0,
      averageResponseTime: 0,
      lastDelivery: null,
    }),
    enableWebhook: vi.fn().mockResolvedValue({
      id: 'test-webhook-id',
      enabled: true,
    }),
    disableWebhook: vi.fn().mockResolvedValue({
      id: 'test-webhook-id',
      enabled: false,
    }),
  }))
}))

// 模拟helpers
vi.mock('../../../src/server/api/helpers', () => ({
  createSuccessResponse: vi.fn((data, message) => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  })),
  createErrorResponse: vi.fn((message, details) => ({
    success: false,
    error: {
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  }))
}))

// 模拟webhook validators
vi.mock('../../../src/server/validators/webhook', () => ({
  validateWebhookCreate: vi.fn((req, res, next) => next()),
  validateWebhookUpdate: vi.fn((req, res, next) => next()),
  validateEventSubscription: vi.fn((req, res, next) => next()),
}))

// 设置测试超时
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 30000
})

// 全局测试清理
afterEach(() => {
  vi.clearAllMocks()
  vi.resetAllMocks()
})

// 测试工具函数
global.describe = describe
global.it = it
global.expect = expect
global.beforeEach = beforeEach
global.afterEach = afterEach
global.beforeAll = beforeAll
global.afterAll = afterAll

export {}