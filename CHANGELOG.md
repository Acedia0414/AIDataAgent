# Changelog

All notable changes to the D365 F&O Data Agent project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Feature Flags API** - `/api/config.getFeatureFlags` endpoint for frontend to check enabled features
- **ENABLE_PREFLIGHT** env var - Controls LLM pre-check before SQL generation (default: ON)

### Changed
- **Query Preflight** now enabled by default via `ENABLE_PREFLIGHT=true`
- **Query Review prompts** refined for clearer technical/business explanations
- **Query Preflight prompts** enhanced with D365 table mapping and "bias toward READY" philosophy

### Removed
- **Intent Classifier prompts** (`intent-classifier-*.md`) - Not used in current flow
  - `intent-classifier-system.md` - Was: "You are an expert intent classifier..."
  - `intent-classifier-categories.md` - Was: GENERAL_QA, QUERY_REQUIRED, FILE_GENERATION categories
  - `intent-classifier-output.md` - Was: JSON output format for intent classification
  - `intent-classifier-multistep.md` - Was: Multi-step detection for Excel sheets
  - **Reason**: SQL runs on-demand, Excel export is post-result. Intent classification adds latency without benefit.
  - **Legacy support**: `intentClassifier.ts` still works with inline stub prompts

### Deprecated
- `getIntentClassifierPrompt()` in prompt-loader.ts - Replaced with inline stub

---

## [Previous Unreleased]

### Added
- **Editable Prompts System for Non-Technical Users**
  - Pure markdown file (`prompts.md`) for easy prompt editing
  - No coding skills required - anyone can edit prompts
  - Organized sections: ROLE, TASK, RULES, SECURITY, CONTEXT, OUTPUT_FORMAT
  - Automatic parsing and loading with caching
  - Documentation for non-technical users in `docs/EDITABLE_PROMPTS_GUIDE.md`
- **LLM Prompts Configuration System**
  - Centralized prompt management in `server/llm-prompts.ts`
  - Type-safe context interfaces for all prompts
  - Dynamic prompt generation with parameterized functions
  - Comprehensive documentation in `docs/LLM_PROMPTS.md`
  - Support for Query Generation, Intent Classification, Query Review, and Result Insights
- **Enhanced Query Pipeline with Intent Classification**
  - Intent classification system (general Q&A vs query-required vs file-generation)
  - Query review stage with technical and layman explanations
  - Query acceptance/rejection flow (loop back if rejected)
  - Dynamic result preview (handles varying column counts)
  - Support for multiple file generation (Excel + others)
  - Connection status indicator in chat interface
  - "Test Connection" button in query flow
- Comprehensive documentation structure in `/docs` folder
- ASCII diagrams for architecture and data flow
- Developer guide for CRUD operations
- Deployment guide for local setup
- User guide for non-technical users

### Changed
- Query generation pipeline now uses metadata context for accuracy
- Enhanced Settings page with global DB connection management
- Improved navigation consistency across all pages
- Enhanced error handling with detailed feedback

### Fixed
- React hooks rendering errors in Home and Settings pages
- TypeScript compilation errors in various components

## [0.3.0] - 2024-01-XX

### Added
- **RAG (Retrieval Augmented Generation) System**
  - Document processing pipeline for PDF, Word, Excel, Text, Markdown
  - Text chunking with configurable overlap
  - Embedding generation using Xenova Transformers (local, no API required)
  - Vector storage with in-memory implementation
  - Swappable architecture for embedding providers and vector stores
  - Knowledge Base UI for document upload and management
  - Integration with chat query system for context-aware responses
  - Comprehensive inline documentation and help text

- **UI/UX Improvements**
  - PageHeader component for consistent navigation
  - Confirmation dialogs for dangerous actions (delete, clear)
  - Tooltips on all buttons and icons
  - Back-to-home navigation on all pages

- **Testing**
  - 17 passing vitest tests for RAG system
  - Unit tests for document processing, text chunking, and vector storage

### Changed
- Query generation now includes RAG context from uploaded documents
- Improved metadata context injection for AI prompts

## [0.2.0] - 2024-01-XX

### Added
- **Azure AD Authentication Integration**
  - Authentication provider abstraction layer
  - Azure AD OAuth provider with MSAL
  - Development fallback authentication (username/password in localStorage)
  - Azure AD group membership fetching
  - Admin UI for Azure AD group to D365 role mappings
  - Database schema for group-to-role mappings
  - Forward-looking column-level permissions architecture

- **Azure SQL Connection Testing**
  - Dedicated connection test page (`/connection-test`)
  - Credential form with localStorage persistence
  - Comprehensive error handling with troubleshooting guidance
  - Detailed technical error information for debugging
  - Backend endpoint for secure connection testing

- **Documentation**
  - Azure AD setup guide with app registration steps
  - Testing checklist for Azure AD integration
  - Testing scenarios for authentication flows

### Changed
- Refactored authentication system to support multiple providers
- Enhanced security with role-based access control preparation

### Fixed
- React setState in render errors in Home page
- TypeScript type errors in authentication providers

## [0.1.0] - 2024-01-XX

### Added
- **Core Application Infrastructure**
  - React 19 + TypeScript frontend with Tailwind CSS 4
  - Node.js + Express backend with tRPC 11
  - Drizzle ORM for type-safe database operations
  - MySQL/TiDB internal database
  - Manus OAuth authentication

- **D365 Metadata Management**
  - XML metadata parser for D365 AxTable files
  - Support for AxTableField elements with type extraction
  - ExtendedDataType (EDT) mapping to SQL types
  - Metadata upload UI with drag-and-drop
  - Metadata viewing, searching, and filtering
  - Database storage for table and field definitions

- **Chat Interface**
  - Natural language query input
  - AI-powered SQL query generation using LLM
  - Streaming response support
  - Conversation history per user
  - Message persistence
  - New conversation functionality

- **Azure SQL Integration**
  - Connection pooling for D365 databases
  - Parameterized query execution
  - Error handling for SQL errors
  - Result formatting and display
  - Connection configuration UI

- **Query History**
  - Query execution tracking
  - Performance metrics (execution time)
  - Result caching in database
  - Search and filtering
  - Query re-execution

- **Excel Export**
  - Query result export to .xlsx format
  - Automatic file download
  - Proper column headers and formatting

- **Security & Access Control**
  - User authentication with JWT sessions
  - Security role management
  - User-to-role mappings
  - Protected tRPC procedures

- **Settings & Admin**
  - Azure SQL connection configuration
  - Security role CRUD operations
  - User role assignments

### Changed
- N/A (initial release)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Parameterized SQL queries to prevent injection
- JWT-based session management
- Environment variable-based credential storage

## Version History

- **0.3.0** - RAG system, UI/UX improvements, comprehensive documentation
- **0.2.0** - Azure AD authentication, connection testing, forward-looking permissions
- **0.1.0** - Initial release with core features

## Upgrade Guide

### From 0.2.0 to 0.3.0

1. **Install new dependencies**:
   ```bash
   pnpm install
   ```

2. **Push database schema changes**:
   ```bash
   pnpm db:push
   ```
   This adds the `knowledge_base_documents` and `knowledge_base_chunks` tables.

3. **No breaking changes** - All existing features remain compatible.

4. **New features available**:
   - Navigate to `/knowledge-base` to upload documents
   - Documents will be automatically processed and indexed
   - Chat queries will now include relevant document context

### From 0.1.0 to 0.2.0

1. **Install new dependencies**:
   ```bash
   pnpm install
   ```

2. **Push database schema changes**:
   ```bash
   pnpm db:push
   ```
   This adds `azure_ad_group_mappings` and `column_permissions` tables.

3. **Configure Azure AD (optional)**:
   - Set environment variables: `AZURE_AD_CLIENT_ID`, `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_SECRET`
   - Follow the setup guide in `docs/deployment/azure-ad-setup.md`

4. **Test database connection**:
   - Navigate to `/connection-test`
   - Enter Azure SQL credentials
   - Verify connection before proceeding

## Contributing

When adding new features or fixing bugs:

1. Update this CHANGELOG.md under the `[Unreleased]` section
2. Follow the format: `### Added/Changed/Fixed` with bullet points
3. Include relevant issue/PR numbers if applicable
4. Move items to a version section when releasing

## Links

- [GitHub Repository](https://github.com/your-org/d365-data-agent)
- [Documentation](./docs/)
- [Issue Tracker](https://github.com/your-org/d365-data-agent/issues)
