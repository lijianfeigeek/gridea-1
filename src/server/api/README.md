# Gridea 文章发布 API

这个 API 为 Gridea 静态博客生成器提供了完整的文章发布和部署功能。

## ✅ 已实现功能

1. **文章发布控制器**
   - 请求数据验证
   - Markdown 内容验证
   - 文章数据创建
   - 响应数据格式化

2. **认证中间件**
   - Bearer Token 验证
   - API 密钥验证
   - 认证错误处理

3. **自动部署集成**
   - 部署服务调用
   - 部署状态跟踪
   - 异步部署处理
   - 重试机制

4. **错误处理**
   - 参数错误处理
   - 验证错误处理
   - 系统错误处理
   - 详细的错误响应

## API 端点

### 1. 发布文章

**POST** `/api/articles/publish`

发布新文章，可选择是否自动部署。

**请求头：**
```
Content-Type: application/json
Authorization: Bearer your-secret-token
X-API-Key: your-api-key (可选)
```

**请求体：**
```json
{
  "title": "文章标题",
  "content": "# 欢迎使用 Gridea API\n\n这是第一篇文章。",
  "tags": ["API", "Gridea"],
  "autoDeploy": true
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "articleId": "2024-01-15-10-30-00-article-title",
    "fileName": "2024-01-15-10-30-00-article-title",
    "published": true,
    "publishedAt": "2024-01-15T10:30:00.000Z",
    "deploymentStatus": "completed",
    "autoDeploy": true,
    "deployUrl": "https://yourusername.github.io/yourrepo/",
    "tags": ["API", "Gridea"],
    "deployedAt": "2024-01-15T10:30:15.000Z"
  },
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

### 2. 健康检查

**GET** `/api/health`

检查 API 健康状态和部署统计信息。

**响应：**
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "deployment": {
    "total": 5,
    "pending": 0,
    "running": 0,
    "completed": 4,
    "failed": 1,
    "cancelled": 0
  }
}
```

### 3. 部署统计

**GET** `/api/deployment/stats`

获取部署统计信息。

**响应：**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "pending": 0,
    "running": 1,
    "completed": 3,
    "failed": 1,
    "cancelled": 0
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 认证

API 支持两种认证方式：

1. **Bearer Token** (推荐)
   ```
   Authorization: Bearer your-secret-token
   ```

2. **API Key**
   ```
   X-API-Key: your-api-key
   ```

## 配置

### 环境变量

```bash
# API 服务器配置
export API_PORT=3000
export API_HOST=localhost
export API_AUTH_ENABLED=true
export API_SECRET_KEY=your-secret-key-here
export API_TOKEN_EXPIRY=24h

# CORS 配置
export API_CORS_ORIGIN=http://localhost:4000,http://localhost:3000

# 日志配置
export API_LOG_LEVEL=info
export API_LOG_FORMAT=json

# 部署配置
export AUTO_DEPLOY_ENABLED=true
```

### 配置文件

API 配置文件位置：`api-config.json`

```json
{
  "port": 3000,
  "host": "localhost",
  "cors": {
    "origin": ["http://localhost:4000", "http://localhost:3000"],
    "credentials": true,
    "optionsSuccessStatus": 200
  },
  "auth": {
    "enabled": true,
    "secretKey": "your-secret-key-here",
    "tokenExpiry": "24h"
  },
  "body": {
    "limit": "10mb",
    "extended": true
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "message": "错误描述",
    "statusCode": 400,
    "error": "BadRequest",
    "type": "validation",
    "details": ["具体错误信息"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 常见错误码

- `400 Bad Request`: 请求数据验证失败
- `401 Unauthorized`: 认证失败
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `429 Too Many Requests`: 请求频率过高
- `500 Internal Server Error`: 服务器内部错误

## 使用示例

### cURL 示例

```bash
# 发布文章
curl -X POST http://localhost:3000/api/articles/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "title": "Hello World",
    "content": "# 欢迎使用 Gridea API\n\n这是我的第一篇文章！",
    "tags": ["API", "Gridea"],
    "autoDeploy": true
  }'

# 健康检查
curl -X GET http://localhost:3000/api/health \
  -H "Content-Type: application/json"
```

### JavaScript 示例

```javascript
// 发布文章
async function publishArticle(articleData) {
  const response = await fetch('http://localhost:3000/api/articles/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${yourApiKey}`
    },
    body: JSON.stringify(articleData)
  })

  const result = await response.json()
  return result
}

// 使用示例
const article = {
  title: '我的第一篇 API 文章',
  content: '# 欢迎使用 Gridea API\n\n这是通过 API 发布的文章。',
  tags: ['API', 'Gridea', '教程'],
  autoDeploy: true
}

publishArticle(article)
  .then(result => console.log('发布成功:', result))
  .catch(error => console.error('发布失败:', error))
```

## 安全特性

1. **输入验证**: 严格的请求数据和 Markdown 内容验证
2. **认证机制**: 支持 Bearer Token 和 API Key 认证
3. **CORS 保护**: 可配置的跨域访问控制
4. **速率限制**: 防止 API 滥用
5. **安全头**: 添加安全相关的 HTTP 头
6. **错误处理**: 不在错误响应中暴露敏感信息

## 部署

### 自动部署

API 支持自动部署功能，当文章发布时可以自动触发部署流程。

**部署配置：**
- 最大并发部署数：3
- 重试次数：3
- 重试延迟：5 秒
- 超时时间：5 分钟

### 部署状态

- `pending`: 等待部署
- `running`: 正在部署
- `completed`: 部署完成
- `failed`: 部署失败
- `cancelled`: 部署取消

## 监控

API 提供了完整的监控功能：

1. **健康检查**: `/api/health`
2. **部署统计**: `/api/deployment/stats`
3. **请求日志**: 可配置的日志级别和格式
4. **错误跟踪**: 详细的错误信息和堆栈跟踪

## 性能优化

1. **异步处理**: 部署任务异步执行，不阻塞 API 响应
2. **并发控制**: 限制同时进行的部署任务数量
3. **重试机制**: 自动重试失败的部署
4. **缓存**: 优化数据库访问和文件操作

## 扩展性

API 设计具有良好的扩展性，支持：

1. **新的文章操作**: 轻松添加更新、删除等操作
2. **更多部署平台**: 支持 GitHub、Gitee、Coding 等平台
3. **自定义验证**: 可配置的验证规则
4. **插件系统**: 支持自定义中间件和处理器

## 开发指南

### 添加新的 API 端点

1. 在 `src/server/api/controllers/` 目录下创建新的控制器
2. 在 `src/server/api/routes/` 目录下创建新的路由
3. 在 `src/server/api/types.ts` 中添加相关的类型定义
4. 在 `src/server/api/integration.ts` 中注册新路由

### 添加新的认证方式

1. 在 `src/server/api/middleware/auth.ts` 中扩展认证逻辑
2. 在 `src/server/api/types.ts` 中添加相关的类型定义
3. 更新文档和示例

### 自定义部署逻辑

1. 修改 `src/server/api/services/deployment.ts` 中的部署服务
2. 添加新的部署平台支持
3. 更新配置选项

## 故障排除

### 常见问题

1. **认证失败**
   - 检查 Bearer Token 或 API Key 是否正确
   - 确认认证功能已启用

2. **部署失败**
   - 检查 Git 配置是否正确
   - 确认网络连接正常
   - 查看部署日志获取详细错误信息

3. **验证失败**
   - 检查文章格式是否符合要求
   - 确认 Markdown 语法正确
   - 查看错误详情了解具体问题

### 调试模式

设置环境变量启用调试模式：

```bash
export API_LOG_LEVEL=debug
export NODE_ENV=development
```

## 项目结构

```
src/server/api/
├── controllers/
│   └── articles.ts           # 文章发布控制器
├── routes/
│   └── articles.ts           # 文章发布路由
├── middleware/
│   ├── auth.ts              # 认证中间件
│   └── errorHandler.ts      # 错误处理中间件
├── services/
│   └── deployment.ts        # 部署服务
├── types.ts                 # TypeScript 类型定义
├── config.ts                # 配置管理
├── integration.ts           # API 集成
├── usage-examples.ts        # 使用示例
└── README.md               # 文档
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 运行测试：`yarn lint`
5. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证。