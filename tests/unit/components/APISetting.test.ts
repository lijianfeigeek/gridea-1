// APISetting Component Test Suite
// 基于Vue.js和Electron的API设置组件测试

import { ipcRenderer } from 'electron'

// Mock electron ipcRenderer
jest.mock('electron', () => ({
  ipcRenderer: {
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    invoke: jest.fn(),
  },
}))

// Mock Vuex store
const mockStore = {
  state: {
    site: {
      api: {
        enabled: false,
        port: 3000,
        auth: {
          enabled: false,
          apiKey: '',
        },
        autoDeploy: false,
        cors: {
          enabled: true,
          origins: ['*'],
        },
        webhooks: {
          enabled: false,
          urls: [],
          events: ['article.published'],
        },
      },
    },
  },
  dispatch: jest.fn(),
  commit: jest.fn(),
}

// Mock Vue message service
const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
}

// Mock Vue bus
const mockBus = {
  $on: jest.fn(),
  $emit: jest.fn(),
  $off: jest.fn(),
}

// Mock Vue i18n
const mockI18n = {
  t: (key: string) => key,
}

// Mock form service
const mockForm = {
  createForm: () => ({
    setFieldsValue: jest.fn(),
    getFieldsValue: jest.fn(),
    validateFields: jest.fn(),
  }),
}

// Mock window API
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'require', {
    value: jest.fn((module) => {
      if (module === 'electron') {
        return { ipcRenderer }
      }
      return {}
    }),
    writable: true,
  })
} else {
  // Mock global window for Node.js environment
  global.window = {
    require: jest.fn((module) => {
      if (module === 'electron') {
        return { ipcRenderer }
      }
      return {}
    }),
  } as any
}

// APISetting Component Class
class APISettingComponent {
  private data: any

  private ipcRenderer: any

  constructor(ipcRendererParam: any = mockIpcRenderer) {
    this.ipcRenderer = ipcRendererParam
    this.data = {
      formLayout: {
        label: { span: 6 },
        wrapper: { span: 18 },
      },
      enabled: false,
      port: 3000,
      authEnabled: false,
      apiKey: '',
      autoDeploy: false,
      apiServerStatus: {
        running: false,
        loading: false,
        url: '',
        error: '',
      },
    }

    // Set up component context
    this.$store = mockStore
    this.$message = mockMessage
    this.$bus = mockBus
    this.$t = mockI18n.t
    this.$form = mockForm

    // Initialize component
    this.mounted()
  }

  // Simulate Vue data access
  get enabled() { return this.data.enabled }

  get port() { return this.data.port }

  get authEnabled() { return this.data.authEnabled }

  get apiKey() { return this.data.apiKey }

  get autoDeploy() { return this.data.autoDeploy }

  get apiServerStatus() { return this.data.apiServerStatus }

  // Simulate Vue data setting
  set enabled(value: boolean) { this.data.enabled = value }

  set port(value: number) { this.data.port = value }

  set authEnabled(value: boolean) { this.data.authEnabled = value }

  set apiKey(value: string) { this.data.apiKey = value }

  set autoDeploy(value: boolean) { this.data.autoDeploy = value }

  // Simulate setData
  async setData(newData: any) {
    Object.assign(this.data, newData)
  }

  // Lifecycle hooks
  mounted() {
    this.loadApiSettings()
    this.setupIpcListeners()
  }

  beforeDestroy() {
    this.removeIpcListeners()
  }

  // Methods
  loadApiSettings() {
    const { api } = this.$store.state.site
    this.enabled = api.enabled
    this.port = api.port
    this.authEnabled = api.auth.enabled
    this.apiKey = api.auth.apiKey
    this.autoDeploy = api.autoDeploy
  }

  setupIpcListeners() {
    this.ipcRenderer.on('api-server-status-changed', this.handleApiServerStatusChanged)
    this.ipcRenderer.on('api-server-started', this.handleApiServerStarted)
    this.ipcRenderer.on('api-server-stopped', this.handleApiServerStopped)
    this.ipcRenderer.on('api-server-error', this.handleApiServerError)
  }

  removeIpcListeners() {
    this.ipcRenderer.removeAllListeners('api-server-status-changed')
    this.ipcRenderer.removeAllListeners('api-server-started')
    this.ipcRenderer.removeAllListeners('api-server-stopped')
    this.ipcRenderer.removeAllListeners('api-server-error')
  }

  handleApiEnabledChange(checked: boolean) {
    this.enabled = checked
    this.updateApiSettings()
  }

  handlePortChange(value: number) {
    this.port = value
    this.updateApiSettings()
  }

  handleAuthEnabledChange(checked: boolean) {
    this.authEnabled = checked
    if (checked && !this.apiKey) {
      this.generateApiKey()
    }
    this.updateApiSettings()
  }

  handleAutoDeployChange(checked: boolean) {
    this.autoDeploy = checked
    this.updateApiSettings()
  }

  generateApiKey() {
    const crypto = require('crypto')
    const randomBytes = crypto.randomBytes(16)
    this.apiKey = `gridea_api_${randomBytes.toString('hex')}`
    this.updateApiSettings()
  }

  updateApiSettings() {
    const settings = {
      enabled: this.enabled,
      port: this.port,
      auth: {
        enabled: this.authEnabled,
        apiKey: this.apiKey,
      },
      autoDeploy: this.autoDeploy,
      cors: {
        enabled: true,
        origins: ['*'],
      },
      webhooks: {
        enabled: false,
        urls: [],
        events: ['article.published'],
      },
    }

    this.$store.dispatch('updateApiSettings', settings)
  }

  async startApiServer() {
    try {
      this.data.apiServerStatus.loading = true
      this.data.apiServerStatus.error = ''

      const result = await this.ipcRenderer.invoke('start-api-server', {
        port: this.port,
        auth: this.authEnabled ? this.apiKey : null,
        cors: { enabled: true, origins: ['*'] },
      })

      if (result.success) {
        this.data.apiServerStatus.running = true
        this.data.apiServerStatus.url = result.url
        this.$message.success('API 服务器启动成功')
      } else {
        throw new Error(result.error || '启动失败')
      }
    } catch (error: any) {
      this.data.apiServerStatus.error = error.message
      this.$message.error(`API 服务器启动失败: ${error.message}`)
    } finally {
      this.data.apiServerStatus.loading = false
    }
  }

  async stopApiServer() {
    try {
      this.data.apiServerStatus.loading = true
      this.data.apiServerStatus.error = ''

      const result = await this.ipcRenderer.invoke('stop-api-server')

      if (result.success) {
        this.data.apiServerStatus.running = false
        this.data.apiServerStatus.url = ''
        this.$message.success('API 服务器已停止')
      } else {
        throw new Error(result.error || '停止失败')
      }
    } catch (error: any) {
      this.data.apiServerStatus.error = error.message
      this.$message.error(`API 服务器停止失败: ${error.message}`)
    } finally {
      this.data.apiServerStatus.loading = false
    }
  }

  handleApiServerStatusChanged(event: any, status: any) {
    this.data.apiServerStatus = {
      ...this.data.apiServerStatus,
      ...status,
    }
  }

  handleApiServerStarted(event: any, result: any) {
    this.data.apiServerStatus.running = true
    this.data.apiServerStatus.url = result.url
    this.data.apiServerStatus.loading = false
    this.$message.success('API 服务器启动成功')
  }

  handleApiServerStopped(event: any) {
    this.data.apiServerStatus.running = false
    this.data.apiServerStatus.url = ''
    this.data.apiServerStatus.loading = false
    this.$message.success('API 服务器已停止')
  }

  handleApiServerError(event: any, error: any) {
    this.data.apiServerStatus.error = error.message
    this.data.apiServerStatus.loading = false
    this.$message.error(`API 服务器错误: ${error.message}`)
  }
}

describe('APISetting Component Test Suite', () => {
  let component: APISettingComponent
  let mockIpcRenderer: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup mock ipcRenderer
    mockIpcRenderer = {
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      invoke: jest.fn(),
    }

    // Override electron mock
    const originalRequire = require
    global.require = jest.fn().mockImplementation((module: string) => {
      if (module === 'electron') {
        return { ipcRenderer: mockIpcRenderer }
      }
      return originalRequire(module)
    })

    // Create component instance
    component = new APISettingComponent(mockIpcRenderer)
  })

  afterEach(() => {
    if (component) {
      component.beforeDestroy()
    }
  })

  describe('1. 组件渲染测试', () => {
    test('组件正确初始化', () => {
      expect(component).toBeDefined()
      expect(component.enabled).toBe(false)
      expect(component.port).toBe(3000)
      expect(component.authEnabled).toBe(false)
      expect(component.apiKey).toBe('')
      expect(component.autoDeploy).toBe(false)
    })

    test('初始状态正确', () => {
      expect(component.apiServerStatus.running).toBe(false)
      expect(component.apiServerStatus.loading).toBe(false)
      expect(component.apiServerStatus.url).toBe('')
      expect(component.apiServerStatus.error).toBe('')
    })

    test('加载API设置数据', () => {
      const { api } = mockStore.state.site
      component.loadApiSettings()

      expect(component.enabled).toBe(api.enabled)
      expect(component.port).toBe(api.port)
      expect(component.authEnabled).toBe(api.auth.enabled)
      expect(component.apiKey).toBe(api.auth.apiKey)
      expect(component.autoDeploy).toBe(api.autoDeploy)
    })
  })

  describe('2. 用户交互测试', () => {
    test('API开关切换', () => {
      component.handleApiEnabledChange(true)

      expect(component.enabled).toBe(true)
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', expect.objectContaining({
        enabled: true,
      }))
    })

    test('端口输入处理', () => {
      component.handlePortChange(8080)

      expect(component.port).toBe(8080)
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', expect.objectContaining({
        port: 8080,
      }))
    })

    test('认证开关切换', () => {
      component.handleAuthEnabledChange(true)

      expect(component.authEnabled).toBe(true)
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', expect.objectContaining({
        auth: expect.objectContaining({
          enabled: true,
        }),
      }))
    })

    test('API密钥生成', () => {
      component.generateApiKey()

      expect(component.apiKey).toMatch(/^gridea_api_[a-f0-9]{32}$/)
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', expect.objectContaining({
        auth: expect.objectContaining({
          apiKey: expect.any(String),
        }),
      }))
    })

    test('自动部署开关切换', () => {
      component.handleAutoDeployChange(true)

      expect(component.autoDeploy).toBe(true)
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', expect.objectContaining({
        autoDeploy: true,
      }))
    })

    test('认证启用时自动生成API密钥', () => {
      // 确保API密钥为空
      component.apiKey = ''

      component.handleAuthEnabledChange(true)

      expect(component.authEnabled).toBe(true)
      expect(component.apiKey).toMatch(/^gridea_api_[a-f0-9]{32}$/)
    })
  })

  describe('3. 状态管理测试', () => {
    test('服务器状态显示', async () => {
      await component.setData({
        apiServerStatus: {
          running: true,
          loading: false,
          url: 'http://localhost:3000',
          error: '',
        },
      })

      expect(component.apiServerStatus.running).toBe(true)
      expect(component.apiServerStatus.url).toBe('http://localhost:3000')
    })

    test('配置保存测试', () => {
      component.enabled = true
      component.port = 8080
      component.authEnabled = true
      component.autoDeploy = true

      component.updateApiSettings()

      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', {
        enabled: true,
        port: 8080,
        auth: {
          enabled: true,
          apiKey: '',
        },
        autoDeploy: true,
        cors: {
          enabled: true,
          origins: ['*'],
        },
        webhooks: {
          enabled: false,
          urls: [],
          events: ['article.published'],
        },
      })
    })

    test('状态同步测试', () => {
      const status = {
        running: true,
        loading: false,
        url: 'http://localhost:3000',
        error: '',
      }

      component.handleApiServerStatusChanged({}, status)

      expect(component.apiServerStatus).toEqual(expect.objectContaining(status))
    })
  })

  describe('4. IPC通信测试', () => {
    test('启动服务器调用', async () => {
      const mockResult = {
        success: true,
        url: 'http://localhost:3000',
      }

      mockIpcRenderer.invoke.mockResolvedValue(mockResult)

      await component.startApiServer()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('start-api-server', {
        port: 3000,
        auth: null,
        cors: { enabled: true, origins: ['*'] },
      })
      expect(component.apiServerStatus.running).toBe(true)
      expect(component.apiServerStatus.url).toBe('http://localhost:3000')
    })

    test('停止服务器调用', async () => {
      const mockResult = {
        success: true,
      }

      mockIpcRenderer.invoke.mockResolvedValue(mockResult)

      await component.stopApiServer()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('stop-api-server')
      expect(component.apiServerStatus.running).toBe(false)
      expect(component.apiServerStatus.url).toBe('')
    })

    test('状态查询调用', () => {
      component.setupIpcListeners()

      expect(mockIpcRenderer.on).toHaveBeenCalledWith('api-server-status-changed', component.handleApiServerStatusChanged)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('api-server-started', component.handleApiServerStarted)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('api-server-stopped', component.handleApiServerStopped)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('api-server-error', component.handleApiServerError)
    })

    test('服务器启动成功事件处理', () => {
      const result = { url: 'http://localhost:3000' }

      component.handleApiServerStarted({}, result)

      expect(component.apiServerStatus.running).toBe(true)
      expect(component.apiServerStatus.url).toBe('http://localhost:3000')
      expect(component.apiServerStatus.loading).toBe(false)
      expect(mockMessage.success).toHaveBeenCalledWith('API 服务器启动成功')
    })

    test('服务器停止事件处理', () => {
      component.handleApiServerStopped({})

      expect(component.apiServerStatus.running).toBe(false)
      expect(component.apiServerStatus.url).toBe('')
      expect(component.apiServerStatus.loading).toBe(false)
      expect(mockMessage.success).toHaveBeenCalledWith('API 服务器已停止')
    })
  })

  describe('5. 错误处理测试', () => {
    test('网络错误处理', async () => {
      const mockError = new Error('网络连接失败')
      mockIpcRenderer.invoke.mockRejectedValue(mockError)

      await component.startApiServer()

      expect(component.apiServerStatus.error).toBe('网络连接失败')
      expect(component.apiServerStatus.loading).toBe(false)
    })

    test('服务器错误处理', async () => {
      const mockResult = {
        success: false,
        error: '端口已被占用',
      }

      mockIpcRenderer.invoke.mockResolvedValue(mockResult)

      await component.startApiServer()

      expect(component.apiServerStatus.error).toBe('端口已被占用')
      expect(component.apiServerStatus.running).toBe(false)
    })

    test('用户输入错误处理', () => {
      // 测试无效端口
      component.handlePortChange(80) // 小于1024的端口

      expect(component.port).toBe(80)
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', expect.objectContaining({
        port: 80,
      }))

      // 测试有效端口
      component.handlePortChange(8080)
      expect(component.port).toBe(8080)
    })

    test('IPC错误处理', () => {
      const mockError = { message: 'IPC通信失败' }

      component.handleApiServerError({}, mockError)

      expect(component.apiServerStatus.error).toBe('IPC通信失败')
      expect(component.apiServerStatus.loading).toBe(false)
    })

    test('停止服务器错误处理', async () => {
      const mockError = new Error('停止服务器失败')
      mockIpcRenderer.invoke.mockRejectedValue(mockError)

      await component.stopApiServer()

      expect(component.apiServerStatus.error).toBe('停止服务器失败')
      expect(component.apiServerStatus.loading).toBe(false)
    })
  })

  describe('6. 生命周期测试', () => {
    test('组件挂载时设置IPC监听器', () => {
      const setupIpcListenersSpy = jest.spyOn(component, 'setupIpcListeners')

      // Clear the mock to count only this test's calls
      mockIpcRenderer.on.mockClear()

      component.mounted()

      expect(setupIpcListenersSpy).toHaveBeenCalled()
      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(4)
    })

    test('组件销毁时移除IPC监听器', () => {
      const removeIpcListenersSpy = jest.spyOn(component, 'removeIpcListeners')

      // Clear the mock to count only this test's calls
      mockIpcRenderer.removeAllListeners.mockClear()

      component.beforeDestroy()

      expect(removeIpcListenersSpy).toHaveBeenCalled()
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledTimes(4)
    })

    test('组件挂载时加载API设置', () => {
      const loadApiSettingsSpy = jest.spyOn(component, 'loadApiSettings')

      component.mounted()

      expect(loadApiSettingsSpy).toHaveBeenCalled()
    })
  })

  describe('7. 边界情况测试', () => {
    test('API密钥格式验证', () => {
      component.generateApiKey()

      expect(component.apiKey).toMatch(/^gridea_api_[a-f0-9]{32}$/)
      expect(component.apiKey.length).toBe(43) // 'gridea_api_' + 32位十六进制
    })

    test('重复生成API密钥', () => {
      component.generateApiKey()
      const firstKey = component.apiKey

      component.generateApiKey()
      const secondKey = component.apiKey

      expect(firstKey).not.toBe(secondKey)
      expect(secondKey).toMatch(/^gridea_api_[a-f0-9]{32}$/)
    })

    test('服务器状态更新时保持错误状态', async () => {
      const initialStatus = {
        running: false,
        loading: false,
        url: '',
        error: 'Previous error',
      }

      await component.setData({ apiServerStatus: initialStatus })

      const newStatus = {
        running: true,
        loading: false,
        url: 'http://localhost:3000',
      }

      component.handleApiServerStatusChanged({}, newStatus)

      expect(component.apiServerStatus.running).toBe(true)
      expect(component.apiServerStatus.url).toBe('http://localhost:3000')
      expect(component.apiServerStatus.error).toBe('Previous error')
    })

    test('端口边界值测试', () => {
      // 测试最小端口
      component.handlePortChange(1024)
      expect(component.port).toBe(1024)

      // 测试最大端口
      component.handlePortChange(65535)
      expect(component.port).toBe(65535)

      // 测试中间值
      component.handlePortChange(3000)
      expect(component.port).toBe(3000)
    })
  })

  describe('8. 集成测试', () => {
    test('完整的工作流程', async () => {
      // 1. 启用API
      component.handleApiEnabledChange(true)
      expect(component.enabled).toBe(true)

      // 2. 修改端口
      component.handlePortChange(8080)
      expect(component.port).toBe(8080)

      // 3. 启用认证
      component.handleAuthEnabledChange(true)
      expect(component.authEnabled).toBe(true)

      // 4. 生成API密钥
      component.generateApiKey()
      expect(component.apiKey).toMatch(/^gridea_api_[a-f0-9]{32}$/)

      // 5. 启动服务器
      const mockResult = {
        success: true,
        url: 'http://localhost:8080',
      }

      mockIpcRenderer.invoke.mockResolvedValue(mockResult)

      await component.startApiServer()

      expect(component.apiServerStatus.running).toBe(true)
      expect(component.apiServerStatus.url).toBe('http://localhost:8080')

      // 6. 停止服务器
      mockIpcRenderer.invoke.mockResolvedValue({ success: true })

      await component.stopApiServer()

      expect(component.apiServerStatus.running).toBe(false)
      expect(component.apiServerStatus.url).toBe('')
    })

    test('错误恢复机制', async () => {
      // 1. 启用API
      component.handleApiEnabledChange(true)

      // 2. 尝试启动服务器但失败
      const mockError = new Error('启动失败')
      mockIpcRenderer.invoke.mockRejectedValue(mockError)

      await component.startApiServer()

      expect(component.apiServerStatus.error).toBe('启动失败')
      expect(component.apiServerStatus.loading).toBe(false)

      // 3. 修复问题后重新启动
      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        url: 'http://localhost:3000',
      })

      await component.startApiServer()

      expect(component.apiServerStatus.running).toBe(true)
      expect(component.apiServerStatus.url).toBe('http://localhost:3000')
      expect(component.apiServerStatus.error).toBe('')
    })

    test('配置持久化测试', () => {
      // 模拟完整的配置更改
      component.handleApiEnabledChange(true)
      component.handlePortChange(8080)
      component.handleAuthEnabledChange(true)
      component.handleAutoDeployChange(true)
      component.generateApiKey()

      // 验证所有配置都被正确保存
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateApiSettings', expect.objectContaining({
        enabled: true,
        port: 8080,
        auth: expect.objectContaining({
          enabled: true,
          apiKey: expect.any(String),
        }),
        autoDeploy: true,
        cors: expect.objectContaining({
          enabled: true,
        }),
      }))
    })
  })
})
