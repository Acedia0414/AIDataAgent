# AIDataAgent Implementation Plan

> **Instructions for Claude Code:** Read this file on startup. Find the first task marked `[ ]`. Implement it. Run tests. Mark it `[x]` and commit. Move to the next `[ ]` task. If you get stuck after 3 attempts, add a `[BLOCKED]` tag and move on.

---

## Phase 1: Knowledge Ingestion Service

### Task 1.1: Project Structure & Dependencies
- [ ] Install new dependencies: `neo4j-driver`, `@pinecone-database/pinecone` (or `pgvector`), `xml2js`, `axios`, `vitest`
- [ ] Create the following new directories under `server/`:
  - `server/knowledge/` — Knowledge Ingestion Service
  - `server/knowledge/parsers/` — X++ metadata parsers
  - `server/agents/` — Agent implementations
  - `server/reconciliation/` — Reconciliation Engine
  - `server/learning/` — Conversation Learning Pipeline
- [ ] Create a `server/knowledge/types.ts` file with TypeScript interfaces for parsed metadata (TableDef, FieldDef, RelationDef, ViewDef, EnumDef, DataEntityDef)

### Task 1.2: AxTable Parser
- [ ] Create `server/knowledge/parsers/axTableParser.ts`
- [ ] Parse `AxTable/*.xml` files from the local X++ source directory
- [ ] Extract: table name, label, fields (name, type, EDT, label), relations (related table, field mappings, cardinality)
- [ ] Write unit tests in `server/knowledge/parsers/__tests__/axTableParser.test.ts`
- [ ] Test against the sample X++ files in the local source directory

### Task 1.3: AxView Parser
- [ ] Create `server/knowledge/parsers/axViewParser.ts`
- [ ] Parse `AxView/*.xml` files
- [ ] Extract: view name, label, data sources (tables), joins (type, conditions), computed columns, filters
- [ ] Write unit tests

### Task 1.4: AxDataEntityView Parser
- [ ] Create `server/knowledge/parsers/axDataEntityParser.ts`
- [ ] Parse `AxDataEntityView/*.xml` files
- [ ] Extract: entity name, public name, fields (business-friendly name → underlying table.field mapping), data sources, staging table
- [ ] Write unit tests

### Task 1.5: AxEnum Parser
- [ ] Create `server/knowledge/parsers/axEnumParser.ts`
- [ ] Parse `AxEnum/*.xml` files
- [ ] Extract: enum name, label, values (integer → label mapping)
- [ ] Write unit tests

### Task 1.6: Layer 1 — Graph DB Population
- [ ] Create `server/knowledge/graphKB.ts`
- [ ] Define the Neo4j graph schema: nodes (Table, View, DataEntity, Field, Enum, EnumValue), relationships (HAS_FIELD, RELATES_TO, USES_ENUM, MAPS_TO, JOINS)
- [ ] Implement the ingestion pipeline: parsers → graph nodes + relationships
- [ ] Write integration tests that verify the graph is correctly populated from sample X++ files

### Task 1.7: Layer 2 — Vector DB Population
- [ ] Create `server/knowledge/vectorKB.ts`
- [ ] For each parsed metadata element (table, field, view, entity), create a text description by combining: name + label + help text + parent table name
- [ ] Generate embeddings using OpenAI `text-embedding-3-small`
- [ ] Store embeddings in pgvector (or Pinecone) with a link back to the graph node ID
- [ ] Implement a `semanticSearch(query: string, topK: number)` function
- [ ] Write tests

### Task 1.8: Layer 3 — Rules DB Schema
- [ ] Create `server/knowledge/rulesKB.ts`
- [ ] Define the schema for Layer 3 rules in the existing MySQL database:
  - `disambiguation_rules` table (term, options, default_resolution, customer_specific)
  - `reconciliation_rules` table (report_name, dp_class, filter_rules, notes)
  - `golden_queries` table (question_pattern, sql_query, dp_class_mapping, verified_at, confidence)
  - `terminology_mappings` table (user_term, d365_term, context, customer_specific)
- [ ] Implement CRUD operations for each table
- [ ] Write tests

### Task 1.9: D365 Glossary Ingestor
- [ ] Create `server/knowledge/glossaryIngestor.ts`
- [ ] Scrape or parse the D365 Business Process Glossary from Microsoft Learn
- [ ] For each term: generate an embedding and store in Layer 2 (Vector DB)
- [ ] For terms with D365-specific meanings that differ from generic ERP usage: create a terminology mapping rule in Layer 3
- [ ] Write tests

---

## Phase 2: Core Agent Architecture

### Task 2.1: Refactor SQL Generator into a Standalone Agent Tool
- [ ] Create `server/agents/sqlGeneratorAgent.ts`
- [ ] Refactor the existing `queryGenerator.ts` logic into a tool that:
  1. Receives a sub-task description (e.g., "Get all customers with overdue invoices > $10K")
  2. Queries Layer 2 (semantic search) to find relevant tables/fields
  3. Queries Layer 1 (graph traversal) to find join paths
  4. Checks Layer 3 (rules) for any disambiguation or correction rules
  5. Generates SQL using the LLM
  6. Returns the SQL query
- [ ] Write tests

### Task 2.2: Implement the Planner Agent
- [ ] Create `server/agents/plannerAgent.ts`
- [ ] The Planner receives a user question and produces a multi-step execution plan
- [ ] Each step in the plan specifies: the tool to use (sqlGenerator, dataAnalyzer, disambiguation), the input, and the expected output
- [ ] Use a Large LLM (GPT-4.1 / Claude Sonnet) for this agent
- [ ] Write tests with sample business questions

### Task 2.3: Implement the ReAct Agent Loop
- [ ] Create `server/agents/agentLoop.ts`
- [ ] Implement the core Reason-Act-Observe loop:
  1. Planner creates a plan
  2. For each step: execute the specified tool, observe the result
  3. If the result is unexpected or an error occurs: re-plan
  4. When all steps are complete: pass results to the Explanation Agent
- [ ] Implement a state manager that maintains context across steps
- [ ] Write tests

### Task 2.4: Implement the Data Analyzer Agent
- [ ] Create `server/agents/dataAnalyzerAgent.ts`
- [ ] This agent receives raw query results and:
  1. Identifies patterns (trends, outliers, correlations)
  2. Calculates derived metrics (percentages, averages, rankings)
  3. Draws conclusions relevant to the user's original question
- [ ] Use a Large LLM for this agent
- [ ] Write tests

### Task 2.5: Azure AD OAuth Client for Tier 2
- [ ] Create `server/auth/azureAdClient.ts`
- [ ] Implement OAuth 2.0 client credentials flow to acquire an access token for the D365 Tier 2 OData endpoints
- [ ] Handle token caching and automatic refresh
- [ ] Write tests (with mocked token endpoint)

---

## Phase 3: Reconciliation & Learning

### Task 3.1: OData Client for X++ Companion Plugin
- [ ] Create `server/reconciliation/odataClient.ts`
- [ ] Implement a client that calls the X++ Companion Plugin's OData actions on Tier 2
- [ ] Use the Azure AD OAuth token from Task 2.5
- [ ] Start with the `AIAgentCustAgingService.GetCustAgingReportData` action
- [ ] Write tests (with mocked OData endpoint)

### Task 3.2: Reconciliation Engine (Tiered Model)
- [ ] Create `server/reconciliation/reconciliationEngine.ts`
- [ ] Implement the three-tier reconciliation model:
  - **Tier 1 (Golden Query):** Check if the user's question matches a golden query in Layer 3. If yes, use it directly.
  - **Tier 2 (On-Demand):** Expose a "Verify" endpoint that calls the DP class and compares results.
  - **Tier 3 (Background):** After returning initial results, asynchronously call the DP class. If match, promote to golden query. If mismatch, flag for review.
- [ ] Implement result comparison logic (row count, total comparison, key metric comparison)
- [ ] Write tests

### Task 3.3: Conversation Learning Pipeline
- [ ] Create `server/learning/learningAgent.ts`
- [ ] Implement the Learning Agent that reviews conversation history and extracts:
  - Corrections (user said "that's wrong, it should be X")
  - Disambiguation resolutions (user confirmed "delivery date means packing slip date")
  - New terminology mappings (user used a term the system didn't know)
  - Successful query patterns (queries that the user confirmed as correct)
- [ ] Create `server/learning/approvalQueue.ts` — a simple file/DB-based queue for admin review
- [ ] Auto-approve low-risk items (terminology preferences, date interpretations)
- [ ] Queue high-risk items (reconciliation rules, new join patterns) for admin approval
- [ ] Write tests

---

## Phase 4: Advanced Reasoning & Polish

### Task 4.1: Disambiguation Agent
- [ ] Create `server/agents/disambiguationAgent.ts`
- [ ] When the Planner detects an ambiguous term (checked against Layer 3 disambiguation rules):
  1. Generate a clarification question with the specific options
  2. Present to the user
  3. Save the user's choice for future queries
- [ ] Write tests

### Task 4.2: Explanation Agent
- [ ] Create `server/agents/explanationAgent.ts`
- [ ] After the agent has completed all steps, generate a human-readable explanation:
  1. What data was retrieved and from which tables
  2. What analysis was performed
  3. Why certain results were selected (the reasoning)
  4. Confidence level and reconciliation status
- [ ] Use a Medium LLM (GPT-4.1-mini) for this agent
- [ ] Write tests

### Task 4.3: Golden Query Library — Initial Seed
- [ ] Create 10 pre-validated golden queries for common business questions:
  1. Customer aging report (AR aging by customer)
  2. Vendor aging report (AP aging by vendor)
  3. Top customers by revenue
  4. Overdue invoices list
  5. Open purchase orders by vendor
  6. Sales order backlog
  7. Inventory on-hand by item
  8. GL trial balance
  9. Budget vs. actual by department
  10. Customer payment history
- [ ] For each: write the SQL query, map to the corresponding DP class (if available), and verify

### Task 4.4: Rendering Layer
- [ ] Implement Excel export for query results (using `exceljs` or `xlsx`)
- [ ] Implement chart rendering options (bar, line, pie) using the existing client-side charting
- [ ] Allow users to save their preferred rendering format per query type
- [ ] Write tests
