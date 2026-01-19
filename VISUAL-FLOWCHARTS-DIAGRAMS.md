# Visual Flowcharts & Diagrams

**Quick visual references for understanding the metadata integration system**

---

## 1. The Three Approaches (Simple Comparison)

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPROACH COMPARISON                           │
└─────────────────────────────────────────────────────────────────┘

APPROACH 1: BULK IMPORT ONLY
═════════════════════════════════════════════════════════════════════

   XML Files (11k)
        │
        ├─→ uploadBulk()
        │
        └─→ Database (all 11k in metadata_tables)
                │
                ├─→ Query Generation
                │      │
                │      └─→ Load ALL 11k tables
                │             │
                │             └─→ Build huge context (200k tokens)
                │                    │
                │                    └─→ LLM (confused, slow, expensive)
                │
                └─→ Cost: $30-90/query ❌
                    Speed: 30-60s ❌
                    Accuracy: 70% ❌


APPROACH 2: RAG ONLY
═════════════════════════════════════════════════════════════════════

   XML Files (11k)
        │
        ├─→ uploadBulk() + Embedding Pipeline
        │
        ├─→ Database (all 11k in metadata_tables)
        │
        └─→ Vector Database (11k embeddings)
                │
                ├─→ Query Generation
                │      │
                │      └─→ RAG Search (find top 50)
                │             │
                │             └─→ Load only relevant 50 tables
                │                    │
                │                    └─→ Build smart context (2-4k tokens)
                │                           │
                │                           └─→ LLM (focused, fast, cheap)
                │
                └─→ Cost: $0.30-0.60/query ✅
                    Speed: 5-10s ✅
                    Accuracy: 95%+ ✅
                    Risk: No fallback if RAG fails ❌


APPROACH 3: HYBRID (RECOMMENDED) ⭐
═════════════════════════════════════════════════════════════════════

   XML Files (11k)
        │
        ├─→ uploadBulk()
        │
        ├─→ Database (all 11k in metadata_tables) ← Fallback
        │
        ├─→ Vector DB (11k embeddings) ← Primary
        │
        └─→ Query Generation
               │
               ├─→ Try RAG Search first (find top 50)
               │      │
               │      ├─→ Success: Load those 50 tables
               │      │             │
               │      │             └─→ LLM (efficient)
               │      │
               │      └─→ Fail: Use all tables from DB
               │
               └─→ Cost: $0.30-0.60/query ✅
                   Speed: 5-10s ✅
                   Accuracy: 95%+ ✅
                   Fallback: If RAG fails, still works ✅
                   Risk: Very low (graceful degradation) ✅
```

---

## 2. The Token Budget Problem & Solution

```
WITHOUT RAG (All Tables Approach)
═════════════════════════════════════════════════════════════════════

User: "Show customer balance"
  │
  ├─→ System loads metadata:
  │     ├─ 11,000 tables
  │     ├─ 550,000 fields (avg 50 per table)
  │     └─ 50,000+ relationships
  │
  ├─→ Build context string (5500 KB):
  │     "Table: ActualLedgerEntry
  │      Fields: TransactionId, Amount, ...
  │
  │      Table: AgreementHeader
  │      Fields: AgreementNumber, Status, ...
  │
  │      ... [repeat 11,000 times] ..."
  │
  ├─→ Send to LLM: 200,000+ tokens
  │
  ├─→ Cost: $10-30 per query ❌
  │
  ├─→ LLM Response: "Here's what I found..."
  │    (But very confused due to data overload)
  │
  └─→ Result Quality: 70% accurate (many wrong guesses)


WITH RAG (Smart Filtering Approach)
═════════════════════════════════════════════════════════════════════

User: "Show customer balance"
  │
  ├─→ System converts question to vector [0.21, 0.45, 0.89, ...]
  │
  ├─→ RAG Search compares against 11,000 table vectors:
  │     ├─ CustTable: similarity 0.99 ✅ INCLUDE
  │     ├─ CustTrans: similarity 0.98 ✅ INCLUDE
  │     ├─ CustGroup: similarity 0.95 ✅ INCLUDE
  │     ├─ ActualLedger: similarity 0.15 ❌ SKIP
  │     ├─ AgreementHeader: similarity 0.12 ❌ SKIP
  │     └─ ... [returns top 50 relevant] ✅
  │
  ├─→ Build focused context (150 KB):
  │     "Table: CustTable
  │      Fields: AccountNum, Name, Balance, ...
  │
  │      Table: CustTrans
  │      Fields: TransId, AccountNum, AmountMST, ...
  │
  │      [Only 50 relevant tables]"
  │
  ├─→ Send to LLM: 2,000-4,000 tokens
  │
  ├─→ Cost: $0.30-0.60 per query ✅
  │
  ├─→ LLM Response: "Based on the customer tables..."
  │    (Crystal clear, focused, confident)
  │
  └─→ Result Quality: 95%+ accurate (correct first time)


SAVINGS COMPARISON
═════════════════════════════════════════════════════════════════════

                    Without RAG    With RAG     Improvement
─────────────────────────────────────────────────────────────
Tokens/Query        200,000        2,500-4,000  50-80x less
Cost/Query          $10-30         $0.30-0.60   50-100x cheaper
Time/Query          30-60s         5-10s        5-10x faster
Accuracy            70%            95%+         25% improvement

Annual Savings (1000 queries):
  Without RAG: $10,000-30,000 spent
  With RAG:    $300-600 spent
  SAVINGS:     $9,700-29,700 per year 💰
```

---

## 3. Complete Data Flow (Week 1-3)

```
WEEK 1: BULK IMPORT
═════════════════════════════════════════════════════════════════════

11,000 D365 XML Files
│
└─→ uploadBulk() Endpoint
    │
    ├─→ Parse each XML
    │    ├─ Table: CustTable
    │    ├─ Fields: [50+ fields]
    │    └─ Relationships: [5+ rels]
    │
    ├─→ Insert into Database
    │    ├─ metadata_tables ← 11,000 rows
    │    ├─ metadata_fields ← 550,000+ rows
    │    ├─ table_relationships ← 50,000+ rows
    │    └─ method_code ← 100,000+ rows
    │
    └─→ ✅ WEEK 1 COMPLETE
        All metadata in database
        Ready for RAG setup


WEEK 2: RAG INFRASTRUCTURE
═════════════════════════════════════════════════════════════════════

Database (metadata_tables)
│
└─→ indexAllMetadataForRAG()
    │
    ├─→ Loop through 11,000 tables
    │
    ├─→ For each table:
    │    │
    │    ├─ Create text: "CustTable: Customer master..."
    │    │
    │    ├─ Convert to embedding via model
    │    │  [0.234, 0.891, 0.123, ..., 0.456]  (768 dimensions)
    │    │
    │    └─ Store in Vector Database
    │       └─ Vector ID: metadata_1
    │          Table Name: CustTable
    │          Similarity searchable: ✅
    │
    └─→ ✅ WEEK 2 COMPLETE
        11,000 vectors indexed
        Ready for semantic search


WEEK 3: QUERY GENERATION INTEGRATION
═════════════════════════════════════════════════════════════════════

User: "Show customer balance"
│
└─→ queryGenerator.ts
    │
    ├─→ Convert question to vector (same embedding model)
    │   [0.245, 0.885, 0.135, ..., 0.450]
    │
    ├─→ findRelevantMetadataTables()
    │   │
    │   ├─→ Search Vector Database
    │   │   Compare vectors, find top 50 most similar
    │   │   └─ CustTable: 0.99 ✅
    │   │   └─ CustTrans: 0.98 ✅
    │   │   └─ ... (48 more)
    │   │
    │   └─→ Return table IDs [1, 2, 3, ..., 50]
    │
    ├─→ Fetch metadata from Database
    │   │
    │   └─ db.getMetadataTablesByIds([1, 2, ..., 50])
    │      └─ Returns: {tableName, fields, relationships}
    │
    ├─→ Build LLM Prompt (2-4k tokens)
    │   │
    │   ├─ Include only relevant tables
    │   ├─ Include all fields for those tables
    │   └─ Include relationships between them
    │
    ├─→ Call LLM with Smart Context
    │   │
    │   └─ "Here are 50 relevant customer tables..."
    │      └─ LLM generates accurate SQL ✅
    │
    └─→ ✅ WEEK 3 COMPLETE
        Query generation using RAG
        Cost: $0.30-0.60/query ✅
        Speed: 5-10 seconds ✅
        Accuracy: 95%+ ✅


POST-IMPLEMENTATION: PRODUCTION
═════════════════════════════════════════════════════════════════════

User Query
│
├─→ RAG Search (primary path)
│   │
│   ├─→ Vector similarity search
│   │
│   ├─→ Find top 50 relevant tables
│   │
│   └─→ Cost: $0.30-0.60/query ✅
│
└─→ Fallback Path (if RAG unavailable)
    │
    ├─→ Load all metadata from DB
    │
    ├─→ Generate with less optimization
    │
    └─→ Cost: $10-30/query (slower but works)
```

---

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE (React)                       │
│  ┌──────────────────┬──────────────────┬──────────────────────┐ │
│  │   Chat Widget    │  Metadata Viewer │  Settings & Config   │ │
│  └──────────────────┴──────────────────┴──────────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    tRPC (Type-safe API)
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                         BACKEND (Node.js)                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Query Generation Pipeline                         │  │
│  │                                                            │  │
│  │  1. queryGenerator.ts                                     │  │
│  │     ├─ Call RAG: findRelevantMetadataTables()            │  │
│  │     ├─ Load relevant table metadata                      │  │
│  │     ├─ Build LLM context                                │  │
│  │     └─ Generate SQL                                      │  │
│  │                                                            │  │
│  │  2. intentClassifier.ts                                  │  │
│  │     └─ Classify user intent (query/modify/system)       │  │
│  │                                                            │  │
│  │  3. queryPipeline.ts                                     │  │
│  │     ├─ Generate reviews (technical + layman)             │  │
│  │     └─ Validate SQL before execution                    │  │
│  │                                                            │  │
│  │  4. queryExecutor.ts                                     │  │
│  │     └─ Execute against D365 database                    │  │
│  │                                                            │  │
│  │  5. resultInsightsGenerator.ts                           │  │
│  │     └─ Format results                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Data Retrieval Layer                              │  │
│  │                                                            │  │
│  │  knowledge-base-adapter.ts                               │  │
│  │  ├─ findRelevantMetadataTables() ← RAG SEARCH            │  │
│  │  └─ Returns: [tableId, tableName, relevance]             │  │
│  │                                                            │  │
│  │  db.ts                                                    │  │
│  │  ├─ getMetadataTablesByIds() ← FETCH FROM DB             │  │
│  │  ├─ getMetadataFieldsByTableId()                        │  │
│  │  └─ getRelationshipsByTableId()                         │  │
│  │                                                            │  │
│  │  metadata-rag-indexer.ts                                 │  │
│  │  └─ indexAllMetadataForRAG() ← ONE-TIME SETUP            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         LLM Integration                                   │  │
│  │                                                            │  │
│  │  rag/RAGOrchestrator.ts                                  │  │
│  │  ├─ Search vectors                                       │  │
│  │  ├─ Embed text                                           │  │
│  │  └─ Vector similarity matching                           │  │
│  │                                                            │  │
│  │  _core/llm.ts                                            │  │
│  │  └─ Call LLM with context                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
     ┌─────────┐           ┌──────────┐         ┌────────────┐
     │  MySQL  │           │  Vector  │         │   D365     │
     │Database │           │Database  │         │  Database  │
     │(Metadata│           │(Chroma/  │         │ (SQL Serv) │
     │ Tables) │           │Pinecone) │         │            │
     └─────────┘           └──────────┘         └────────────┘
     11k tables             11k vectors         Live data
     550k fields            searchable          (queries run
     50k rels              in < 1 sec           here)
```

---

## 5. Cost Comparison Over Time

```
Monthly Cost Projection (Based on 100 queries/month)

Month 1-3: BEFORE RAG Implementation
═════════════════════════════════════════════════════════════════════

Monthly Cost: 100 queries × $30/query = $3,000/month

$3,500 ├─────────────────────────
       │                      │
$3,000 ├──────────────────────┼── EXPENSIVE ❌
       │   $3,000 ┌──────────┐│
$2,500 ├──────────┤          ││
       │          │          ││
$2,000 ├──────────┤          ││
       │          │          ││
$1,500 ├──────────┤          ││
       │          │          ││
$1,000 ├──────────┤          ││
       │          │          ││
  $500 ├──────────┤          ││
       │          │          ││
    $0 └──────────┴──────────┴┘
       Month 1  Month 2  Month 3


Month 4-6: AFTER RAG Implementation
═════════════════════════════════════════════════════════════════════

Monthly Cost: 100 queries × $0.30/query = $30/month

$3,500 ├─────────────────────────
       │   $3,000
$3,000 ├──────┐
       │      │ BEFORE (expensive)
$2,500 ├──────┤
       │      │
$2,000 ├──────┤         RAG
       │      │      Implementation
$1,500 ├──────┤         Cost: $500
       │      │      (one-time)
$1,000 ├──────┤           ┌──┐
       │      │           │  │
  $500 ├──────┤      $30  │  │
       │      │     ┌──┐  │  │
    $0 └──────┴─────┘  └──┘  └─ CHEAP ✅
       M1-M3  M4   M5-M6


6-Month Comparison
═════════════════════════════════════════════════════════════════════

WITHOUT RAG:
  6 months × $3,000/month = $18,000 ❌

WITH RAG:
  Implementation cost: $500 (one-time)
  Months 1-3: $3,000/month (before switch)
  Months 4-6: $30/month (after switch)
  Total: $500 + $9,000 + $60 = $9,560 ✅

SAVINGS: $8,440 in just 6 months! 💰


Annual Projection (1000 queries/year)
═════════════════════════════════════════════════════════════════════

WITHOUT RAG:
  Year 1: 1000 × $30 = $30,000

WITH RAG (after Q1):
  Q1: 250 × $30 = $7,500
  Q2-Q4: 750 × $0.30 = $225
  Year 1 Total: $7,725

  Year 2+: 1000 × $0.30 = $300/year

TOTAL SAVINGS (3 years):
  Without RAG: $90,000
  With RAG: $8,025
  Savings: $81,975 💰💰💰
```

---

## 6. Timeline Gantt Chart

```
Project: Metadata Integration
Timeline: 3 weeks
Start: This week

Week 1: BULK IMPORT
═════════════════════════════════════════════════════════════════════

Mon  Prepare XML files
     ┌────────────────┐
     │ Gather 11k XML │
     └────────────────┘

Tue  Test uploadBulk
     ┌────────────────────────────────────┐
     │ Test with 100 files, verify works  │
     └────────────────────────────────────┘

Wed  Run full import
     ┌──────────────────────────────┐
     │ Upload all 11k files         │
     │ (1-2 hours)                  │
     └──────────────────────────────┘

Thu  Verify & validate
     ┌────────────────────────────┐
     │ Count tables (should be    │
     │ 11k), check fields/rels    │
     └────────────────────────────┘

Fri  Week 1 complete
     ✅ All metadata in DB
     ✅ Ready for Week 2


Week 2: RAG INFRASTRUCTURE
═════════════════════════════════════════════════════════════════════

Mon  Choose & setup Vector DB
     ┌────────────────────────────┐
     │ Chroma / Pinecone / other  │
     │ (30 min - 1 hour)          │
     └────────────────────────────┘

Tue  Create RAG indexer
     ┌──────────────────────────────────┐
     │ Create metadata-rag-indexer.ts   │
     │ (use CODE-IMPLEMENTATION file)   │
     └──────────────────────────────────┘

Wed  Embed all metadata
     ┌──────────────────────────────────┐
     │ Run indexing process             │
     │ (5-30 minutes for 11k tables)    │
     └──────────────────────────────────┘

Thu  Test RAG search
     ┌────────────────────────────┐
     │ Test: "customer" finds     │
     │ CustTable in top results   │
     └────────────────────────────┘

Fri  Week 2 complete
     ✅ 11k vectors indexed
     ✅ RAG search working
     ✅ Ready for Week 3


Week 3: INTEGRATION
═════════════════════════════════════════════════════════════════════

Mon  Update queryGenerator.ts
     ┌──────────────────────────────────┐
     │ Add RAG metadata lookup          │
     │ (see CODE-IMPLEMENTATION file)   │
     └──────────────────────────────────┘

Tue  Add fallback logic
     ┌──────────────────────────────────┐
     │ If RAG fails, use all metadata   │
     │ Graceful degradation             │
     └──────────────────────────────────┘

Wed  Run integration tests
     ┌──────────────────────────────────┐
     │ Test full flow (Q → SQL → Result)│
     │ Validate accuracy                │
     └──────────────────────────────────┘

Thu  Measure & optimize
     ┌────────────────────────────┐
     │ Cost per query: $0.30-0.60 │
     │ Speed: 5-10 seconds        │
     │ Accuracy: 95%+             │
     └────────────────────────────┘

Fri  Week 3 complete
     ✅ Full integration working
     ✅ 10x cost reduction verified
     ✅ PRODUCTION READY


Legend:
┌────────────────┐ = Task duration
Mon-Fri          = Day of week
✅               = Complete
```

---

## 7. Decision Matrix (Choose Your Path)

```
Can you wait 3 weeks?
│
├─ YES (Choose Hybrid ⭐)
│  │
│  ├─ Implementation: 3 weeks
│  ├─ Cost: $0.30-0.60/query
│  ├─ Speed: 5-10 seconds
│  ├─ Accuracy: 95%+
│  ├─ Benefit: 10-100x savings
│  └─ Risk: Very low (fallback included)
│
└─ NO (Choose Bulk Import)
   │
   ├─ Implementation: 1 day
   ├─ Cost: $30-90/query ❌
   ├─ Speed: 30-60 seconds ❌
   ├─ Accuracy: 70% ❌
   ├─ Benefit: Data in system quickly
   └─ Plan: Upgrade to Hybrid in Phase 2
```

---

## 8. Risk Matrix

```
Implementation Risks vs Mitigation

HIGH RISK / HIGH IMPACT
═════════════════════════════════════════════════════════════════════
❌ Import fails mid-process
   Mitigation: Use Promise.allSettled, can retry failed files

❌ Vector embeddings wrong
   Mitigation: Test with sample queries, evaluate quality, can retrain

MEDIUM RISK / MEDIUM IMPACT
═════════════════════════════════════════════════════════════════════
⚠️ RAG search returns irrelevant tables
   Mitigation: Falls back to all metadata, tune relevance threshold

⚠️ LLM still makes mistakes with RAG
   Mitigation: Add validation, human-in-the-loop, iterative improvement

LOW RISK / LOW IMPACT
═════════════════════════════════════════════════════════════════════
✅ Vector DB selection wrong
   Mitigation: Easy to switch, minimal code changes

✅ Performance not as expected
   Mitigation: Optimize gradually, batch sizes, caching
```

---

## 9. Success Indicators (Checklist)

```
WEEK 1: BULK IMPORT ✅
═════════════════════════════════════════════════════════════════════
□ XML files prepared (11k files ready)
□ uploadBulk tested with 100 files (success)
□ Full import completed (11k files)
□ Database verification:
  □ SELECT COUNT(*) FROM metadata_tables = 11000
  □ SELECT COUNT(*) FROM metadata_fields > 500000
  □ SELECT COUNT(*) FROM table_relationships > 50000
□ Error rate < 1% (< 100 failures)
□ All fields and relationships imported


WEEK 2: RAG INFRASTRUCTURE ✅
═════════════════════════════════════════════════════════════════════
□ Vector DB chosen and set up
□ metadata-rag-indexer.ts created
□ Embedding pipeline running
□ All 11k tables embedded successfully
□ 11k vectors stored in vector DB
□ Memory usage within expectations
□ Test search "customer":
  □ Returns CustTable
  □ Returns CustTrans
  □ Returns CustGroup
  □ Response time < 1 second


WEEK 3: INTEGRATION ✅
═════════════════════════════════════════════════════════════════════
□ queryGenerator.ts updated with RAG
□ findRelevantMetadataTables() working
□ Fallback logic implemented
□ Test queries:
  □ "Show customers" → finds CustTable
  □ "Sales report" → finds SalesTable
  □ "Vendor invoices" → finds VendTable
  □ All top results are relevant
□ SQL generation accuracy > 90%
□ Cost verification:
  □ Tokens per query: 2-4k (before: 200k)
  □ Cost per query: $0.30-0.60 (before: $30)
  □ Speed: 5-10 seconds (before: 30-60s)
□ Production deployment ready
```

---

## 10. Quick Status Template (Share with Team)

```
METADATA INTEGRATION - STATUS UPDATE
═════════════════════════════════════════════════════════════════════

Week: [1 of 3]
Status: ✅ ON TRACK

COMPLETED THIS WEEK:
✅ Item 1
✅ Item 2
✅ Item 3

IN PROGRESS:
⏳ Item 1 (due Friday)
⏳ Item 2 (due Friday)

BLOCKERS:
none

METRICS:
  Tables imported: 11,000 / 11,000
  Vector embeddings: 0 / 11,000
  Integration tests: 0 / 10

NEXT WEEK PLAN:
  - Set up vector database
  - Create metadata indexing pipeline
  - Test RAG search accuracy

ESTIMATED COMPLETION: Week 3 (on schedule)
```

---

These visual diagrams should help everyone on the team quickly understand the metadata integration system, approach, and implementation timeline.

Use these in presentations, documentation, and team meetings.

