# D365 F&O Data Agent - API Documentation

**Author:** Manus AI  
**Last Updated:** January 8, 2026  
**Version:** 1.0

---

## Overview

The D365 F&O Data Agent exposes a type-safe API built with **tRPC 11**, providing end-to-end type safety between the frontend and backend. All API calls are made over HTTP using JSON-RPC protocol, with automatic TypeScript type inference on the client side.

**Base URL:** `/api/trpc`  
**Protocol:** JSON-RPC 2.0  
**Authentication:** Session-based (HTTP-only cookie)

---

## Authentication

### OAuth Flow

The application uses **Manus OAuth** for authentication. Users must authenticate before accessing protected endpoints.

#### Get Login URL

**Client Usage:**
```typescript
import { getLoginUrl } from '@/lib/auth';

const loginUrl = getLoginUrl();
window.location.href = loginUrl; // Redirect to Manus OAuth
```

**OAuth Callback:**
- **Endpoint:** `GET /api/oauth/callback`
- **Parameters:** `code` (query parameter from OAuth provider)
- **Response:** Sets HTTP-only session cookie, redirects to home page

#### Get Current User

**Endpoint:** `auth.me`  
**Type:** Query  
**Authentication:** Required

**Request:**
```typescript
const { data: user } = trpc.auth.me.useQuery();
```

**Response:**
```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'admin' | 'user';
  lastSignedIn: Date | null;
}
```

**Error Codes:**
- `UNAUTHORIZED`: No valid session cookie

#### Logout

**Endpoint:** `auth.logout`  
**Type:** Mutation  
**Authentication:** Required

**Request:**
```typescript
const logout = trpc.auth.logout.useMutation();
await logout.mutateAsync();
```

**Response:**
```typescript
{
  success: true;
}
```

---

## Query Pipeline

The query pipeline transforms natural language questions into SQL queries and executes them against configured databases.

### Classify Intent

**Endpoint:** `query.classifyIntent`  
**Type:** Mutation  
**Authentication:** Required

Determines the type of user request (data query, modification, or system command).

**Request:**
```typescript
const classify = trpc.query.classifyIntent.useMutation();
const result = await classify.mutateAsync({
  question: "Show me all customers from last month"
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Natural language question |

**Response:**
```typescript
{
  intent: 'query' | 'modify' | 'system';
  entities: string[]; // Detected table names
  confidence: number; // 0.0 to 1.0
}
```

**Example:**
```json
{
  "intent": "query",
  "entities": ["CustTable"],
  "confidence": 0.95
}
```

---

### Generate Query

**Endpoint:** `query.generate`  
**Type:** Mutation  
**Authentication:** Required

Generates SQL query from natural language question using the configured LLM.

**Request:**
```typescript
const generate = trpc.query.generate.useMutation();
const result = await generate.mutateAsync({
  question: "Show me all customers from last month",
  conversationId: 123 // Optional: for context
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Natural language question |
| `conversationId` | number | No | Conversation ID for context |

**Response:**
```typescript
{
  sql: string; // Generated SQL query
  explanation: {
    technical: string; // Technical description
    layman: string; // Human-readable explanation
  };
  tablesUsed: string[]; // Tables referenced in query
  estimatedRows: number | null; // Estimated result count
}
```

**Example:**
```json
{
  "sql": "SELECT * FROM CustTable WHERE CreatedDateTime >= DATEADD(month, -1, GETDATE())",
  "explanation": {
    "technical": "Selects all columns from CustTable where CreatedDateTime is within the last 30 days",
    "layman": "This will show you all customer records that were created in the last month"
  },
  "tablesUsed": ["CustTable"],
  "estimatedRows": 42
}
```

**Error Codes:**
- `BAD_REQUEST`: Invalid question format
- `INTERNAL_SERVER_ERROR`: LLM service unavailable
- `FORBIDDEN`: No active database connection configured

---

### Execute Query

**Endpoint:** `query.execute`  
**Type:** Mutation  
**Authentication:** Required

Executes a SQL query against the active database connection.

**Request:**
```typescript
const execute = trpc.query.execute.useMutation();
const result = await execute.mutateAsync({
  sql: "SELECT * FROM CustTable WHERE ...",
  conversationId: 123 // Optional
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sql` | string | Yes | SQL query to execute |
| `conversationId` | number | No | Conversation ID for history tracking |

**Response:**
```typescript
{
  success: true;
  data: {
    rows: Record<string, unknown>[]; // Query result rows
    rowCount: number; // Total rows returned
    executionTime: number; // Milliseconds
    columns: string[]; // Column names
  };
}
```

**Example:**
```json
{
  "success": true,
  "data": {
    "rows": [
      { "AccountNum": "US-001", "Name": "Contoso Ltd", "CreatedDateTime": "2025-12-15T10:30:00Z" },
      { "AccountNum": "US-002", "Name": "Fabrikam Inc", "CreatedDateTime": "2025-12-20T14:22:00Z" }
    ],
    "rowCount": 2,
    "executionTime": 145,
    "columns": ["AccountNum", "Name", "CreatedDateTime"]
  }
}
```

**Error Codes:**
- `BAD_REQUEST`: Invalid SQL syntax
- `FORBIDDEN`: Query contains dangerous operations (DROP, TRUNCATE)
- `INTERNAL_SERVER_ERROR`: Database connection failed
- `TIMEOUT`: Query exceeded 30-second timeout

---

### Export to Excel

**Endpoint:** `query.exportToExcel`  
**Type:** Mutation  
**Authentication:** Required

Exports query results to an Excel file.

**Request:**
```typescript
const exportExcel = trpc.query.exportToExcel.useMutation();
const result = await exportExcel.mutateAsync({
  sql: "SELECT * FROM CustTable WHERE ...",
  sheetName: "Customers" // Optional
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sql` | string | Yes | SQL query to execute |
| `sheetName` | string | No | Name for Excel sheet (default: "Sheet1") |

**Response:**
```typescript
{
  success: true;
  downloadUrl: string; // Temporary download URL
  filename: string; // Generated filename
  rowCount: number; // Rows exported
}
```

**Example:**
```json
{
  "success": true,
  "downloadUrl": "/api/downloads/export-1704672000.xlsx",
  "filename": "customers-export-2026-01-08.xlsx",
  "rowCount": 42
}
```

**Notes:**
- Download URLs expire after 1 hour
- Maximum 10,000 rows per export
- Excel files use `.xlsx` format (Office Open XML)

---

## Database Configuration

### List Connections

**Endpoint:** `config.listDatabaseConnections`  
**Type:** Query  
**Authentication:** Required (Admin only)

Retrieves all configured database connections.

**Request:**
```typescript
const { data: connections } = trpc.config.listDatabaseConnections.useQuery();
```

**Response:**
```typescript
Array<{
  id: number;
  name: string;
  databaseType: 'sqlserver' | 'mysql' | 'postgresql' | 'sqlite' | 'oracle';
  host: string;
  port: number;
  database: string;
  username: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>
```

**Example:**
```json
[
  {
    "id": 1,
    "name": "Production D365",
    "databaseType": "sqlserver",
    "host": "d365-prod.database.windows.net",
    "port": 1433,
    "database": "AXDB",
    "username": "d365user",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-08T00:00:00Z"
  }
]
```

**Note:** Passwords are never returned in API responses.

---

### Create Connection

**Endpoint:** `config.createDatabaseConnection`  
**Type:** Mutation  
**Authentication:** Required (Admin only)

Creates a new database connection.

**Request:**
```typescript
const create = trpc.config.createDatabaseConnection.useMutation();
await create.mutateAsync({
  name: "Production D365",
  databaseType: "sqlserver",
  host: "d365-prod.database.windows.net",
  port: 1433,
  database: "AXDB",
  username: "d365user",
  password: "SecurePassword123!"
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Connection display name |
| `databaseType` | enum | Yes | Database type (sqlserver, mysql, etc.) |
| `host` | string | Yes | Database server hostname |
| `port` | number | Yes | Database server port |
| `database` | string | Yes | Database name |
| `username` | string | Yes | Database username |
| `password` | string | Yes | Database password (encrypted at rest) |

**Response:**
```typescript
{
  success: true;
  connectionId: number;
}
```

**Error Codes:**
- `BAD_REQUEST`: Invalid connection parameters
- `CONFLICT`: Connection name already exists
- `FORBIDDEN`: User is not admin

---

### Test Connection

**Endpoint:** `config.testDatabaseConnection`  
**Type:** Mutation  
**Authentication:** Required (Admin only)

Tests connectivity to a database.

**Request:**
```typescript
const test = trpc.config.testDatabaseConnection.useMutation();
const result = await test.mutateAsync({
  connectionId: 1
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connectionId` | number | Yes | ID of connection to test |

**Response:**
```typescript
{
  success: boolean;
  message: string;
  latency: number | null; // Milliseconds
}
```

**Example:**
```json
{
  "success": true,
  "message": "Connection successful",
  "latency": 45
}
```

---

### Set Active Connection

**Endpoint:** `config.setActiveConnection`  
**Type:** Mutation  
**Authentication:** Required (Admin only)

Sets the active database connection for query execution.

**Request:**
```typescript
const setActive = trpc.config.setActiveConnection.useMutation();
await setActive.mutateAsync({
  connectionId: 1
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connectionId` | number | Yes | ID of connection to activate |

**Response:**
```typescript
{
  success: true;
}
```

**Note:** Only one connection can be active at a time. Setting a new active connection deactivates all others.

---

### Delete Connection

**Endpoint:** `config.deleteDatabaseConnection`  
**Type:** Mutation  
**Authentication:** Required (Admin only)

Deletes a database connection.

**Request:**
```typescript
const deleteConn = trpc.config.deleteDatabaseConnection.useMutation();
await deleteConn.mutateAsync({
  connectionId: 1
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connectionId` | number | Yes | ID of connection to delete |

**Response:**
```typescript
{
  success: true;
}
```

**Error Codes:**
- `BAD_REQUEST`: Cannot delete active connection
- `NOT_FOUND`: Connection ID does not exist

---

## LLM Configuration

### List LLM Configurations

**Endpoint:** `config.listLlmConfigurations`  
**Type:** Query  
**Authentication:** Required (Admin only)

Retrieves all configured LLM providers.

**Request:**
```typescript
const { data: llms } = trpc.config.listLlmConfigurations.useQuery();
```

**Response:**
```typescript
Array<{
  id: number;
  name: string;
  provider: 'manus' | 'openai' | 'azure' | 'anthropic';
  isActive: boolean;
  createdAt: Date;
}>
```

**Example:**
```json
[
  {
    "id": 1,
    "name": "Manus Built-in",
    "provider": "manus",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "OpenAI GPT-4",
    "provider": "openai",
    "isActive": false,
    "createdAt": "2026-01-05T00:00:00Z"
  }
]
```

---

### Create LLM Configuration

**Endpoint:** `config.createLlmConfiguration`  
**Type:** Mutation  
**Authentication:** Required (Admin only)

Adds a new LLM provider configuration.

**Request:**
```typescript
const create = trpc.config.createLlmConfiguration.useMutation();
await create.mutateAsync({
  name: "OpenAI GPT-4",
  provider: "openai",
  apiKey: "sk-...",
  endpoint: "https://api.openai.com/v1", // Optional
  model: "gpt-4-turbo" // Optional
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Configuration display name |
| `provider` | enum | Yes | Provider type (manus, openai, azure, anthropic) |
| `apiKey` | string | Yes* | API key (*not required for Manus) |
| `endpoint` | string | No | Custom API endpoint |
| `model` | string | No | Specific model to use |

**Response:**
```typescript
{
  success: true;
  configId: number;
}
```

---

### Set Active LLM

**Endpoint:** `config.setActiveLlm`  
**Type:** Mutation  
**Authentication:** Required (Admin only)

Sets the active LLM provider for query generation.

**Request:**
```typescript
const setActive = trpc.config.setActiveLlm.useMutation();
await setActive.mutateAsync({
  configId: 1
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `configId` | number | Yes | ID of LLM config to activate |

**Response:**
```typescript
{
  success: true;
}
```

---

## Conversation Management

### Create Conversation

**Endpoint:** `conversation.create`  
**Type:** Mutation  
**Authentication:** Required

Creates a new conversation thread.

**Request:**
```typescript
const create = trpc.conversation.create.useMutation();
const result = await create.mutateAsync({
  title: "Customer Analysis" // Optional
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Conversation title (default: "New Conversation") |

**Response:**
```typescript
{
  id: number; // New conversation ID
}
```

---

### List Conversations

**Endpoint:** `conversation.list`  
**Type:** Query  
**Authentication:** Required

Retrieves all conversations for the current user.

**Request:**
```typescript
const { data: conversations } = trpc.conversation.list.useQuery();
```

**Response:**
```typescript
Array<{
  id: number;
  userId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

### Get Conversation Messages

**Endpoint:** `conversation.getMessages`  
**Type:** Query  
**Authentication:** Required

Retrieves all messages in a conversation.

**Request:**
```typescript
const { data: messages } = trpc.conversation.getMessages.useQuery({
  conversationId: 123
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | number | Yes | Conversation ID |

**Response:**
```typescript
Array<{
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}>
```

---

### Add Message

**Endpoint:** `conversation.addMessage`  
**Type:** Mutation  
**Authentication:** Required

Adds a message to a conversation.

**Request:**
```typescript
const addMsg = trpc.conversation.addMessage.useMutation();
await addMsg.mutateAsync({
  conversationId: 123,
  role: 'user',
  content: 'Show me all customers'
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | number | Yes | Conversation ID |
| `role` | enum | Yes | Message role (user or assistant) |
| `content` | string | Yes | Message text |

**Response:**
```typescript
{
  success: true;
  messageId: number;
}
```

---

## Query History

### Get Query History

**Endpoint:** `history.getQueryHistory`  
**Type:** Query  
**Authentication:** Required

Retrieves query execution history for the current user.

**Request:**
```typescript
const { data: history } = trpc.history.getQueryHistory.useQuery({
  limit: 50, // Optional
  offset: 0 // Optional
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Max results (default: 50) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response:**
```typescript
Array<{
  id: number;
  userId: number;
  question: string;
  generatedSql: string;
  executionTime: number; // Milliseconds
  rowCount: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
}>
```

---

## System Notifications

### Notify Owner

**Endpoint:** `system.notifyOwner`  
**Type:** Mutation  
**Authentication:** Required

Sends a notification to the project owner (for operational alerts).

**Request:**
```typescript
const notify = trpc.system.notifyOwner.useMutation();
await notify.mutateAsync({
  title: "Database Connection Failed",
  content: "Unable to connect to Production D365 database"
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Notification title |
| `content` | string | Yes | Notification body |

**Response:**
```typescript
{
  success: boolean;
}
```

**Use Cases:**
- Critical errors (database connection failures)
- Security alerts (unauthorized access attempts)
- System health warnings (high query latency)

---

## Knowledge Base Integration (Future)

**Status:** Interface defined, implementation pending

The knowledge base integration will provide domain-specific context for query generation. The following endpoints are planned:

### Search Knowledge Base

**Endpoint:** `knowledgeBase.search` (Planned)  
**Type:** Query  
**Authentication:** Required

**Request:**
```typescript
const { data: docs } = trpc.knowledgeBase.search.useQuery({
  query: "customer shipping address",
  limit: 5
});
```

**Response:**
```typescript
Array<{
  id: string;
  title: string;
  content: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}>
```

### Upload Document

**Endpoint:** `knowledgeBase.uploadDocument` (Planned)  
**Type:** Mutation  
**Authentication:** Required (Admin only)

**Request:**
```typescript
const upload = trpc.knowledgeBase.uploadDocument.useMutation();
await upload.mutateAsync({
  title: "D365 Shipping Fields Guide",
  content: "...",
  metadata: { category: "shipping" }
});
```

**Implementation Note:** The knowledge base will be implemented by a separate team. The query generation pipeline already has hooks for injecting KB context once the service is available.

---

## Metadata APIs

**Status:** Managed by separate team

Metadata-related endpoints (table parsing, field extraction, relationship management) are maintained by a different development team and are documented separately. These endpoints handle:

- Uploading D365 XML metadata files
- Parsing table structures
- Extracting fields, relationships, and indexes
- Browsing metadata in tree view

For metadata API documentation, contact the metadata management team.

---

## Error Handling

All tRPC endpoints follow a consistent error format:

```typescript
{
  error: {
    code: string; // Error code (e.g., 'UNAUTHORIZED', 'BAD_REQUEST')
    message: string; // Human-readable error message
    data?: {
      zodError?: ZodError; // Validation errors (if applicable)
      cause?: Error; // Original error (if applicable)
    };
  };
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No valid session or insufficient permissions |
| `FORBIDDEN` | 403 | User lacks required role (e.g., admin-only endpoint) |
| `BAD_REQUEST` | 400 | Invalid input parameters or malformed request |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate connection name) |
| `TIMEOUT` | 408 | Operation exceeded time limit |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

The API does not currently implement rate limiting, as it is deployed on the Manus platform which handles infrastructure-level rate limiting. Future versions may add application-level rate limiting for LLM API calls to manage costs.

---

## Versioning

The API currently uses **v1** (implicit). Future breaking changes will be introduced as new versions (v2, v3, etc.) with separate tRPC routers to maintain backward compatibility.

---

## Client Usage Examples

### React Component with tRPC

```typescript
import { trpc } from '@/lib/trpc';

function CustomerQuery() {
  const [question, setQuestion] = useState('');
  const generate = trpc.query.generate.useMutation();
  const execute = trpc.query.execute.useMutation();

  const handleSubmit = async () => {
    // Step 1: Generate SQL
    const { sql, explanation } = await generate.mutateAsync({ question });
    
    // Step 2: Show user the SQL and explanation
    console.log('Generated SQL:', sql);
    console.log('Explanation:', explanation.layman);
    
    // Step 3: Execute query
    const result = await execute.mutateAsync({ sql });
    console.log('Results:', result.data.rows);
  };

  return (
    <div>
      <input value={question} onChange={e => setQuestion(e.target.value)} />
      <button onClick={handleSubmit}>Ask Question</button>
    </div>
  );
}
```

### Error Handling

```typescript
const generate = trpc.query.generate.useMutation({
  onError: (error) => {
    if (error.data?.code === 'UNAUTHORIZED') {
      // Redirect to login
      window.location.href = getLoginUrl();
    } else if (error.data?.code === 'FORBIDDEN') {
      // Show error: No database connection
      toast.error('Please configure a database connection first');
    } else {
      // Generic error
      toast.error(error.message);
    }
  }
});
```

---

## Conclusion

The D365 F&O Data Agent API provides a comprehensive, type-safe interface for natural language database querying. The tRPC architecture ensures reliability and developer productivity through automatic type inference and runtime validation. All endpoints are production-ready and actively maintained.

For questions or support, contact the development team through the Manus platform.

---

**Document Maintained By:** Manus AI  
**API Version:** 1.0  
**Last Updated:** January 8, 2026
