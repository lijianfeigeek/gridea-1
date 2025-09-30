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
- `yarn lint` - Run ESLint to check code quality

### Testing Commands
- `yarn test` - Run Jest unit tests via Vue CLI
- `yarn test:watch` - Run Jest tests in watch mode
- `yarn test:coverage` - Run Jest tests with coverage report
- `yarn test:run` - Run Jest tests directly
- `yarn test:run:watch` - Run Jest tests in watch mode directly
- `yarn test:run:coverage` - Run Jest tests with coverage report directly
- `yarn test:unit` - Run Vitest unit tests
- `yarn test:watch:unit` - Run Vitest unit tests in watch mode
- `yarn test:coverage:unit` - Run Vitest unit tests with coverage
- `yarn test:api` - Run API-specific tests (Vitest)
- `yarn test:api:watch` - Run API tests in watch mode (Vitest)

### Single Test Commands
- `yarn test tests/unit/background/ipc.test.ts` - Run specific Jest test file
- `yarn test:unit tests/unit/api/articles.test.ts` - Run specific Vitest test file

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

### Key Features Implementation
- **Markdown Editor**: Monaco Editor with markdown-it for parsing
- **Theme System**: EJS-based templating with customizable themes
- **Deployment**: Multiple deployment targets including Git-based and SFTP
- **Internationalization**: Vue I18n with support for multiple languages
- **Local Storage**: LowDB for lightweight database needs
- **REST API**: Experimental REST API server for external article publishing (in development)

## Code Style and Conventions

### TypeScript Configuration
- Strict mode enabled
- Experimental decorators supported (for Vue Class Components)
- Path mapping: `@/*` resolves to `src/*`

### ESLint Rules
- No semicolons enforced
- Single quotes for strings
- Console statements allowed in development
- Max line length: 1500 characters (very permissive)
- Vue-specific rules configured
- Husky pre-commit hooks enabled for automatic linting

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
- Lint code with `yarn lint` before committing
- Build production version with `yarn electron:build`

### File Organization
- Keep related files together (component + styles + types)
- Use absolute imports with `@/` alias
- Follow the existing directory structure for consistency

### Testing Strategy
- **Dual Testing Framework**: The project uses both Jest and Vitest
  - **Jest**: Used for IPC handlers and background process tests
  - **Vitest**: Used for API server and unit tests
- **Component Tests**: Vue component testing with @vue/test-utils
- **Integration Tests**: API server integration and IPC communication
- **E2E Tests**: Complete workflow testing (planned)
- **Test Structure**: Tests organized in `tests/` directory with subdirectories

## Testing Infrastructure

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

### Key Mock Patterns
The Jest setup includes comprehensive mocking for:
- Electron modules (app, ipcMain, BrowserWindow, etc.)
- Express server with both default and named imports
- File system operations (fs, path)
- Database operations (LowDB)
- Server modules and middleware
- Internationalization and locales

## Current Development Context

### Active Branch: REST-API Implementation
The `REST-API` branch implements a comprehensive REST API server for external article publishing with Test-Driven Development (TDD) methodology.

**Key Features:**
- REST API server with configurable port (default: 3000)
- Article publishing API endpoints
- Markdown content validation
- Optional Bearer Token authentication
- Automatic deployment integration
- Webhook notification system
- CORS configuration support
- Real-time API server status monitoring

**Implementation Files:**
- **API Server Core**: `src/server/api/index.ts` - Main APIServer class with lifecycle management
- **Configuration**: `src/server/api/config.ts` - ConfigManager for API server settings
- **Middleware**: `src/server/api/middleware.ts` - Authentication, CORS, security, and rate limiting
- **Routes**: `src/server/api/routes/` - API endpoint definitions (articles, webhooks)
- **Controllers**: `src/server/api/controllers/` - Business logic handlers
- **Validators**: `src/server/validators/` - Content validation and sanitization (markdown, webhook)
- **API Settings GUI**: `src/views/setting/includes/APISetting.vue` - Complete Vue component for API configuration
- **IPC Integration**: Extended `src/background/ipc-handlers.ts` with API server management methods
- **Tests**: Comprehensive test suite in `tests/unit/api/` and `tests/unit/background/`

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

**TDD Development Process:**
1. **Red Phase**: Write failing test cases
2. **Green Phase**: Implement minimal functionality to pass tests
3. **Refactor Phase**: Optimize code while maintaining test coverage
4. **Integration**: Test component interactions and end-to-end workflows

**Testing Commands:**
- `yarn test:api` - Run API-specific tests (Vitest)
- `yarn test:api:watch` - Run API tests in watch mode (Vitest)
- `yarn test` - Run Jest tests (IPC handlers)
- `yarn test:unit` - Run Vitest unit tests
- `yarn test:coverage:unit` - Run tests with coverage report

## Branch Context and Development Approach

### When working on the REST-API branch:
- Follow TDD methodology: write tests before implementation
- Maintain comprehensive test coverage (>90% for unit tests)
- Use the existing API server structure in `src/server/api/`
- Extend the API settings GUI in `src/views/setting/includes/APISetting.vue`
- Implement new endpoints following the established patterns
- Ensure all new features have corresponding tests
- Run `yarn lint` before committing changes
- Use `yarn test:api` to verify API functionality
- Handle TypeScript 3.2.2 limitations with type assertions

### When working on the master branch:
- Focus on stable production features
- Maintain backward compatibility
- Follow established coding patterns
- Test new features thoroughly before merging

### General Development Guidelines
- Use absolute imports with `@/` alias
- Create TypeScript interfaces for new data structures
- Add translations in `src/assets/locales.ts` for user-facing features
- Follow Vue Class Component patterns with TypeScript decorators
- Implement proper error handling and user feedback
- Use the existing state management patterns (minimal Vuex, local component state)
- Follow the established file organization and naming conventions

### API Development Specifics
- All new API endpoints must have corresponding tests before implementation
- Use the existing ConfigManager pattern for configuration management
- Implement proper input validation using express-validator
- Follow the established error handling patterns in middleware/errorHandler.ts
- Use the APIServer class lifecycle methods (start/stop/restart) for server management
- Implement proper CORS configuration for development and production environments
- Use structured logging for API operations and debugging
- Use lazy loading patterns for server modules to avoid runtime errors