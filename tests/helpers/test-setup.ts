// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
  value: () => ({
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
    toString: () => '',
  }),
})

// Mock Electron APIs
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

// Set up test timeout
jest.setTimeout(30000)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})
