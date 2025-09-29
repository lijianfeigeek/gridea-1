# API Server Architecture

This is a complete API server implementation for Gridea, built with Express.js and TypeScript.

## Features

- ✅ **Express Application Setup** - Full Express server initialization
- ✅ **HTTP Server Management** - Node.js HTTP server with lifecycle control
- ✅ **CORS Middleware** - Cross-origin resource sharing configuration
- ✅ **Body Parsing** - JSON and URL-encoded data parsing
- ✅ **Authentication** - Token-based authentication system
- ✅ **Security Headers** - Basic security middleware
- ✅ **Rate Limiting** - Request rate limiting to prevent abuse
- ✅ **Request Logging** - Comprehensive request logging
- ✅ **Error Handling** - Centralized error handling with proper HTTP responses
- ✅ **Configuration Management** - Flexible configuration with environment variable support
- ✅ **Health Check** - /api/health endpoint for monitoring
- ✅ **TypeScript Support** - Full type safety with strict TypeScript
- ✅ **Code Quality** - ESLint compliant code

## Usage

### Basic Usage

```typescript
import ApiServer from './src/server/api'

async function startApp() {
  const apiServer = new ApiServer()

  try {
    await apiServer.start()
    console.log('Server running on port 3000')
    console.log('Health check: http://localhost:3000/api/health')
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startApp()
```

### With Custom Configuration

```typescript
import ApiServer from './src/server/api'

const config = {
  port: 8080,
  host: '0.0.0.0',
  cors: {
    origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
    credentials: true,
    optionsSuccessStatus: 200
  },
  auth: {
    enabled: true,
    secretKey: 'your-secret-key-change-in-production',
    tokenExpiry: '24h'
  },
  logging: {
    level: 'debug',
    format: 'json'
  }
}

const apiServer = new ApiServer('./custom-config.json')
apiServer.updateConfig(config)
await apiServer.start()
```

### Environment Variables

You can configure the server using environment variables:

```bash
export API_PORT=8080
export API_HOST=0.0.0.0
export API_CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
export API_AUTH_ENABLED=true
export API_AUTH_SECRET=your-secret-key
export API_LOG_LEVEL=debug
```

## API Endpoints

### Health Check

```
GET /api/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "uptime": 12345,
    "version": "1.0.0",
    "memory": {
      "heapUsed": 12345678,
      "heapTotal": 23456789,
      "rss": 34567890
    },
    "api": {
      "endpoints": 1,
      "requests": 123
    }
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "error": "BadRequest",
    "details": "Additional error details (in development mode)",
    "timestamp": "2023-01-01T00:00:00.000Z"
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## Architecture

### Core Components

1. **APIServer Class** (`src/server/api/index.ts`)
   - Main server class with lifecycle management
   - Middleware setup
   - Route configuration
   - Error handling

2. **Middleware Manager** (`src/server/api/middleware.ts`)
   - CORS configuration
   - Authentication
   - Security headers
   - Rate limiting
   - Request logging
   - Error handling

3. **Configuration Manager** (`src/server/api/config.ts`)
   - Configuration validation
   - Environment variable support
   - Configuration persistence

4. **Routes** (`src/server/api/routes.ts`)
   - Health check endpoint
   - Request statistics
   - Route management

5. **Type Definitions** (`src/server/api/types.ts`)
   - TypeScript interfaces
   - Response types
   - Error types

### Adding New Routes

```typescript
// Extend the APIRoutes class
class ExtendedRoutes extends APIRoutes {
  private setupCustomRoutes() {
    this.router.get('/api/custom', this.customHandler.bind(this))
  }

  private customHandler(req: Request, res: Response) {
    res.json({
      success: true,
      data: { message: 'Custom endpoint' },
      timestamp: new Date().toISOString()
    })
  }
}

// Use in APIServer constructor
this.routes = new ExtendedRoutes()
```

### Adding Custom Middleware

```typescript
// Extend the MiddlewareManager class
class CustomMiddleware extends MiddlewareManager {
  public setupCustomMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Custom logic here
      next()
    }
  }
}

// Use in APIServer constructor
this.middlewareManager = new CustomMiddleware(config)
```

## Development

### Running Tests

```bash
# Run linting
yarn lint

# Test basic functionality
node src/server/api/simple-test.js
```

### Code Quality

The codebase follows these standards:

- ✅ ESLint compliant
- ✅ TypeScript strict mode
- ✅ Proper error handling
- ✅ Consistent naming conventions
- ✅ Comprehensive documentation

## Security Features

- CORS protection with configurable origins
- Rate limiting (100 requests per 15 minutes per IP)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Token-based authentication (configurable)
- Request logging for audit purposes
- Input validation and sanitization

## Monitoring

- Health check endpoint with memory usage and uptime
- Request counting and statistics
- Structured logging with JSON format support
- Error tracking with detailed error information

## License

This code is part of the Gridea project and follows the same license terms.