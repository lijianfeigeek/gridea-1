import {
  app, protocol, BrowserWindow, Menu, shell, ipcMain, IpcMainEvent, IpcMainInvokeEvent,
} from 'electron'
import {
  createProtocol,
} from 'vue-cli-plugin-electron-builder/lib'
import { autoUpdater } from 'electron-updater'
import { init } from '@sentry/electron/dist/main'
import App from './server/app'
import messages from './assets/locales-menu'
import initServer from './server'
import { initializeIPCHandlers, cleanupAPIServer } from './background/ipc-handlers'

// Sentry 初始化将在 app ready 事件中处理

const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow | null = null
let menu: Menu
let httpServer: any
let mainWindow: BrowserWindow | null = null

// API Server Management
interface APIServerConfig {
  port: number
  enabled: boolean
  auth: {
    enabled: boolean
    secretKey: string
  }
  cors: {
    enabled: boolean
    origins: string[]
  }
  logging: {
    enabled: boolean
    level: string
  }
}

interface APIServerStatus {
  running: boolean
  port: number
  url: string
  health: any
  error: string
  lastUpdate: string
}

// Global API server state
let apiServer: any = null
let configManager: any = null
let apiServerStatus: APIServerStatus = {
  running: false,
  port: 0,
  url: '',
  health: null,
  error: '',
  lastUpdate: new Date().toISOString(),
}

/**
 * Check if port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net')
    const server = net.createServer()

    server.listen(port, () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Find available port
 */
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  // Try to find available port sequentially
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const available = await isPortAvailable(port)
    if (available) {
      return port
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`)
}

/**
 * Handle port conflicts
 */
async function handlePortConflict(originalPort: number): Promise<number> {
  console.warn(`Port ${originalPort} is already in use, finding alternative port...`)

  try {
    const availablePort = await findAvailablePort(originalPort + 1)
    console.log(`Found available port: ${availablePort}`)
    return availablePort
  } catch (error) {
    console.error('Failed to find available port:', error)
    throw new Error(`Port ${originalPort} is in use and no alternative ports available`)
  }
}

/**
 * Validate API server configuration
 */
function validateAPIServerConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object')
    return { valid: false, errors }
  }

  // Validate port
  if (typeof config.port !== 'number' || config.port < 1024 || config.port > 65535) {
    errors.push('Port must be a number between 1024 and 65535')
  }

  // Validate auth configuration
  if (config.auth && typeof config.auth !== 'object') {
    errors.push('Auth configuration must be an object')
  } else if (config.auth) {
    if (typeof config.auth.enabled !== 'boolean') {
      errors.push('Auth enabled must be a boolean')
    }
    if (config.auth.enabled && typeof config.auth.secretKey !== 'string') {
      errors.push('Auth secret key must be a string when auth is enabled')
    }
  }

  // Validate CORS configuration
  if (config.cors && typeof config.cors !== 'object') {
    errors.push('CORS configuration must be an object')
  } else if (config.cors) {
    if (typeof config.cors.enabled !== 'boolean') {
      errors.push('CORS enabled must be a boolean')
    }
    if (config.cors.origins && !Array.isArray(config.cors.origins)) {
      errors.push('CORS origins must be an array')
    }
  }

  // Validate logging configuration
  if (config.logging && typeof config.logging !== 'object') {
    errors.push('Logging configuration must be an object')
  } else if (config.logging) {
    if (typeof config.logging.enabled !== 'boolean') {
      errors.push('Logging enabled must be a boolean')
    }
    if (config.logging.level && !['error', 'warn', 'info', 'debug'].includes(config.logging.level)) {
      errors.push('Logging level must be one of: error, warn, info, debug')
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Broadcast API server status to all windows
 */
function broadcastAPIServerStatus(): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    window.webContents.send('api-server-status-changed', { ...apiServerStatus })
  })
}

/**
 * Log API server error with structured logging
 */
function logAPIServerError(error: Error, context: string): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
    code: (error as any).code,
    errno: (error as any).errno,
  }

  console.error('API Server Error:', JSON.stringify(errorInfo, null, 2))

  // Send error to renderer processes
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    window.webContents.send('api-server-error', errorInfo)
  })
}

// Standard scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true } }])
function createWindow() {
  // Create the browser window.
  const winOption: any = {
    width: 1200,
    height: 800,
    minHeight: 642,
    minWidth: 1000,
    webPreferences: {
      webSecurity: false, // FIXED: Not allowed to load local resource
      nodeIntegration: true,
      enableRemoteModule: true, // FIXED: 兼容 electron@11.0.1
      contextIsolation: false, // FIXED: 解决 require is not defined 问题
    },
    // frame: false, // 去除默认窗口栏
    titleBarStyle: 'hiddenInset' as ('hidden' | 'default' | 'hiddenInset' | 'customButtonsOnHover' | undefined),
  }

  if (process.platform !== 'darwin') {
    winOption.icon = `${__dirname}/app-icons/gridea.png`
  }

  win = new BrowserWindow(winOption)
  mainWindow = win
  win.setTitle('Gridea')

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) { win.webContents.openDevTools() }
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
    autoUpdater.checkForUpdatesAndNotify()
  }

  win.on('closed', () => {
    win = null
    mainWindow = null
  })

  const locale: string = app.getLocale() || 'zh-CN'
  const menuLabels = messages[locale] || messages['zh-CN']
  // menu
  const template: any = [
    {
      label: menuLabels.edit,
      submenu: [
        {
          label: menuLabels.save,
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (win) {
              win.webContents.send('click-menu-save')
            }
          },
        },
        { type: 'separator' },
        { role: 'undo', label: menuLabels.undo },
        { role: 'redo', label: menuLabels.redo },
        { type: 'separator' },
        { role: 'cut', label: menuLabels.cut },
        { role: 'copy', label: menuLabels.copy },
        { role: 'paste', label: menuLabels.paste },
        { role: 'delete', label: menuLabels.delete },
        { role: 'selectall', label: menuLabels.selectall },
        { role: 'toggledevtools', label: menuLabels.toggledevtools },
        { type: 'separator' },
        { role: 'close', label: menuLabels.close },
        { role: 'quit', label: menuLabels.quit },
      ],
    },
    {
      role: 'windowMenu',
    },
    {
      role: menuLabels.help,
      submenu: [
        {
          label: 'Learn More',
          click() { shell.openExternal('https://github.com/getgridea/gridea') },
        },
      ],
    },
  ]

  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  const s = initServer()
  httpServer = s.server

  const setting = {
    mainWindow: win,
    app,
    baseDir: __dirname,
    previewServer: s.app,
  }

  // Init app
  const appInstance = new App(setting)
  console.log('Main process runing...', appInstance.appDir) // DELETE ME
}

// Quit when all windows are closed.
app.on('window-all-closed', async () => {
  // 清理 API 服务器
  try {
    await cleanupAPIServer()
  } catch (error) {
    console.warn('API server cleanup failed:', error)
  }

  // 关闭 HTTP 服务器
  httpServer && httpServer.close()

  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // 初始化 Sentry
  try {
    init({
      dsn: 'https://6a6dacc57a6a4e27a88eb31596c152f8@sentry.io/1887150',
      debug: false,
      // 对于 Electron v13，我们需要禁用一些可能导致问题的功能
      autoSessionTracking: false,
    })
  } catch (error) {
    console.warn('Sentry initialization failed:', error)
  }

  // 初始化 IPC 处理器
  try {
    initializeIPCHandlers()
    console.log('IPC handlers initialized successfully')
  } catch (error) {
    console.warn('IPC handlers initialization failed:', error)
  }

  // 注册 API 服务器 IPC 处理器
  try {
    // Note: API server IPC handlers are already initialized via initializeIPCHandlers() above
    console.log('API server IPC handlers registration checked')
  } catch (error) {
    console.warn('API server IPC handlers registration failed:', error)
  }

  // if (isDevelopment && !process.env.IS_TEST) {
  //   // Install Vue Devtools
  //   await installVueDevtools()
  // }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', async (data) => {
      if (data === 'graceful-exit') {
        await cleanupAPIServer()
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', async () => {
      await cleanupAPIServer()
      app.quit()
    })
  }
}

// 应用退出前清理
app.on('before-quit', async () => {
  try {
    await cleanupAPIServer()
  } catch (error) {
    console.warn('API server cleanup failed on app quit:', error)
  }
})


/**
 * Start the API Server
 */
async function handleStartAPIServer(
  event: IpcMainInvokeEvent,
  config: APIServerConfig,
): Promise<{ success: boolean; url?: string; error?: string; code?: string }> {
  try {
    console.log('Starting API server with config:', config)

    // Validate configuration
    const validation = validateAPIServerConfig(config)
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
    }

    // Load server modules lazily
    if (!apiServer) {
      const { APIServer } = await import('./server/api/index')
      apiServer = new APIServer()
    }

    // Initialize config manager if not exists
    if (!configManager) {
      const { ConfigManager } = await import('./server/api/config')
      configManager = new ConfigManager()
    }

    // Update configuration
    const serverConfig = {
      port: config.port,
      host: 'localhost',
      auth: {
        enabled: config.auth.enabled,
        secretKey: config.auth.secretKey,
        tokenExpiry: '24h',
      },
      cors: {
        origin: config.cors.origins || ['*'],
        credentials: true,
        optionsSuccessStatus: 200,
      },
      body: {
        limit: '10mb',
        extended: true,
      },
      logging: {
        level: config.logging.level || 'info',
        format: 'json',
      },
    }

    configManager.updateConfig(serverConfig)

    // Check port availability
    const portAvailable = await isPortAvailable(config.port)
    if (!portAvailable) {
      const alternativePort = await handlePortConflict(config.port)
      config.port = alternativePort
    }

    // Start server
    await apiServer.start(config.port)

    const url = `http://localhost:${config.port}`

    // Update server status
    apiServerStatus = {
      running: true,
      port: config.port,
      url,
      health: await apiServer.getHealthStatus(),
      error: '',
      lastUpdate: new Date().toISOString(),
    }

    // Broadcast status change to all windows
    broadcastAPIServerStatus()

    console.log('API server started successfully:', url)
    return { success: true, url }
  } catch (error) {
    logAPIServerError(error as Error, 'handleStartAPIServer')

    const errorMessage = error instanceof Error ? error.message : 'Failed to start API server'
    const errorCode = (error as any).code || 'SERVER_START_FAILED'

    // Update server status
    apiServerStatus = {
      running: false,
      port: 0,
      url: '',
      health: null,
      error: errorMessage,
      lastUpdate: new Date().toISOString(),
    }

    // Broadcast status change
    broadcastAPIServerStatus()

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    }
  }
}

/**
 * Stop the API Server
 */
async function handleStopAPIServer(
  event: IpcMainInvokeEvent,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    console.log('Stopping API server...')

    if (!apiServer || !apiServer.isServerRunning()) {
      console.log('API server is not running')
      return { success: true }
    }

    await apiServer.stop()

    // Update server status
    apiServerStatus = {
      running: false,
      port: 0,
      url: '',
      health: null,
      error: '',
      lastUpdate: new Date().toISOString(),
    }

    // Broadcast status change
    broadcastAPIServerStatus()

    console.log('API server stopped successfully')
    return { success: true }
  } catch (error) {
    logAPIServerError(error as Error, 'handleStopAPIServer')

    const errorMessage = error instanceof Error ? error.message : 'Failed to stop API server'
    const errorCode = (error as any).code || 'SERVER_STOP_FAILED'

    // Update server status
    apiServerStatus.error = errorMessage
    apiServerStatus.lastUpdate = new Date().toISOString()

    // Broadcast status change
    broadcastAPIServerStatus()

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    }
  }
}

/**
 * Get API Server Status
 */
async function handleGetAPIServerStatus(
  event: IpcMainInvokeEvent,
): Promise<APIServerStatus> {
  try {
    if (apiServer && apiServer.isServerRunning()) {
      const health = await apiServer.getHealthStatus()
      apiServerStatus.health = health
      apiServerStatus.running = true
    } else {
      apiServerStatus.running = false
    }

    apiServerStatus.lastUpdate = new Date().toISOString()
    return { ...apiServerStatus }
  } catch (error) {
    logAPIServerError(error as Error, 'handleGetAPIServerStatus')

    apiServerStatus = {
      running: false,
      port: 0,
      url: '',
      health: null,
      error: error instanceof Error ? error.message : 'Failed to get server status',
      lastUpdate: new Date().toISOString(),
    }

    return { ...apiServerStatus }
  }
}

/**
 * Open API Documentation
 */
async function handleOpenAPIDocumentation(
  event: IpcMainInvokeEvent,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!apiServerStatus.running || !apiServerStatus.url) {
      throw new Error('API server is not running')
    }

    const docUrl = `${apiServerStatus.url}/api/health`

    // Open in default browser
    await shell.openExternal(docUrl)

    console.log('Opened API documentation:', docUrl)
    return { success: true, url: docUrl }
  } catch (error) {
    logAPIServerError(error as Error, 'handleOpenAPIDocumentation')

    const errorMessage = error instanceof Error ? error.message : 'Failed to open API documentation'

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Save API Settings
 */
async function handleSaveAPISettings(
  event: IpcMainInvokeEvent,
  settings: APIServerConfig,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    console.log('Saving API settings:', settings)

    // Validate settings
    const validation = validateAPIServerConfig(settings)
    if (!validation.valid) {
      throw new Error(`Settings validation failed: ${validation.errors.join(', ')}`)
    }

    // Load config manager if not exists
    if (!configManager) {
      const { ConfigManager } = await import('./server/api/config')
      configManager = new ConfigManager()
    }

    // Convert settings to config format
    const apiConfig = {
      port: settings.port,
      host: 'localhost',
      auth: {
        enabled: settings.auth.enabled,
        secretKey: settings.auth.secretKey,
        tokenExpiry: '24h',
      },
      cors: {
        origin: settings.cors.origins || ['*'],
        credentials: true,
        optionsSuccessStatus: 200,
      },
      body: {
        limit: '10mb',
        extended: true,
      },
      logging: {
        level: settings.logging.level || 'info',
        format: 'json',
      },
    }

    // Save configuration
    configManager.updateConfig(apiConfig)
    configManager.saveConfig()

    console.log('API settings saved successfully')
    return { success: true }
  } catch (error) {
    logAPIServerError(error as Error, 'handleSaveAPISettings')

    const errorMessage = error instanceof Error ? error.message : 'Failed to save API settings'
    const errorCode = (error as any).code || 'SAVE_SETTINGS_FAILED'

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    }
  }
}


// API Server cleanup function - redefined to avoid conflict
async function cleanupLocalAPIServer(): Promise<void> {
  try {
    if (apiServer && apiServer.isServerRunning()) {
      console.log('Cleaning up API server...')
      await apiServer.stop()
    }

    apiServer = null
    configManager = null

    // Reset status
    apiServerStatus = {
      running: false,
      port: 0,
      url: '',
      health: null,
      error: '',
      lastUpdate: new Date().toISOString(),
    }

    console.log('API server cleanup completed')
  } catch (error) {
    logAPIServerError(error as Error, 'cleanupLocalAPIServer')
  }
}

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
