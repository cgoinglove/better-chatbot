# Claude AI Assistant Guidelines for better-chatbot

## Project Overview

**better-chatbot** is an advanced open-source chatbot application built with Next.js 15 and the AI SDK by Vercel. It focuses on creating the best possible chatbot UX with seamless AI tool integration through the Model Context Protocol (MCP). The application supports multiple AI providers and allows users to create custom workflows that become callable tools in chat conversations.

### Key Features
- **Multi-Provider AI Support**: OpenAI, Anthropic, Google Gemini, xAI Grok, Ollama, and OpenRouter
- **Easy Model Integration**: Add new LLM providers and models easily through `@src/app/api/chat/models/` (see [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers))
- **Model Context Protocol (MCP)**: Seamless integration with external tools and services
- **Visual Workflows**: Create custom workflows with drag-and-drop UI that become callable tools
- **Realtime Voice Assistant**: Voice interaction with full MCP tool integration
- **Tool Mentions**: Quick tool access using `@toolname` syntax
- **Multiple Tool Choice Modes**: Auto, Manual, and None
- **Multi-language Support**: English, Korean, Spanish, French, Japanese, Chinese

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **React**: 19.1.0 with Server Components
- **TypeScript**: 5.8.3 with strict mode
- **Styling**: Tailwind CSS 4.1.11 with CSS variables
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **State Management**: Zustand 5.0.6
- **Data Fetching**: SWR 2.3.4
- **Internationalization**: next-intl 4.3.4
- **Animations**: Framer Motion 12.23.10

### Backend
- **Runtime**: Node.js >=18 with Edge Runtime support
- **Database**: PostgreSQL with Drizzle ORM 0.41.0
- **Authentication**: better-auth 1.3.4 with OAuth support (Google, GitHub)
- **AI Integration**: Vercel AI SDK 4.3.19
- **MCP Integration**: @modelcontextprotocol/sdk 1.17.0
- **Caching**: Memory and Redis cache implementations
- **File Processing**: Custom code execution environment with workers

### Development Tools
- **Package Manager**: pnpm 10.2.1
- **Code Quality**: Biome 1.9.4 (linting + formatting)
- **Testing**: Vitest 3.2.4 with test setup
- **Database**: Drizzle Kit 0.30.6 for migrations
- **Git Hooks**: Husky 9.1.7 with lint-staged
- **Bundler**: Turbopack (Next.js dev mode)

## Architecture

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (chat)/            # Main chat interface
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layouts/          # Layout components
│   ├── tool-invocation/  # Tool execution UI
│   └── workflow/         # Workflow builder UI
├── hooks/                # Custom React hooks
├── lib/                  # Core business logic
│   ├── ai/              # AI provider integrations
│   ├── auth/            # Authentication logic
│   ├── db/              # Database schema & repositories
│   ├── cache/           # Caching implementations
│   └── code-runner/     # Code execution sandbox
├── types/               # Shared TypeScript types (client/server compatible)
└── middleware.ts        # Next.js middleware
```

### Key Components

#### AI Integration (`src/lib/ai/`)
- **models.ts**: Multi-provider AI model configuration
- **mcp/**: Model Context Protocol integration and management
- **tools/**: Built-in tools (web search, code execution, visualization)
- **workflow/**: Visual workflow system with node-based execution
- **speech/**: Realtime voice interaction with OpenAI

#### Database Schema (`src/lib/db/pg/schema.pg.ts`)
The application uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **Users**: Authentication and preferences with OAuth support
- **Sessions & Accounts**: Session management and OAuth provider integration
- **Chat Threads**: Conversation management with user relationships
- **Messages**: Chat history with tool invocations, parts, and attachments
- **Agents**: Custom AI agents with instructions and icons
- **MCP Servers**: External tool configurations with enable/disable state
- **MCP Customizations**: Per-user tool and server instruction customizations
- **Workflows**: Visual workflow definitions with nodes and edges
- **Archives**: Chat archiving system for organizing conversations

All tables use UUID primary keys and include proper foreign key relationships with cascade deletes where appropriate.

#### Type System (`src/types/`)
Shared TypeScript type definitions that work in both client and server environments:

- **Separation from DB Schema**: Types are kept separate from Drizzle schemas to avoid client-side errors
- **Universal Compatibility**: All types in `src/types/` can be safely imported in both client and server components
- **Domain-Specific Types**: Organized by feature (chat, agent, mcp, workflow, user, archive)
- **No DB Dependencies**: Types don't import database-specific code that could cause hydration issues

This separation ensures that client components can use type definitions without encountering server-only imports that would cause Next.js build errors.

#### Authentication (`src/lib/auth/`)
- Session-based authentication with better-auth
- OAuth providers (Google, GitHub)
- User preferences and customization

## Development Guidelines

### Code Style
- **Formatting**: 2-space indentation, LF line endings, 80-character line width
- **Imports**: Organized with Biome, use path aliases (`@/`, `ui/`, `lib/`)
- **TypeScript**: Strict mode enabled, no unused variables/parameters allowed
- **Components**: Use React Server Components by default, Client Components when needed
- **Naming**: camelCase for variables/functions, PascalCase for components

### Database Operations
- Use Drizzle ORM with prepared statements
- Repository pattern for data access
- Migration files in `src/lib/db/migrations/pg/`
- Schema changes require new migration files

### API Routes
- Follow Next.js 15 App Router conventions
- Use proper HTTP status codes and error handling
- Implement rate limiting where appropriate
- Support both streaming and non-streaming responses

### Component Development
- Use shadcn/ui components as base
- Implement proper loading and error states
- Support both light and dark themes
- Follow accessibility best practices
- Use TypeScript for all props and state

### Testing
- Unit tests with Vitest
- Test files co-located with source code (`.test.ts` suffix)
- Setup file: `vitest.setup.ts`
- Run tests: `pnpm test` or `pnpm test:watch`

## Build and Deployment

### Scripts
```bash
# Development
pnpm dev                    # Start development server with Turbopack
pnpm build:local           # Build for local deployment (no HTTPS)
pnpm build                 # Production build
pnpm start                 # Start production server

# Database
pnpm db:generate           # Generate migrations
pnpm db:push              # Push schema changes
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Drizzle Studio

# Code Quality
pnpm lint                 # Run linting
pnpm lint:fix            # Fix linting issues
pnpm format              # Format code with Biome
pnpm check-types         # TypeScript type checking
pnpm test                # Run tests

# Docker
pnpm docker:pg           # Start PostgreSQL container
pnpm docker-compose:up   # Full Docker Compose setup
pnpm docker:app          # Build and run app container
```

### Environment Variables
Required variables are documented in `.env.example`. Key categories:
- **AI Providers**: API keys for OpenAI, Anthropic, Google, etc.
- **Database**: PostgreSQL connection URL
- **Authentication**: better-auth secret and OAuth credentials
- **Optional Tools**: Exa AI for web search and content extraction
- **Feature Flags**: MCP configuration, sign-up controls

### Deployment Options
1. **Local**: `pnpm build:local && pnpm start`
2. **Docker**: Use provided Dockerfile and compose.yml
3. **Vercel**: One-click deploy with automatic environment setup
4. **Self-hosted**: Standard Next.js deployment with PostgreSQL

## MCP Integration

### Server Management
- Servers configured via UI or file-based config
- Support for both local and remote MCP servers
- Tool customization and parameter validation
- Automatic tool discovery and registration

### Workflow System
- Visual workflow builder with node-based interface
- Support for LLM nodes, tool nodes, and conditional logic
- Workflows become callable tools with `@workflow_name` syntax
- Execution engine with dependency resolution

### Built-in Tools
- **Web Search**: Exa AI integration for semantic search and content extraction
- **Code Execution**: Safe JavaScript and Python execution  
- **Data Visualization**: UI component tools for data presentation
  - **Interactive Tables**: Feature-rich tables with sorting, filtering, search, highlighting, pagination, and CSV/Excel export
  - **Charts**: Generation of bar, line, and pie charts
  - Tools generate parameters that render React components
  - Components located in `@src/components/tool-invocation/`
  - Dynamic imports used in `@src/components/message-parts.tsx` for rendering
  - Lazy-loaded Excel export using CDN-based xlsx library for optimal bundle size
- **HTTP Requests**: Configurable HTTP client
- **Sequential Thinking**: Step-by-step reasoning

## Contributing

### Before Contributing
1. Read `CONTRIBUTING.md` for detailed guidelines
2. Create an issue for new features or major changes
3. Follow the established code style and patterns
4. Ensure all tests pass and types are correct

### Development Setup
```bash
git clone https://github.com/cgoinglove/better-chatbot.git
cd better-chatbot
pnpm i                    # Creates .env file automatically
pnpm docker:pg           # Start PostgreSQL (optional)
# Configure .env with your API keys
pnpm build:local && pnpm start
```

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `pnpm check` to verify quality
5. Submit PR with clear description

## Additional Resources

- **Documentation**: `/docs/tips-guides/` for setup guides
- **Examples**: `/src/lib/ai/workflow/examples/` for workflow templates
- **Discord**: Community support and discussions
- **GitHub Issues**: Bug reports and feature requests

## File Structure Notes

- **Public Assets**: `/public/` for static files and icons
- **Internationalization**: `/messages/` for translations
- **Scripts**: `/scripts/` for build and setup automation
- **Docker**: `/docker/` for containerization configs
- **Custom MCP Server**: `/custom-mcp-server/` for development

This project emphasizes user experience, tool integration flexibility, and developer productivity. When contributing, focus on maintaining these core principles while following the established patterns and conventions.