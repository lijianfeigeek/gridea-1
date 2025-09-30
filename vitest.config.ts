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
})