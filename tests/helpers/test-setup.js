// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

// Mock browser APIs only if they exist (for browser environment)
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock ResizeObserver (browser API)
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

// Mock IntersectionObserver (browser API)
if (typeof IntersectionObserver === 'undefined') {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

// Mock window.getSelection (only in browser environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'getSelection', {
    value: () => ({
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
      toString: () => '',
    }),
  })
}

// Mock Electron APIs (only in browser environment)
if (typeof window !== 'undefined') {
  global.window = Object.assign(window, {
    require: jest.fn((module) => {
      if (module === 'electron') {
        return {
          ipcRenderer: {
            on: jest.fn(),
            send: jest.fn(),
            removeAllListeners: jest.fn(),
          },
          remote: {
            app: {
              getLocale: () => 'en-US',
              getPath: () => '/tmp',
            },
            getCurrentWindow: () => ({
                setTitle: jest.fn(),
                on: jest.fn(),
                webContents: {
                  send: jest.fn(),
                },
              }),
            },
            shell: {
              openExternal: jest.fn(),
            },
          }
        }
        return {}
      }),
    })
  }

// Set up test timeout
jest.setTimeout(30000)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})
