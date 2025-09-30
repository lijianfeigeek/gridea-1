/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/e2e/**/*',
      'tests/unit/background/**', // Exclude Jest-specific tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
    reporters: ['verbose'],
    outputFile: {
      'junit': 'reports/junit.xml',
    },
    // Compatible with Jest test timeout
    testTimeout: 30000,
    hookTimeout: 30000,
    // Electron environment optimization
    env: {
      NODE_ENV: 'test',
      ELECTRON_RUN_AS_NODE: '1',
      VITEST: 'true',
    },
    // Mock common Electron globals
    // Optimize for Electron's module system
    fakeTimers: {
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    },
    // Improve performance for Electron environment
    maxWorkers: Math.max(1, Math.floor(require('os').cpus().length / 2)),
    // Disable unhandled promise rejections to prevent Electron-specific issues
    unhandledRejections: 'ignore',
  },
  resolve: {
    alias: {
      '@': './src',
      '@test': './tests',
    },
  },
  // Make compatible with Jest global test functions
  define: {
    global: 'globalThis',
  },
  // Optimize for Electron's module system
  server: {
    deps: {
      inline: [
        // Inline Electron-related modules
        'electron',
        'original-fs',
        'v8',
      ],
    },
  },
})