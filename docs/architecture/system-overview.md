# D365 F&O Data Agent - System Architecture

## Overview

The D365 F&O Data Agent is an AI-powered natural language query interface for Dynamics 365 Finance and Operations databases. The system allows non-technical business users to ask questions in plain English and receive accurate SQL-based results from their D365 environment.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface (React)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Chat   │  │ Metadata │  │Knowledge │  │ Settings │        │
│  │Interface │  │Management│  │   Base   │  │  & Admin │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │ tRPC (Type-safe API)
┌────────────────────────┴────────────────────────────────────────┐
│                    Backend Services (Node.js)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Authentication Layer                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │  Azure AD  │  │   Manus    │  │    Dev     │         │   │
│  │  │   OAuth    │  │   OAuth    │  │  Fallback  │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Core Services                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   Query     │  │  Metadata   │  │     RAG     │      │   │
│  │  │ Generator   │  │   Parser    │  │  Retrieval  │      │   │
│  │  │  (AI/LLM)   │  │  (XML/TXT)  │  │   Engine    │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Data Access Layer                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  Azure SQL  │  │   Internal  │  │   Vector    │      │   │
│  │  │  Executor   │  │  Database   │  │    Store    │      │   │
│  │  │  (D365 DB)  │  │(MySQL/TiDB) │  │ (In-Memory) │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Frontend Layer (React + TypeScript)

**Chat Interface**
- Natural language query input
- Streaming AI responses
- Conversation history management
- Result visualization (tables, charts)
- Excel export functionality

**Metadata Management**
- D365 XML metadata file upload
- Table/field definition viewing
- Metadata search and filtering

**Knowledge Base**
- Document upload (PDF, Word, Excel, Text, Markdown)
- RAG document processing status
- Document management (view, delete)

**Settings & Admin**
- Azure SQL connection configuration
- Security role management
- Azure AD group mappings
- Connection testing

### Backend Layer (Node.js + Express)

**Authentication System**
- Provider abstraction layer
- Azure AD OAuth integration
- Development fallback (localStorage)
- Session management (JWT)
- Role-based access control

**Query Generation Engine**
- Natural language to SQL conversion (LLM)
- Metadata context injection
- RAG context retrieval
- Query validation and sanitization
- SQL parameter binding

**Metadata Parser**
- D365 AxTable XML parsing
- Field type extraction (ExtendedDataType)
- Relationship mapping
- Business logic extraction

**RAG System**
- Document processing pipeline
- Text chunking (configurable overlap)
- Embedding generation (Xenova Transformers)
- Vector storage (in-memory/external)
- Semantic search

**Azure SQL Executor**
- Connection pooling
- Parameterized query execution
- Error handling and logging
- Result formatting

### Data Layer

**Internal Database (MySQL/TiDB)**
- User profiles and authentication
- Metadata storage (tables, fields)
- Conversation history
- Query history and results
- Security role mappings
- Azure AD group mappings
- Knowledge base documents

**External Database (Azure SQL)**
- D365 F&O production data
- Read-only query execution
- Connection managed per tenant

**Vector Store**
- Document embeddings
- Semantic search index
- In-memory (development)
- External providers (Pinecone, Weaviate - future)

## Data Flow

### Query Execution Flow

```
User Query
    │
    ▼
┌───────────────────┐
│  Chat Interface   │
│  (User Input)     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Authentication   │
│  Check & Role     │
│  Verification     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  RAG Retrieval    │
│  Get Relevant     │
│  Documents        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Table Selection  │
│  Strategy (RAG/   │
│  Keyword/Zero)    │ ← See: features/table-selection-strategies.md
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Metadata Context │
│  Load Table/Field │
│  Definitions      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  LLM Query Gen    │
│  Natural Language │
│  → SQL            │
│  (Mode A/B/C)     │ ← NEW: Mode C infers standard D365 tables
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Query Review     │ ← NEW: User reviews SQL before execution
│  (pendingExecution│
│   = true)         │
└────────┬──────────┘
         │
         │ User clicks "Run Query"
         ▼
┌───────────────────┐
│  Query Validation │
│  & Sanitization   │
│  (CTE support)    │ ← NEW: WITH...SELECT queries allowed
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Azure SQL Exec   │
│  Execute Query    │
│  on D365 DB       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Result Format    │
│  & Export         │
│  (Table/Excel)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Save History     │
│  Log Query        │
└────────┬──────────┘
         │
         ▼
    Response to User
```

### Metadata Ingestion Flow

```
D365 XML File
    │
    ▼
┌───────────────────┐
│  File Upload      │
│  (Frontend)       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  XML Parser       │
│  Extract Tables   │
│  & Fields         │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Type Mapping     │
│  AxTableField     │
│  → SQL Types      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Database Storage │
│  Save Metadata    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Index & Search   │
│  Enable Query     │
│  Generation       │
└───────────────────┘
```

### RAG Document Processing Flow

```
Document Upload
    │
    ▼
┌───────────────────┐
│  File Type Check  │
│  PDF/Word/Excel   │
│  /Text/Markdown   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Text Extraction  │
│  Parse Content    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Text Chunking    │
│  Split into       │
│  Manageable Pieces│
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Embedding Gen    │
│  Xenova Trans-    │
│  formers (Local)  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Vector Storage   │
│  Store Embeddings │
│  for Retrieval    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Metadata Save    │
│  Document Info    │
└───────────────────┘
```

## Security Architecture

### Authentication Flow

```
User Login Request
    │
    ▼
┌───────────────────┐
│  Auth Provider    │
│  Selection        │
│  (Azure AD/Dev)   │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│Azure AD│  │  Dev   │
│ OAuth  │  │ Local  │
└───┬────┘  └───┬────┘
    │           │
    └─────┬─────┘
          │
          ▼
┌───────────────────┐
│  User Profile     │
│  Fetch/Create     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Azure AD Groups  │
│  Fetch Membership │
│  (if Azure AD)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Role Mapping     │
│  AD Group →       │
│  D365 Role        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Session Token    │
│  JWT Generation   │
└────────┬──────────┘
         │
         ▼
    Login Success
```

### Role-Based Access Control

```
Query Request
    │
    ▼
┌───────────────────┐
│  JWT Validation   │
│  Extract User     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Load User Roles  │
│  D365 Security    │
│  Roles            │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Permission Check │
│  Table/Column     │
│  Access (Future)  │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
Allowed   Denied
    │         │
    ▼         ▼
Execute   Return Error
Query     403 Forbidden
```

## Technology Stack

### Frontend
- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **Routing**: Wouter
- **API Client**: tRPC + React Query
- **State Management**: React hooks + tRPC cache

### Backend
- **Runtime**: Node.js 22
- **Framework**: Express 4
- **Language**: TypeScript
- **API**: tRPC 11 (type-safe RPC)
- **Authentication**: MSAL (Azure AD), JWT
- **ORM**: Drizzle ORM
- **Database**: MySQL/TiDB (internal), Azure SQL (D365)

### AI & ML
- **LLM**: OpenAI GPT-4, GPT-5.1 (via Manus API), Gemini, Claude
- **Default Model**: GPT-5.1-2025-11-13 ($2.50/1M input, $10/1M output)
- **Token Tracking**: Real-time token usage and cost estimation
- **Embeddings**: Xenova Transformers (local)
- **Vector Store**: In-memory (development), Pinecone/Weaviate (future)
- **Query Modes**: Mode A (full schema), Mode B (schema request), Mode C (inferred standard D365 tables)

### File Processing
- **PDF**: pdf-parse
- **Word**: mammoth
- **Excel**: xlsx
- **Markdown**: markdown-it

### Testing
- **Framework**: Vitest
- **Coverage**: Unit tests for core services

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Manus Platform                        │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │          Frontend (Static Assets)              │    │
│  │          Served via CDN                        │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
│  ┌────────────────┴───────────────────────────────┐    │
│  │          Backend API Server                    │    │
│  │          Node.js + Express + tRPC              │    │
│  │          Port: 3000                            │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
│  ┌────────────────┴───────────────────────────────┐    │
│  │          Internal Database                     │    │
│  │          MySQL/TiDB                            │    │
│  │          (Managed by Manus)                    │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ Outbound Connection
                       │
           ┌───────────┴────────────┐
           │                        │
           ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│   Azure SQL      │    │   Azure AD       │
│   D365 F&O DB    │    │   OAuth          │
│   (Customer)     │    │   (Customer)     │
└──────────────────┘    └──────────────────┘
```

## Scalability Considerations

### Current Architecture (MVP)
- Single server instance
- In-memory vector store
- Connection pooling for Azure SQL
- Suitable for: 10-50 concurrent users

### Future Enhancements
- **Horizontal Scaling**: Multiple backend instances behind load balancer
- **Vector Store**: External vector database (Pinecone, Weaviate)
- **Caching**: Redis for query result caching
- **Queue System**: Background job processing for long-running queries
- **CDN**: Static asset caching and distribution

## Security Considerations

### Data Protection
- **Encryption in Transit**: HTTPS/TLS for all connections
- **Encryption at Rest**: Database encryption (managed by platform)
- **Credential Storage**: Environment variables, never in code
- **SQL Injection Prevention**: Parameterized queries only

### Access Control
- **Authentication**: Azure AD OAuth (SSO)
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: JWT with expiration
- **Audit Logging**: Query history with user attribution

### Compliance
- **GDPR**: User data deletion support
- **SOC 2**: Audit trail for all data access
- **D365 Security**: Respects D365 security role permissions

## Monitoring & Observability

### Logging
- **Application Logs**: Winston/Console
- **Query Logs**: All SQL queries logged with user context
- **Error Tracking**: Structured error logging

### Metrics (Future)
- **Performance**: Query execution time
- **Usage**: Queries per user, popular tables
- **Errors**: Failed queries, connection errors

## Extensibility

### Plugin Architecture
- **Authentication Providers**: Easy to add new providers
- **Vector Stores**: Swappable vector storage backends
- **Embedding Providers**: Support for OpenAI, Cohere, etc.
- **LLM Providers**: Support for multiple LLM APIs

### API Integration
- **tRPC Procedures**: Type-safe API extension
- **Webhooks**: Future support for event notifications
- **REST API**: Future support for external integrations

## References

- [Development Guide](../development/getting-started.md)
- [Deployment Guide](../deployment/local-setup.md)
- [API Documentation](../api/trpc-procedures.md)
- [User Guide](../usage/user-guide.md)
