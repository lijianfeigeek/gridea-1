# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## TypeScript Compatibility

**Important**: This project uses TypeScript 3.2.2. When working with this codebase:

- Use type assertions `(value as Type)` instead of type annotations in catch clauses (`catch (error: any)`)
- For browser APIs like `navigator.clipboard`, use type assertion: `(navigator as any).clipboard`
- `ga.event()` requires exactly 3 arguments: `ga.event('Category', 'Action', { evLabel: 'label' })`
- The project uses Vue Class Components with TypeScript decorators (experimentalDecorators enabled)

## Development Commands

### Essential Commands
- `yarn` - Install dependencies
- `yarn electron:serve` - Start development server with hot reload
- `yarn electron:build` - Build the application for production
- `yarn lint` - Run ESLint to check code quality (required before commit)

### Testing Commands
- `yarn test` - Run Jest unit tests via Vue CLI (IPC handlers, background process)
- `yarn test:watch` - Run Jest tests in watch mode
- `yarn test:coverage` - Run Jest tests with coverage report
- `yarn test:run` - Run Jest tests directly
- `yarn test:run:watch` - Run Jest tests in watch mode directly
- `yarn test:run:coverage` - Run Jest tests with coverage report directly
- `yarn test:unit` - Run Vitest unit tests (API server, general unit tests)
- `yarn test:watch:unit` - Run Vitest unit tests in watch mode
- `yarn test:coverage:unit` - Run Vitest unit tests with coverage
- `yarn test:api` - Run API-specific tests (Vitest)
- `yarn test:api:watch` - Run API tests in watch mode (Vitest)

### Single Test Commands
- `yarn test tests/unit/background/ipc.test.ts` - Run specific Jest test file
- `yarn test:unit tests/unit/api/articles.test.ts` - Run specific Vitest test file
- `yarn test:api tests/integration/api-integration.test.ts` - Run specific integration test

### Integration Testing Commands
- `yarn test:api tests/integration/` - Run all integration tests
- `yarn test:api tests/integration/config-simple.test.ts` - Run configuration integration tests
- `yarn test:api tests/integration/api-integration-simple.test.ts` - Run API integration tests
- `yarn test:api tests/integration/server-lifecycle.test.ts` - Run server lifecycle tests
- `yarn test:api tests/integration/configuration-integration.test.ts` - Run configuration management tests
- `yarn test:api tests/integration/webhook-article.test.ts` - Run webhook integration tests

### Requirements
- Node.js version >= v10.0.0 required
- Use yarn for package management (npm may work but yarn is preferred)

## Architecture Overview

Gridea is a static blog writing client built with Electron and Vue.js. The application allows users to write blog posts in Markdown and deploy them to various static hosting platforms.

### Core Architecture

**Electron Application Structure:**
- `src/background.ts` - Main process handling window creation, menus, and app lifecycle
- `src/main.ts` - Renderer process entry point, Vue app initialization
- `src/server.ts` - Express server for preview functionality (runs on port 4000)

**Frontend Architecture:**
- Vue 2.x with TypeScript and Vue Class Components
- Vue Router for navigation
- Vuex for state management (minimal usage)
- Ant Design Vue for UI components
- Tailwind CSS for utility-first styling

**Key Directories:**
- `src/components/` - Reusable Vue components
- `src/views/` - Page-level components
- `src/server/` - Backend logic and APIs
- `src/helpers/` - Utility functions and helpers
- `src/interfaces/` - TypeScript type definitions
- `src/assets/` - Static assets including styles and locales

### State Management
The application uses Vuex minimally with a single `site` module in `src/store/modules/site.ts`. Most state is managed locally within components or passed through props.

### Server-Side Architecture
The Express server (`src/server/`) handles:
- Blog post management (CRUD operations)
- Theme rendering and customization
- Deployment to various platforms (GitHub Pages, SFTP, Netlify)
- Settings management
- Preview generation

### REST API Architecture
The REST API implementation (`src/server/api/`) provides external article publishing capabilities:
- **APIServer Class**: Main server lifecycle management in `src/server/api/index.ts`
- **Configuration Management**: ConfigManager in `src/server/api/config.ts`
- **Middleware**: Authentication, CORS, security, rate limiting in `src/server/api/middleware.ts`
- **Routes**: API endpoints in `src/server/api/routes/`
- **Controllers**: Business logic in `src/server/api/controllers/`
- **Validators**: Input validation in `src/server/validators/`

### Key Features Implementation
- **Markdown Editor**: Monaco Editor with markdown-it for parsing
- **Theme System**: EJS-based templating with customizable themes
- **Deployment**: Multiple deployment targets including Git-based and SFTP
- **Internationalization**: Vue I18n with support for multiple languages
- **Local Storage**: LowDB for lightweight database needs
- **REST API**: External article publishing with authentication and webhooks

## Code Style and Conventions

### TypeScript Configuration
- Strict mode enabled
- Experimental decorators supported (for Vue Class Components)
- Path mapping: `@/*` resolves to `src/*`
- Legacy TypeScript 3.2.2 constraints apply

### ESLint Rules
- No semicolons enforced
- Single quotes for strings
- Console statements allowed in development
- Max line length: 1500 characters (very permissive)
- Vue-specific rules configured
- Husky pre-commit hooks enabled for automatic linting
- **Critical**: Must pass `yarn lint` before committing

### Styling
- Tailwind CSS for utility classes
- Less for component-specific styles
- Ant Design Vue components with custom theming
- Variables defined in `src/assets/styles/var.less`

### Component Structure
- Vue Class Components with TypeScript decorators
- Components follow PascalCase naming
- Views are in `src/views/` with nested routing structure
- Shared components in `src/components/`

## Development Workflow

### Adding New Features
1. Create TypeScript interfaces in `src/interfaces/` for new data structures
2. Add server logic in appropriate `src/server/` modules
3. Create Vue components following existing patterns
4. Update routing in `src/router.ts` if needed
5. Add translations in `src/assets/locales.ts`

### Building and Testing
- Use `yarn electron:serve` for development with hot reload
- Lint code with `yarn lint` before committing (mandatory)
- Build production version with `yarn electron:build`

### File Organization
- Keep related files together (component + styles + types)
- Use absolute imports with `@/` alias
- Follow the existing directory structure for consistency

## Testing Infrastructure

### Dual Testing Framework Architecture
The project uses both Jest and Vitest in a complementary setup with distinct responsibilities:

**Jest Responsibilities:**
- IPC handler testing (`tests/unit/background/`)
- Background process testing
- Electron-specific functionality
- Node.js environment testing
- Main process and renderer process communication
- Legacy unit tests

**Vitest Responsibilities:**
- API server testing (`tests/unit/api/`)
- General unit testing
- Integration testing (`tests/integration/`)
- Web API and HTTP testing
- Server lifecycle and configuration management testing
- Modern test framework with better performance and ES module support

### Framework Selection Strategy
- **Use Jest** for Electron-specific tests requiring complex Node.js mocking
- **Use Vitest** for API server tests, integration tests, and new test development
- **Both frameworks** share the same timeout settings (30 seconds) for consistency

### Test Structure
```
tests/
├── unit/
│   ├── background/          # Jest tests for IPC handlers
│   ├── api/                 # Vitest tests for API server
│   ├── components/          # Vue component tests
│   ├── validators/          # Input validation tests
│   └── services/            # Service layer tests
├── integration/            # Vitest integration tests
│   ├── api-integration.test.ts        # Full API integration
│   ├── api-integration-simple.test.ts # Simplified API tests
│   ├── config-simple.test.ts          # Configuration tests
│   ├── server-lifecycle.test.ts       # Server lifecycle tests
│   ├── configuration-integration.test.ts # Config management
│   ├── webhook-article.test.ts        # Webhook integration
│   └── background-ipc.test.ts         # IPC integration
└── e2e/                   # End-to-end tests (planned)
```

### Jest Configuration
- Test environment: Node.js
- Timeout: 30 seconds
- Coverage collection enabled
- Mock setup in `tests/setup-jest.js` with comprehensive Electron and Express mocking
- Path aliases: `@/*` → `src/*`, `@test/*` → `tests/*`

### Vitest Configuration
- Test environment: Node.js
- Coverage provider: V8
- Global test functions enabled
- Exclude patterns for Jest-specific tests
- Compatible with Jest timeout settings

### Mock Patterns and Testing Utilities

**Jest Setup (`tests/setup-jest.js`):**
- Comprehensive Electron module mocking (app, ipcMain, BrowserWindow, etc.)
- Express server mocking with both default and named imports
- File system operations mocking (fs, path, fs-extra)
- Database operations mocking (LowDB)
- Server modules and middleware mocking
- Internationalization and locales mocking

**Vitest Setup (`tests/setup.ts`):**
- API server testing utilities
- HTTP request/response mocking
- Configuration management testing helpers

### Integration Testing Strategy

**Test Categories:**
1. **GUI-Server Integration**: Server start/stop, status synchronization, health monitoring
2. **API End-to-End**: Article publishing, authentication, auto-deployment workflows
3. **Webhook Integration**: Notification systems, retry mechanisms, error handling
4. **Configuration Integration**: Save/load operations, updates, validation, environment variables
5. **Performance Integration**: Concurrent requests, long-running operations, memory usage
6. **IPC Communication**: Main process and renderer process communication

**Integration Test Files:**
- `api-integration.test.ts`: Comprehensive integration suite (1041 lines)
- `api-integration-simple.test.ts`: Simplified API server tests (629 lines)
- `server-lifecycle.test.ts`: Server lifecycle management (587 lines)
- `configuration-integration.test.ts`: Configuration management (611 lines)
- `config-simple.test.ts`: Core configuration tests (377 lines)
- `webhook-article.test.ts`: Webhook integration tests
- `background-ipc.test.ts`: IPC integration tests

### Current Test Health Status
- **Jest IPC Tests**: 93.8% pass rate (30/32 tests passing)
- **Vitest Integration Tests**: ~63% pass rate (73/115 tests passing)
- **Overall Test Infrastructure**: ~85% health rating
- **Critical Issues**: Resolved mock configuration and linting errors

## Current Development Context

### Active Branch: REST-API Implementation
The `REST-API` branch implements a comprehensive REST API server for external article publishing with Test-Driven Development (TDD) methodology.

**Key Features:**
- REST API server with configurable port (default: 3000)
- Article publishing API endpoints with markdown content validation
- Optional Bearer Token authentication with secret key management
- Automatic deployment integration with static site generation
- Webhook notification system with event subscriptions
- CORS configuration support for cross-origin requests
- Real-time API server status monitoring via IPC
- Comprehensive error handling and structured logging
- Health check endpoints for monitoring

**Implementation Files:**
- **API Server Core**: `src/server/api/index.ts` - Main APIServer class with lifecycle management
- **Configuration**: `src/server/api/config.ts` - ConfigManager for API server settings
- **Middleware**: `src/server/api/middleware.ts` - Authentication, CORS, security, and rate limiting
- **Routes**: `src/server/api/routes/` - API endpoint definitions (articles, webhooks)
- **Controllers**: `src/server/api/controllers/` - Business logic handlers
- **Validators**: `src/server/validators/` - Content validation and sanitization (markdown, webhook)
- **API Settings GUI**: `src/views/setting/includes/APISetting.vue` - Complete Vue component for API configuration
- **IPC Integration**: Extended `src/background/ipc-handlers.ts` with API server management methods
- **Tests**: Comprehensive test suite in `tests/unit/api/`, `tests/unit/background/`, and `tests/integration/`

**Critical Architecture Dependencies:**
- **appInstance Injection**: API server requires Gridea app instance for file operations and deployment
- **IPC Communication**: Main process and renderer process coordination for server management
- **Lazy Loading**: Server modules loaded dynamically to prevent runtime instantiation errors
- **Express.js Middleware Stack**: Security, CORS, authentication, rate limiting, and error handling

**API Endpoints:**
```
GET  /api/health                    - Health check and server status
GET  /api/articles/publish          - Article publishing endpoint
GET  /api/articles/:id/status       - Get article processing status
POST /api/articles/publish          - Publish article with markdown content
POST /api/validate/markdown         - Validate markdown content
GET  /api/config                    - Get current API configuration
POST /api/webhooks/test             - Test webhook functionality
```

**IPC Communication:**
The API server communicates with the main process via these IPC channels:
- `start-api-server` - Start the API server with configuration
- `stop-api-server` - Stop the running API server
- `get-api-server-status` - Get current server status
- `save-api-settings` - Persist API configuration to file
- `api-server-status-changed` - Event fired when server status changes
- `api-server-started` - Event fired when server starts successfully
- `api-server-stopped` - Event fired when server stops
- `api-server-error` - Event fired when server encounters errors

**Critical Implementation Details:**
- **Lazy Loading**: Server modules are loaded dynamically to prevent runtime instantiation errors
- **Express Mocking**: Jest setup includes comprehensive Express mocking to handle both default and named imports
- **TypeScript Compatibility**: All code must work with TypeScript 3.2.2 constraints
- **Error Handling**: Structured error handling with proper type assertions

### TDD Development Process
1. **Red Phase**: Write failing test cases
2. **Green Phase**: Implement minimal functionality to pass tests
3. **Refactor Phase**: Optimize code while maintaining test coverage
4. **Integration**: Test component interactions and end-to-end workflows

## Branch Context and Development Approach

### When working on the REST-API branch:
- Follow TDD methodology: write tests before implementation
- Maintain comprehensive test coverage (>90% for unit tests)
- Use the existing API server structure in `src/server/api/`
- Extend the API settings GUI in `src/views/setting/includes/APISetting.vue`
- Implement new endpoints following the established patterns
- Ensure all new features have corresponding tests
- Run `yarn lint` before committing changes (mandatory)
- Use `yarn test:api` to verify API functionality
- Handle TypeScript 3.2.2 limitations with type assertions
- Use appropriate test framework: Jest for IPC/background, Vitest for API/integration

### When working on the master branch:
- Focus on stable production features
- Maintain backward compatibility
- Follow established coding patterns
- Test new features thoroughly before merging

### General Development Guidelines
- Use absolute imports with `@/` alias
- Create TypeScript interfaces for new data structures
- Add translations in `src/assets/locales.ts` for user-facing features (all 6 language variants: zhHans, zh_TW, en, fr_FR, ru, ja_JP)
- Follow Vue Class Component patterns with TypeScript decorators
- Implement proper error handling and user feedback
- Use the existing state management patterns (minimal Vuex, local component state)
- Follow the established file organization and naming conventions
- **Vuex Actions**: Use namespaced actions (e.g., `this.$store.dispatch('site/updateApiSettings', settings)`)
- **Null Safety**: Always implement comprehensive null checking for site state and API configuration
- **Internationalization**: Ensure all user-facing strings have translations in all supported languages

### API Development Specifics
- All new API endpoints must have corresponding tests before implementation
- Use the existing ConfigManager pattern for configuration management
- Implement proper input validation using express-validator
- Follow the established error handling patterns in middleware/errorHandler.ts
- Use the APIServer class lifecycle methods (start/stop/restart) for server management
- Implement proper CORS configuration for development and production environments
- Use structured logging for API operations and debugging
- Use lazy loading patterns for server modules to avoid runtime errors
- **Critical**: Always pass appInstance to API server constructor for file operations
- **Vue Component Integration**: Use global component registration pattern for settings components
- **TypeScript 3.2.2 Constraints**: Use type assertions instead of type annotations in catch clauses

### Testing Best Practices
- **Mock Setup**: Use existing mock patterns in `tests/setup-jest.js` for Jest tests
- **Integration Tests**: Write comprehensive integration tests for new API features
- **Error Handling**: Test both success and error scenarios
- **Performance**: Include performance testing for API endpoints
- **Memory Management**: Test for memory leaks in long-running operations
- **Concurrent Access**: Test API behavior under concurrent requests
- **Test Framework Choice**: Use Vitest for new tests unless specifically testing Electron functionality
- **Mock State Management**: Always clear mocks between tests to prevent state pollution
- **ES Module Compatibility**: Ensure Vitest tests use ES imports and proper type exports

## Known Issues and Solutions

### Test Framework Compatibility
The project uses both Jest and Vitest which can cause conflicts:
- **Issue**: Mock state pollution between test frameworks
- **Solution**: Use framework-specific mock configurations and clear state between tests
- **Best Practice**: Run Jest and Vitest tests separately using their respective commands

### Mock Configuration Challenges
- **Issue**: Complex Express Router mocking causing integration test failures
- **Solution**: Use factory pattern for mock creation and avoid state pollution
- **Status**: Partially resolved - 42 integration tests still failing due to mock conflicts

### TypeScript 3.2.2 Constraints
- **Issue**: Limited TypeScript features affect test writing
- **Solution**: Use type assertions instead of type annotations in catch clauses
- **Example**: `catch (error) { console.log((error as Error).message) }`