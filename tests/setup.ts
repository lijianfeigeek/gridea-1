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
    removeAllListeners: vi.fn()
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
  const mockFs = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    statSync: vi.fn(),
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
    promises: {
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
  }

  // 添加 promisified 方法以支持 Bluebird.promisifyAll
  const promisifiedMethods = {}
  Object.keys(mockFs).forEach(key => {
    if (typeof mockFs[key] === 'function' && !key.startsWith('promises')) {
      promisifiedMethods[`${key}Async`] = vi.fn()
    }
  })

  return {
    ...mockFs,
    ...promisifiedMethods,
    // Bluebird 可能期望的额外方法
    open: vi.fn(),
    close: vi.fn(),
    read: vi.fn(),
    write: vi.fn(),
    fstat: vi.fn(),
    ftruncate: vi.fn(),
    futimes: vi.fn(),
    fsync: vi.fn(),
    fdatasync: vi.fn(),
  }
})

// 模拟LowDB
vi.mock('lowdb', () => ({
  Low: vi.fn().mockImplementation(() => ({
    data: {},
    read: vi.fn(),
    write: vi.fn()
  })),
  JSONFile: vi.fn()
}))

// 设置测试超时
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 10000
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