# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Better-chatbot is a Next.js 15 AI chatbot application with MCP (Model Context Protocol) support, built with TypeScript, React 19, and the Vercel AI SDK. It provides a comprehensive chat interface with tool integration, visual workflows, and multi-provider LLM support.

## Common Development Commands

### Essential Commands

```bash
# Install dependencies
pnpm i

# Development with hot-reload (uses Turbopack)
pnpm dev

# Development with HTTPS
pnpm dev:https

# Build for production (local)
pnpm build:local

# Start production server
pnpm start

# Run all checks before committing
pnpm check  # Runs lint:fix, check-types, and tests
```

### Testing Commands

```bash
# Run unit tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run a specific test file
pnpm test src/lib/ai/mcp/mcp-tool-id.test.ts

# E2E tests with Playwright
pnpm test:e2e

# E2E tests with UI
pnpm test:e2e:ui

# Install Playwright browsers if needed
pnpm playwright:install
```

### Code Quality

```bash
# Lint and auto-fix with Next.js ESLint and Biome
pnpm lint:fix

# Type checking
pnpm check-types

# Format code with Biome
pnpm format
```

### Database Management

```bash
# Generate Drizzle migrations
pnpm db:generate

# Apply migrations to database
pnpm db:push

# Reset database (drops and recreates)
pnpm db:reset

# Open Drizzle Studio for database inspection
pnpm db:studio

# Run database migrations
pnpm db:migrate
```

### Docker Commands

```bash
# Start PostgreSQL container
pnpm docker:pg

# Start Redis container
pnpm docker:redis

# Docker Compose operations
pnpm docker-compose:up     # Start all services
pnpm docker-compose:down   # Stop all services
pnpm docker-compose:logs   # View logs
pnpm docker-compose:update # Pull latest and rebuild
```

## Architecture & Key Components

### Core Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **UI**: React 19 + Radix UI + Tailwind CSS v4
- **AI**: Vercel AI SDK with multi-provider support (OpenAI, Anthropic, Google, XAI, Ollama, OpenRouter)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better Auth library
- **Caching**: Redis (optional)
- **Testing**: Vitest (unit) + Playwright (E2E)

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (sign-in, sign-up)
│   └── (chat)/            # Main chat interface and features
│       ├── chat/          # Chat threads
│       ├── mcp/           # MCP server management
│       ├── workflow/      # Visual workflow editor
│       └── agents/        # Agent management
├── components/            # React components
│   ├── ui/               # Reusable UI components (buttons, dialogs, etc.)
│   ├── chat/             # Chat-specific components
│   ├── mcp/              # MCP tool components
│   └── workflow/         # Workflow editor components
├── lib/                  # Core utilities and business logic
│   ├── ai/              # AI-related functionality
│   │   ├── mcp/         # MCP client management and storage
│   │   ├── tools/       # Built-in tools (web search, JS executor, etc.)
│   │   ├── workflow/    # Workflow execution engine
│   │   └── speech/      # Voice/speech functionality
│   ├── auth/            # Authentication configuration
│   ├── db/              # Database schemas and migrations
│   └── cache/           # Caching utilities
└── types/               # TypeScript type definitions
```

### Key Architectural Patterns

1. **MCP Integration**: The app implements Model Context Protocol for external tool integration. MCP servers are managed through multiple storage backends (database, file-based, memory).

2. **Workflow System**: Visual workflow editor allows chaining LLM nodes and tool nodes. Workflows are executed through a graph-based executor that handles dependencies and branching.

3. **Multi-Provider AI**: Supports multiple LLM providers through a unified interface. Custom OpenAI-compatible providers can be added dynamically.

4. **Server Actions**: Uses Next.js server actions for secure server-side operations, particularly for AI streaming and database operations.

5. **Real-time Features**: Supports real-time voice chat with OpenAI's Realtime API, integrated with MCP tools.

## Critical Next.js 15 Changes

### ⚠️ Breaking Changes from Next.js 14

1. **Async Request APIs**: `params`, `searchParams`, `cookies()`, and `headers()` are now async

   ```typescript
   // ❌ OLD (Next.js 14)
   export default function Page({ params, searchParams }) {
     const id = params.id;
   }

   // ✅ NEW (Next.js 15)
   export default async function Page({ params, searchParams }) {
     const { id } = await params;
   }
   ```

2. **React 19 Required**: Minimum React version is 19.0.0

3. **`useFormState` → `useActionState`**: Import from 'react' not 'react-dom'

4. **Fetch Caching**: Fetch requests are no longer cached by default

## Core Principles

### 1. Server Components First

- **Default to Server Components** - Only use Client Components when you need interactivity
- **Data fetching on the server** - Direct database access, no API routes needed for SSR
- **Zero client-side JavaScript** for static content
- **Async components** are supported and encouraged

### 2. File Conventions

Always use these file names in the `app/` directory:

- `page.tsx` - Route page component
- `layout.tsx` - Shared layout wrapper
- `loading.tsx` - Loading UI (Suspense fallback)
- `error.tsx` - Error boundary (must be Client Component)
- `not-found.tsx` - 404 page
- `route.ts` - API route handler
- `template.tsx` - Re-rendered layout
- `default.tsx` - Parallel route fallback

### 3. Data Fetching Patterns

```typescript
// ✅ GOOD: Fetch in Server Component
async function ProductList() {
  const products = await db.products.findMany();
  return <div>{/* render products */}</div>;
}

// ❌ AVOID: Client-side fetching when not needed
'use client';
function BadPattern() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/data')... }, []);
}
```

### 4. Caching Strategy

- Use `fetch()` with Next.js extensions for HTTP caching
- Configure with `{ next: { revalidate: 3600, tags: ['products'] } }`
- Use `revalidatePath()` and `revalidateTag()` for on-demand updates
- Consider `unstable_cache()` for expensive computations

## Common Patterns

### Server Action with Form

```typescript
// actions.ts
'use server';
export async function createItem(prevState: any, formData: FormData) {
  // Validate, mutate, revalidate
  const validated = schema.parse(Object.fromEntries(formData));
  await db.items.create({ data: validated });
  revalidatePath('/items');
}

// form.tsx
'use client';
import { useActionState } from 'react';
export function Form() {
  const [state, formAction] = useActionState(createItem, {});
  return <form action={formAction}>...</form>;
}
```

### Optimistic Updates

```typescript
'use client';
import { useOptimistic } from 'react';
export function OptimisticList({ items, addItem }) {
  const [optimisticItems, addOptimisticItem] = useOptimistic(items, (state, newItem) => [
    ...state,
    newItem,
  ]);
  // Use optimisticItems for immediate UI update
}
```

### Testing Strategy

- **Unit Tests**: Located alongside source files as `*.test.ts`, using Vitest
- **E2E Tests**: In `tests/` directory, using Playwright
- **Test Database**: Uses `.env.test` for isolated test environment
- **Auth States**: E2E tests use pre-configured auth states for multi-user scenarios

### Environment Configuration

The project uses a `.env` file (auto-generated by `pnpm i`) with these key variables:

- LLM provider API keys (at least one required)
- `POSTGRES_URL` for database connection
- `BETTER_AUTH_SECRET` for authentication
- Optional: `EXA_API_KEY` for web search, OAuth credentials, Redis URL

### Development Workflow

1. Always run `pnpm i` after pulling changes
2. Use `pnpm dev` for local development with hot-reload
3. Run `pnpm check` before committing to ensure code quality
4. Database migrations are handled via Drizzle Kit
5. Use `pnpm build:local` for production builds without HTTPS

### MCP (Model Context Protocol) Implementation

The MCP system allows integration of external tools:

- Servers can be configured via UI, database, or file-based config
- Supports stdio and SSE transport protocols
- OAuth support for MCP servers requiring authentication
- Tool testing interface at `/mcp/test/[id]`

### Workflow Engine

The workflow system enables visual programming:

- Nodes: LLM (AI reasoning), Tool (MCP execution), Condition (branching)
- Edges define execution flow and data dependencies
- Workflows are serialized as JSON and stored in database
- Published workflows become callable tools in chat

## Repository Architecture Patterns

### Repository Pattern

The project follows a clean repository pattern for data access:

```typescript
// Repository implementation in /src/lib/db/pg/repositories/
class ExampleRepository {
  async getItems() { /* Direct database queries */ }
  async createItem(data) { /* INSERT operations */ }
  async updateItem(id, data) { /* UPDATE operations */ }
  async deleteItem(id) { /* DELETE operations */ }
}

// Export in /src/lib/db/repository.ts
export { exampleRepository } from "./pg/repositories/example-repository.pg";

// Server-side data fetching in /src/lib/example/server.ts
import "server-only";
export async function getExampleData() {
  // Auth checks, then call repository
  return exampleRepository.getItems();
}

// Server actions in /src/app/api/example/actions.ts
"use server";
export async function updateExampleAction(prevState: any, formData: FormData) {
  // Validation, auth checks, then call repository
  // Always revalidatePath() after mutations
}
```

### Import Path Conventions

Follow these import patterns consistently:

```typescript
// UI components (alias: ui/*)
import { Button } from "ui/button";

// Types (alias: app-types/*)
import type { User } from "app-types/user";
import type { AdminUser } from "app-types/admin";

// Lib utilities (alias: lib/*)
import { getSession } from "lib/auth/server";
import { adminRepository } from "lib/db/repository";

// Auth utilities (alias: auth/*)
import { authClient } from "auth/client";

// General src paths (alias: @/*)
import { SomeComponent } from "@/components/example";
```

### Form Handling with Next.js 15

Always use the Next.js `<Form>` component for progressive enhancement:

```typescript
// Client component with Next.js Form
"use client";
import Form from "next/form";
import { useOptimistic } from "react";
import { SubmitButton } from "./submit-button";

export function ExampleForm({ initialData }) {
  const [data, setOptimisticData] = useOptimistic(initialData);
  
  const handleSubmit = async (formData: FormData) => {
    // Optimistic update
    setOptimisticData(newData);
    
    const result = await serverAction(null, formData);
    if (result.error) {
      toast.error(result.error);
      setOptimisticData(initialData); // Revert
    }
  };

  return (
    <Form action={handleSubmit}>
      {/* form fields */}
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}

// SubmitButton using useFormStatus
"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, ...props }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
```

### Data Fetching Performance Patterns

For expensive operations like statistics, use parallel loading with Suspense:

```typescript
// Server component with parallel data fetching
export default async function DetailPage({ params }) {
  const { id } = await params;
  
  // Fast data loads immediately
  const basicData = await getBasicData(id);
  
  return (
    <div>
      <BasicDataDisplay data={basicData} />
      
      {/* Slow data loads in parallel with Suspense */}
      <Suspense fallback={<div>Loading stats...</div>}>
        <StatsComponent userId={id} />
      </Suspense>
      
      <Suspense fallback={<div>Loading sessions...</div>}>
        <SessionsComponent userId={id} />
      </Suspense>
    </div>
  );
}

// Separate server components for expensive operations
async function StatsComponent({ userId }) {
  const stats = await getExpensiveStats(userId);
  return <StatsDisplay stats={stats} />;
}
```

### Component Organization

```
src/
├── components/
│   ├── ui/              # Reusable UI primitives (shadcn/ui)
│   ├── feature-name/    # Feature-specific components
│   └── layouts/         # Layout components
├── app/
│   ├── (group)/         # Route groups for layouts
│   └── api/
│       └── feature/     # Server actions (not API routes)
└── lib/
    ├── feature/
    │   ├── server.ts    # Server-side data fetching
    │   └── validation.ts # Zod schemas
    └── db/
        └── repositories/ # Data access layer
```

### Authentication & Authorization

- Use `getSession()` in server components for auth checks
- Implement role-based access control with centralized role enums
- Server actions should always validate auth before mutations
- Use route group layouts `(group)` for protected areas

### Testing Strategy

#### Unit Tests
- Use Vitest, place `*.test.ts` alongside source files
- Focus on business logic, not UI rendering
- Test utilities and data transformations, not implementation details
- Mock external dependencies, not internal modules
- Test error handling, validation logic, and data flow

#### End-to-End (E2E) Tests - Critical Principles

**Core Philosophy**: Test user workflows and business-critical paths comprehensively. E2E tests should verify complete user journeys, not individual components.

**Test Organization**:
- Place E2E tests in `/tests` directory with `.spec.ts` extension
- Use auth states in `tests/.auth/` for different user roles (admin, editor, user)
- Seed test data with `pnpm test:e2e:seed` before running tests
- Group related tests in describe blocks by feature area

**Essential Coverage Areas**:

1. **State Persistence**: Always test that UI state (search, pagination, filters) is maintained across navigation
   ```typescript
   // Test search state maintenance when navigating to detail and back
   await searchInput.fill("search term");
   await userRow.click(); // Navigate to detail
   await backButton.click(); // Return to list
   expect(await searchInput.inputValue()).toBe("search term");
   ```

2. **Data Scenarios**: Test both positive and negative data states
   ```typescript
   // Test users with stats vs users without stats
   // Test banned vs active users  
   // Test users with passwords vs OAuth-only users
   ```

3. **User Confirmation Flows**: Test multi-step interactions completely
   ```typescript
   // Test typing user name for delete confirmation
   await deleteButton.click();
   await confirmInput.fill(userName); // Test exact name match required
   expect(deleteButton).toBeEnabled();
   ```

4. **Form Validation**: Test client and server-side validation
   ```typescript
   // Test required fields, email format, password complexity
   // Test error states and success flows
   ```

5. **Permission Boundaries**: Test role-based access thoroughly
   ```typescript
   // Test admin vs user vs editor permissions
   // Test self-modification restrictions
   ```

**Selector Strategy**:
- **Prefer `data-testid`** attributes for reliable element selection
- Use semantic selectors (`getByRole`, `getByText`) for user-facing text
- Avoid CSS selectors or implementation-dependent selectors
- Always use descriptive test IDs that reflect component purpose

**Common Patterns**:
```typescript
// Wait for elements with timeout
await page.waitForSelector("[data-testid='users-table']", { timeout: 10000 });

// Handle conditional elements gracefully  
if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
  // Test the element
}

// Test both success and error paths
// Test form validation states
// Test loading and empty states
```

**Critical Testing Requirements**:
- Test complete user workflows, not isolated interactions
- Verify state persistence across navigation
- Test all data scenarios (empty, populated, error states)
- Test permission boundaries and role restrictions
- Test form validation and error handling thoroughly
- Always test both success and failure paths
