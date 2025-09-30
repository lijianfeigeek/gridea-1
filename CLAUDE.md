# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `yarn test:api` - Run API-specific tests
- `yarn test:api:watch` - Run API tests in watch mode

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
- **Unit Tests**: Use Jest for utility functions and business logic
- **Component Tests**: Vue component testing with @vue/test-utils
- **Integration Tests**: API server integration and IPC communication
- **E2E Tests**: Complete workflow testing (planned)
- **Test Structure**: Tests organized in `tests/` directory with subdirectories for unit, integration, and e2e

## Platform-Specific Considerations

### Electron Builder Configuration
- Multi-platform builds (Windows, macOS, Linux)
- Auto-update functionality enabled
- Platform-specific icons and packaging
- GitHub releases integration

### Development Environment
- Node integration enabled in Electron
- Web security disabled for local resource access
- Remote module enabled for Electron API access

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
- API Server: `src/server/api/` - Core Express API server implementation
- API Settings GUI: `src/views/setting/includes/APISetting.vue` - User interface for API configuration
- IPC Handlers: Extended `src/background.ts` with API server management methods
- Validators: `src/server/validators/` - Content validation and sanitization
- Tests: `tests/unit/api/` - Comprehensive test suite following TDD principles

**API Endpoints:**
```
GET  /api/health                    - Health check
POST /api/v1/articles/publish        - Publish article
GET  /api/v1/articles/:id/status   - Get article status
POST /api/v1/validate/markdown      - Validate markdown
GET  /api/v1/config                 - Get configuration
POST /api/v1/webhook/test           - Test webhook
```

**TDD Development Process:**
1. **Red Phase**: Write failing test cases
2. **Green Phase**: Implement minimal functionality to pass tests
3. **Refactor Phase**: Optimize code while maintaining test coverage
4. **Integration**: Test component interactions and end-to-end workflows

**Testing Commands:**
- `yarn test:api` - Run API-specific tests
- `yarn test:api:watch` - Run API tests in watch mode
- `yarn test:unit` - Run all unit tests
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