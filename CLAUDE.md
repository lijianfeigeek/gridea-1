# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `yarn` - Install dependencies
- `yarn electron:serve` - Start development server with hot reload
- `yarn electron:build` - Build the application for production
- `yarn lint` - Run ESLint to check code quality

### Requirements
- Node.js version > v10.0.0 required
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