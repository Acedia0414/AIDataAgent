# D365 F&O Data Agent - Architecture Overview

**Author:** Manus AI  
**Last Updated:** January 8, 2026  
**Version:** 1.0

---

## Executive Summary

The D365 F&O Data Agent is an intelligent natural language interface for Microsoft Dynamics 365 Finance and Operations databases. The system translates user questions into SQL queries, executes them against configured databases, and presents results in human-readable formats including Excel exports. The architecture follows a pipeline pattern with distinct stages for intent classification, query generation, review, execution, and result formatting.

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       ├─── Authentication (Manus OAuth)
       │
       v
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   Chat   │  │ Metadata │  │ Settings │  │ History │ │
│  │Interface │  │  Viewer  │  │  Config  │  │  View   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │ tRPC (Type-safe API)
                     v
┌─────────────────────────────────────────────────────────┐
│                  Backend (Express + tRPC)                │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Query Processing Pipeline                  │  │
│  │                                                     │  │
│  │  1. Intent Classifier                              │  │
│  │     ↓                                               │  │
│  │  2. Query Generator (LLM)                          │  │
│  │     ↓                                               │  │
│  │  3. Query Reviewer (Technical + Layman)           │  │
│  │     ↓                                               │  │
│  │  4. Query Executor (Database Adapters)            │  │
│  │     ↓                                               │  │
│  │  5. Result Formatter (JSON/Excel)                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Supporting Services                        │  │
│  │  • Metadata Parser (D365 XML)                     │  │
│  │  • Database Connection Manager                     │  │
│  │  • LLM Configuration Manager                       │  │
│  │  • Knowledge Base Adapter (Future)                │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       v             v             v
┌──────────┐  ┌──────────┐  ┌──────────┐
│  MySQL   │  │ SQL      │  │  Manus   │
│ (Metadata│  │ Server   │  │   LLM    │
│  Store)  │  │(D365 DB) │  │ Service  │
└──────────┘  └──────────┘  └──────────┘
```

---

## Core Components

### 1. Frontend Layer (React 19 + Tailwind 4)

The frontend provides an intuitive interface for interacting with D365 data through natural language queries.

**Key Pages:**

| Page | Purpose | Key Features |
|------|---------|--------------|
| **Chat Interface** | Primary query interaction | Message history, streaming responses, connection status banner |
| **Metadata Viewer** | Browse D365 table structures | Visual Studio-style tree, fields, relationships, indexes |
| **Connection Test** | Verify database and LLM connectivity | Real-time status checks, connection diagnostics |
| **Settings** | Configure connections and LLM | Database credentials, LLM provider selection, security roles |
| **History** | Review past queries | Query log, execution times, result previews |

**State Management:** The application uses tRPC's built-in React Query integration for server state management, eliminating the need for Redux or similar libraries. Authentication state is managed through a custom `useAuth()` hook that interfaces with Manus OAuth.

---

### 2. Backend Layer (Express 4 + tRPC 11)

The backend implements a type-safe API using tRPC, ensuring end-to-end type safety between client and server.

#### 2.1 Query Processing Pipeline

The query pipeline transforms natural language into executable SQL through five distinct stages:

**Stage 1: Intent Classification**

The intent classifier determines whether a user query is asking for data retrieval, data modification, or system information. This stage uses lightweight LLM calls with structured output to categorize requests.

```typescript
// Intent types
type Intent = 
  | { type: 'query', entities: string[] }
  | { type: 'modify', operation: 'insert' | 'update' | 'delete' }
  | { type: 'system', command: string };
```

**Stage 2: Query Generation**

The query generator uses the configured LLM (Manus Built-in or custom provider) to translate natural language into SQL. The generator has access to:

- Database schema metadata (tables, fields, relationships)
- Previously successful query patterns
- **[Future]** Knowledge base context for domain-specific terminology

The generator produces T-SQL compatible with SQL Server, the primary database for D365 F&O deployments.

**Stage 3: Query Review**

Before execution, the generated SQL undergoes dual review:

1. **Technical Review:** Validates SQL syntax, checks for dangerous operations (DROP, TRUNCATE), estimates performance impact
2. **Layman Explanation:** Generates human-readable description of what the query will do

This stage provides transparency and allows users to approve or reject queries before execution.

**Stage 4: Query Execution**

The executor uses database adapters to run queries against the configured connection. The adapter pattern supports multiple database types:

- SQL Server (primary)
- MySQL
- PostgreSQL
- SQLite
- Oracle

Each adapter implements a common interface:

```typescript
interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  executeQuery(sql: string): Promise<QueryResult>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
}
```

**Stage 5: Result Formatting**

Query results are formatted based on user preference:

- **JSON:** Direct API response for programmatic access
- **Excel:** Multi-sheet workbooks with formatted data, generated using the `exceljs` library

---

#### 2.2 Metadata Management

The metadata subsystem parses D365 Finance and Operations XML metadata files to extract table structures, field definitions, relationships, and indexes.

**Metadata Parser V2** handles:

- **Fields:** Data types, Extended Data Types (EDT), mandatory flags, labels
- **Field Groups:** Logical groupings of related fields
- **Relationships:** Foreign key constraints with cardinality and cascade rules
- **Indexes:** Primary keys, unique constraints, composite indexes
- **Full-Text Indexes:** Search-optimized indexes with change tracking modes
- **Methods:** Business logic methods with parameter signatures (parsed but not executed)

Parsed metadata is stored in MySQL tables for fast retrieval during query generation.

---

#### 2.3 Database Connection Manager

The connection manager (`server/db-config.ts`) handles:

- Secure credential storage (passwords encrypted at rest)
- Connection pooling for performance
- Active connection selection (only one database active at a time)
- Connection health monitoring

**Security Note:** Database credentials are encrypted using AES-256 before storage. The encryption key is derived from the `JWT_SECRET` environment variable.

---

#### 2.4 LLM Configuration Manager

The LLM manager (`server/routers-config.ts`) supports multiple LLM providers:

| Provider | Configuration Required | Use Case |
|----------|------------------------|----------|
| **Manus Built-in** | None (pre-configured) | Default, no API key needed |
| **OpenAI** | API key | GPT-4 for complex queries |
| **Azure OpenAI** | Endpoint + API key | Enterprise deployments |
| **Anthropic** | API key | Claude for reasoning-heavy tasks |

Users can switch providers through the Settings page. The system automatically uses the active LLM configuration for all query generation tasks.

---

### 3. Data Layer

#### 3.1 Metadata Store (MySQL)

The metadata database stores:

- **metadataTables:** Table definitions with descriptions and business purposes
- **metadataFields:** Field definitions with types and constraints
- **tableRelationships:** Foreign key relationships between tables
- **tableIndexes:** Index definitions with field lists
- **fullTextIndexes:** Full-text search indexes

#### 3.2 Application Database (MySQL)

The application database stores:

- **users:** User accounts with roles (admin/user)
- **databaseConnections:** Configured database connections
- **llmConfigurations:** LLM provider settings
- **conversations:** Chat conversation threads
- **messages:** Individual chat messages
- **queryHistory:** Executed queries with results and execution times

---

## Data Flow

### Typical Query Flow

The following sequence diagram illustrates a complete query lifecycle:

```
User → Frontend: "Show me all customers from last month"
Frontend → Backend (tRPC): query.generate({ question: "..." })
Backend → Intent Classifier: Classify intent
Intent Classifier → Backend: { type: 'query', entities: ['Customer'] }
Backend → Metadata Store: Get Customer table schema
Metadata Store → Backend: { fields: [...], relationships: [...] }
Backend → LLM Service: Generate SQL with schema context
LLM Service → Backend: "SELECT * FROM CustTable WHERE ..."
Backend → Query Reviewer: Review SQL
Query Reviewer → Backend: { technical: "...", layman: "..." }
Backend → Frontend: { sql: "...", explanation: "..." }
Frontend → User: Display SQL + explanation
User → Frontend: Approve execution
Frontend → Backend: query.execute({ sql: "..." })
Backend → Query Executor: Execute via adapter
Query Executor → SQL Server: Run query
SQL Server → Query Executor: Result rows
Query Executor → Backend: { rows: [...], rowCount: 42 }
Backend → Result Formatter: Format as Excel
Result Formatter → Backend: Excel buffer
Backend → Frontend: { downloadUrl: "..." }
Frontend → User: Download Excel file
```

---

## Integration Points

### Knowledge Base Integration (Future)

The system is designed to integrate with a future knowledge base component for domain-specific context. The integration contract is defined in `server/knowledge-base-adapter.ts`:

```typescript
interface KnowledgeBaseAdapter {
  /**
   * Search the knowledge base for relevant documents
   * @param query - Natural language search query
   * @returns Array of relevant documents with content and metadata
   */
  search(query: string): Promise<KnowledgeDocument[]>;
  
  /**
   * Check if knowledge base is available
   * @returns true if KB is configured and reachable
   */
  isEnabled(): boolean;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}
```

**Integration Flow:**

When a user submits a query, the system will:

1. Check if knowledge base is enabled via `isEnabled()`
2. If enabled, call `search(query)` to retrieve relevant documents
3. Inject document content into the LLM prompt as additional context
4. Generate SQL with enhanced domain knowledge

**Example Use Case:** If the knowledge base contains a document explaining that "Ship-to customer" refers to the `ShipToCustomer` field in `SalesTable`, the LLM can use this context to generate more accurate queries when users ask about "shipping destinations."

**Implementation Status:** The interface is defined, but the actual knowledge base implementation will be provided by a separate team. The query generation pipeline already has a placeholder hook for injecting KB context.

---

## Security Architecture

### Authentication

The system uses **Manus OAuth** for user authentication. The authentication flow:

1. User clicks "Sign In" → Redirected to Manus OAuth portal
2. User authenticates with Manus credentials
3. OAuth callback returns JWT token
4. Token stored in HTTP-only cookie
5. All API requests include cookie for authentication

### Authorization

Role-based access control (RBAC) is implemented with two roles:

- **Admin:** Full access to all features, can manage connections and LLM configs
- **User:** Can query data and view history, cannot modify system settings

### Data Protection

- **Database Credentials:** Encrypted with AES-256 before storage
- **LLM API Keys:** Encrypted with AES-256 before storage
- **Query Results:** Not persisted by default (only metadata in query history)
- **User Data:** Stored in compliance with Manus platform security standards

---

## Performance Considerations

### Query Optimization

The query executor implements several optimizations:

- **Connection Pooling:** Reuses database connections to reduce latency
- **Query Timeout:** Enforces 30-second timeout to prevent long-running queries
- **Result Limiting:** Automatically adds `TOP 1000` to queries without explicit limits
- **Schema Caching:** Metadata is cached in memory to avoid repeated database lookups

### LLM Cost Management

To minimize LLM API costs:

- **Intent Classification:** Uses lightweight models (e.g., GPT-3.5) for classification
- **Query Generation:** Uses more powerful models (e.g., GPT-4) only when needed
- **Prompt Optimization:** Minimizes token usage by sending only relevant schema information
- **Response Caching:** Caches similar query patterns to avoid redundant LLM calls (future enhancement)

---

## Deployment Architecture

The application is designed for deployment on the **Manus platform**, which provides:

- **Managed Hosting:** Automatic scaling and load balancing
- **Database Provisioning:** MySQL database included
- **Environment Variables:** Secure secret management
- **SSL/TLS:** Automatic HTTPS with custom domain support
- **OAuth Integration:** Built-in authentication

**Environment Variables:**

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | MySQL connection string | Yes |
| `JWT_SECRET` | Session signing key | Yes |
| `OAUTH_SERVER_URL` | Manus OAuth backend | Yes |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth frontend | Yes |
| `BUILT_IN_FORGE_API_KEY` | Manus LLM API key | Yes |
| `BUILT_IN_FORGE_API_URL` | Manus LLM endpoint | Yes |

---

## Technology Stack

### Frontend

- **React 19:** UI framework with concurrent rendering
- **Tailwind CSS 4:** Utility-first styling with custom design tokens
- **Wouter:** Lightweight client-side routing
- **tRPC Client:** Type-safe API calls with React Query integration
- **shadcn/ui:** Accessible component library built on Radix UI
- **Lucide Icons:** Icon library for consistent visual language

### Backend

- **Node.js 22:** JavaScript runtime
- **Express 4:** Web server framework
- **tRPC 11:** Type-safe API layer
- **Drizzle ORM:** Type-safe database queries
- **MySQL2:** MySQL database driver
- **ExcelJS:** Excel file generation
- **xml2js:** XML parsing for D365 metadata

### Development Tools

- **TypeScript 5:** Static type checking
- **Vite 7:** Fast build tool and dev server
- **Vitest 2:** Unit testing framework
- **Drizzle Kit:** Database migration tool
- **pnpm:** Fast, disk-efficient package manager

---

## Extensibility

### Adding New Database Adapters

To support additional database types:

1. Create a new adapter in `server/database/adapters/`
2. Implement the `DatabaseAdapter` interface
3. Register the adapter in `server/database/adapters/index.ts`
4. Add the database type to the `databaseType` enum in `drizzle/schema.ts`
5. Update the connection form in the frontend to support the new type

### Extending Query Generation

To enhance query generation capabilities:

1. **Add Schema Introspection:** Modify `server/queryExecutor.ts` to run `SELECT TOP 0 * FROM table` before query generation to get actual column names and types
2. **Inject Knowledge Base Context:** Implement the `KnowledgeBaseAdapter` interface and call it in the query generation pipeline
3. **Add Query Templates:** Create a library of common query patterns to improve generation accuracy
4. **Fine-tune Prompts:** Adjust the LLM prompts in `server/routers.ts` to better handle specific D365 terminology

---

## Future Enhancements

The following features are planned for future releases:

1. **Knowledge Base Integration:** Full implementation of the KB adapter with vector search
2. **Multi-Step Queries:** Support for complex requests requiring multiple SQL queries (e.g., "Create an Excel with three sheets, each filtered differently")
3. **Query Result Summaries:** LLM-generated insights about query results (e.g., "Found 42 customers, 80% are from the US")
4. **Schema Introspection:** Pre-query `SELECT TOP 0 * FROM table` to get actual column metadata
5. **Query Progress Tracking:** Real-time progress updates during long-running queries
6. **Result Visualization:** Charts and graphs for numeric query results
7. **Query Scheduling:** Ability to schedule recurring queries and email results
8. **Audit Logging:** Comprehensive logging of all queries for compliance

---

## Conclusion

The D365 F&O Data Agent provides a robust, extensible architecture for natural language database querying. The pipeline-based design ensures modularity and maintainability, while the type-safe tRPC layer guarantees reliability. The system is production-ready and designed for seamless integration with future enhancements, particularly the planned knowledge base component.

---

**Document Maintained By:** Manus AI  
**For Questions or Contributions:** Contact the development team through the Manus platform.
