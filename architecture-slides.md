# D365 F&O Data Agent Architecture

---

## Slide 1: System Overview

### D365 F&O Data Agent - High-Level Architecture

**Purpose**: AI-powered natural language interface for querying Dynamics 365 Finance & Operations data

**Key Components**:
- Web Application (React + TypeScript)
- API Layer (Express + tRPC)
- AI Query Engine (LLM Integration)
- Azure SQL Connector
- Metadata Management System
- Authentication & Authorization

**User Flow**: User asks question → AI generates SQL → Query executes → Results displayed → Export to Excel

---

## Slide 2: Technology Stack

### Frontend Technologies
- **React 19** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **TailwindCSS 4** - Utility-first styling
- **tRPC Client** - End-to-end type safety
- **Wouter** - Lightweight routing

### Backend Technologies
- **Express 4** - Web server framework
- **tRPC 11** - Type-safe API layer
- **Node.js** - JavaScript runtime
- **Drizzle ORM** - Database operations

### External Services
- **Azure SQL Database** - D365 F&O data source
- **Azure AD OAuth** - User authentication
- **LLM API** - Natural language processing
- **S3 Storage** - File exports

---

## Slide 3: Data Flow Architecture

### Request Flow (Natural Language Query)

1. **User Input** → Chat interface receives natural language question
2. **Authentication Check** → Verify user session and permissions
3. **Metadata Retrieval** → Load relevant table/field definitions
4. **AI Processing** → LLM generates SQL query with context
5. **Query Validation** → Sanitize and validate generated SQL
6. **Azure SQL Execution** → Execute query against D365 database
7. **Result Processing** → Format and filter based on user roles
8. **Response Delivery** → Display results in chat with export option

**Security Checkpoints**: OAuth validation → Role verification → Query sanitization → Result filtering

---

## Slide 4: Database Architecture

### Internal Database (MySQL/TiDB)
**Purpose**: Store application metadata and state

**Tables**:
- `users` - User profiles and authentication
- `user_security_roles` - D365 role mappings
- `metadata_tables` - D365 table definitions
- `metadata_fields` - Field schemas and relationships
- `conversations` - Chat conversation threads
- `messages` - Chat message history
- `query_history` - Executed query logs
- `azure_sql_connections` - Database connection configs

### External Database (Azure SQL)
**Purpose**: D365 F&O production data (read-only access)

---

## Slide 5: AI Query Generation Engine

### Natural Language to SQL Conversion

**Input**: "Show me all purchase orders from last month"

**Process**:
1. **Context Building** - Gather metadata for relevant tables
2. **Prompt Engineering** - Inject schema + user roles + question
3. **LLM Invocation** - Generate SQL with structured output
4. **Validation** - Ensure SELECT-only, no dangerous keywords
5. **Explanation** - AI provides query rationale

**Output**: 
```sql
SELECT * FROM PurchTable 
WHERE CreatedDateTime >= DATEADD(month, -1, GETDATE())
ORDER BY CreatedDateTime DESC
```

**Safety Features**: Keyword blacklist (DROP, DELETE, INSERT) | Query type validation | Parameterization support

---

## Slide 6: Metadata Management System

### Metadata Ingestion Pipeline

**Input Format** (TXT):
```
TABLE: CustomerTable
DESCRIPTION: Customer master data
FIELD: AccountNum
TYPE: String
PRIMARY_KEY: true
---
TABLE: SalesTable...
```

**Processing Steps**:
1. **Parse** - Extract tables and fields from TXT format
2. **Validate** - Check required fields, detect duplicates
3. **Store** - Save to metadata_tables and metadata_fields
4. **Index** - Enable fast lookup for AI context

**Benefits**: AI understands business context | Accurate query generation | Relationship awareness

---

## Slide 7: Authentication & Authorization

### Security Architecture

**Authentication Layer** (Azure AD OAuth):
- Users sign in with Azure AD credentials
- Same login as D365 access
- Session management with secure cookies
- JWT token validation

**Authorization Layer** (Role-Based Access Control):
- D365 security roles mapped to user profiles
- Query results filtered by user permissions
- Admin-only features (connections, role management)
- Audit trail for all queries

**Query Security**:
- Only SELECT statements allowed
- Dangerous keywords blocked
- SQL injection prevention
- Connection pooling with encryption

---

## Slide 8: Azure SQL Integration

### Connection Management

**Connection Pool**:
- Reusable connections to Azure SQL
- Configurable pool size (max 10)
- Automatic reconnection on failure
- 30-second connection timeout

**Configuration** (Admin UI):
- Server: `myserver.database.windows.net`
- Database: `AXDB`
- Credentials: Encrypted storage
- SSL/TLS encryption enabled

**Query Execution**:
- Parameterized queries for safety
- 60-second query timeout
- Error handling and logging
- Performance metrics tracking

---

## Slide 9: Data Export System

### Excel Export Pipeline

**Trigger**: User clicks "Export to Excel" on query results

**Process**:
1. **Data Collection** - Query results + metadata
2. **Excel Generation** - Create workbook with ExcelJS
   - Sheet 1: Query results (formatted table)
   - Sheet 2: Query information (SQL, execution time)
3. **Styling** - Headers, filters, auto-fit columns
4. **Upload** - Store in S3 with unique key
5. **Download Link** - Return public URL to user

**Features**: Auto-fit columns | Frozen headers | Data filters | Query documentation

---

## Slide 10: Chat Interface Architecture

### Conversation Management

**Components**:
- **Conversation List** - Sidebar with all user chats
- **Message History** - Persistent chat messages
- **Input Area** - Natural language query input
- **Results Display** - Table visualization
- **Export Controls** - Excel download button

**State Management**:
- Real-time message updates
- Optimistic UI updates
- Streaming response support
- Conversation persistence

**UX Features**: Mobile responsive | Loading states | Error handling | Auto-scroll to latest

---

## Slide 11: Deployment Architecture

### Production Environment

**Hosting**: Manus Platform (managed infrastructure)

**Components**:
- **Web Server** - Express app serving React frontend
- **Database** - Managed MySQL/TiDB instance
- **Storage** - S3-compatible object storage
- **Authentication** - Manus OAuth service

**Scalability**:
- Horizontal scaling for web servers
- Connection pooling for databases
- CDN for static assets
- Automatic SSL/TLS certificates

**Monitoring**: Application logs | Query performance metrics | Error tracking | Usage analytics

---

## Slide 12: Security & Compliance

### Enterprise Security Features

**Data Protection**:
- Encrypted connections (SSL/TLS)
- Password encryption for stored credentials
- No sensitive data in frontend code
- Secure session management

**Access Control**:
- Azure AD authentication required
- Role-based query filtering
- Admin-only configuration access
- Audit trail for all queries

**Query Safety**:
- SQL injection prevention
- Query type restrictions (SELECT only)
- Dangerous keyword blocking
- Query validation and sanitization

**Compliance**: Audit logs | User activity tracking | Query history retention | Role-based access control

---

## Slide 13: Future Enhancements

### Roadmap for Advanced Features

**Performance Optimization**:
- Query result caching for frequent queries
- Materialized views for complex aggregations
- Query optimization suggestions
- Background query execution

**Advanced Analytics**:
- Chart generation for numeric data
- Trend analysis and forecasting
- Saved query templates
- Scheduled report generation

**User Experience**:
- Voice input for queries
- Query suggestions based on history
- Collaborative query sharing
- Mobile app development

**Integration**: Power BI connector | Teams bot integration | Email report delivery | API for external systems
