# 🧪 End-to-End Testing Guide

Comprehensive guide for running and developing end-to-end tests for better-chatbot using Playwright.

## Quick Start

```bash
# Install dependencies (if not already done)
pnpm install

# Install Playwright browsers
pnpm playwright:install

# Run all e2e tests
pnpm test:e2e

# Run tests with UI (interactive mode)
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e -- tests/agents/agent-creation.spec.ts

# Run tests in debug mode
pnpm test:e2e:debug
```

## 🏗️ Test Architecture

Our e2e tests are designed for **reliability, speed, and maintainability**:

### Test Structure (Will be expanded over time, this is just an example)

```
tests/
├── lifecycle/                 # Setup and teardown for tests
│   ├── auth.setup.ts          # User registration & authentication
│   └── teardown.global.ts     # Test data cleanup
├── core/                      # Core tests for landing page, auth flows, etc.
│   └── unauthenticated.spec.ts # Landing page & auth flows
├── agents/                    # Agent tests
│   ├── agent-creation.spec.ts  # Agent CRUD operations
│   ├── agent-visibility.spec.ts # Multi-user sharing & permissions
│   └── agents.spec.ts          # Basic agent functionality
└── models/                    # Model selection & persistence
    └── model-selection.spec.ts # Model selection & persistence
```

### Key Features

- ✅ **Automated user registration** with unique test accounts
- ✅ **Multi-user testing** for sharing & permissions
- ✅ **Automatic cleanup** of test data
- ✅ **Parallel execution** for speed
- ✅ **Robust selectors** using data-testid attributes

## 🔧 Configuration

### Environment Setup

Tests require these environment variables:

```bash
# Database (required)
POSTGRES_URL=postgres://user:password@localhost:5432/database

# Authentication (required)
BETTER_AUTH_SECRET=your-secret-here

# At least one LLM provider (required)
OPENAI_API_KEY=your-openai-key
# OR
ANTHROPIC_API_KEY=your-anthropic-key
# OR
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key

# Optional: Set default model for tests - will need to be corelated with API keys
E2E_DEFAULT_MODEL=openai/gpt-4o-mini
```

### VSCode Extension

We recommend using the [Playwright](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension for VSCode. It provides a lot of helpful features for writing and debugging tests.

### Test Database

```bash
pnpm docker:pg
```

## 🎯 Authentication Strategy

### Authentication Setup

Tests authenticate 4 users 1 admin, 1 editor, 1 editor2, and 1 regular by default on setup. - This is to test multi-user functionality like agent or workspace sharing. These users are defined in `tests/constants/test-users.ts`.

To test as an authenticated user (nearly all tests), you can use the `test.use({ storageState: TEST_USERS.editor.authFile });` or `test.use({ storageState: TEST_USERS.editor2.authFile });` or `test.use({ storageState: TEST_USERS.regular.authFile });` or `test.use({ storageState: TEST_USERS.admin.authFile });` in the test file. Without this, the test will run as an unauthenticated user. This can go in the describe block or the test block.

### Multi-User Testing

Playwright is designed to run tests in parallel. This means that each test will run in its own browser instance. For tests that need to test multi-user functionality, you can set the tests to run sequentially by using the `test.describe.configure({ mode: 'serial' });` decorator. See `tests/agents/agent-visibility.spec.ts` for an example.

**Example:**

#### User 1 Only

```typescript
// Most tests use single user authentication
import { TEST_USERS } from '../constants/test-users';
test.describe('Agent Creation', () => {
  test.use({ storageState: TEST_USERS.editor.authFile });

  test('should create agent', async ({ page }) => {
    // Test logic here
  });
});
```

#### User 2 Only

```typescript
import { TEST_USERS } from '../constants/test-users';
test.describe('Agent Creation', () => {
  test.use({ storageState: TEST_USERS.editor2.authFile });

  test('should create agent', async ({ page }) => {
    // Test logic here
  });
});
```

#### User 1 and User 2

This is the most common use case for multi-user testing.

```typescript
import { TEST_USERS } from '../constants/test-users';
test.describe('Agent Sharing', () => {
  test('user sharing workflow', async ({ browser }) => {
    // User1 creates agent
    const user1Context = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const user1Page = await user1Context.newPage();

    // User2 interacts with shared agent
    const user2Context = await browser.newContext({
      storageState: TEST_USERS.editor2.authFile,
    });
    const user2Page = await user2Context.newPage();
  });
});
```

### Benefits

- **No duplicate test runs** - Regular tests run once with user1
- **Efficient multi-user testing** - Only when needed for sharing features
- **Clean isolation** - Each test gets fresh authentication state

## 🔍 Best Practices

### Reliable Selectors

Always use `data-testid` attributes for stable selectors:

```typescript
// ✅ Good - stable and semantic
await page.getByTestId('agent-name-input').fill('My Agent');
await page.getByTestId('agent-save-button').click();

// ❌ Avoid - fragile and language-dependent
await page.locator('input[placeholder="Enter agent name"]').fill('My Agent');
await page.getByText('Save').click();
```

### Waiting Strategies

Use appropriate waiting strategies for reliability:

```typescript
// Wait for network activity to settle
await page.waitForLoadState('networkidle');

// Wait for specific API responses
const responsePromise = page.waitForResponse(
  (response) => response.url().includes('/api/agent/') && response.request().method() === 'PUT'
);
await page.getByTestId('save-button').click();
await responsePromise;

// Wait for navigation
await page.waitForURL('**/agents', { timeout: 10000 });
```

### Unique Test Data

Generate unique data to avoid conflicts:

```typescript
const testSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const agentName = `Test Agent ${testSuffix}`;
```

## 🐛 Debugging

### Debug Commands

```bash
# Run specific test with browser visible
pnpm test:e2e -- tests/agents/agent-creation.spec.ts --headed

# Debug mode with breakpoints
pnpm test:e2e:debug

# Run single test
npx playwright test -g "should create agent"

# Generate test report
npx playwright show-report
```

### Debug Helpers

Add debug information to tests:

```typescript
// Take screenshots for debugging
await page.screenshot({ path: 'debug-agent-creation.png', fullPage: true });

// Log page content
console.log('Current URL:', page.url());
const agents = await page.locator('[data-testid="agent-card-name"]').all();
console.log(`Found ${agents.length} agents`);
```

### Common Issues

**Tests timing out:**

- Ensure `E2E_DEFAULT_MODEL` is set to a fast model
- Check database connection and API keys
- Increase timeout for slow operations

**Authentication failures:**

- Verify `BETTER_AUTH_SECRET` is set
- Check PostgreSQL connection
- Ensure auth setup completes successfully

**Element not found:**

- Verify data-testid exists in component
- Check for loading states
- Use proper waiting strategies

## 🚀 CI/CD Integration

Tests run automatically on GitHub Actions with:

- **PostgreSQL 17** test database
- **Parallel execution** across multiple workers
- **Automatic artifact upload** for debugging
- **Clean test environment** isolated from production

## 📝 Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../constants/test-users';
test.describe('Your Feature', () => {
  test.use({ storageState: TEST_USERS.editor.authFile });

  test('should perform action', async ({ page }) => {
    // Navigate to page
    await page.goto('/your-feature');

    // Perform actions
    await page.getByTestId('input-field').fill('test value');
    await page.getByTestId('submit-button').click();

    // Wait for response
    await page.waitForURL('**/success', { timeout: 10000 });

    // Verify results
    await expect(page.getByTestId('success-message')).toBeVisible();
  });
});
```

### Multi-User Test Template

```typescript
import { TEST_USERS } from '../constants/test-users';
test('multi-user workflow', async ({ browser }) => {
  const testId = Date.now().toString(36);

  // User1 setup
  const user1Context = await browser.newContext({
    storageState: TEST_USERS.editor.authFile,
  });
  const user1Page = await user1Context.newPage();

  try {
    // User1 actions
    await user1Page.goto('/create');
    // ... user1 workflow
  } finally {
    await user1Context.close();
  }

  // User2 verification
  const user2Context = await browser.newContext({
    storageState: 'tests/.auth/user2.json',
  });
  const user2Page = await user2Context.newPage();

  try {
    // User2 actions
    await user2Page.goto('/shared');
    // ... user2 workflow
  } finally {
    await user2Context.close();
  }
});
```

## 🧹 Data Cleanup

Tests automatically clean up after themselves:

1. **User identification** by email patterns (`playwright.*@example.com`)
2. **Cascade deletion** respecting foreign key constraints
3. **Complete cleanup** of test users and related data

No manual cleanup required - the system handles it automatically!

---

For more examples, see the existing test files in the `tests/` directory. Each test demonstrates different patterns and best practices for reliable e2e testing.
