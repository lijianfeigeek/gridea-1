// Simple test setup without external dependencies

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

// Set up test timeout
jest.setTimeout(30000)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})
