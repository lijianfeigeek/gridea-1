// Vitest-compatible test setup
import { vi, afterEach } from 'vitest'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}

// Mock browser APIs only if they exist (for browser environment)
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock ResizeObserver (browser API)
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// Mock IntersectionObserver (browser API)
if (typeof IntersectionObserver === 'undefined') {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// Mock window.getSelection (only in browser environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'getSelection', {
    value: () => ({
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
      toString: () => '',
    }),
  })
}

// Mock Electron APIs (only in browser environment)
if (typeof window !== 'undefined') {
  global.window = Object.assign(window, {
    require: vi.fn((module) => {
      if (module === 'electron') {
        return {
          ipcRenderer: {
            on: vi.fn(),
            send: vi.fn(),
            removeAllListeners: vi.fn(),
          },
          remote: {
            app: {
              getLocale: () => 'en-US',
              getPath: () => '/tmp',
            },
            getCurrentWindow: () => ({
              setTitle: vi.fn(),
              on: vi.fn(),
              webContents: {
                send: vi.fn(),
              },
            }),
          },
          shell: {
            openExternal: vi.fn(),
          },
        }
      }
      return {}
    }),
  })
}

// Set up test timeout
vi.setConfig({ testTimeout: 30000 })

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  vi.clearAllTimers()
})
