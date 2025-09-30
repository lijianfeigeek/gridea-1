# Webhook 服务

这个Webhook服务为Gridea提供了完整的事件驱动通知系统，允许外部服务订阅和接收Gridea内部事件。

## 功能特性

### 🔧 核心功能
- **Webhook管理**: 创建、更新、删除、启用/禁用webhook
- **事件订阅**: 灵活的事件订阅和过滤机制
- **重试机制**: 指数退避重试策略
- **签名验证**: HMAC-SHA256签名确保安全性
- **实时监控**: 完整的交付状态跟踪和统计

### 📡 支持的事件类型
- `post.published` - 文章发布
- `post.updated` - 文章更新
- `post.deleted` - 文章删除
- `post.draft_created` - 草稿创建
- `post.draft_updated` - 草稿更新
- `post.draft_deleted` - 草稿删除
- `deployment.started` - 部署开始
- `deployment.completed` - 部署完成
- `deployment.failed` - 部署失败
- `site.settings_updated` - 站点设置更新
- `theme.changed` - 主题变更
- `tag.created` - 标签创建
- `tag.updated` - 标签更新
- `tag.deleted` - 标签删除
- `menu.updated` - 菜单更新
- `system.error` - 系统错误
- `system.warning` - 系统警告
- `system.info` - 系统信息

### 🛡️ 安全特性
- HMAC-SHA256请求签名
- 可配置的密钥
- 自定义请求头
- 超时控制
- 重试限制

## 快速开始

### 1. 导入服务

```typescript
import { WebhookService } from './services/webhook'

const webhookService = new WebhookService()
```

### 2. 创建Webhook

```typescript
const webhook = await webhookService.createWebhook({
  url: 'https://your-service.com/webhook',
  enabled: true,
  events: ['post.published', 'deployment.completed'],
  secret: 'your-secret-key',
  headers: {
    'X-Custom-Header': 'Gridea-Integration'
  },
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 5000
})
```

### 3. 订阅事件

```typescript
// 简单订阅
await webhookService.subscribeToEvent(webhook.id, 'post.published')

// 带过滤器的订阅
await webhookService.subscribeToEvent(webhook.id, 'post.published', {
  property: 'post.title',
  operator: 'contains',
  value: '重要'
})
```

### 4. 发送事件

```typescript
await webhookService.emitEvent('post.published', {
  post: {
    id: 'post-123',
    title: '新文章标题',
    content: '文章内容...',
    published: true,
    date: new Date().toISOString(),
    tags: ['技术', '教程'],
    fileName: 'new-post.md'
  }
})
```

### 5. 测试Webhook

```typescript
const result = await webhookService.testWebhook(webhook.id)

if (result.success) {
  console.log(`测试成功: ${result.statusCode} (${result.duration}ms)`)
} else {
  console.log(`测试失败: ${result.error}`)
}
```

## 事件负载格式

所有webhook请求都包含以下结构：

```json
{
  "id": "event-uuid",
  "event": "post.published",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "source": "gridea",
  "data": {
    "post": {
      "id": "post-123",
      "title": "文章标题",
      "content": "文章内容...",
      "published": true,
      "date": "2024-01-01T00:00:00.000Z",
      "tags": ["技术", "教程"],
      "fileName": "post-123.md"
    }
  },
  "metadata": {
    "requestId": "request-uuid",
    "version": "1.0"
  }
}
```

## 请求头

Webhook服务会自动添加以下请求头：

- `Content-Type: application/json`
- `User-Agent: Gridea-Webhook/1.0`
- `X-Webhook-ID: {webhookId}`
- `X-Webhook-Event: {eventType}`
- `X-Webhook-Delivery: {deliveryId}`
- `X-Gridea-Timestamp: {timestamp}`
- `X-Gridea-Signature: sha256={signature}` (如果有密钥)

## 重试机制

服务实现了指数退避重试策略：

- 第一次重试：5秒后
- 第二次重试：10秒后
- 第三次重试：20秒后
- 以此类推...

## 监控和统计

### 获取统计信息

```typescript
const stats = webhookService.getStats()

console.log({
  totalWebhooks: stats.totalWebhooks,
  enabledWebhooks: stats.enabledWebhooks,
  totalDeliveries: stats.totalDeliveries,
  successfulDeliveries: stats.successfulDeliveries,
  failedDeliveries: stats.failedDeliveries,
  averageResponseTime: stats.averageResponseTime
})
```

### 监听事件

```typescript
webhookService.on('webhookCreated', (webhook) => {
  console.log(`Webhook created: ${webhook.url}`)
})

webhookService.on('deliveryDelivered', ({ delivery, result }) => {
  console.log(`Delivery successful: ${delivery.id} (${result.statusCode})`)
})

webhookService.on('deliveryFailed', (delivery) => {
  console.log(`Delivery failed: ${delivery.id} - ${delivery.error}`)
})
```

## 错误处理

服务提供完整的错误处理和状态跟踪：

```typescript
// 获取webhook的交付记录
const deliveries = webhookService.getWebhookDeliveries(webhook.id)

// 获取特定事件的交付记录
const eventDeliveries = webhookService.getEventDeliveries(eventId)

// 获取特定交付的详细信息
const delivery = webhookService.getDelivery(deliveryId)
```

## 示例集成

### Slack通知

```typescript
const slackWebhook = await webhookService.createWebhook({
  url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
  enabled: true,
  events: ['post.published', 'deployment.completed'],
  headers: {
    'Content-Type': 'application/json'
  }
})

await webhookService.subscribeToEvent(slackWebhook.id, 'post.published')
```

### Discord通知

```typescript
const discordWebhook = await webhookService.createWebhook({
  url: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
  enabled: true,
  events: ['deployment.failed'],
  retryAttempts: 5,
  retryDelay: 10000
})

await webhookService.subscribeToEvent(discordWebhook.id, 'deployment.failed')
```

### 自定义服务

```typescript
const customWebhook = await webhookService.createWebhook({
  url: 'https://your-service.com/api/gridea-events',
  enabled: true,
  events: ['post.published', 'post.updated', 'post.deleted'],
  secret: process.env.WEBHOOK_SECRET,
  headers: {
    'Authorization': `Bearer ${process.env.API_KEY}`,
    'X-Service-Name': 'MyCustomService'
  }
})
```

## 清理资源

```typescript
// 关闭服务，清理定时器和资源
webhookService.shutdown()
```

## 性能考虑

- **队列大小**: 最大1000个事件的队列
- **并发交付**: 最多10个并发请求
- **重试限制**: 防止无限重试
- **内存管理**: 自动清理过期的交付记录

## 故障排除

### 常见问题

1. **Webhook未触发**
   - 检查webhook是否已启用
   - 确认已订阅相应事件
   - 验证过滤器设置

2. **交付失败**
   - 检查目标URL是否可访问
   - 验证网络连接
   - 查看错误日志

3. **签名验证失败**
   - 确认密钥配置正确
   - 检查接收端的签名验证逻辑
   - 验证负载格式

### 调试

启用调试日志：

```typescript
webhookService.on('eventQueued', (event) => {
  console.log(`Event queued: ${event.type}`)
})

webhookService.on('deliveryScheduled', (delivery) => {
  console.log(`Delivery scheduled: ${delivery.id}`)
})
```

## 最佳实践

1. **安全性**
   - 始终使用HTTPS URL
   - 配置签名密钥
   - 限制重试次数

2. **可靠性**
   - 设置合理的超时时间
   - 配置适当的重试策略
   - 监控交付状态

3. **性能**
   - 避免过多的事件过滤器
   - 定期清理过期的webhook
   - 监控队列大小

4. **监控**
   - 定期检查统计信息
   - 设置告警机制
   - 记录重要事件

## 扩展性

Webhook服务设计为可扩展的，可以轻松添加：

- 新的事件类型
- 自定义过滤器
- 不同的重试策略
- 额外的认证方式
- 更多的监控指标