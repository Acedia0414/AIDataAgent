# D365 F&O Data Agent - Developer Guide

**Author:** Manus AI  
**Last Updated:** January 8, 2026  
**Version:** 1.0

---

## Introduction

This guide provides comprehensive instructions for developers working on the D365 F&O Data Agent. It covers local development setup, architecture patterns, extension points, testing strategies, and deployment procedures.

---

## Prerequisites

Before starting development, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 22.x | JavaScript runtime |
| **pnpm** | 9.x | Package manager |
| **Git** | 2.x | Version control |
| **MySQL** | 8.x | Local database (or use Manus platform DB) |
| **VS Code** | Latest | Recommended IDE |

**Recommended VS Code Extensions:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Drizzle ORM

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd d365-data-agent
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all frontend and backend dependencies defined in `package.json`.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/d365_agent

# Authentication (provided by Manus platform)
JWT_SECRET=your-jwt-secret-here
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# LLM Service (provided by Manus platform)
BUILT_IN_FORGE_API_KEY=your-api-key-here
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge

# Owner Info (for notifications)
OWNER_OPEN_ID=your-open-id
OWNER_NAME=Your Name

# App Info
VITE_APP_ID=d365-data-agent
VITE_APP_TITLE=D365 F&O Data Agent
VITE_APP_LOGO=/logo.png
```

**Note:** When deploying to Manus platform, these variables are automatically injected. You only need to configure them for local development.

### 4. Initialize Database

Run database migrations to create tables:

```bash
pnpm db:push
```

This command:
1. Generates SQL migration files from `drizzle/schema.ts`
2. Applies migrations to the database specified in `DATABASE_URL`

### 5. Start Development Server

```bash
pnpm dev
```

This starts:
- **Frontend dev server** on `http://localhost:3000` (Vite)
- **Backend API server** on `http://localhost:3000/api` (Express)

The dev server includes:
- Hot Module Replacement (HMR) for instant UI updates
- TypeScript type checking
- Automatic server restart on backend changes

### 6. Verify Setup

Open `http://localhost:3000` in your browser. You should see the login page. If authentication is working, you'll be redirected to the Manus OAuth portal.

---

## Project Structure

Understanding the project structure is essential for effective development:

```
d365-data-agent/
├── client/                    # Frontend React application
│   ├── public/                # Static assets (favicon, images)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── AIChatBox.tsx  # Chat interface component
│   │   │   ├── DashboardLayout.tsx  # Layout wrapper
│   │   │   └── MetadataTree.tsx     # Metadata tree viewer
│   │   ├── contexts/          # React contexts (auth, theme)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and helpers
│   │   │   ├── trpc.ts        # tRPC client setup
│   │   │   └── utils.ts       # Helper functions
│   │   ├── pages/             # Page components
│   │   │   ├── Home.tsx       # Chat interface page
│   │   │   ├── Metadata.tsx   # Metadata upload page
│   │   │   ├── Settings.tsx   # Configuration page
│   │   │   └── History.tsx    # Query history page
│   │   ├── App.tsx            # Root component with routing
│   │   ├── main.tsx           # Application entry point
│   │   └── index.css          # Global styles and Tailwind config
│   └── index.html             # HTML template
├── server/                    # Backend Express + tRPC application
│   ├── _core/                 # Framework-level code (do not modify)
│   │   ├── context.ts         # tRPC context builder
│   │   ├── env.ts             # Environment variable validation
│   │   ├── llm.ts             # LLM service integration
│   │   └── oauth.ts           # OAuth authentication
│   ├── database/              # Database adapters
│   │   ├── adapters/          # Adapter implementations
│   │   │   ├── SqlServerAdapter.ts
│   │   │   ├── MySqlAdapter.ts
│   │   │   └── index.ts       # Adapter registry
│   │   └── DatabaseAdapter.ts # Adapter interface
│   ├── db.ts                  # Database query helpers
│   ├── db-config.ts           # Connection management
│   ├── routers.ts             # Main tRPC router
│   ├── routers-config.ts      # Configuration endpoints
│   ├── metadataParserV2.ts    # D365 XML parser
│   ├── queryExecutor.ts       # Query execution logic
│   └── *.test.ts              # Vitest test files
├── drizzle/                   # Database schema and migrations
│   ├── schema.ts              # Drizzle ORM schema definitions
│   └── 0001_*.sql             # Generated migration files
├── shared/                    # Shared types and constants
├── storage/                   # S3 storage helpers
├── ARCHITECTURE.md            # System architecture documentation
├── API_DOCUMENTATION.md       # API reference
├── DEVELOPER_GUIDE.md         # This file
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite bundler configuration
└── drizzle.config.ts          # Drizzle ORM configuration
```

---

## Development Workflow

### Making Changes

The typical development workflow follows these steps:

#### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

#### 2. Implement Changes

Follow the appropriate pattern based on what you're changing:

**Adding a New API Endpoint:**

1. Define the endpoint in `server/routers.ts` or create a new router file
2. Add input validation using Zod schemas
3. Implement the endpoint logic
4. Update `API_DOCUMENTATION.md` with the new endpoint

**Adding a New UI Component:**

1. Create the component in `client/src/components/`
2. Use shadcn/ui components where possible
3. Follow Tailwind CSS utility-first styling
4. Ensure accessibility (keyboard navigation, ARIA labels)

**Modifying Database Schema:**

1. Update `drizzle/schema.ts` with new tables or columns
2. Run `pnpm db:push` to generate and apply migrations
3. Update database helper functions in `server/db.ts`
4. Add corresponding types to TypeScript interfaces

#### 3. Write Tests

All new features must include tests. See the Testing section below for details.

#### 4. Run Type Checking

```bash
pnpm tsc --noEmit
```

This verifies TypeScript types without generating output files.

#### 5. Test Locally

```bash
pnpm dev
```

Manually test your changes in the browser.

#### 6. Commit Changes

```bash
git add .
git commit -m "feat: add SQL formatting modal"
```

Use conventional commit messages:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions or updates
- `chore:` Build process or tooling changes

---

## Testing

The project uses **Vitest** for unit and integration testing.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test metadataParserV2

# Run with coverage
pnpm test --coverage
```

### Writing Tests

Tests are colocated with source files using the `.test.ts` suffix.

**Example: Testing a tRPC Endpoint**

```typescript
// server/routers.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from './routers';
import { createContext } from './_core/context';

describe('Query Router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createContext({
      user: { id: 1, openId: 'test-user', role: 'admin' }
    });
    caller = appRouter.createCaller(ctx);
  });

  it('should generate SQL from natural language', async () => {
    const result = await caller.query.generate({
      question: 'Show me all customers'
    });

    expect(result.sql).toContain('SELECT');
    expect(result.sql).toContain('CustTable');
    expect(result.explanation).toBeDefined();
  });
});
```

**Example: Testing a Utility Function**

```typescript
// server/metadataParserV2.test.ts
import { describe, it, expect } from 'vitest';
import { parseD365MetadataV2 } from './metadataParserV2';

describe('Metadata Parser V2', () => {
  it('should parse table name from XML', async () => {
    const xml = `<?xml version="1.0"?>
      <AxTable>
        <Name>CustTable</Name>
      </AxTable>`;

    const result = await parseD365MetadataV2(xml);
    expect(result.tableName).toBe('CustTable');
  });
});
```

### Test Coverage Goals

Maintain at least **80% code coverage** for:
- Database query helpers (`server/db.ts`)
- Metadata parser (`server/metadataParserV2.ts`)
- Query executor (`server/queryExecutor.ts`)
- Database adapters (`server/database/adapters/*.ts`)

UI components do not require unit tests but should be manually tested for:
- Responsive design (mobile, tablet, desktop)
- Keyboard accessibility
- Screen reader compatibility

---

## Extending the System

### Adding a New Database Adapter

To support a new database type (e.g., MongoDB, Snowflake):

#### 1. Create Adapter Class

Create `server/database/adapters/YourDatabaseAdapter.ts`:

```typescript
import { DatabaseAdapter, ConnectionConfig, QueryResult } from '../DatabaseAdapter';

export class YourDatabaseAdapter implements DatabaseAdapter {
  private connection: any = null;

  async connect(config: ConnectionConfig): Promise<void> {
    // Implement connection logic
    this.connection = await yourDatabaseLibrary.connect({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
    });
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }

    const startTime = Date.now();
    const result = await this.connection.query(sql);
    const executionTime = Date.now() - startTime;

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      columns: result.columns.map(c => c.name),
      executionTime,
    };
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connection.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
```

#### 2. Register Adapter

Update `server/database/adapters/index.ts`:

```typescript
import { YourDatabaseAdapter } from './YourDatabaseAdapter';

export const adapters = {
  sqlserver: SqlServerAdapter,
  mysql: MySqlAdapter,
  postgresql: PostgreSqlAdapter,
  yourdatabase: YourDatabaseAdapter, // Add here
};
```

#### 3. Update Schema

Add the new database type to `drizzle/schema.ts`:

```typescript
export const databaseConnections = mysqlTable("database_connections", {
  // ...
  databaseType: mysqlEnum("databaseType", [
    "sqlserver",
    "mysql",
    "postgresql",
    "sqlite",
    "oracle",
    "yourdatabase" // Add here
  ]).notNull(),
  // ...
});
```

#### 4. Update Frontend

Add the new type to the connection form in `client/src/pages/Settings.tsx`:

```typescript
<Select value={databaseType} onValueChange={setDatabaseType}>
  <SelectItem value="sqlserver">SQL Server</SelectItem>
  <SelectItem value="mysql">MySQL</SelectItem>
  <SelectItem value="postgresql">PostgreSQL</SelectItem>
  <SelectItem value="yourdatabase">Your Database</SelectItem>
</Select>
```

#### 5. Write Tests

Create `server/database/adapters/YourDatabaseAdapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { YourDatabaseAdapter } from './YourDatabaseAdapter';

describe('YourDatabaseAdapter', () => {
  it('should connect successfully', async () => {
    const adapter = new YourDatabaseAdapter();
    await adapter.connect({
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'user',
      password: 'pass',
    });

    const isConnected = await adapter.testConnection();
    expect(isConnected).toBe(true);
  });
});
```

---

### Extending Query Generation

To improve query generation accuracy:

#### 1. Add Schema Introspection

Modify `server/queryExecutor.ts` to fetch actual column metadata before generating SQL:

```typescript
async function introspectSchema(tableName: string): Promise<ColumnInfo[]> {
  const adapter = await getActiveAdapter();
  const result = await adapter.executeQuery(`SELECT TOP 0 * FROM ${tableName}`);
  
  return result.columns.map(col => ({
    name: col,
    type: inferTypeFromSample(result.rows[0]?.[col]),
  }));
}

// Use in query generation
const columns = await introspectSchema('CustTable');
const prompt = `Generate SQL for: "${question}"\nAvailable columns: ${columns.map(c => c.name).join(', ')}`;
```

#### 2. Add Query Templates

Create `server/queryTemplates.ts`:

```typescript
export const queryTemplates = {
  'list all': 'SELECT * FROM {table}',
  'count records': 'SELECT COUNT(*) FROM {table}',
  'recent records': 'SELECT * FROM {table} WHERE CreatedDateTime >= DATEADD(day, -7, GETDATE())',
};

export function matchTemplate(question: string): string | null {
  for (const [pattern, template] of Object.entries(queryTemplates)) {
    if (question.toLowerCase().includes(pattern)) {
      return template;
    }
  }
  return null;
}
```

Use templates as starting points for the LLM to reduce token usage and improve consistency.

#### 3. Integrate Knowledge Base

Once the knowledge base is implemented, inject context into query generation:

```typescript
import { knowledgeBase } from './knowledge-base-adapter';

async function generateQueryWithContext(question: string): Promise<string> {
  let context = '';
  
  if (knowledgeBase.isEnabled()) {
    const docs = await knowledgeBase.search(question);
    context = docs.map(d => d.content).join('\n\n');
  }

  const prompt = `
    Context from knowledge base:
    ${context}

    User question: ${question}

    Generate SQL query:
  `;

  return await invokeLLM({ messages: [{ role: 'user', content: prompt }] });
}
```

---

### Adding New UI Components

When creating new UI components, follow these guidelines:

#### 1. Use shadcn/ui Components

Prefer pre-built components from `client/src/components/ui/`:

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter query" />
      <Button>Submit</Button>
    </Card>
  );
}
```

#### 2. Follow Tailwind CSS Patterns

Use utility classes for styling:

```typescript
<div className="flex flex-col gap-4 p-6 bg-background rounded-lg border">
  <h2 className="text-2xl font-bold text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

#### 3. Ensure Accessibility

- Add `aria-label` to icon-only buttons
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Ensure keyboard navigation works (`Tab`, `Enter`, `Escape`)
- Test with screen readers (NVDA, JAWS, VoiceOver)

#### 4. Handle Loading States

```typescript
function QueryResults() {
  const { data, isLoading, error } = trpc.query.execute.useQuery({ sql: '...' });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;

  return <ResultsTable data={data.rows} />;
}
```

---

## Database Migrations

### Creating Migrations

When you modify `drizzle/schema.ts`, generate a migration:

```bash
pnpm db:push
```

This creates a new migration file in `drizzle/` with a timestamp and description.

### Applying Migrations

Migrations are automatically applied by `pnpm db:push`. In production, the Manus platform handles migrations during deployment.

### Rolling Back Migrations

To roll back the last migration:

```bash
pnpm drizzle-kit drop
```

**Warning:** This is destructive and cannot be undone. Use with caution.

---

## Debugging

### Backend Debugging

Add `console.log` statements or use the Node.js debugger:

```bash
node --inspect-brk node_modules/.bin/vite
```

Then attach VS Code debugger with this configuration (`.vscode/launch.json`):

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Backend",
  "port": 9229
}
```

### Frontend Debugging

Use browser DevTools:

1. Open Chrome DevTools (`F12`)
2. Go to Sources tab
3. Set breakpoints in TypeScript files
4. Refresh page to trigger breakpoints

### Database Debugging

View SQL queries executed by Drizzle:

```typescript
import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL, {
  logger: true, // Logs all SQL queries
});
```

---

## Performance Optimization

### Frontend Optimization

- **Code Splitting:** Use `React.lazy()` for large components
- **Memoization:** Use `useMemo()` and `useCallback()` for expensive computations
- **Virtual Scrolling:** Use `react-window` for long lists (e.g., query history)

### Backend Optimization

- **Connection Pooling:** Reuse database connections
- **Query Caching:** Cache frequent queries in Redis (future enhancement)
- **LLM Response Caching:** Cache similar query patterns to reduce API costs

### Database Optimization

- **Indexes:** Ensure frequently queried columns have indexes
- **Query Limits:** Always add `TOP N` or `LIMIT N` to prevent large result sets
- **Connection Timeouts:** Set 30-second timeout to prevent long-running queries

---

## Deployment

### Deploying to Manus Platform

The application is designed for one-click deployment on Manus:

1. **Save Checkpoint:** Use the Manus UI to save a checkpoint
2. **Click Publish:** The Publish button appears after saving a checkpoint
3. **Configure Domain:** Optionally set a custom domain in Settings → Domains

The Manus platform automatically:
- Builds the frontend and backend
- Applies database migrations
- Injects environment variables
- Provisions SSL certificates
- Enables auto-scaling

### Manual Deployment (Advanced)

If deploying outside Manus:

```bash
# Build frontend
pnpm build

# Start production server
NODE_ENV=production pnpm start
```

Ensure all environment variables are set in your hosting environment.

---

## Troubleshooting

### Common Issues

**Issue:** `DATABASE_URL` connection fails

**Solution:** Verify MySQL is running and credentials are correct. Test with:

```bash
mysql -h localhost -u root -p
```

---

**Issue:** tRPC type errors in frontend

**Solution:** Restart TypeScript server in VS Code:

1. Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Run "TypeScript: Restart TS Server"

---

**Issue:** Hot reload not working

**Solution:** Restart dev server:

```bash
# Kill process
Ctrl+C

# Restart
pnpm dev
```

---

**Issue:** LLM API calls failing

**Solution:** Check `BUILT_IN_FORGE_API_KEY` is set correctly. Test with:

```bash
curl -H "Authorization: Bearer $BUILT_IN_FORGE_API_KEY" \
  https://api.manus.im/forge/llm/chat
```

---

## Best Practices

### Code Style

- **TypeScript:** Use strict mode, avoid `any` types
- **Naming:** Use camelCase for variables, PascalCase for components
- **File Organization:** Group related files in directories
- **Comments:** Document complex logic, avoid obvious comments

### Security

- **Input Validation:** Always validate user input with Zod schemas
- **SQL Injection:** Use parameterized queries, never concatenate user input into SQL
- **Authentication:** Check `ctx.user` in all protected procedures
- **Secrets:** Never commit API keys or passwords to Git

### Performance

- **Lazy Loading:** Load components only when needed
- **Debouncing:** Debounce search inputs to reduce API calls
- **Pagination:** Paginate large result sets (e.g., query history)

---

## Contributing

### Pull Request Process

1. Create a feature branch from `main`
2. Implement changes with tests
3. Run `pnpm test` and `pnpm tsc --noEmit` to verify
4. Commit with conventional commit messages
5. Push branch and create pull request
6. Request review from team members
7. Address review feedback
8. Merge after approval

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] TypeScript types are correct (no `any`)
- [ ] Documentation updated (if API changed)
- [ ] No console.log statements in production code
- [ ] Accessibility tested (keyboard navigation, screen reader)

---

## Resources

### Documentation

- **tRPC:** https://trpc.io/docs
- **Drizzle ORM:** https://orm.drizzle.team/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Vite:** https://vitejs.dev/guide
- **Vitest:** https://vitest.dev/guide

### Internal Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [README.md](./README.md) - Project overview

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check existing GitHub issues
2. Search internal documentation
3. Ask in the team Slack channel
4. Contact the development team lead

---

**Document Maintained By:** Manus AI  
**For Questions:** Contact the development team through the Manus platform  
**Last Updated:** January 8, 2026
