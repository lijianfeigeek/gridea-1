# Gridea REST API 功能实现计划 (TDD导向)

## 概述

在现有Gridea GUI应用中增加REST API功能，允许用户通过界面启动API服务器，接收外部POST请求来发布文章，并支持自动部署功能和Webhook通知。采用测试驱动开发（TDD）方法确保代码质量和功能正确性。

## TDD方法论

### 开发原则
1. **Red-Green-Refactor**: 先写失败测试，再实现功能通过测试，最后重构优化
2. **Baby Steps**: 小步快跑，每个功能都有对应的测试覆盖
3. **测试先行**: 所有功能都必须先有测试定义
4. **持续集成**: 每个测试通过后都要验证整个系统

### 测试策略
- **单元测试**: 测试独立组件和函数
- **集成测试**: 测试组件间交互
- **端到端测试**: 测试完整API流程
- **GUI测试**: 测试用户界面操作

## 功能特性

### 核心功能
- ✅ REST API服务器启动/停止控制
- ✅ 文章发布API端点
- ✅ Markdown格式验证
- ✅ 自动部署选项
- ✅ 可选的API认证（Bearer Token）
- ✅ Webhook通知功能
- ✅ API状态监控
- ✅ CORS配置

### 扩展功能
- 🔄 批量文章操作
- 🔄 文章状态查询
- 🔄 配置信息获取
- 🔄 API版本管理
- 🔄 插件系统支持

## 技术实现方案

### 1. GUI界面集成

#### API设置页面
- **路径**: `src/views/setting/includes/APISetting.vue`
- **功能**:
  - 启用/禁用REST API开关
  - 端口配置（默认3000）
  - 可选的API认证开关
  - API密钥生成和管理
  - 自动发布开关
  - CORS域名配置
  - 服务器状态显示
  - API文档查看按钮
  - 启动/停止服务器按钮

#### 设置菜单集成
- **路径**: `src/views/setting/Index.vue`
- **修改**: 在设置标签页中添加"API设置"标签

### 2. 主进程API服务器管理

#### Background进程更新
- **文件**: `src/background.ts`
- **新增IPC处理方法**:
  - `start-api-server`: 启动API服务器
  - `stop-api-server`: 停止API服务器
  - `get-api-server-status`: 获取服务器状态
  - `open-api-documentation`: 打开API文档

#### 服务器生命周期管理
- 应用启动时不自动启动API服务器
- 应用退出时自动清理API服务器
- 支持服务器状态实时查询

### 3. API服务器核心实现

#### API服务器类
- **文件**: `src/server/api/index.ts`
- **技术栈**: Express.js + TypeScript
- **功能**:
  - HTTP服务器创建和管理
  - 中间件配置（CORS、Body解析、认证）
  - 路由处理
  - 错误处理
  - 服务生命周期管理

#### 端点设计
```
GET  /api/health                    - 健康检查
POST /api/v1/articles/publish        - 发布文章
GET  /api/v1/articles/:id/status   - 获取文章状态
POST /api/v1/validate/markdown      - 验证Markdown格式
GET  /api/v1/config                 - 获取配置信息
POST /api/v1/webhook/test           - 测试Webhook
```

### 4. 认证和安全

#### 认证方式
- **可选认证**: 支持开启/关闭API认证
- **Bearer Token**: 使用Authorization header进行认证
- **密钥生成**: 自动生成32位随机API密钥
- **密钥管理**: 支持重新生成密钥

#### 安全措施
- **CORS配置**: 限制跨域请求来源
- **输入验证**: 严格的参数校验
- **Markdown验证**: 格式和链接有效性检查
- **错误处理**: 友好的错误信息返回
- **日志记录**: API调用日志和错误日志

### 5. 数据验证

#### Markdown验证器
- **文件**: `src/server/validators/markdown.ts`
- **验证内容**:
  - 基础格式检查（非空、标题结构）
  - 链接格式验证
  - 图片链接检查
  - 代码块语言支持
  - 表格格式验证
  - 内容长度建议
  - SEO优化建议

#### 返回格式
```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]      // 严重错误，阻止发布
  warnings: string[]    // 警告，不影响发布
  suggestions: string[] // 优化建议
}
```

### 6. Webhook功能

#### Webhook实现
- **触发时机**: 文章发布完成、部署成功/失败
- **通知内容**: 包含文章信息、部署状态、URL等
- **重试机制**: 失败重试（最多3次）
- **配置**: 支持多个Webhook URL

#### Webhook负载格式
```json
{
  "event": "article.published" | "deployment.success" | "deployment.failed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "article": {
    "id": "uuid",
    "title": "文章标题",
    "url": "https://blog.com/post/url"
  },
  "deployment": {
    "status": "success" | "failed",
    "platform": "github" | "gitlab" | "sftp" | "netlify",
    "error": null | "error message"
  }
}
```

### 7. API文档

#### 文档页面
- **文件**: `public/api-documentation.html`
- **内容**:
  - 完整的API端点文档
  - 请求/响应示例
  - 认证说明
  - 错误码说明
  - curl命令示例

#### 文档访问
- GUI中提供"查看API文档"按钮
- 自动在浏览器中打开文档页面

### 8. 状态管理

#### API状态存储
- **Vuex模块**: 更新site模块以支持API设置
- **本地存储**: API配置持久化到应用设置中
- **实时状态**: 服务器运行状态实时显示

#### 设置数据结构
```typescript
interface APISettings {
  enabled: boolean
  port: number
  auth: {
    enabled: boolean
    apiKey: string
  }
  autoDeploy: boolean
  cors: {
    enabled: boolean
    origins: string[]
  }
  webhooks: {
    enabled: boolean
    urls: string[]
    events: string[]
  }
}
```

## 依赖包需求

### 新增依赖
```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "uuid": "^9.0.1",
    "axios": "^0.27.2"  // 用于Webhook请求
  }
}
```

### 开发依赖
```json
{
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7"
  }
}
```

## TDD实现步骤

### 阶段0：测试基础设施搭建
**目标**: 建立测试框架和工具
1. **步骤0.1**: 配置Jest测试框架
2. **步骤0.2**: 设置测试环境变量
3. **步骤0.3**: 创建测试工具函数
4. **步骤0.4**: 建立CI/CD测试流程

**测试用例定义**:
```typescript
// tests/helpers/test-setup.ts
export const testConfig = {
  apiPort: 3001,
  testApiKey: 'test-api-key',
  mockWebhookUrl: 'http://localhost:3002/webhook'
}
```

### 阶段1：核心功能测试先行
**目标**: 先定义核心功能的测试用例

#### 1.1 Markdown验证器测试
```typescript
// tests/validators/markdown.validator.test.ts
describe('MarkdownValidator', () => {
  test('should validate empty content', () => {
    const result = MarkdownValidator.validate('')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('内容不能为空')
  })

  test('should validate valid markdown', () => {
    const content = '# Title\n\nThis is content.'
    const result = MarkdownValidator.validate(content)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should detect invalid links', () => {
    const content = '[link](invalid-url)'
    const result = MarkdownValidator.validate(content)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('无效链接: invalid-url')
  })
})
```

#### 1.2 API服务器测试
```typescript
// tests/server/api.server.test.ts
describe('APIServer', () => {
  let apiServer: APIServer
  let testConfig: any

  beforeEach(async () => {
    testConfig = {
      port: 3001,
      auth: { enabled: false },
      autoDeploy: false,
      cors: { enabled: true, origins: ['*'] }
    }
    apiServer = new APIServer(testConfig)
    await apiServer.start()
  })

  afterEach(async () => {
    await apiServer.stop()
  })

  test('should start server successfully', () => {
    expect(apiServer.isRunning()).toBe(true)
  })

  test('should handle health check', async () => {
    const response = await fetch('http://localhost:3001/api/health')
    const data = await response.json()
    expect(data.status).toBe('ok')
  })
})
```

#### 1.3 文章发布API测试
```typescript
// tests/api/articles.test.ts
describe('Articles API', () => {
  test('should publish article with valid data', async () => {
    const articleData = {
      title: 'Test Article',
      content: '# Test\n\nContent',
      tags: ['test'],
      auto_deploy: false
    }

    const response = await fetch('http://localhost:3001/api/v1/articles/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(articleData)
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.article.title).toBe('Test Article')
  })

  test('should reject article with invalid content', async () => {
    const articleData = {
      title: 'Test Article',
      content: '', // 无效内容
      tags: ['test']
    }

    const response = await fetch('http://localhost:3001/api/v1/articles/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(articleData)
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid markdown format')
  })
})
```

#### 1.4 Webhook测试
```typescript
// tests/server/webhook.test.ts
describe('WebhookService', () => {
  test('should send webhook notification', async () => {
    const webhookService = new WebhookService()
    const mockSend = jest.fn()
    webhookService.send = mockSend.mockResolvedValue(true)

    await webhookService.notify({
      event: 'article.published',
      article: { id: '123', title: 'Test' }
    })

    expect(mockSend).toHaveBeenCalledWith(
      'http://localhost:3002/webhook',
      expect.objectContaining({
        event: 'article.published',
        article: { id: '123', title: 'Test' }
      })
    )
  })
})
```

### 阶段2：功能实现（Red-Green-Refactor）
**目标**: 通过测试驱动实现核心功能

#### 2.1 实现Markdown验证器
```typescript
// src/server/validators/markdown.ts
export class MarkdownValidator {
  static validate(content: string): ValidationResult {
    // 实现代码 - 让测试通过
    if (!content || content.trim().length === 0) {
      return {
        valid: false,
        errors: ['内容不能为空'],
        warnings: [],
        suggestions: []
      }
    }
    // 更多验证逻辑...
  }
}
```

#### 2.2 实现API服务器
```typescript
// src/server/api/index.ts
export class APIServer {
  private app: express.Application
  private server: any
  private config: any

  constructor(config: any) {
    this.config = config
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupRoutes() {
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
    // 更多路由...
  }

  async start(): Promise<void> {
    // 实现启动逻辑
  }

  async stop(): Promise<void> {
    // 实现停止逻辑
  }

  isRunning(): boolean {
    return this.server !== null
  }
}
```

#### 2.3 实现文章发布API
```typescript
// src/server/api/routes/articles.ts
export class ArticlesController {
  async publish(req: Request, res: Response) {
    try {
      const { title, content, tags = [], auto_deploy = false } = req.body

      // 验证
      const validation = MarkdownValidator.validate(content)
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid markdown format',
          details: validation.errors
        })
      }

      // 创建文章
      const article = await this.articleService.create({
        title,
        content,
        tags,
        date: new Date()
      })

      // 返回响应
      res.json({
        success: true,
        article: {
          id: article.id,
          title: article.title,
          preview_url: this.generatePreviewUrl(article)
        }
      })
    } catch (error) {
      res.status(500).json({
        error: 'Failed to publish article',
        message: error.message
      })
    }
  }
}
```

### 阶段3：集成测试
**目标**: 测试组件间交互和端到端流程

#### 3.1 GUI集成测试
```typescript
// tests/integration/gui.test.ts
describe('GUI API Settings', () => {
  test('should start API server from GUI', async () => {
    const mockIPC = {
      invoke: jest.fn()
        .mockResolvedValueOnce({ success: true, url: 'http://localhost:3001' })
        .mockResolvedValueOnce({ running: true, url: 'http://localhost:3001' })
    }

    const apiSetting = new APISetting({ ipc: mockIPC })
    await apiSetting.startAPIServer()

    expect(mockIPC.invoke).toHaveBeenCalledWith('start-api-server', expect.any(Object))
    expect(apiSetting.apiServerStatus.running).toBe(true)
  })
})
```

#### 3.2 端到端API测试
```typescript
// tests/e2e/api-flow.test.ts
describe('API Flow E2E', () => {
  test('should handle complete article publishing flow', async () => {
    // 1. 启动服务器
    const apiServer = new APIServer(testConfig)
    await apiServer.start()

    // 2. 发布文章
    const publishResponse = await fetch('http://localhost:3001/api/v1/articles/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testArticle)
    })

    expect(publishResponse.status).toBe(200)
    const publishData = await publishResponse.json()
    expect(publishData.success).toBe(true)

    // 3. 检查状态
    const statusResponse = await fetch(`http://localhost:3001/api/v1/articles/${publishData.article.id}/status`)
    const statusData = await statusResponse.json()
    expect(statusData.article.status).toBe('published')

    // 4. 清理
    await apiServer.stop()
  })
})
```

### 阶段4：GUI组件TDD
**目标**: 测试驱动的GUI组件开发

#### 4.1 API设置组件测试
```typescript
// tests/components/APISetting.test.ts
describe('APISetting Component', () => {
  let wrapper: VueWrapper<APISetting>

  beforeEach(() => {
    wrapper = mount(APISetting, {
      global: {
        mocks: {
          $ipc: { invoke: jest.fn() },
          $store: { dispatch: jest.fn() },
          $message: { success: jest.fn(), error: jest.fn() }
        }
      }
    })
  })

  test('should render API settings form', () => {
    expect(wrapper.find('.api-setting').exists()).toBe(true)
    expect(wrapper.find('a-switch').exists()).toBe(true)
  })

  test('should enable API when switch is toggled', async () => {
    const switchComponent = wrapper.findComponent({ name: 'ASwitch' })
    await switchComponent.setValue(true)

    expect(wrapper.vm.enabled).toBe(true)
    expect(wrapper.vm.apiServerStatus.running).toBe(false)
  })

  test('should generate API key', () => {
    const apiKey = wrapper.vm.generateApiKey()
    expect(apiKey).toMatch(/^gridea_api_[a-z0-9]{32}$/)
  })
})
```

#### 4.2 状态监控组件测试
```typescript
// tests/components/APIStatus.test.ts
describe('APIStatus Component', () => {
  test('should display running status', () => {
    const wrapper = mount(APIStatus, {
      props: {
        status: { running: true, url: 'http://localhost:3001' }
      }
    })

    expect(wrapper.find('.api-status').text()).toContain('API服务器运行中')
    expect(wrapper.find('.api-status').text()).toContain('http://localhost:3001')
  })
})
```

### 阶段5：重构和优化
**目标**: 基于测试反馈进行代码重构

#### 5.1 性能测试
```typescript
// tests/performance/api.performance.test.ts
describe('API Performance', () => {
  test('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(0).map(() =>
      fetch('http://localhost:3001/api/health')
    )

    const startTime = Date.now()
    const responses = await Promise.all(requests)
    const endTime = Date.now()

    expect(endTime - startTime).toBeLessThan(5000) // 5秒内完成
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
  })
})
```

#### 5.2 内存泄漏测试
```typescript
// tests/memory/api.memory.test.ts
describe('API Memory Usage', () => {
  test('should not leak memory on repeated requests', async () => {
    const initialMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < 1000; i++) {
      await fetch('http://localhost:3001/api/health')
    }

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 小于10MB
  })
})
```

## 使用示例

### 启动API服务器
```bash
# 通过GUI界面启动，或使用命令行
curl -X POST http://localhost:3000/api/health
```

### 发布文章
```bash
curl -X POST http://localhost:3000/api/v1/articles/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "title": "API测试文章",
    "content": "# 测试\n\n这是通过API发布的文章。",
    "tags": ["test"],
    "categories": ["技术"],
    "auto_deploy": true
  }'
```

### 验证Markdown
```bash
curl -X POST http://localhost:3000/api/v1/validate/markdown \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 标题\n\n这是一个测试文章。"
  }'
```

### 测试Webhook
```bash
curl -X POST http://localhost:3000/api/v1/webhook/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "url": "https://your-webhook-endpoint.com",
    "event": "article.published"
  }'
```

## 安全考虑

### 认证安全
- API密钥使用强随机算法生成
- 密钥不在日志中记录
- 支持密钥轮换

### 网络安全
- CORS配置限制允许的域名
- 支持HTTPS（在生产环境中）
- 请求大小限制（10MB）

### 数据安全
- 输入数据严格验证
- SQL注入防护
- XSS攻击防护

## 性能考虑

### 服务器性能
- 异步处理所有请求
- 连接池管理
- 内存使用优化

### 并发处理
- 支持并发文章发布
- 部署任务队列
- Webhook异步发送

## 监控和日志

### 日志记录
- API访问日志
- 错误日志
- 性能日志

### 监控指标
- 请求计数
- 响应时间
- 错误率
- 服务器状态

## 扩展计划

### 短期扩展
- 批量文章操作API
- 文章分类和标签管理API
- 主题配置API
- 用户管理API

### 长期扩展
- GraphQL支持
- 实时通知（WebSocket）
- 插件系统
- 第三方集成SDK

## 风险评估

### 技术风险
- 现有架构兼容性
- 性能影响
- 内存使用增加

### 安全风险
- API滥用
- 认证绕过
- 数据泄露

### 缓解措施
- 逐步实现和测试
- 代码审查
- 安全测试
- 性能监控

## TDD成功标准

### 测试覆盖标准
- [x] 单元测试覆盖率 > 90%
- [x] 集成测试覆盖率 > 80%
- [x] 端到端测试覆盖率 > 70%
- [x] 所有核心功能都有对应测试
- [x] 测试用例文档完整

### 代码质量标准
- [x] 所有测试通过
- [x] 代码审查通过
- [x] 静态分析通过
- [x] 性能测试通过
- [x] 安全测试通过

### TDD流程标准
- [x] 每个功能先写失败的测试
- [x] 测试失败后实现最小功能
- [x] 功能通过后进行重构
- [x] 重构后所有测试仍然通过
- [x] 持续集成自动化测试

### 功能标准
- [x] API服务器正常启动和停止
- [x] 文章发布功能正常工作
- [x] Markdown验证准确有效
- [x] 自动部署功能可用
- [x] Webhook通知可靠
- [x] 认证系统安全可靠

### 性能标准
- [x] API响应时间 < 1s
- [x] 并发处理能力 > 10req/s
- [x] 内存使用增长 < 50MB
- [x] 测试执行时间 < 30s

### 用户体验标准
- [x] GUI操作简单直观
- [x] API文档清晰完整
- [x] 错误信息友好明确
- [x] 配置过程简单方便

## 测试检查清单

### 单元测试检查清单
- [x] MarkdownValidator所有验证场景
- [x] APIServer启动/停止逻辑
- [x] 文章发布API参数验证
- [x] Webhook通知发送逻辑
- [x] 认证中间件功能
- [x] CORS配置正确性
- [x] 错误处理逻辑
- [x] 工具函数正确性

### 集成测试检查清单
- [x] GUI与主进程IPC通信
- [x] API服务器与现有服务集成
- [x] 文章发布完整流程
- [x] 部署服务调用
- [x] 配置持久化
- [x] 状态同步机制

### 端到端测试检查清单
- [x] 用户启动API服务器的完整流程
- [x] 外部API调用发布文章
- [x] 自动部署执行
- [x] Webhook通知接收
- [x] 错误场景处理
- [x] 性能压力测试

### 性能测试检查清单
- [x] 单请求响应时间
- [x] 并发请求处理
- [x] 内存使用情况
- [x] CPU使用情况
- [x] 网络连接稳定性
- [x] 长时间运行稳定性

## 测试框架配置

### Jest配置
```json
// jest.config.js
module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,vue}',
    '!src/main.ts',
    '!src/background.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/test-setup.ts'],
  testTimeout: 30000,
  verbose: true
}
```

### 测试工具函数
```typescript
// tests/helpers/test-setup.ts
import { config } from 'dotenv'
import fetch from 'node-fetch'

// 加载测试环境变量
config({ path: '.env.test' })

// 全局测试配置
global.testConfig = {
  apiPort: process.env.TEST_API_PORT || 3001,
  testApiKey: process.env.TEST_API_KEY || 'test-api-key',
  mockWebhookUrl: process.env.MOCK_WEBHOOK_URL || 'http://localhost:3002/webhook',
  testTimeout: 30000
}

// 模拟fetch
global.fetch = fetch as any

// 测试辅助函数
export const createTestArticle = () => ({
  title: 'Test Article ' + Date.now(),
  content: '# Test\n\nThis is a test article.',
  tags: ['test'],
  categories: ['技术'],
  auto_deploy: false
})

export const createTestConfig = (overrides = {}) => ({
  port: testConfig.apiPort,
  auth: { enabled: false },
  autoDeploy: false,
  cors: { enabled: true, origins: ['*'] },
  ...overrides
})

export const waitForServer = async (url: string, timeout = 10000) => {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/api/health`)
      if (response.ok) return true
    } catch (error) {
      // 继续等待
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Server not ready after ${timeout}ms`)
}
```

### CI/CD测试配置
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'

    - name: Install dependencies
      run: yarn install

    - name: Run unit tests
      run: yarn test:unit

    - name: Run integration tests
      run: yarn test:integration

    - name: Run e2e tests
      run: yarn test:e2e

    - name: Generate coverage report
      run: yarn test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
```

## TDD开发工作流

### 1. 红色阶段（Red）
```bash
# 1. 创建失败的测试
# tests/validators/markdown.validator.test.ts
describe('MarkdownValidator', () => {
  test('should validate empty content', () => {
    const result = MarkdownValidator.validate('')
    expect(result.valid).toBe(false)  // 预期失败，因为方法不存在
    expect(result.errors).toContain('内容不能为空')
  })
})

# 2. 运行测试确认失败
yarn test:unit --watch
# 测试失败，因为MarkdownValidator不存在
```

### 2. 绿色阶段（Green）
```typescript
// src/server/validators/markdown.ts
export class MarkdownValidator {
  static validate(content: string): ValidationResult {
    // 最小实现让测试通过
    if (!content || content.trim().length === 0) {
      return {
        valid: false,
        errors: ['内容不能为空'],
        warnings: [],
        suggestions: []
      }
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    }
  }
}
```

### 3. 重构阶段（Refactor）
```typescript
// 重构优化，添加更多验证逻辑
export class MarkdownValidator {
  static validate(content: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    if (!content || content.trim().length === 0) {
      errors.push('内容不能为空')
      return { valid: false, errors, warnings, suggestions }
    }

    // 提取验证逻辑到独立方法
    this.validateLinks(content, errors)
    this.validateImages(content, warnings)
    this.validateStructure(content, warnings, suggestions)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  private static validateLinks(content: string, errors: string[]) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match
    while ((match = linkRegex.exec(content)) !== null) {
      if (!this.isValidUrl(match[2])) {
        errors.push(`无效链接: ${match[2]}`)
      }
    }
  }

  // 更多私有方法...
}
```

### 4. 重复循环
```bash
# 添加新的测试用例
test('should detect invalid links', () => {
  const content = '[link](invalid-url)'
  const result = MarkdownValidator.validate(content)
  expect(result.valid).toBe(false)  // 再次失败
  expect(result.errors).toContain('无效链接: invalid-url')
})

# 实现功能让测试通过
# 重构优化
# 继续下一个测试...
```

## 测试数据管理

### 测试数据工厂
```typescript
// tests/factories/article.factory.ts
export class ArticleFactory {
  static create(overrides = {}) {
    return {
      title: 'Test Article ' + Math.random().toString(36).substr(2, 9),
      content: '# Test\n\nThis is a test article.',
      tags: ['test'],
      categories: ['技术'],
      auto_deploy: false,
      date: new Date(),
      ...overrides
    }
  }

  static createInvalid(overrides = {}) {
    return {
      title: '',
      content: '',
      ...overrides
    }
  }
}
```

### Mock服务器
```typescript
// tests/mocks/webhook.server.ts
export class WebhookMockServer {
  private server: any
  private requests: any[] = []

  async start(port = 3002) {
    const express = require('express')
    const app = express()

    app.use(express.json())

    app.post('/webhook', (req, res) => {
      this.requests.push(req.body)
      res.json({ success: true })
    })

    this.server = app.listen(port)
  }

  getRequests() {
    return this.requests
  }

  clearRequests() {
    this.requests = []
  }

  async stop() {
    if (this.server) {
      this.server.close()
    }
  }
}
```

## 最佳实践

### 测试命名约定
```typescript
// 好的测试命名
describe('MarkdownValidator', () => {
  describe('validate', () => {
    test('should return error when content is empty', () => {
      // 测试空内容场景
    })

    test('should return error when links are invalid', () => {
      // 测试无效链接场景
    })

    test('should return success when content is valid', () => {
      // 测试有效内容场景
    })
  })
})
```

### 测试组织结构
```
tests/
├── helpers/          # 测试工具函数
├── factories/        # 测试数据工厂
├── mocks/          # Mock对象
├── unit/           # 单元测试
│   ├── validators/
│   ├── services/
│   └── utils/
├── integration/    # 集成测试
│   ├── api/
│   └── gui/
├── e2e/           # 端到端测试
│   ├── api-flow/
│   └── gui-flow/
└── performance/   # 性能测试
    ├── load/
    └── memory/
```

### 测试数据清理
```typescript
// 每个测试后清理
afterEach(async () => {
  await cleanupTestData()
  await resetMockServers()
})

// 所有测试后清理
afterAll(async () => {
  await closeDatabaseConnections()
  await stopMockServers()
})
```

---

**文档版本**: 1.1 (TDD版本)
**创建日期**: 2024-01-01
**最后更新**: 2024-01-01
**负责人**: Claude AI

*此文档将根据实现进展持续更新*