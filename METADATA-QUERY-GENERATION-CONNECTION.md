# Understanding the Metadata ↔ Query Generation Connection

**Purpose:** Understand WHY metadata is critical and HOW it flows through the system
**Audience:** Technical team members implementing metadata integration

---

## The Problem You're Solving

User asks: **"Show me customer balances for Q1"**

The system needs to translate this into SQL like:
```sql
SELECT
  CustTable.AccountNum,
  CustTable.Name,
  SUM(CustTrans.AmountMST) AS Balance
FROM CustTable
JOIN CustTrans ON CustTable.AccountNum = CustTrans.AccountNum
WHERE YEAR(CustTrans.TransDate) = 2024
  AND MONTH(CustTrans.TransDate) <= 3
  AND CustTable.DataAreaId = '001'
GROUP BY CustTable.AccountNum, CustTable.Name;
```

**But the LLM doesn't know:**
- ❓ What is "customer"? (CustTable? Customer entity?)
- ❓ What field is "balance"? (AmountMST? Amount? CustTrans?)
- ❓ What is "Q1"? (Months 1-3? Date range? Fiscal period?)
- ❓ How do I join CustTable to transactions? (CustTrans? On which fields?)

**This is where metadata comes in.** It tells the LLM:
- ✅ CustTable = Customer master table with AccountNum as primary key
- ✅ CustTrans = Customer transaction table with AmountMST = balance amount
- ✅ They join via AccountNum
- ✅ TransDate field contains transaction dates

---

## The Data Flow

### Step 1: User Asks Question

```
User: "Show me customer balances for Q1"
  ↓
[System receives natural language question]
```

### Step 2: Find Relevant Metadata (Where RAG Helps)

**WITHOUT RAG (Current - loads everything):**
```
Question: "Show me customer balances for Q1"
  ↓
db.getMetadataTables()
  ↓
[11,000 tables returned]
  ↓
Build context with ALL 11k tables
  ↓
Send to LLM: "Here are ALL D365 tables and fields..."
  ↓
LLM tries to find needle in haystack ❌
```

**WITH RAG (Recommended):**
```
Question: "Show me customer balances for Q1"
  ↓
RAG Search: "Find relevant tables"
  ↓
[Returns: CustTable, CustTrans, LedgerJournalTrans, ...]
  ↓
Build context with ONLY 50 relevant tables
  ↓
Send to LLM: "Here are the customer-related tables..."
  ↓
LLM focuses and generates correct SQL ✅
```

### Step 3: Extract Metadata Details

```
For each relevant table (e.g., CustTable):
  ├─ Table name: CustTable
  ├─ Description: "Customer master table"
  ├─ Fields:
  │   ├─ AccountNum (String, PrimaryKey)
  │   ├─ Name (String)
  │   ├─ Balance (Real)
  │   ├─ CreditLimit (Real)
  │   └─ ... [50+ other fields]
  └─ Relationships:
      ├─ CustTable → CustTrans (via AccountNum)
      ├─ CustTable → CustGroup (via CustGroupId)
      └─ ... [other relationships]
```

### Step 4: Build LLM Prompt with Metadata Context

```typescript
// What the LLM receives:

"You are a D365 F&O SQL expert. Generate a SQL query to:
'Show me customer balances for Q1'

Here is the D365 database schema:

## Table: CustTable
Description: Customer master table containing all customer information
Fields:
  - AccountNum (String) [PRIMARY KEY]
  - Name (String)
  - Balance (Real) - Customer balance
  - CreditLimit (Real) - Credit limit

Relationships:
  - CustTable.AccountNum → CustTrans.AccountNum (One-to-Many)

## Table: CustTrans
Description: Customer transaction table containing all transactions
Fields:
  - TransId (Integer) [PRIMARY KEY]
  - AccountNum (String) [FOREIGN KEY → CustTable]
  - TransDate (DateTime)
  - AmountMST (Real) - Amount in accounting currency

Relationships:
  - CustTrans.AccountNum → CustTable.AccountNum (Many-to-One)

[Only relevant tables shown, not all 11,000]

Generate the SQL query now:"
```

### Step 5: LLM Generates SQL

```sql
WITH Q1_DATES AS (
  SELECT
    DATEFROMPARTS(YEAR(GETDATE()), 1, 1) AS StartDate,
    DATEFROMPARTS(YEAR(GETDATE()), 3, 31) AS EndDate
)
SELECT
  c.AccountNum,
  c.Name,
  SUM(t.AmountMST) AS Balance
FROM CustTable c
INNER JOIN CustTrans t ON c.AccountNum = t.AccountNum
CROSS JOIN Q1_DATES
WHERE t.TransDate BETWEEN Q1_DATES.StartDate AND Q1_DATES.EndDate
  AND c.DataAreaId = '001'
GROUP BY c.AccountNum, c.Name
ORDER BY c.Name;
```

### Step 6: Review & Execute

```
[System shows human-readable explanation]
[User reviews and approves]
[SQL is executed against D365 database]
[Results returned to user]
```

---

## How Metadata Gets Into the System

### The Import Pipeline

```
D365 XML Files (11,000 files)
  ↓
Each file: <AxTable>
  <Name>CustTable</Name>
  <Fields>...</Fields>
  <Relations>...</Relations>
  <SourceCode>...</SourceCode>
</AxTable>
  ↓
uploadBulk Endpoint
  ├─ Parse each XML file
  ├─ Extract table/field/relationship info
  ├─ Insert into metadata_tables DB
  ├─ Insert into metadata_fields DB
  ├─ Insert into table_relationships DB
  └─ Extract method code for relationship inference
  ↓
Database Tables:
  ├─ metadata_tables: [11,000 rows] (table names, descriptions)
  ├─ metadata_fields: [550,000+ rows] (all fields, types, descriptions)
  ├─ table_relationships: [50,000+ rows] (foreign keys, joins)
  └─ method_code: [100,000+ rows] (X++ methods for analysis)
  ↓
Metadata is now READY for query generation
```

### The Metadata Storage Schema

```sql
-- metadata_tables (one row per table)
CREATE TABLE metadata_tables (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tableName VARCHAR(255) UNIQUE,        -- e.g., "CustTable"
  description TEXT,                     -- e.g., "Customer master table"
  businessPurpose TEXT,                 -- Why this table exists
  codeLayerInfo VARCHAR(255),            -- Layer: API, OData, etc.
  createdAt TIMESTAMP DEFAULT NOW()
);

-- metadata_fields (many rows per table)
CREATE TABLE metadata_fields (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tableId INT FOREIGN KEY,              -- Links to metadata_tables
  fieldName VARCHAR(255),               -- e.g., "AccountNum"
  fieldType VARCHAR(100),               -- e.g., "String", "Real"
  description TEXT,                     -- e.g., "Customer account number"
  businessMeaning VARCHAR(255),         -- Extended Data Type
  isPrimaryKey BOOLEAN,                 -- Is this a primary key?
  isForeignKey BOOLEAN,                 -- Is this a foreign key?
  referencedTable VARCHAR(255),         -- If FK, what table does it reference?
  createdAt TIMESTAMP DEFAULT NOW()
);

-- table_relationships (foreign keys, joins)
CREATE TABLE table_relationships (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sourceTableId INT FOREIGN KEY,        -- From table
  relationName VARCHAR(255),            -- e.g., "CustTrans"
  relatedTable VARCHAR(255),            -- To table
  sourceField VARCHAR(255),             -- From field
  relatedField VARCHAR(255),            -- To field
  cardinality VARCHAR(50),              -- "OneToMany", "OneToOne"
  isInferred BOOLEAN,                   -- Was this inferred from method analysis?
  createdAt TIMESTAMP DEFAULT NOW()
);
```

---

## The RAG Layer (The Solution)

### Current Problem: Token Bloat

```
All 11k Tables in Prompt:
┌────────────────────────────────────┐
│ # D365 Database Schema             │
│                                    │
│ ## Table: ActualLedgerEntryEntity  │
│ Fields: TransactionId, Amount...  │
│                                    │
│ ## Table: AgreementHeaderV2        │
│ Fields: AgreementNumber, Status... │
│                                    │
│ ## Table: AllowanceChargeHeader    │
│ Fields: ChargeId, Amount...        │
│                                    │
│ ... [11,000 more tables] ...       │
│                                    │
│ ## Table: VendorFinancialMetrics   │
│ Fields: VendorId, Balance...       │
└────────────────────────────────────┘

Total Tokens: 200,000+
Cost: $10-30 per query ❌
LLM confusion: High ❌
```

### RAG Solution: Semantic Filtering

```
Question: "Show me customer balances"
  ↓
["Show", "me", "customer", "balances"]
  ↓ (Convert to vector embedding)
[0.21, 0.45, 0.89, 0.12, 0.78, ...]
  ↓ (Vector search: find similar tables)
Compare against all table embeddings:
  - CustTable embedding: [0.20, 0.46, 0.88, ...] → Similarity: 0.99 ✅
  - CustTrans embedding: [0.22, 0.44, 0.87, ...] → Similarity: 0.98 ✅
  - ActualLedgerEntry: [0.01, 0.05, 0.02, ...] → Similarity: 0.15 ❌
  - AgreementHeader: [0.03, 0.08, 0.10, ...] → Similarity: 0.12 ❌
  ↓
Returns Top 50 Relevant Tables:
  [CustTable, CustTrans, CustGroup, CustInvoiceJour, ...]
  ↓
Only send THESE 50 tables to LLM:

┌──────────────────────────────┐
│ # Customer-Related Tables    │
│                              │
│ ## Table: CustTable          │
│ Fields: AccountNum, Name...  │
│                              │
│ ## Table: CustTrans          │
│ Fields: TransId, Amount...   │
│                              │
│ ## Table: CustGroup          │
│ Fields: GroupId, Name...     │
│                              │
│ ... [47 more relevant tables]│
└──────────────────────────────┘

Total Tokens: 2,000-4,000 ✅
Cost: $0.30-0.60 per query ✅
LLM focus: High ✅
```

---

## How RAG Works (Technical Deep Dive)

### Step 1: Embedding Metadata (One-Time)

```typescript
// For EACH table in metadata_tables:

Table: CustTable
Description: Customer master table
Fields: AccountNum, Name, Balance, CreditLimit, ...

↓ (Convert to text)

"D365 Table: CustTable
 Description: Customer master table containing all customer information
 Fields: AccountNum, Name, Balance, CreditLimit"

↓ (Embedding Model - OpenAI, Ollama, HuggingFace)

Vector: [0.234, 0.891, 0.123, 0.456, 0.789, ...]
        (768 dimensions, numerical representation of the text meaning)

↓ (Store in Vector Database)

metadata_tables.id = 1
metadata_tables.tableName = "CustTable"
vector_store.id = "metadata_1"
vector_store.vector = [0.234, 0.891, ...]
```

### Step 2: Search at Query Time

```typescript
Question: "Show customer balances"

↓ (Embedding Model - SAME model as above)

Vector: [0.245, 0.885, 0.135, 0.450, 0.795, ...]

↓ (Vector Similarity Search)

Distance to CustTable: 0.01 (VERY similar) → Include ✅
Distance to CustTrans: 0.03 (similar) → Include ✅
Distance to ActualLedger: 0.89 (not similar) → Skip ❌

↓ (Return Top 50 by similarity)

Results: [
  { tableId: 1, tableName: "CustTable", similarity: 0.99 },
  { tableId: 2, tableName: "CustTrans", similarity: 0.98 },
  { tableId: 3, tableName: "CustGroup", similarity: 0.95 },
  ...
]

↓ (Fetch full metadata for these 50 from database)

[Complete field lists, relationships for only these 50 tables]

↓ (Send to LLM)
```

### Step 3: LLM Uses Smart Context

```
Instead of: "Here are all 11,000 tables..."
LLM receives: "Here are the 50 customer-related tables..."

Result: Focused, accurate SQL generation
```

---

## Expected Improvements

### Before RAG

```
User Query: "Customer balances"
  ↓
LLM receives: All 11,000 tables
  ↓
LLM generates SQL:
  ✅ Correct 70% of time
  ❌ Wrong 30% of time (picked wrong table)

Cost: $15-30 per query
Speed: 30-60 seconds
Accuracy: Medium
```

### After RAG

```
User Query: "Customer balances"
  ↓
RAG finds: 50 relevant tables
  ↓
LLM generates SQL:
  ✅ Correct 95%+ of time
  ❌ Wrong < 5% of time

Cost: $0.30-0.60 per query (50x cheaper!)
Speed: 5-10 seconds (5-10x faster!)
Accuracy: High (much better!)
```

---

## The Complete System Flow (Summary)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIALIZATION (Week 1-2)                                │
│                                                              │
│ 11k XML files → uploadBulk → Database                       │
│                                                              │
│ All metadata stored in:                                     │
│  - metadata_tables (11,000 rows)                            │
│  - metadata_fields (550,000+ rows)                          │
│  - table_relationships (50,000+ rows)                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RAG SETUP (Week 2)                                       │
│                                                              │
│ For each metadata table:                                    │
│  - Create embedding text                                   │
│  - Convert to vector (768 dimensions)                      │
│  - Store in vector database                                │
│                                                              │
│ Result: 11,000 vectors indexed, searchable ✅              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. QUERY TIME (Every user query)                            │
│                                                              │
│ User: "Show customer balances"                             │
│   ↓                                                         │
│ RAG Search: Find top 50 similar tables (< 1 sec)           │
│   ↓                                                         │
│ Fetch Details: Get field lists from database               │
│   ↓                                                         │
│ Build Context: Send to LLM with only relevant metadata     │
│   ↓                                                         │
│ LLM Generates: Correct SQL (95%+ accuracy)                 │
│   ↓                                                         │
│ Execute & Return: Results to user                          │
│                                                              │
│ Cost: $0.30-0.60 ✅                                         │
│ Speed: 5-10 seconds ✅                                     │
│ Accuracy: 95%+ ✅                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Metadata is Essential** - Without it, LLM can't generate correct SQL
2. **11k Tables is Too Much** - Sending all to LLM is expensive and inaccurate
3. **RAG is the Solution** - Smart filtering of metadata makes system work
4. **Import First, Optimize Second** - Bulk import all metadata, then add RAG
5. **Graceful Degradation** - If RAG fails, fallback to all metadata (slower but works)

---

## Questions to Validate Understanding

1. **Q:** Why can't we just send all 11k tables to the LLM?
   **A:** Exceeds token limits, costs $30/query, LLM gets confused with irrelevant data

2. **Q:** How does RAG know which tables are relevant?
   **A:** Converts both question and tables to vectors, finds similarity mathematically

3. **Q:** What if a table doesn't have a good description?
   **A:** RAG still works using field names and relationships; can improve descriptions later

4. **Q:** How long does RAG setup take?
   **A:** Embedding 11k tables takes 5-30 minutes one-time

5. **Q:** What if RAG search is wrong?
   **A:** System falls back to using all metadata (slower but still works)

---

## Next Actions

1. **Understand this flow** - Digest the metadata ↔ query generation connection
2. **Review existing code** - Study uploadBulk, queryGenerator, RAGOrchestrator
3. **Start with import** - Test uploadBulk with small batch this week
4. **Plan RAG phase** - Schedule embedding and integration for Week 2-3

This understanding will guide your implementation. The code examples in CODE-IMPLEMENTATION-EXAMPLES.md will show you exactly what to build.

