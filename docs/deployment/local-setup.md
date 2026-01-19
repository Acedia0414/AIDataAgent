# Local Development Setup Guide

This guide walks you through setting up the D365 F&O Data Agent for local development and testing.

## Prerequisites

### Required Software
- **Node.js**: v22.x or later
- **pnpm**: v10.x or later (package manager)
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Optional Tools
- **Azure Data Studio**: For database inspection
- **Postman**: For API testing (though tRPC panel is built-in)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd d365-data-agent
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all frontend and backend dependencies defined in `package.json`.

### 3. Configure Environment Variables

The Manus platform automatically injects required environment variables. For local testing outside Manus, create a `.env` file:

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/d365_agent

# Authentication (Manus OAuth - auto-injected on platform)
JWT_SECRET=your-jwt-secret-here
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Azure AD (Optional - for Azure AD authentication)
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_REDIRECT_URI=http://localhost:3000/api/auth/callback

# LLM API (Manus built-in - auto-injected)
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your-api-key

# App Configuration
VITE_APP_TITLE=D365 Data Agent
VITE_APP_ID=your-app-id
```

**Note**: When deployed on Manus platform, these variables are automatically configured.

### 4. Initialize Database

Push the database schema to create all required tables:

```bash
pnpm db:push
```

This command:
1. Generates SQL migration files from `drizzle/schema.ts`
2. Applies migrations to the database
3. Creates all tables, indexes, and relationships

### 5. Start Development Server

```bash
pnpm dev
```

This starts:
- **Frontend**: Vite dev server with HMR (Hot Module Replacement)
- **Backend**: Express server with tsx watch mode
- **tRPC**: Type-safe API with automatic type generation

The application will be available at:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3000 (Express server)
- **tRPC Panel**: http://localhost:3000/api/trpc-panel (API explorer)

## Development Workflow

### Project Structure

```
d365-data-agent/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (routes)
│   │   ├── lib/           # Utilities and tRPC client
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   ├── App.tsx        # Main app component with routing
│   │   └── main.tsx       # Entry point
│   └── index.html         # HTML template
│
├── server/                # Backend Node.js application
│   ├── _core/             # Framework-level code (don't modify)
│   ├── auth/              # Authentication providers
│   ├── rag/               # RAG system components
│   ├── db.ts              # Database query helpers
│   ├── routers.ts         # tRPC procedure definitions
│   ├── queryGenerator.ts  # AI query generation
│   ├── metadataParser.ts  # D365 XML parser
│   ├── azureSqlExecutor.ts # Azure SQL connection
│   └── *.test.ts          # Vitest unit tests
│
├── drizzle/               # Database schema and migrations
│   └── schema.ts          # Table definitions
│
├── shared/                # Code shared between client/server
│   └── const.ts           # Constants
│
├── docs/                  # Documentation
│   ├── architecture/      # System design docs
│   ├── development/       # Developer guides
│   ├── deployment/        # Deployment guides
│   ├── usage/             # User guides
│   └── api/               # API documentation
│
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # Project overview
```

### Development Loop

```
┌─────────────────────────────────────────────────┐
│  1. Update Database Schema                      │
│     Edit drizzle/schema.ts                      │
│     Run: pnpm db:push                           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  2. Add Database Helpers                        │
│     Edit server/db.ts                           │
│     Add query functions (return raw results)    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  3. Create tRPC Procedures                      │
│     Edit server/routers.ts                      │
│     Define API endpoints with validation        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  4. Build Frontend UI                           │
│     Create/edit client/src/pages/*.tsx          │
│     Use trpc.*.useQuery/useMutation hooks       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  5. Write Tests                                 │
│     Create server/*.test.ts                     │
│     Run: pnpm test                              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  6. Test in Browser                             │
│     Open http://localhost:5173                  │
│     Verify functionality                        │
└─────────────────────────────────────────────────┘
```

### Hot Reload Behavior

**Frontend (Vite)**
- Changes to `client/src/**/*.tsx` → Instant HMR
- Changes to `client/src/**/*.ts` → Instant HMR
- Changes to `client/index.html` → Full page reload

**Backend (tsx watch)**
- Changes to `server/**/*.ts` → Server restart (~2-3 seconds)
- Changes to `drizzle/schema.ts` → Requires manual `pnpm db:push`

### Database Schema Changes

When you modify `drizzle/schema.ts`:

1. **Add a new table**:
```typescript
export const myTable = mysqlTable("my_table", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

2. **Push changes**:
```bash
pnpm db:push
```

3. **Add database helpers** in `server/db.ts`:
```typescript
export async function getMyTableItems() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(myTable);
}
```

4. **Create tRPC procedure** in `server/routers.ts`:
```typescript
myFeature: router({
  list: protectedProcedure.query(async () => {
    return await getMyTableItems();
  }),
}),
```

5. **Use in frontend**:
```typescript
const { data } = trpc.myFeature.list.useQuery();
```

## Testing

### Run All Tests

```bash
pnpm test
```

### Run Specific Test File

```bash
pnpm test metadata
pnpm test azure
pnpm test rag
```

### Watch Mode (Re-run on Changes)

```bash
pnpm test --watch
```

### Test Coverage

```bash
pnpm test --coverage
```

## Building for Production

### Build Command

```bash
pnpm build
```

This:
1. Builds frontend with Vite (optimized, minified)
2. Bundles backend with esbuild
3. Outputs to `dist/` directory

### Production Build Structure

```
dist/
├── client/          # Frontend static assets
│   ├── index.html
│   ├── assets/      # JS, CSS bundles with content hashes
│   └── ...
└── index.js         # Backend bundle (single file)
```

### Start Production Server

```bash
NODE_ENV=production node dist/index.js
```

## Common Development Tasks

### Add a New Page

1. Create page component:
```bash
touch client/src/pages/MyNewPage.tsx
```

2. Add route in `client/src/App.tsx`:
```typescript
<Route path="/my-page" component={MyNewPage} />
```

3. Add navigation link in `client/src/pages/Home.tsx` or use `PageHeader` component.

### Add a New tRPC Procedure

1. Add database helper in `server/db.ts`:
```typescript
export async function getMyData() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(myTable);
}
```

2. Add procedure in `server/routers.ts`:
```typescript
myRouter: router({
  getData: protectedProcedure.query(async ({ ctx }) => {
    return await getMyData();
  }),
}),
```

3. Use in frontend:
```typescript
const { data } = trpc.myRouter.getData.useQuery();
```

### Add Authentication to a Procedure

Use `protectedProcedure` instead of `publicProcedure`:

```typescript
mySecureEndpoint: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    // ctx.user is guaranteed to exist
    const userId = ctx.user.id;
    return await getDataForUser(userId, input.id);
  }),
```

### Add Input Validation

Use Zod schemas:

```typescript
import { z } from "zod";

myProcedure: protectedProcedure
  .input(z.object({
    email: z.string().email(),
    age: z.number().min(18).max(120),
    role: z.enum(["admin", "user"]),
  }))
  .mutation(async ({ input }) => {
    // input is fully typed and validated
    return await createUser(input);
  }),
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

Or change the port in `server/_core/index.ts`.

### Database Connection Errors

1. Check `DATABASE_URL` in `.env`
2. Ensure database server is running
3. Verify credentials and permissions
4. Check firewall rules

### TypeScript Errors

```bash
# Check for type errors
pnpm check

# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear pnpm cache
pnpm store prune
```

### Build Errors

```bash
# Clear Vite cache
rm -rf client/.vite

# Clear esbuild cache
rm -rf dist

# Rebuild
pnpm build
```

## Environment-Specific Configuration

### Development
- Hot reload enabled
- Source maps enabled
- Verbose logging
- No minification

### Production
- Hot reload disabled
- Source maps disabled (or external)
- Error logging only
- Full minification and optimization

## Next Steps

- [Architecture Overview](../architecture/system-overview.md)
- [Developer Guide](../development/getting-started.md)
- [API Documentation](../api/trpc-procedures.md)
- [User Guide](../usage/user-guide.md)
