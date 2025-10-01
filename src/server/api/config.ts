import * as path from 'path'
import * as fse from 'fs-extra'
import { APIServerConfig } from './types'

export class ConfigManager {
  private static readonly DEFAULT_CONFIG: APIServerConfig = {
    port: 3000,
    host: '0.0.0.0', // 支持局域网访问
    cors: {
      origin: ['*', 'http://localhost:4000', 'http://localhost:8080', 'http://127.0.0.1:4000', 'http://127.0.0.1:8080'],
      credentials: true,
      optionsSuccessStatus: 200,
    },
    auth: {
      enabled: false,
      secretKey: 'your-secret-key-change-in-production',
      tokenExpiry: '24h',
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

  private configPath: string

  private config: APIServerConfig

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'api-config.json')
    this.config = this.loadConfig()
  }

  private loadConfig(): APIServerConfig {
    try {
      if (fse.pathExistsSync(this.configPath)) {
        const fileConfig = fse.readJsonSync(this.configPath)
        return { ...ConfigManager.DEFAULT_CONFIG, ...fileConfig }
      }
      return ConfigManager.DEFAULT_CONFIG
    } catch (error) {
      console.warn('Failed to load API config, using defaults:', error.message)
      return ConfigManager.DEFAULT_CONFIG
    }
  }

  public getConfig(): APIServerConfig {
    return { ...this.config }
  }

  public updateConfig(updates: Partial<APIServerConfig>): void {
    this.config = this.mergeDeep(this.config, updates)
  }

  private mergeDeep(target: any, source: any): any {
    if (typeof target !== 'object' || target === null) {
      return source
    }

    if (typeof source !== 'object' || source === null) {
      return target
    }

    const output = { ...target }

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          output[key] = this.mergeDeep(target[key], source[key])
        } else {
          output[key] = source[key]
        }
      }
    }

    return output
  }

  public saveConfig(): void {
    try {
      fse.ensureDirSync(path.dirname(this.configPath))
      fse.writeJsonSync(this.configPath, this.config, { spaces: 2 })
    } catch (error) {
      console.error('Failed to save API config:', error)
      throw error
    }
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (typeof this.config.port !== 'number' || this.config.port < 1 || this.config.port > 65535) {
      errors.push('Port must be a number between 1 and 65535')
    }

    if (typeof this.config.host !== 'string' || !this.config.host.trim()) {
      errors.push('Host must be a non-empty string')
    }

    if (!Array.isArray(this.config.cors.origin) && typeof this.config.cors.origin !== 'string') {
      errors.push('CORS origin must be a string or array of strings')
    }

    if (this.config.auth.enabled && (!this.config.auth.secretKey || this.config.auth.secretKey.length < 8)) {
      errors.push('Secret key must be at least 8 characters long when auth is enabled')
    }

    if (this.config.body.limit && typeof this.config.body.limit !== 'string') {
      errors.push('Body limit must be a string')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  public getEnvironmentConfig(): APIServerConfig {
    const envConfig = { ...this.config }

    if (process.env.API_PORT) {
      envConfig.port = parseInt(process.env.API_PORT, 10)
    }

    if (process.env.API_HOST) {
      envConfig.host = process.env.API_HOST
    }

    if (process.env.API_CORS_ORIGIN) {
      envConfig.cors.origin = process.env.API_CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
    }

    if (process.env.API_AUTH_ENABLED) {
      envConfig.auth.enabled = process.env.API_AUTH_ENABLED.toLowerCase() === 'true'
    }

    if (process.env.API_AUTH_SECRET) {
      envConfig.auth.secretKey = process.env.API_AUTH_SECRET
    }

    if (process.env.API_LOG_LEVEL) {
      envConfig.logging.level = process.env.API_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug'
    }

    return envConfig
  }
}
