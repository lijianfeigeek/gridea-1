/**
 * Debug test to identify API server startup issues
 */

import {
  describe, it, expect, beforeEach, vi,
} from 'vitest'
import { APIServer } from '@/server/api'

// Import mocked modules for testing
import * as fse from 'fs-extra'

describe('API Server Debug Test', () => {
  let apiServer: APIServer
  let mockAppInstance: any

  beforeEach(() => {
    // Reset all mocks to ensure clean state
    vi.clearAllMocks()

    // Create a simple mock appInstance
    mockAppInstance = {
      appDir: '/tmp/gridea-test',
      buildDir: '/tmp/gridea-test/public',
      db: {
        get: vi.fn().mockReturnValue({}),
        set: vi.fn(),
        write: vi.fn(),
        read: vi.fn(),
        setting: {
          platform: 'github',
          username: 'test-user',
          token: 'test-token',
          tokenUsername: 'test-token-user',
          repository: 'test-repo',
        },
      },
      mainWindow: {
        webContents: { send: vi.fn() },
      },
      $setting: {
        get: vi.fn().mockReturnValue({ platform: 'github' }),
        set: vi.fn(),
        write: vi.fn(),
        read: vi.fn(),
      },
    }

    // Mock file system operations
    vi.mocked(fse.pathExistsSync).mockReturnValue(false)
    vi.mocked(fse.writeJsonSync).mockReturnValue(true)
    vi.mocked(fse.ensureDirSync).mockReturnValue(true)
  })

  it('should create API server without hanging', async () => {
    // This test should timeout if there are issues
    console.log('Creating API server...')

    apiServer = new APIServer('/tmp/test-config.json', mockAppInstance)
    console.log('API server created successfully')

    expect(apiServer).toBeDefined()
    expect(apiServer.isServerRunning()).toBe(false)
  })

  it('should get configuration without hanging', async () => {
    console.log('Creating API server for config test...')
    apiServer = new APIServer('/tmp/test-config.json', mockAppInstance)
    console.log('API server created, getting config...')

    const config = apiServer.getConfig()
    console.log('Config retrieved:', config)

    expect(config).toBeDefined()
    expect(config.port).toBe(3000) // Default port
  })

  it('should validate configuration without hanging', async () => {
    console.log('Creating API server for validation test...')
    apiServer = new APIServer('/tmp/test-config.json', mockAppInstance)
    console.log('API server created, validating config...')

    // Test with a valid config
    apiServer.updateConfig({
      port: 3001,
      host: 'localhost',
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true,
        optionsSuccessStatus: 200,
      },
      auth: {
        enabled: false,
        secretKey: 'test-secret-key',
        tokenExpiry: '24h',
      },
    })

    const validation = apiServer.getConfig()
    console.log('Config validation completed')

    expect(validation.port).toBe(3001)
  }, 5000) // Shorter timeout for this specific test
})
