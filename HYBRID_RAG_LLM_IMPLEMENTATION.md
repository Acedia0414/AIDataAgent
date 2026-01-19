# Hybrid RAG + LLM Implementation Summary

## What's New (Demo Stage)

This implementation introduces smart, transparent query generation that combines RAG + LLM reasoning with keyword boosting and intelligent hints.

### Feature Flag
```typescript
const SHOW_RAG_REASONING = true;
```
Located in `server/queryGenerator.ts`. Set to `false` to hide reasoning from chat (useful after demo phase).

---

## New Files Created

### 1. `server/metadata-table-analyzer.ts`
**Purpose:** Automatically analyze your metadata to identify primary vs. helper tables and extract primary keys.

**What it does:**
- Scans all 3,251 tables on server startup
- Identifies "primary" tables (VendTable, CustTable, etc.) vs. helper tables (Tmp, History, Staging, Request)
- Extracts primary key for each table
- Confidence scoring: high/medium/low

**Usage:**
```typescript
const primaryTablesMap = await getPrimaryTablesCache();
const isPrimary = await isPrimaryTable("VendTable"); // true
const primaryKey = await getPrimaryKeyForTable("VendTable"); // "VendAccountNum"
```

### 2. `server/reasoning-tracker.ts`
**Purpose:** Track all decisions made during query generation (for transparency).

**What it tracks:**
- Query intent (simple_count, complex_join, aggregation, etc.)
- Keywords detected in user question
- RAG results (which tables matched, similarity %, keywords matched)
- Selected tables and why
- Hints given to LLM

**Usage:**
```typescript
reasoningTracker.reset();
reasoningTracker.setIntent("simple_count");
reasoningTracker.setKeywords(["vendor"]);
reasoningTracker.addHint("Use COUNT(DISTINCT VendAccountNum)");
const reasoning = reasoningTracker.getReasoning();
```

---

## Enhanced Files

### 1. `server/metadata-rag-indexer.ts`
**Added:** Keyword-aware ranking for RAG results

**How it works:**
- When you ask "how many vendors", the system:
  1. Extracts keywords: ["vendors", "many"]
  2. Runs semantic search (existing embedding-based)
  3. Boosts tables with matching keywords:
     - Table name match (e.g., "Vend" in "VendTable"): +30% boost
     - Description match: +10% boost
  4. Re-ranks results and returns top N

**Result:** `VendTable` ranks higher even if semantic similarity wasn't perfect alone.

### 2. `server/queryGenerator.ts`
**Added:**
- Intelligent hint injection for LLM
- Query-specific guidance (e.g., for COUNT queries: "Use COUNT(DISTINCT PrimaryKey)")
- Reasoning tracking and formatting
- Primary table/key injection into LLM context

**Example hints added:**
```
For "how many vendors":
- "This appears to be an aggregation query. Use GROUP BY with primary keys."
- "For table VendTable, use COUNT(DISTINCT VendAccountNum) to avoid duplicates."
```

### 3. `server/routers.ts`
**Added:**
- Friendly error summarization for LLM failures
- Reasoning display in chat (HTML `<details>` collapsible)
- Return reasoning from `query.generate` mutation

**In Chat:**
```
**Generated SQL:** ...

📊 How We Found This (Click to expand)
- Query Type: simple_count
- Keywords: vendor
- Top Tables Found (by RAG + Keyword Matching):
  1. VendTable [PRIMARY] - 87% match (matched: vendor)
  2. VendCategory - 72% match (matched: vendor)
- Selected for Query: VendTable
- Why: Selected from 20 RAG-ranked tables (with keyword boosting)
```

---

## Configuration

### Max Tokens (Cost Control)
**Current:** 4000 tokens per query (wasteful for simple queries)

**To adjust:**
1. Go to Admin → LLM Settings
2. Change "Max Output Tokens" from 4000 to 2000 (safe buffer, lower cost)
3. Or make it context-aware in the code (I can add this if you want)

**Cost Impact:**
- 4000 tokens @ $0.60/1k = $2.40 per query
- 2000 tokens @ $0.60/1k = $1.20 per query
- Input cost stays the same regardless

### Reasoning Display
**To toggle off** (after demo):
1. Open `server/queryGenerator.ts`
2. Change `const SHOW_RAG_REASONING = true;` to `false`
3. Restart server

---

## How It Works (Flow)

### Example: "How many vendors in total?"

```
1. User asks: "How many vendors in total?"
   ↓
2. Multi-step detection: Single query (not multi-step)
   ↓
3. Intent classification: Simple aggregation
   ↓
4. RAG Search (with keyword boosting):
   - Extract keywords: ["vendors", "total"]
   - Semantic search: 20 initial results
   - Keyword boost: VendTable +30% (name match), others +10% (description)
   - Result: VendTable ranks #1
   ↓
5. LLM Context:
   - System prompt: Standard D365 SQL generator guidance
   - Metadata: Top 28 tables (RAG-ranked + related via relationships)
   - Hints: "Use COUNT(DISTINCT VendAccountNum)" + primary key info
   - User question: "How many vendors in total?"
   ↓
6. LLM Generates:
   SELECT COUNT(DISTINCT VendAccountNum) FROM VendTable
   ↓
7. Query Executed:
   Result: 156 rows
   ↓
8. Chat Response:
   **Generated SQL:** SELECT COUNT(DISTINCT VendAccountNum) FROM VendTable
   **Results:** 1 rows returned in 245ms

   [Collapsible: How We Found This]
   - Query Type: simple_count
   - Keywords: vendors, total
   - RAG Results: VendTable (87%), VendCategory (72%), ...
   - Selected: VendTable (primary match)
```

---

## What If RAG Doesn't Find VendTable?

✅ **This is OK!** Here's why:

1. **Keyword boosting helps:** Even if semantic similarity is low, keyword match boosts it.
2. **Related tables fallback:** If VendTable isn't found, the system pulls related tables via relationships.
3. **LLM fallback:** If still not in context, LLM can infer from the 28 closest tables + hints.
4. **User feedback:** You see exactly which tables were ranked and why.

In demo, the reasoning shows all of this, so you can verify and correct if needed.

---

## Testing Checklist

- [ ] Ask "how many vendors in total?"
  - Should see VendTable ranked first in reasoning
  - SQL should use COUNT(DISTINCT VendAccountNum)

- [ ] Ask "purchase orders from last month"
  - Should detect aggregation + date filtering
  - Should show hints about date fields

- [ ] Ask "customer balances by country"
  - Should detect aggregation + grouping
  - Should show multiple table relationships

- [ ] Check reasoning display
  - Click "How We Found This" to expand
  - Verify table rankings and keyword matches

---

## Next Steps (After Demo)

1. **Disable reasoning:** Set `SHOW_RAG_REASONING = false` when going live
2. **Adjust max tokens:** Lower from 4000 to 2000 for cost savings
3. **Custom primary table detection:** If auto-detection misses some, we can add manual overrides
4. **Metrics:** Track which hints were most useful, which queries failed

---

## Key Benefits

✅ **Better simple query handling:** Keyword boosting fixes "vendors" → "Vend*" matching
✅ **Transparent process:** Users see exactly how tables were ranked and why
✅ **LLM-friendly:** Hints guide LLM to correct columns (primary keys) without manual input
✅ **Cost control:** Configurable max tokens to prevent waste
✅ **No user burden:** Everything automatic, no technical info required from end users
