import { WebhookService } from './webhook'
import { WebhookEventType } from '../interfaces/webhook'

export class WebhookExample {
  private webhookService: WebhookService

  constructor() {
    this.webhookService = new WebhookService()
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.webhookService.on('webhookCreated', (webhook) => {
      console.log(`🎣 Webhook created: ${webhook.url}`)
    })

    this.webhookService.on('deliveryDelivered', ({ delivery, result }) => {
      console.log(`✅ Delivery successful: ${delivery.id} (${result.statusCode})`)
    })

    this.webhookService.on('deliveryFailed', (delivery) => {
      console.log(`❌ Delivery failed: ${delivery.id} - ${delivery.error}`)
    })
  }

  public async createExampleWebhooks(): Promise<void> {
    try {
      // 创建一个简单的webhook，监听文章发布事件
      const postWebhook = await this.webhookService.createWebhook({
        url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        enabled: true,
        events: ['post.published', 'post.updated'],
        secret: 'your-secret-key',
        headers: {
          'X-Custom-Header': 'Gridea-Integration',
        },
      })

      // 订阅文章发布事件
      await this.webhookService.subscribeToEvent(postWebhook.id, 'post.published')

      // 创建一个带有过滤器的webhook，只监听特定标题的文章
      const filteredWebhook = await this.webhookService.createWebhook({
        url: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
        enabled: true,
        events: ['post.published'],
        secret: 'discord-secret',
      })

      // 订阅带有过滤器的文章发布事件
      await this.webhookService.subscribeToEvent(filteredWebhook.id, 'post.published', {
        property: 'post.title',
        operator: 'contains',
        value: '重要',
      })

      // 创建一个监听部署事件的webhook
      const deployWebhook = await this.webhookService.createWebhook({
        url: 'https://api.telegram.org/botYOUR_TOKEN/sendMessage',
        enabled: true,
        events: ['deployment.completed', 'deployment.failed'],
        retryAttempts: 5,
        retryDelay: 10000,
      })

      await this.webhookService.subscribeToEvent(deployWebhook.id, 'deployment.completed')
      await this.webhookService.subscribeToEvent(deployWebhook.id, 'deployment.failed')

      console.log('✅ Example webhooks created successfully')
    } catch (error) {
      console.error('❌ Failed to create example webhooks:', error)
    }
  }

  public async simulateEvents(): Promise<void> {
    try {
      // 模拟文章发布事件
      await this.webhookService.emitEvent('post.published', {
        post: {
          id: 'post-123',
          title: '重要：新功能发布',
          content: '我们很高兴地宣布...',
          published: true,
          date: new Date().toISOString(),
          tags: ['公告', '功能'],
          fileName: 'important-feature-release.md',
        },
      })

      // 模拟文章更新事件
      await this.webhookService.emitEvent('post.updated', {
        post: {
          id: 'post-456',
          title: '常规更新',
          content: '这是一个普通的更新...',
          published: true,
          date: new Date().toISOString(),
          tags: ['更新'],
          fileName: 'regular-update.md',
        },
      })

      // 模拟部署完成事件
      await this.webhookService.emitEvent('deployment.completed', {
        deployment: {
          id: 'deploy-789',
          status: 'completed',
          startTime: new Date(Date.now() - 300000),
          endTime: new Date(),
          deployUrl: 'https://your-blog.github.io',
        },
      })

      console.log('✅ Events simulated successfully')
    } catch (error) {
      console.error('❌ Failed to simulate events:', error)
    }
  }

  public async demonstrateWebhookTesting(): Promise<void> {
    try {
      const webhooks = this.webhookService.getAllWebhooks()

      // Test all webhooks in parallel instead of sequentially
      const testPromises = webhooks.map(async (webhook) => {
        console.log(`\n🧪 Testing webhook: ${webhook.url}`)
        const result = await this.webhookService.testWebhook(webhook.id)

        if (result.success) {
          console.log(`✅ Test successful: ${result.statusCode} (${result.duration}ms)`)
        } else {
          console.log(`❌ Test failed: ${result.error}`)
        }
      })

      await Promise.all(testPromises)
    } catch (error) {
      console.error('❌ Failed to test webhooks:', error)
    }
  }

  public showStatistics(): void {
    const stats = this.webhookService.getStats()

    console.log('\n📊 Webhook Statistics:')
    console.log(`Total webhooks: ${stats.totalWebhooks}`)
    console.log(`Enabled webhooks: ${stats.enabledWebhooks}`)
    console.log(`Total deliveries: ${stats.totalDeliveries}`)
    console.log(`Successful deliveries: ${stats.successfulDeliveries}`)
    console.log(`Failed deliveries: ${stats.failedDeliveries}`)
    console.log(`Average response time: ${stats.averageResponseTime.toFixed(2)}ms`)

    if (stats.lastDelivery) {
      console.log(`Last delivery: ${stats.lastDelivery.toISOString()}`)
    }
  }

  public async runExample(): Promise<void> {
    console.log('🚀 Starting Webhook Service Example...')

    await this.createExampleWebhooks()
    await this.simulateEvents()
    await this.demonstrateWebhookTesting()

    // 等待一段时间让webhook处理完成
    await new Promise(resolve => setTimeout(resolve, 2000))

    this.showStatistics()

    console.log('\n✨ Example completed!')

    // 清理资源
    this.webhookService.shutdown()
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  const example = new WebhookExample()
  example.runExample().catch(console.error)
}
