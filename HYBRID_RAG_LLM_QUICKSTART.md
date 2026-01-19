# 🚀 Hybrid RAG + LLM Launch Checklist

## What Just Got Built

You now have a **smart hybrid system** that:
- 🎯 Automatically finds the right tables (keyword boosting + semantic search)
- 💡 Gives the LLM helpful hints (primary keys, aggregation guidance)
- 👁️ Shows you exactly how decisions were made (reasoning panel)
- 💰 Lets you control costs (configurable max tokens)
- 🤖 Requires zero technical input from end users

---

## Before Testing: Setup

### 1. Set LLM Endpoint (Required)
```bash
export LLM_API_URL=http://127.0.0.1:1234
export LLM_API_KEY=not-needed-for-local  # or your API key if remote
```

Or via Admin → LLM Settings:
- Endpoint: `http://127.0.0.1:1234`
- Max Output Tokens: `2000` (reduced from 4000 for cost)
- Model: Keep as-is

### 2. Restart Server
```bash
npm run dev
# or your dev command
```

### 3. Verify in Logs
```
[Metadata Analyzer] Analyzed 3251 tables. Primary: XXX
[LLM] invoke { url: '...', model: 'gpt-4o-mini...', ... }
```

---

## Test Scenarios

### Test 1: Simple Aggregation ✅
**Ask:** "How many vendors in total?"

**Expected:**
- Reasoning shows: VendTable ranked #1 (87% match, keyword "vendor")
- SQL: `SELECT COUNT(DISTINCT VendAccountNum) FROM VendTable`
- Hint visible: "Use COUNT(DISTINCT VendAccountNum)"

**Success:** VendTable appears, keyword boost mentioned

---

### Test 2: Date Range Query ✅
**Ask:** "Show purchase orders from last month"

**Expected:**
- Query Type: complex_join
- Hints mention: "Apply appropriate date range filtering"
- Tables: PurchTable + related transaction tables
- SQL includes: WHERE CreatedDate BETWEEN ... AND ...

**Success:** Hints suggest date filtering

---

### Test 3: Grouping/Aggregation ✅
**Ask:** "Customers by total invoice amount"

**Expected:**
- Query Type: aggregation
- Hints: "Use GROUP BY with primary keys"
- SQL: SELECT ... GROUP BY CustAccountNum ... SUM(...)

**Success:** GROUP BY hint appears

---

### Test 4: Transparency ✅
**Click "How We Found This"**

**Expected:**
- See keywords extracted from your question
- See table rankings (top 5 with % match)
- See why each table was selected
- See hints given to LLM

**Success:** Reasoning makes sense, top table is relevant

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "LLM invoke" not in logs | Set LLM_API_URL env var and restart |
| Reasoning not showing | Check SHOW_RAG_REASONING=true in queryGenerator.ts |
| Wrong table selected | Check reasoning — keyword boost might need tuning |
| Slow queries | Max tokens too high; reduce to 2000 in Admin settings |
| High costs | Lower max tokens; only needed for complex multi-step queries |

---

## Demo Notes

✅ Everything is automatic — end users type naturally, see reasoning
✅ Keyword boosting makes "vendor" → "VendTable" work
✅ Primary key hints reduce bad SQL
✅ Reasoning shows transparency (good for trust-building)
✅ Collapsible design keeps chat clean while info available

---

## After Demo: Going Live

1. **Hide reasoning:** Set `SHOW_RAG_REASONING = false` in queryGenerator.ts
2. **Lock max tokens:** Typically 2000 is safe
3. **Monitor:** Track which questions fail, adjust primary table detection if needed
4. **Cost tracking:** Monitor LLM API usage (input + output tokens)

---

## Questions Before Testing?

- How to adjust keyword boost strength? (tuning in metadata-rag-indexer.ts)
- Want to add custom primary tables? (override in metadata-table-analyzer.ts)
- Need to hide specific hints from users? (flag in queryGenerator.ts)

**Go test it! 🎯**
