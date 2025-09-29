/* eslint-disable no-await-in-loop */
import EventEmitter from 'events'
import Deploy from '../../deploy'
import { APIError } from '../types'

export interface DeploymentTask {
  id: string
  articleId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date
  error?: string
  deployUrl?: string
  logs: string[]
}

export interface DeploymentConfig {
  maxConcurrentDeployments: number
  retryAttempts: number
  retryDelay: number
  timeout: number
}

export class DeploymentService extends EventEmitter {
  private tasks: Map<string, DeploymentTask> = new Map()

  private deploy: Deploy

  private config: DeploymentConfig

  private runningTasks: Set<string> = new Set()

  constructor(appInstance: any, config: Partial<DeploymentConfig> = {}) {
    super()
    this.deploy = new Deploy(appInstance)
    this.config = {
      maxConcurrentDeployments: 3,
      retryAttempts: 3,
      retryDelay: 5000,
      timeout: 300000,
      ...config,
    }

    this.setupEventHandlers()
  }

  public async deployArticle(articleId: string): Promise<DeploymentTask> {
    const taskId = this.generateTaskId()

    const task: DeploymentTask = {
      id: taskId,
      articleId,
      status: 'pending',
      startTime: new Date(),
      logs: [],
    }

    this.tasks.set(taskId, task)
    this.emit('taskCreated', task)

    this.queueDeployment(task)

    return task
  }

  public getTask(taskId: string): DeploymentTask | undefined {
    return this.tasks.get(taskId)
  }

  public getArticleTasks(articleId: string): DeploymentTask[] {
    return Array.from(this.tasks.values()).filter(task => task.articleId === articleId)
  }

  public getAllTasks(): DeploymentTask[] {
    return Array.from(this.tasks.values())
  }

  public async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task || task.status === 'completed' || task.status === 'failed') {
      return false
    }

    if (task.status === 'running') {
      task.status = 'cancelled'
      task.endTime = new Date()
      task.logs.push(`Task cancelled at ${new Date().toISOString()}`)
      this.emit('taskCancelled', task)
      this.runningTasks.delete(taskId)
      return true
    }

    if (task.status === 'pending') {
      task.status = 'cancelled'
      task.endTime = new Date()
      task.logs.push(`Task cancelled at ${new Date().toISOString()}`)
      this.emit('taskCancelled', task)
      return true
    }

    return false
  }

  private async queueDeployment(task: DeploymentTask): Promise<void> {
    if (this.runningTasks.size >= this.config.maxConcurrentDeployments) {
      setTimeout(() => this.queueDeployment(task), 1000)
      return
    }

    task.status = 'running'
    task.logs.push(`Deployment started at ${new Date().toISOString()}`)
    this.runningTasks.add(task.id)
    this.emit('taskStarted', task)

    this.executeDeployment(task)
  }

  private async executeDeployment(task: DeploymentTask): Promise<void> {
    let attempt = 0
    let lastError: string | null = null

    while (attempt < this.config.retryAttempts) {
      attempt++
      task.logs.push(`Attempt ${attempt} at ${new Date().toISOString()}`)

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Deployment timeout')), this.config.timeout)
        })

        const deployPromise = this.deploy.publish()

        const result = await Promise.race([deployPromise, timeoutPromise])

        if (result.success) {
          task.status = 'completed'
          task.endTime = new Date()
          task.deployUrl = this.getDeployUrl() || undefined
          task.logs.push(`Deployment completed successfully at ${new Date().toISOString()}`)
          this.emit('taskCompleted', task)
          this.runningTasks.delete(task.id)
          return
        }
        lastError = result.message || 'Unknown deployment error'
        task.logs.push(`Deployment failed: ${lastError}`)

        if (attempt < this.config.retryAttempts) {
          task.logs.push(`Retrying in ${this.config.retryDelay}ms...`)
          await this.delay(this.config.retryDelay)
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        task.logs.push(`Deployment error: ${lastError}`)

        if (attempt < this.config.retryAttempts) {
          task.logs.push(`Retrying in ${this.config.retryDelay}ms...`)
          await this.delay(this.config.retryDelay)
        }
      }
    }

    task.status = 'failed'
    task.endTime = new Date()
    task.error = lastError || 'Deployment failed after all retry attempts'
    task.logs.push(`Task failed at ${new Date().toISOString()}`)
    this.emit('taskFailed', task)
    this.runningTasks.delete(task.id)
  }

  private generateTaskId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDeployUrl(): string | null {
    const setting = this.deploy.db && this.deploy.db.setting ? this.deploy.db.setting : null
    if (!setting) return null

    const domain = setting.domain ? setting.domain : ''
    const platform = setting.platform ? setting.platform : 'github'
    const username = setting.username ? setting.username : ''
    const repository = setting.repository ? setting.repository : ''

    if (!domain && platform === 'github' && username && repository) {
      return `https://${username}.github.io/${repository}/`
    }

    return domain || null
  }

  private setupEventHandlers(): void {
    this.on('taskCreated', (task: DeploymentTask) => {
      console.log(`Deployment task created: ${task.id} for article ${task.articleId}`)
    })

    this.on('taskStarted', (task: DeploymentTask) => {
      console.log(`Deployment task started: ${task.id}`)
    })

    this.on('taskCompleted', (task: DeploymentTask) => {
      console.log(`Deployment task completed: ${task.id}`)
    })

    this.on('taskFailed', (task: DeploymentTask) => {
      console.log(`Deployment task failed: ${task.id}, error: ${task.error}`)
    })

    this.on('taskCancelled', (task: DeploymentTask) => {
      console.log(`Deployment task cancelled: ${task.id}`)
    })
  }

  public getStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    } {
    const tasks = Array.from(this.tasks.values())

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
