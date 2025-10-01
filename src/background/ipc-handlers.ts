import { ipcMain, IpcMainInvokeEvent } from 'electron'

// Global API server instance
let apiServer: any = null
let configManager: any = null
let appInstance: any = null

// Lazy load server modules
let APIServer: any = null
let ConfigManager: any = null

// Log management
const logBuffer: Array<{
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  details?: string
}> = []
const maxLogBuffer = 1000

// Original console methods to capture logs
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
}

// Enable/disable log capture
let logCaptureEnabled = false

/**
 * Add log entry to buffer
 */
function addLogEntry(level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: string): void {
  const logEntry = {
    timestamp: Date.now(),
    level,
    message,
    details,
  }

  logBuffer.push(logEntry)

  // Maintain buffer size
  if (logBuffer.length > maxLogBuffer) {
    logBuffer.splice(0, logBuffer.length - maxLogBuffer)
  }

  // Send log to all renderer processes
  const allWindows = require('electron').BrowserWindow.getAllWindows()
  allWindows.forEach((window: any) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('api-log-message', logEntry)
    }
  })
}

/**
 * Enhanced console methods with log capture
 */
const enhancedConsole = {
  log: (...args: any[]) => {
    originalConsole.log(...args)
    addLogEntry('info', args.join(' '))
  },
  info: (...args: any[]) => {
    originalConsole.info(...args)
    addLogEntry('info', args.join(' '))
  },
  warn: (...args: any[]) => {
    originalConsole.warn(...args)
    addLogEntry('warn', args.join(' '))
  },
  error: (...args: any[]) => {
    originalConsole.error(...args)
    addLogEntry('error', args.join(' '))
  },
  debug: (...args: any[]) => {
    originalConsole.debug(...args)
    addLogEntry('debug', args.join(' '))
  },
}

/**
 * Get API server logs
 */
async function handleGetAPIServerLogs(
  event: IpcMainInvokeEvent,
  options: { limit?: number; level?: string } = {},
): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    let logs = [...logBuffer]

    // Filter by level if specified
    if (options.level && options.level !== 'all') {
      logs = logs.filter(log => log.level === options.level)
    }

    // Limit results if specified
    if (options.limit && options.limit > 0) {
      logs = logs.slice(-options.limit)
    }

    return { success: true, logs }
  } catch (error) {
    console.error('Failed to get API server logs:', error)
    return {
      success: false,
      error: error.message || 'Failed to get logs',
      code: error.code || 'GET_LOGS_FAILED',
    }
  }
}

/**
 * Clear API server logs
 */
async function handleClearAPIServerLogs(
  event: IpcMainInvokeEvent,
): Promise<{ success: boolean; error?: string }> {
  try {
    logBuffer.length = 0
    return { success: true }
  } catch (error) {
    console.error('Failed to clear API server logs:', error)
    return {
      success: false,
      error: error.message || 'Failed to clear logs',
      code: error.code || 'CLEAR_LOGS_FAILED',
    }
  }
}

/**
 * Set log capture
 */
async function handleSetLogCapture(
  event: IpcMainInvokeEvent,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (enabled && !logCaptureEnabled) {
      // Enable log capture
      Object.assign(console, enhancedConsole)
      logCaptureEnabled = true
      addLogEntry('info', 'Log capture enabled for API server')
    } else if (!enabled && logCaptureEnabled) {
      // Disable log capture
      Object.assign(console, originalConsole)
      logCaptureEnabled = false
      originalConsole.info('Log capture disabled for API server')
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to set log capture:', error)
    return {
      success: false,
      error: error.message || 'Failed to set log capture',
      code: error.code || 'SET_LOG_CAPTURE_FAILED',
    }
  }
}

/**
 * Test log functionality
 */
async function handleTestLog(
  event: IpcMainInvokeEvent,
  message: string = 'Test log message',
): Promise<{ success: boolean; error?: string }> {
  try {
    if (logCaptureEnabled) {
      addLogEntry('info', `Test log: ${message}`)
      console.log(`Test log from enhanced console: ${message}`)
      console.warn(`Test warning: ${message}`)
      console.error(`Test error: ${message}`)
    } else {
      originalConsole.log(`Test log from original console: ${message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to test log:', error)
    return {
      success: false,
      error: error.message || 'Failed to test log',
      code: error.code || 'TEST_LOG_FAILED',
    }
  }
}

async function loadServerModules() {
  if (!APIServer) {
    const { APIServer: ImportedAPIServer } = await import('../server/api/index')
    APIServer = ImportedAPIServer
  }
  if (!ConfigManager) {
    const { ConfigManager: ImportedConfigManager } = await import('../server/api/config')
    ConfigManager = ImportedConfigManager
  }
}

/**
 * Start the API server
 */
async function handleStartAPIServer(
  event: IpcMainInvokeEvent,
  config: { port: number; host?: string; auth?: string; cors: { enabled: boolean; origins: string[] } },
): Promise<{ success: boolean; url?: string; error?: string; code?: string }> {
  try {
    // Validate configuration
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration object')
    }

    if (!config.port || config.port < 1024 || config.port > 65535) {
      throw new Error('Port must be between 1024 and 65535')
    }

    // Load server modules
    await loadServerModules()

    // Initialize API server if not exists
    if (!apiServer) {
      apiServer = new APIServer(undefined, appInstance)
    }

    // Initialize config manager if not exists
    if (!configManager) {
      configManager = new ConfigManager()
    }

    // Update configuration
    const {
      port, host = '0.0.0.0', auth, cors,
    } = config
    const serverConfig: any = {
      port,
      host,
      auth: {
        enabled: !!auth,
        secretKey: auth || '',
      },
      cors: {
        origin: (cors && cors.origins) || ['*'],
        credentials: true,
        optionsSuccessStatus: 200,
      },
    }
    configManager.updateConfig(serverConfig)

    // Start server
    await apiServer.start(port)

    const url = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`
    addLogEntry('info', `API server started successfully on ${url}`)

    // Notify renderer process
    if (event.sender) {
      event.sender.send('api-server-started', { success: true, url })
    }

    return { success: true, url }
  } catch (error) {
    console.error('Failed to start API server:', error)

    // Notify renderer process of error
    if (event.sender) {
      event.sender.send('api-server-error', error)
    }

    return {
      success: false,
      error: error.message || 'Failed to start API server',
      code: error.code || 'SERVER_START_FAILED',
    }
  }
}

/**
 * Stop the API server
 */
async function handleStopAPIServer(
  event: IpcMainInvokeEvent,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    if (!apiServer) {
      return { success: true } // Server not running
    }

    await apiServer.stop()

    // Notify renderer process
    if (event.sender) {
      event.sender.send('api-server-stopped')
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to stop API server:', error)

    // Notify renderer process of error
    if (event.sender) {
      event.sender.send('api-server-error', error)
    }

    return {
      success: false,
      error: error.message || 'Failed to stop API server',
      code: error.code || 'SERVER_STOP_FAILED',
    }
  }
}

/**
 * Get API server status
 */
async function handleGetAPIServerStatus(
  event: IpcMainInvokeEvent,
): Promise<{
  running: boolean
  loading: boolean
  url: string
  error: string
  health?: any
}> {
  try {
    if (!apiServer) {
      return {
        running: false,
        loading: false,
        url: '',
        error: '',
      }
    }

    const isRunning = apiServer.isServerRunning()
    const health = await apiServer.getHealthStatus()

    return {
      running: isRunning,
      loading: false,
      url: isRunning ? `http://localhost:${health.api.endpoints > 0 ? '3000' : '3000'}` : '',
      error: '',
      health,
    }
  } catch (error) {
    console.error('Failed to get API server status:', error)

    return {
      running: false,
      loading: false,
      url: '',
      error: error.message || 'Failed to get server status',
    }
  }
}

/**
 * Save API settings to configuration file
 */
async function handleSaveAPISettings(
  event: IpcMainInvokeEvent,
  settings: any,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    // Validate settings
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be an object')
    }

    // Load server modules
    await loadServerModules()

    // Convert frontend settings to backend config format
    const {
      port = 3000, host = '0.0.0.0', auth = {}, cors = {},
    } = settings
    const { enabled = false, secretKey = '' } = auth
    const { origins = ['*'] } = cors

    const apiConfig: any = {
      port,
      host,
      auth: {
        enabled,
        secretKey,
        tokenExpiry: '24h',
      },
      cors: {
        origin: origins,
        credentials: true,
        optionsSuccessStatus: 200,
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

    // Validate configuration
    if (typeof apiConfig.port !== 'number' || apiConfig.port < 1024 || apiConfig.port > 65535) {
      throw new Error('Port must be between 1024 and 65535')
    }

    // Save configuration
    if (!configManager) {
      configManager = new ConfigManager()
    }

    configManager.updateConfig(apiConfig)
    configManager.saveConfig()

    return { success: true }
  } catch (error) {
    console.error('Failed to save API settings:', error)

    return {
      success: false,
      error: error.message || 'Failed to save API settings',
      code: error.code || 'SAVE_SETTINGS_FAILED',
    }
  }
}

/**
 * Test webhook functionality
 */
async function handleTestWebhook(
  event: IpcMainInvokeEvent,
  webhookConfig: { url: string; headers?: Record<string, string> },
): Promise<{ success: boolean; status?: number; statusText?: string; error?: string }> {
  try {
    const { url, headers = {} } = webhookConfig
    if (!url) {
      throw new Error('Webhook URL is required')
    }

    // For testing purposes, we'll just validate the URL format
    // In a real implementation, this would make an actual HTTP request
    const urlPattern = /^https?:\/\/.+/
    if (!urlPattern.test(url)) {
      throw new Error('Invalid webhook URL format')
    }

    // Simulate webhook test
    // In production, this would use fetch or axios to make the actual request
    return {
      success: true,
      status: 200,
      statusText: 'OK',
    }
  } catch (error) {
    console.error('Failed to test webhook:', error)

    return {
      success: false,
      error: error.message || 'Failed to test webhook',
    }
  }
}

/**
 * Handle server status change events
 */
function handleServerStatusChanged(event: IpcMainInvokeEvent, status: any): void {
  // Broadcast status change to all renderer processes
  if (event.sender) {
    event.sender.send('api-server-status-changed', status)
  }
}

/**
 * Handle server started events
 */
function handleServerStarted(event: IpcMainInvokeEvent, result: any): void {
  if (event.sender) {
    event.sender.send('api-server-started', result)
  }
}

/**
 * Handle server stopped events
 */
function handleServerStopped(event: IpcMainInvokeEvent): void {
  if (event.sender) {
    event.sender.send('api-server-stopped')
  }
}

/**
 * Handle server error events
 */
function handleServerError(event: IpcMainInvokeEvent, error: any): void {
  if (event.sender) {
    event.sender.send('api-server-error', error)
  }
}

/**
 * Initialize IPC handlers for API server management
 */
export function initializeIPCHandlers(appInstanceParam?: any): void {
  // Store the appInstance for use by API server
  if (appInstanceParam) {
    appInstance = appInstanceParam
  }

  // Enable log capture immediately during initialization
  if (!logCaptureEnabled) {
    Object.assign(console, enhancedConsole)
    logCaptureEnabled = true
    addLogEntry('info', 'Log capture enabled during IPC handlers initialization')
  }

  // Remove existing handlers to prevent duplicates (if method exists)
  if (typeof ipcMain.removeHandler === 'function') {
    try {
      ipcMain.removeHandler('start-api-server')
      ipcMain.removeHandler('stop-api-server')
      ipcMain.removeHandler('get-api-server-status')
      ipcMain.removeHandler('save-api-settings')
      ipcMain.removeHandler('test-webhook')
      ipcMain.removeHandler('get-api-server-logs')
      ipcMain.removeHandler('clear-api-server-logs')
      ipcMain.removeHandler('set-log-capture')
      ipcMain.removeHandler('test-log')
    } catch (error) {
      // Ignore errors when removing non-existent handlers
    }
  }

  // Register invoke handlers
  ipcMain.handle('start-api-server', handleStartAPIServer)
  ipcMain.handle('stop-api-server', handleStopAPIServer)
  ipcMain.handle('get-api-server-status', handleGetAPIServerStatus)
  ipcMain.handle('save-api-settings', handleSaveAPISettings)
  ipcMain.handle('test-webhook', handleTestWebhook)
  ipcMain.handle('get-api-server-logs', handleGetAPIServerLogs)
  ipcMain.handle('clear-api-server-logs', handleClearAPIServerLogs)
  ipcMain.handle('set-log-capture', handleSetLogCapture)
  ipcMain.handle('test-log', handleTestLog)

  // Register event listeners for bidirectional communication
  ipcMain.on('api-server-status-changed', handleServerStatusChanged)
  ipcMain.on('api-server-started', handleServerStarted)
  ipcMain.on('api-server-stopped', handleServerStopped)
  ipcMain.on('api-server-error', handleServerError)
}

/**
 * Clean up API server and resources
 */
export async function cleanupAPIServer(): Promise<void> {
  try {
    if (apiServer && apiServer.isServerRunning()) {
      try {
        await apiServer.stop()
      } catch (stopError) {
        console.warn('Error stopping API server during cleanup:', stopError)
      }
    }
    apiServer = null
    configManager = null

    // Remove all IPC handlers (if method exists)
    if (typeof ipcMain.removeHandler === 'function') {
      try {
        ipcMain.removeHandler('start-api-server')
        ipcMain.removeHandler('stop-api-server')
        ipcMain.removeHandler('get-api-server-status')
        ipcMain.removeHandler('save-api-settings')
        ipcMain.removeHandler('test-webhook')
      } catch (error) {
        // Ignore errors when removing non-existent handlers
      }
    }

    // Remove all event listeners
    ipcMain.removeAllListeners('api-server-status-changed')
    ipcMain.removeAllListeners('api-server-started')
    ipcMain.removeAllListeners('api-server-stopped')
    ipcMain.removeAllListeners('api-server-error')
  } catch (error) {
    console.error('Error during API server cleanup:', error)
  }
}

/**
 * Get current API server instance (for testing)
 */
export function getAPIServerInstance(): any | null {
  return apiServer
}

/**
 * Get current config manager instance (for testing)
 */
export function getConfigManagerInstance(): any | null {
  return configManager
}

/**
 * Set API server instance (for testing)
 */
export function setAPIServerInstance(instance: any): void {
  apiServer = instance
}


/**
 * Set config manager instance (for testing)
 */
export function setConfigManagerInstance(instance: any): void {
  configManager = instance
}

/**
 * Set app instance (for testing)
 */
export function setAppInstance(instance: any): void {
  appInstance = instance
}

/**
 * Reset all singletons (for testing)
 */
export function resetIPCHandlers(): void {
  apiServer = null
  configManager = null
  appInstance = null
  APIServer = null
  ConfigManager = null
}

/**
 * Clear and reset IPC handlers (for testing)
 */
export function clearIPCHandlers(): void {
  // Remove all handlers if method exists
  if (typeof ipcMain.removeHandler === 'function') {
    try {
      ipcMain.removeHandler('start-api-server')
      ipcMain.removeHandler('stop-api-server')
      ipcMain.removeHandler('get-api-server-status')
      ipcMain.removeHandler('save-api-settings')
      ipcMain.removeHandler('test-webhook')
      ipcMain.removeHandler('get-api-server-logs')
      ipcMain.removeHandler('clear-api-server-logs')
      ipcMain.removeHandler('set-log-capture')
      ipcMain.removeHandler('test-log')
    } catch (error) {
      // Ignore errors when removing non-existent handlers
    }
  }

  // Remove all event listeners
  ipcMain.removeAllListeners('api-server-status-changed')
  ipcMain.removeAllListeners('api-server-started')
  ipcMain.removeAllListeners('api-server-stopped')
  ipcMain.removeAllListeners('api-server-error')
  ipcMain.removeAllListeners('api-log-message')
}
