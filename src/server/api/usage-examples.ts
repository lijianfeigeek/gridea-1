import { ArticlePublishRequest, ArticlePublishResponse } from './types'

export interface APIUsageExample {
  name: string
  description: string
  method: string
  endpoint: string
  headers: Record<string, string>
  body: any
  response: any
  curlCommand: string
}

export const API_EXAMPLES: APIUsageExample[] = [
  {
    name: 'Publish Article',
    description: 'Publish a new article with auto-deployment',
    method: 'POST',
    endpoint: '/api/articles/publish',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-secret-token',
      'X-API-Key': 'your-api-key',
    },
    body: {
      title: 'Hello World',
      content: '# Welcome to my blog\n\nThis is my first post using the Gridea API!',
      tags: ['getting-started', 'api'],
      autoDeploy: true,
    },
    response: {
      success: true,
      data: {
        articleId: '2024-01-15-10-30-00-hello-world',
        fileName: '2024-01-15-10-30-00-hello-world',
        published: true,
        publishedAt: '2024-01-15T10:30:00.000Z',
        deploymentStatus: 'completed',
        autoDeploy: true,
        deployUrl: 'https://yourusername.github.io/yourrepo/',
        tags: ['getting-started', 'api'],
        deployedAt: '2024-01-15T10:30:15.000Z',
      },
      timestamp: '2024-01-15T10:30:15.000Z',
    },
    curlCommand: `curl -X POST http://localhost:3000/api/articles/publish \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-secret-token" \\
  -H "X-API-Key: your-api-key" \\
  -d '{
    "title": "Hello World",
    "content": "# Welcome to my blog\\n\\nThis is my first post using the Gridea API!",
    "tags": ["getting-started", "api"],
    "autoDeploy": true
  }'`,
  },
  {
    name: 'Publish Article without Auto-Deploy',
    description: 'Publish an article without automatic deployment',
    method: 'POST',
    endpoint: '/api/articles/publish',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-secret-token',
    },
    body: {
      title: 'Draft Article',
      content: 'This is a draft article that will not be deployed automatically.',
      tags: ['draft'],
      autoDeploy: false,
    },
    response: {
      success: true,
      data: {
        articleId: '2024-01-15-10-31-00-draft-article',
        fileName: '2024-01-15-10-31-00-draft-article',
        published: true,
        publishedAt: '2024-01-15T10:31:00.000Z',
        deploymentStatus: 'pending',
        autoDeploy: false,
        deployUrl: null,
        tags: ['draft'],
      },
      timestamp: '2024-01-15T10:31:00.000Z',
    },
    curlCommand: `curl -X POST http://localhost:3000/api/articles/publish \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-secret-token" \\
  -d '{
    "title": "Draft Article",
    "content": "This is a draft article that will not be deployed automatically.",
    "tags": ["draft"],
    "autoDeploy": false
  }'`,
  },
  {
    name: 'Check API Health',
    description: 'Check the health status of the API and deployment service',
    method: 'GET',
    endpoint: '/api/health',
    headers: {
      'Content-Type': 'application/json',
    },
    body: null,
    response: {
      success: true,
      message: 'API is healthy',
      timestamp: '2024-01-15T10:32:00.000Z',
      deployment: {
        total: 5,
        pending: 0,
        running: 0,
        completed: 4,
        failed: 1,
        cancelled: 0,
      },
    },
    curlCommand: `curl -X GET http://localhost:3000/api/health \\
  -H "Content-Type: application/json"`,
  },
  {
    name: 'Get Deployment Statistics',
    description: 'Get deployment statistics and metrics',
    method: 'GET',
    endpoint: '/api/deployment/stats',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-secret-token',
    },
    body: null,
    response: {
      success: true,
      data: {
        total: 5,
        pending: 0,
        running: 1,
        completed: 3,
        failed: 1,
        cancelled: 0,
      },
      timestamp: '2024-01-15T10:33:00.000Z',
    },
    curlCommand: `curl -X GET http://localhost:3000/api/deployment/stats \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-secret-token"`,
  },
]

export const ERROR_EXAMPLES = [
  {
    name: 'Authentication Error',
    statusCode: 401,
    response: {
      success: false,
      error: {
        message: 'Authentication required. Please provide a valid Bearer token or API key.',
        statusCode: 401,
        error: 'Unauthorized',
        timestamp: '2024-01-15T10:34:00.000Z',
      },
      timestamp: '2024-01-15T10:34:00.000Z',
    },
  },
  {
    name: 'Validation Error',
    statusCode: 400,
    response: {
      success: false,
      error: {
        message: 'Invalid request data',
        statusCode: 400,
        error: 'BadRequest',
        details: ['Title is required and must be a non-empty string', 'Content is required and must be a non-empty string'],
        timestamp: '2024-01-15T10:35:00.000Z',
      },
      timestamp: '2024-01-15T10:35:00.000Z',
    },
  },
  {
    name: 'Markdown Validation Error',
    statusCode: 400,
    response: {
      success: false,
      error: {
        message: 'Invalid markdown content',
        statusCode: 400,
        error: 'InvalidContent',
        details: ['检测到不安全的链接协议', '标题层级不能跳级'],
        timestamp: '2024-01-15T10:36:00.000Z',
      },
      timestamp: '2024-01-15T10:36:00.000Z',
    },
  },
  {
    name: 'Deployment Error',
    statusCode: 500,
    response: {
      success: false,
      error: {
        message: 'Deployment failed',
        statusCode: 500,
        error: 'DeploymentError',
        details: 'Network error during deployment',
        timestamp: '2024-01-15T10:37:00.000Z',
      },
      timestamp: '2024-01-15T10:37:00.000Z',
    },
  },
]

export function generateExampleDocumentation(): string {
  return `# Gridea API Usage Examples

## Authentication

The API supports two authentication methods:
1. **Bearer Token**: Include in Authorization header
2. **API Key**: Include in X-API-Key header

## Endpoints

### 1. Publish Article

\`\`\`bash
${API_EXAMPLES[0].curlCommand}
\`\`\`

### 2. Check API Health

\`\`\`bash
${API_EXAMPLES[2].curlCommand}
\`\`\`

### 3. Get Deployment Statistics

\`\`\`bash
${API_EXAMPLES[3].curlCommand}
\`\`\`

## Error Handling

Common error responses:

### Authentication Error (401)
\`\`\`json
${JSON.stringify(ERROR_EXAMPLES[0].response, null, 2)}
\`\`\`

### Validation Error (400)
\`\`\`json
${JSON.stringify(ERROR_EXAMPLES[1].response, null, 2)}
\`\`\`

### Deployment Error (500)
\`\`\`json
${JSON.stringify(ERROR_EXAMPLES[3].response, null, 2)}
\`\`\`

## Configuration

Set environment variables to configure the API:

\`\`\`bash
export API_AUTH_ENABLED=true
export API_SECRET_KEY=your-secret-key
export API_PORT=3000
export API_HOST=localhost
export AUTO_DEPLOY_ENABLED=true
\`\`\`
`
}

export function getExampleByEndpoint(endpoint: string): APIUsageExample | undefined {
  return API_EXAMPLES.find(example => example.endpoint === endpoint)
}

export function getErrorExampleByStatusCode(statusCode: number): any {
  return ERROR_EXAMPLES.find(example => example.statusCode === statusCode)
}
