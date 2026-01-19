# Quick Reference: Metadata Integration

**Use this guide for quick lookups during implementation**

---

## The Three Approaches (Side-by-Side)

| Question | Bulk Only | RAG Only | Hybrid* |
|----------|-----------|----------|---------|
| How long to implement? | 1 day | 1 week | 1 week |
| How much does it cost per query? | $30-90 | $0.30-0.60 | $0.30-0.60 |
| How fast are queries? | 30-60s | 5-10s | 5-10s |
| How accurate is SQL generation? | 70% | 95%+ | 95%+ |
| Does it scale to 100k+ tables? | No | Yes | Yes |
| What if RAG fails? | N/A | Falls back? | Falls back to all metadata |

**\* Hybrid = Import all metadata + RAG for smart retrieval (RECOMMENDED)**

---

## Current Codebase Status

### Already Built ✅
- `server/routers.ts` - uploadBulk endpoint (import 11k files)
- `server/queryGenerator.ts` - Uses metadata to generate SQL
- `server/rag/RAGOrchestrator.ts` - Vector search infrastructure
- `server/metadataParserV2.ts` - Parses D365 XML files
- Database schema - Tables for storing metadata

### Need to Build ⚠️
- RAG indexing of metadata tables
- Metadata-specific search function
- Integration of RAG into query generation
- Fallback handling

---

## Timeline at a Glance

```
Week 1: Bulk Import
├─ Prepare 11k XML files
├─ Test uploadBulk with 100 files
├─ Run full import of 11k files
└─ Verify all in database ✓

Week 2: RAG Infrastructure
├─ Set up vector database (Chroma/Pinecone)
├─ Create embedding pipeline
├─ Embed all 11k tables (5-30 min)
└─ Test vector search ✓

Week 3: Integration
├─ Update queryGenerator.ts
├─ Add smart metadata retrieval
├─ Test end-to-end
└─ Verify cost savings ✓
```

---

## The Upload Endpoint (Already Built)

**Location:** `server/routers.ts` line ~42

**How to use:**

```bash
curl -X POST http://localhost:3000/api/trpc/metadata.uploadBulk \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "filename": "CustTable.xml",
        "content": "<AxTable>...</AxTable>"
      },
      {
        "filename": "SalesTable.xml",
        "content": "<AxTable>...</AxTable>"
      }
    ],
    "replaceExisting": false
  }'
```

**Response:**
```json
{
  "success": true,
  "tablesProcessed": 2,
  "created": 2,
  "replaced": 0,
  "errors": []
}
```

---

## Key Metrics to Track

### After Bulk Import
```sql
SELECT COUNT(*) FROM metadata_tables;
-- Should return ~11,000
```

### After RAG Setup
```
- Total vectors created: 11,000
- Average search time: < 1 second
- Memory used: ~2-5 GB (depends on vector DB)
```

### After Integration
```
- Cost per query: Before $30 → After $0.30 (100x reduction)
- Query time: Before 30s → After 5-10s (5x faster)
- SQL accuracy: Before 70% → After 95%+ (25% improvement)
```

---

## Files You'll Modify

| File | When | What |
|------|------|------|
| `server/db.ts` | Week 2 | Add `getMetadataTablesByIds()` |
| `server/routers.ts` | Week 1 | Use existing `uploadBulk` ✓ |
| `server/queryGenerator.ts` | Week 3 | Add RAG metadata lookup |
| `server/knowledge-base-adapter.ts` | Week 2 | Add `findRelevantMetadataTables()` |
| `server/metadata-rag-indexer.ts` | Week 2 | **NEW** - Create this file |
| `server/routers-admin.ts` | Week 2 | Add index trigger endpoint |

---

## Files You'll Create

### `server/metadata-rag-indexer.ts` (Week 2)

**Purpose:** Convert metadata tables to vectors
**Size:** ~200-300 lines
**Code provided in:** CODE-IMPLEMENTATION-EXAMPLES.md

### Test file: `server/metadata-rag.test.ts` (Week 3)

**Purpose:** Test RAG integration
**Size:** ~100 lines
**Code provided in:** CODE-IMPLEMENTATION-EXAMPLES.md

---

## Vector Database Comparison

| DB | Cost | Setup | Effort | Scalability |
|----|------|-------|--------|------------|
| **Chroma** | Free | 5 min | Low | Medium (1GB) |
| **Pinecone** | $1-3/mo | 2 min | Very Low | High |
| **Milvus** | Free | 30 min | Medium | High |
| **Supabase (pgvector)** | Free tier | 10 min | Low | High |

**Recommendation:** Start with **Chroma** for MVP, migrate to **Pinecone** or **Supabase** for production.

---

## Embedding Model Comparison

| Model | Cost | Quality | Speed | Local |
|-------|------|---------|-------|-------|
| **OpenAI text-embedding-3-small** | $0.02/1M tokens | ⭐⭐⭐⭐⭐ | Fast | No |
| **Ollama** | Free | ⭐⭐⭐ | Depends on GPU | Yes |
| **All-MiniLM-L6** | Free | ⭐⭐⭐ | Very Fast | Yes |
| **HuggingFace** | Free | ⭐⭐⭐ | Slow | No |

**Recommendation:** **OpenAI** for best quality, or **Ollama** for free local option.

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Upload fails partway | File too large or malformed XML | Check error logs, fix XML, retry with `replaceExisting: false` |
| RAG returns no results | Embeddings not created or index empty | Run indexing: `admin.indexMetadataForRAG` |
| RAG returns wrong tables | Poor embedding quality | Check table descriptions, improve with semantic naming |
| SQL still wrong even with RAG | LLM limitations | Add few-shot examples, improve context, add validation |
| Import hangs | Too many concurrent files | Reduce `MAX_CONCURRENT` from 10 to 5 in routers.ts |
| Memory exceeded | Files too large | Process in smaller batches, increase server RAM |

---

## Validation Checklist

### Week 1: Bulk Import
- [ ] 100 files uploaded successfully
- [ ] Database shows 100 tables
- [ ] No critical errors in logs
- [ ] 11k file import completes
- [ ] Database shows 11k tables
- [ ] All fields and relationships present

### Week 2: RAG Setup
- [ ] Vector database initialized
- [ ] Metadata embedding pipeline created
- [ ] All 11k tables embedded (< 30 minutes)
- [ ] Vector search returns results
- [ ] Test query: "customer" finds CustTable
- [ ] Search response time < 1 second

### Week 3: Integration
- [ ] queryGenerator.ts updated with RAG lookup
- [ ] Fallback logic handles RAG failures
- [ ] Sample queries generate correct SQL
- [ ] Cost reduced by 10x (measure tokens)
- [ ] Speed improved 5-10x (time queries)
- [ ] Accuracy improved to 95%+

---

## Testing Queries

Use these to validate your RAG implementation:

```typescript
// Test 1: Customer query
await findRelevantMetadataTables("show all customers");
// Expected: CustTable, CustGroup, CustInvoiceJour in top 5

// Test 2: Sales query
await findRelevantMetadataTables("sales by region");
// Expected: SalesTable, SalesLine, CustTable in top 5

// Test 3: Vendor query
await findRelevantMetadataTables("vendors and their invoices");
// Expected: VendTable, VendInvoiceJour, VendTrans in top 5

// Test 4: Date-based query
await findRelevantMetadataTables("transactions in Q1");
// Expected: Any table with TransDate, CreatedDate fields

// Test 5: Aggregation query
await findRelevantMetadataTables("total amount by month");
// Expected: Tables with Amount fields, Date fields
```

---

## Database Queries for Monitoring

```sql
-- Check import progress
SELECT COUNT(*) as total_tables FROM metadata_tables;
SELECT COUNT(*) as total_fields FROM metadata_fields;
SELECT COUNT(*) as total_relationships FROM table_relationships;

-- Find tables with most fields
SELECT tableName, COUNT(*) as field_count
FROM metadata_tables mt
LEFT JOIN metadata_fields mf ON mt.id = mf.tableId
GROUP BY mt.id, mt.tableName
ORDER BY field_count DESC
LIMIT 20;

-- Check relationship density
SELECT
  COUNT(*) as total_rels,
  AVG(rel_count) as avg_rels_per_table
FROM (
  SELECT sourceTableId, COUNT(*) as rel_count
  FROM table_relationships
  GROUP BY sourceTableId
) AS rels;

-- Find tables with inferred relationships
SELECT tableName, COUNT(*) as inferred_count
FROM table_relationships tr
LEFT JOIN metadata_tables mt ON tr.sourceTableId = mt.id
WHERE tr.isInferred = true
GROUP BY tr.sourceTableId, mt.tableName
ORDER BY inferred_count DESC;
```

---

## Performance Targets

### After Bulk Import
- ✓ Query getMetadataTables(): < 500ms
- ✓ Database size: ~500MB for 11k tables
- ✓ Insert performance: 1000 tables/minute

### After RAG Setup
- ✓ Vector search: < 1 second
- ✓ Embedding creation: 1000 tables/5 minutes
- ✓ Memory usage: 2-5GB for 11k embeddings

### After Integration
- ✓ Query generation: 5-10 seconds
- ✓ LLM response time: < 10 seconds
- ✓ Total user experience: < 15 seconds

---

## Dependencies You Might Need

```bash
# For Chroma (vector DB)
npm install chroma-js

# For Pinecone (managed vector DB)
npm install @pinecone-database/pinecone

# For HuggingFace embeddings
npm install @xenova/transformers

# For OpenAI embeddings (already in project?)
npm install openai

# For testing
npm install vitest
```

---

## Debugging Commands

```bash
# Check if metadata imported successfully
sqlite3 your_database.db "SELECT COUNT(*) FROM metadata_tables;"

# View sample metadata table
sqlite3 your_database.db "SELECT * FROM metadata_tables LIMIT 5;"

# Check for import errors
grep -i "error\|failed" server_logs.txt | head -20

# Monitor import progress
tail -f server_logs.txt | grep "Metadata Upload"

# Test RAG search
npx ts-node -e "
  import { findRelevantMetadataTables } from './server/knowledge-base-adapter';
  const result = await findRelevantMetadataTables('customer');
  console.log(result);
"
```

---

## Communication with Team

### When Updating Team
- "We're at Phase X of Y"
- "Current status: ✅ complete / ⏳ in-progress / ❌ blocked"
- "Cost impact: Was $X per query, now $Y" (for motivation)
- "Performance: X seconds → Y seconds" (before/after)

### Key Metrics to Report
- Tables imported: X/11,000
- Vectors created: X/11,000
- Search accuracy: X%
- Cost savings: X%
- Query performance: X seconds

---

## References

**Full Documentation:**
1. RESEARCH-METADATA-INTEGRATION-STRATEGY.md - Analysis & approach
2. IMPLEMENTATION-GUIDE-METADATA-INTEGRATION.md - Step-by-step plan
3. CODE-IMPLEMENTATION-EXAMPLES.md - Ready-to-use code
4. METADATA-QUERY-GENERATION-CONNECTION.md - How it all fits together
5. METADATA-INTEGRATION-EXECUTIVE-SUMMARY.md - High-level overview

**Codebase:**
- Upload: `/server/routers.ts` lines ~42-320
- Query Gen: `/server/queryGenerator.ts`
- RAG Core: `/server/rag/RAGOrchestrator.ts`
- Adapter: `/server/knowledge-base-adapter.ts`
- Database: `/server/db.ts`

---

## Quick Start Commands

```bash
# Week 1: Test the upload endpoint
curl -X POST http://localhost:3000/api/trpc/metadata.uploadBulk \
  -H "Content-Type: application/json" \
  -d '{"files": [...], "replaceExisting": false}'

# Week 2: Start RAG indexing
npm run metadata:index

# Week 3: Run integration tests
npm run test -- metadata-rag

# Monitor performance
npm run build && npm start
# Then track:
# - Query generation time
# - LLM token usage
# - Cost per query
```

---

## Success Indicators

✅ **Week 1 Complete When:**
- All 11k tables in database
- 0-1% file failure rate
- Verified with: `SELECT COUNT(*) FROM metadata_tables = 11000`

✅ **Week 2 Complete When:**
- 11k vectors created
- Sample search returns relevant tables
- Response time < 1 second

✅ **Week 3 Complete When:**
- LLM cost reduced 10x
- Query generation using RAG results
- 95%+ SQL accuracy in tests

---

## Remember

1. **Start with import** - Get data in first
2. **Add RAG second** - Optimize after import works
3. **Test thoroughly** - Vector search quality matters
4. **Measure impact** - Track costs and speed
5. **Plan for scale** - This approach works for 100k+ tables

**The hybrid approach is not just good - it's the difference between an expensive, slow, inaccurate system and a fast, cheap, accurate one.**

