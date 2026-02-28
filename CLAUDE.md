# D365 AI Data Agent — Claude Code Skill Package

## Project Overview

You are building an **ERP-Native Reasoning Engine** for Dynamics 365 Finance & Operations. This is a product (not a feature) that allows business users (CFOs, AP/AR clerks, procurement managers) to ask natural language questions about their D365 data and receive accurate, explained, and verified answers.

The product generates SQL queries against the D365 database, uses a three-layered Knowledge Base to understand the schema, and validates answers against D365's own report logic (DP classes) via a Reconciliation Engine.

## Architecture Summary

The system has these core components:

**Knowledge Ingestion Service** (`server/knowledge/`) — Parses X++ source code (XML files) to build the agent's understanding of the D365 database schema. Populates three layers:
- **Layer 1 (Graph DB / Neo4j):** Tables, fields, relations, views, data entities, enums as a knowledge graph
- **Layer 2 (Vector DB / pgvector):** Semantic embeddings of metadata for natural language search
- **Layer 3 (Rules DB / MySQL):** Disambiguation rules, reconciliation rules, golden queries, terminology mappings

**Agent Architecture** (`server/agents/`) — A multi-agent system using the ReAct (Reason-Act-Observe) pattern:
- **PlannerAgent:** Decomposes user questions into multi-step execution plans
- **SQLGeneratorAgent:** Generates SQL queries using KB context
- **DataAnalyzerAgent:** Analyzes query results for patterns and insights
- **DisambiguationAgent:** Asks clarification questions for ambiguous terms
- **ExplanationAgent:** Generates human-readable reasoning for results

**Reconciliation Engine** (`server/reconciliation/`) — Validates agent answers against D365 DP class output via the X++ Companion Plugin on Tier 2.

**Conversation Learning Pipeline** (`server/learning/`) — Extracts rules and corrections from user conversations to continuously improve the Knowledge Base.

## Development Environment

**Local Machine (where you run):**
- Node.js 22+, pnpm
- Local copy of X++ source files (the `PackagesLocalDirectory` folder)
- MCP servers: `sql-server` (pointing to Tier 2 Azure SQL) and `filesystem` (pointing to local X++ source)

**Tier 2 Environment (remote backend):**
- Azure SQL database (AxDB) — accessed via JIT credentials (refreshed every 8 hours)
- X++ Companion Plugin — accessed via OData with Azure AD OAuth

**Tier 1 Dev Box (not directly accessible):**
- Used only by the human developer to compile and deploy X++ code
- You will never connect to this directly

## Key Technical Skills

### Skill: Reading X++ Metadata XML Files

D365 stores all metadata as XML files in the `PackagesLocalDirectory` folder. The main models are `ApplicationCommon`, `ApplicationSuite`, and `ApplicationFoundation`.

**File locations:**
- Tables: `<Model>/AxTable/<TableName>.xml`
- Views: `<Model>/AxView/<ViewName>.xml`
- Data Entities: `<Model>/AxDataEntityView/<EntityName>.xml`
- Enums: `<Model>/AxEnum/<EnumName>.xml`
- EDT (Extended Data Types): `<Model>/AxEdt/<EdtName>.xml`
- Classes: `<Model>/AxClass/<ClassName>.xpp`

**Example: Parsing a table definition**
```typescript
import { parseStringPromise } from 'xml2js';
import fs from 'fs/promises';

async function parseAxTable(filePath: string) {
  const xml = await fs.readFile(filePath, 'utf-8');
  const result = await parseStringPromise(xml);
  const table = result.AxTable;
  
  return {
    name: table.Name[0],
    label: table.Label?.[0] || '',
    fields: table.Fields?.[0]?.AxTableField?.map(f => ({
      name: f.Name[0],
      type: f.$?.['i:type'] || 'unknown',
      label: f.Label?.[0] || '',
      edt: f.ExtendedDataType?.[0] || null,
    })) || [],
    relations: table.Relations?.[0]?.AxTableRelation?.map(r => ({
      name: r.Name[0],
      relatedTable: r.RelatedTable[0],
      constraints: r.Constraints?.[0]?.AxTableRelationConstraint?.map(c => ({
        field: c.Field?.[0],
        relatedField: c.RelatedField?.[0],
      })) || [],
    })) || [],
  };
}
```

### Skill: Querying the Tier 2 Azure SQL Database

The D365 database uses specific conventions:
- All D365 tables have a `RECID` column (bigint primary key)
- All D365 tables have a `DATAAREAID` column (company/legal entity identifier) — **always filter by this**
- All D365 tables have a `PARTITION` column — **always filter by this** (usually = 1)
- Enum fields store integer values, not labels — use the enum parser output to translate
- Date fields are stored as `datetime` — D365 uses `1900-01-01` as the "null date"
- Amount fields may be in different currencies — check for `CurrencyCode` fields

**Important D365 SQL conventions:**
```sql
-- Always include DATAAREAID and PARTITION filters
SELECT * FROM CUSTTABLE WHERE DATAAREAID = 'usmf' AND PARTITION = 5637144576

-- Null dates in D365
WHERE DUEDATE != '1900-01-01 00:00:00.000'

-- Enum values are integers — translate using the enum parser
-- Example: CustTrans.Approved = 1 means "Yes"
```

### Skill: Calling the X++ Companion Plugin via OData

The X++ Companion Plugin exposes DP classes as OData actions on the Tier 2 environment.

**Authentication:** Azure AD OAuth 2.0 Client Credentials flow.

```typescript
import axios from 'axios';

async function getAzureAdToken(tenantId: string, clientId: string, clientSecret: string, resource: string) {
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      resource: resource,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data.access_token;
}

async function callDPClass(d365Url: string, token: string, serviceName: string, params: any) {
  const response = await axios.post(
    `${d365Url}/api/services/AIAgentServiceGroup/${serviceName}`,
    params,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return response.data;
}
```

### Skill: Working with the Knowledge Base Layers

**Layer 1 (Neo4j) — Graph queries:**
```typescript
// Find all fields of a table
const result = await session.run(
  'MATCH (t:Table {name: $tableName})-[:HAS_FIELD]->(f:Field) RETURN f',
  { tableName: 'CustTable' }
);

// Find join path between two tables
const result = await session.run(
  'MATCH path = shortestPath((a:Table {name: $from})-[:RELATES_TO*]-(b:Table {name: $to})) RETURN path',
  { from: 'CustTable', to: 'SalesTable' }
);
```

**Layer 2 (Vector DB) — Semantic search:**
```typescript
// Find tables/fields relevant to a natural language query
const results = await vectorKB.semanticSearch("overdue customer invoices", 10);
// Returns: [{name: "CustTransOpen", score: 0.92}, {name: "CustTrans.DueDate", score: 0.88}, ...]
```

**Layer 3 (MySQL) — Rules lookup:**
```typescript
// Check for disambiguation rules
const rules = await rulesKB.getDisambiguationRules("delivery date");
// Returns: {term: "delivery date", options: ["Confirmed date", "Receipt date", "Packing slip date"], default: null}

// Check for golden queries
const golden = await rulesKB.findGoldenQuery("customer aging report");
// Returns: {sql: "SELECT ...", dpClass: "CustAgingReportDP", verified: true}
```

## Coding Standards

- **Language:** TypeScript (strict mode)
- **Testing:** vitest — every new file must have corresponding tests
- **Style:** Follow the existing project patterns in `server/`
- **Imports:** Use ES module imports (`import`), not CommonJS (`require`)
- **Error handling:** Always use try/catch with meaningful error messages
- **Logging:** Use `console.log` with `[ComponentName]` prefix for debugging
- **Environment variables:** Use the existing `server/_core/env.ts` pattern for new config values

## Task Execution Protocol

1. Read `TASKS.md` and find the first task marked `[ ]`
2. Read any relevant existing code files before making changes
3. Implement the task
4. Write unit tests
5. Run `pnpm test` — all tests must pass
6. Mark the task as `[x]` in `TASKS.md`
7. Commit with message: `feat: [Task X.Y] <brief description>`
8. Move to the next `[ ]` task
9. If stuck after 3 attempts, mark as `[BLOCKED]` with a reason and move on

## D365 Domain Knowledge

**Key D365 F&O Tables (most commonly queried):**

| Business Area | Key Tables | What They Store |
| :--- | :--- | :--- |
| Accounts Receivable | CustTable, CustTrans, CustTransOpen, CustSettlement, CustInvoiceJour, CustInvoiceTrans | Customer master, transactions, open balances, settlements, invoices |
| Accounts Payable | VendTable, VendTrans, VendTransOpen, VendSettlement, VendInvoiceJour, VendInvoiceTrans | Vendor master, transactions, open balances, settlements, invoices |
| Sales | SalesTable, SalesLine, SalesOrderHeader, CustPackingSlipJour, CustPackingSlipTrans | Sales orders, lines, packing slips |
| Purchasing | PurchTable, PurchLine, VendPackingSlipJour, VendPackingSlipTrans | Purchase orders, lines, product receipts |
| Inventory | InventTable, InventDim, InventTrans, InventSum, InventOnhand | Items, dimensions, transactions, on-hand |
| General Ledger | GeneralJournalEntry, GeneralJournalAccountEntry, LedgerJournalTable, LedgerJournalTrans, MainAccount | Journal entries, account entries, chart of accounts |
| Party/Address | DirPartyTable, LogisticsPostalAddress, LogisticsElectronicAddress | Names, addresses, contact info for all parties |

**Common D365 Gotchas:**
- `CustTable.AccountNum` is the customer ID, NOT the customer name. The name is in `DirPartyTable.Name` (joined via `CustTable.Party = DirPartyTable.RecId`).
- `CustTransOpen` contains ONLY open (unsettled) transactions. For all transactions, use `CustTrans`.
- Financial dimensions are stored in a separate `DimensionAttributeValueCombination` table, joined via `LedgerDimension` fields.
- Amounts in `CustTrans`/`VendTrans` are in the **transaction currency**. For accounting currency amounts, use `AmountMST`.
- The `TransDate` field is the posting date, not the document date.
