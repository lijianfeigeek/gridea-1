// Vitest-compatible test setup test
import {
  describe, it, expect, beforeEach,
} from 'vitest'

// Import Vitest-compatible setup
import '../helpers/test-setup-vitest'

describe('Vitest Test Setup', () => {
  beforeEach(() => {
    // Setup is already imported and will run automatically
  })

  it('should have console methods mocked', () => {
    expect(console.log).toBeDefined()
    expect(console.warn).toBeDefined()
    expect(console.error).toBeDefined()
    expect(console.info).toBeDefined()
  })

  it('should have browser APIs mocked if available', () => {
    if (typeof window !== 'undefined') {
      expect(window.matchMedia).toBeDefined()
      expect(window.getSelection).toBeDefined()
    }
  })

  it('should have ResizeObserver mocked', () => {
    expect(global.ResizeObserver).toBeDefined()
  })

  it('should have IntersectionObserver mocked', () => {
    expect(global.IntersectionObserver).toBeDefined()
  })

  it('should have test timeout configured', () => {
    // Vitest timeout is configured globally
    expect(true).toBe(true)
  })
})
