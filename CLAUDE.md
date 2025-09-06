# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
# Install dependencies (uses pnpm)
pnpm i

# Setup environment variables (auto-runs in postinstall)
pnpm initial:env

# Start local PostgreSQL (if not using external DB)
pnpm docker:pg

# Run database migrations
pnpm db:migrate
```

### Development
```bash
# Start development server with Turbopack
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm check-types

# Linting and formatting
pnpm lint        # Next.js lint + Biome lint with fixes
pnpm lint:fix    # Lint with fixes
pnpm format      # Biome formatting
```

### Database Operations
```bash
# Generate new migrations
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Reset database (drop and push)
pnpm db:reset

# Open Drizzle Studio
pnpm db:studio

# Run custom migration script
pnpm db:migrate
```

### Build and Deploy
```bash
# Build for production
pnpm build

# Build for local production (NO_HTTPS='1')
pnpm build:local

# Start production server
pnpm start

# Docker operations
pnpm docker-compose:up
pnpm docker-compose:down
pnpm docker-compose:logs
```

## Architecture Overview

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **AI Integration**: Vercel AI SDK with multiple providers (OpenAI, Anthropic, Google, xAI, Ollama)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: better-auth with email/password and OAuth (Google, GitHub)
- **UI**: React 19, Tailwind CSS, Radix UI, ShadCN components
- **Model Context Protocol**: Custom MCP client implementation for tool integration

### Project Structure

#### `/src/app/` - Next.js App Router
- `(auth)/` - Authentication pages and logic
- `(chat)/` - Main chat interface and related pages
- `api/` - API routes for chat, authentication, and data operations

#### `/src/lib/` - Core Library Code
- `ai/` - AI model providers, tools, and MCP integration
- `auth/` - Authentication configuration and utilities
- `db/` - Database schema, migrations, and repositories
- `cache/` - Caching abstraction layer

#### `/src/components/` - React Components
- UI components organized by feature (chat, auth, artifacts, etc.)
- `ui/` - Reusable ShadCN UI components
- `layouts/` - App-wide layout components

### Key Architectural Patterns

#### Multi-Provider AI Integration
The app supports multiple AI providers through a unified interface:
- Provider configurations in `src/lib/ai/models.ts`
- Model-specific capabilities (tool calling support, reasoning models)
- Fallback mechanisms for unsupported features

#### MCP (Model Context Protocol) Architecture
- Global MCP clients manager (`src/lib/ai/mcp/mcp-manager.ts`)
- Storage abstraction supporting file-based and database-based configs
- Tool integration through standardized MCP protocol

#### Authentication System
- Uses better-auth with Drizzle adapter
- Supports email/password and OAuth providers
- Migration system for users from previous auth systems

#### Database Design
- PostgreSQL with Drizzle ORM
- Separate schemas for users, chats, projects, documents, and MCP configurations
- Migration system with versioned schema changes

### Feature Systems

#### Artifact System
- Code/document generation and editing capabilities
- Multiple artifact types: text, code, image, sheet
- Live editing with diff visualization

#### Project Management
- Hierarchical organization of chat threads
- Project-specific instructions and context
- MCP server integration per project

#### Tool Integration
- Built-in tools for charts, weather, document management
- `@tool` mention system for direct tool invocation
- Tool choice modes: Auto, Manual, None

### Development Notes

#### Environment Configuration
- Multiple environment support (local, Docker, Vercel)
- Conditional HTTPS settings via NO_HTTPS flag
- Database URL configuration for different deployment scenarios

#### MCP Configuration
- File-based config (`.mcp-config.json`) for local development
- Database-based config for production deployments
- UI for adding/managing MCP servers

#### Testing Strategy
- Vitest for unit tests
- Playwright for end-to-end tests
- Test setup files in `/src/tests/`

#### Deployment Options
1. **Local Development**: Direct pnpm commands
2. **Docker Compose**: Full stack with PostgreSQL
3. **Vercel**: Serverless deployment with external database

### Important Conventions
- Use pnpm as package manager
- Database operations should use transactions for data integrity
- All new AI models must be registered in the models configuration
- MCP tools should follow the standardized protocol interface
- UI components should extend ShadCN base components when possible