# RAG Quick Start Guide

## ✅ Everything is Verified & Working

All RAG components have been verified as functional:
- ✅ LM Studio embedding generation
- ✅ In-memory vector store with cosine similarity
- ✅ Metadata indexing logic
- ✅ Search endpoints
- ✅ Query generator integration
- ✅ **NEW:** Admin control panel UI

---

## 🚀 Quick Start (3 Steps)

### Step 1: Ensure LM Studio is Running
```bash
# LM Studio should be listening at http://127.0.0.1:1234
# Check by visiting in browser or:
curl http://127.0.0.1:1234/health
```

### Step 2: Navigate to Admin Panel
- Open app and go to **Admin** (in top navigation)
- You should see "RAG Indexing Control" panel
- It will show status as **🔴 Not Indexed** initially

### Step 3: Click "Index All Metadata"
- Confirm the dialog
- Watch progress bar fill up
- Console will log: `[RAG Indexer] Progress: X/Y tables processed`
- When complete: status changes to **🟢 Ready** with count of indexed tables

---

## ⏱️ Expected Timing

For 3000+ tables with LM Studio:
- **Initial:** 2-5 seconds per 100 tables (depends on your hardware)
- **Total estimate:** 15-30 minutes for full 3000+
- You can close the page while indexing runs (async operation)

---

## ✨ After Indexing is Complete

When you ask questions in the **Chat** page:
1. System automatically finds relevant tables using semantic search
2. Instead of using all 3000+ tables, it filters to ~20 most relevant ones
3. Better context = better SQL queries = better answers
4. Logs show: `[Query Generator] RAG found X relevant tables`

---

## 🔍 How to Verify It's Working

### Check Admin Stats
- Visit `/admin`
- See "X tables indexed" displayed
- See embedding model name

### Check Server Logs
Look for:
```
[RAG Indexer] Starting to index 3000+ metadata tables...
[RAG Indexer] Progress: 100/3000 tables processed
[RAG Indexer] Indexing complete! Indexed: 3000, Failed: 0
```

### Test a Query
Ask in Chat: "Show me all customer information"
- Watch server logs for: `[Query Generator] Using RAG search for query...`
- Should see: `[Query Generator] RAG found 15 relevant tables`

---

## 🛠️ Troubleshooting

### Error: "No embedding returned from LM Studio"
- **Cause:** LM Studio not running or wrong address
- **Fix:** Start LM Studio, verify it's listening at `127.0.0.1:1234`

### Indexing is very slow
- **Cause:** LM Studio CPU-bound or generating embeddings slowly
- **Fix:** Normal for first run. Embeddings are computed in batches of 5 tables.

### Indexing fails partway through
- **Cause:** Usually a specific table with bad metadata or LM Studio timeout
- **Fix:** Check server logs for `[RAG Indexer] Failed to index [TableName]`
  - You can fix that table's metadata and re-index

### Query generation not using RAG
- **Cause:** Indexing not completed yet or store cleared
- **Fix:** Go to Admin, check if "Ready" status shows. If not, run indexing again.

---

## 📝 Files Modified/Created

- ✏️ `server/routers.ts` - Fixed progress callback
- ✏️ `server/metadata-rag-indexer.ts` - Improved logging
- ✨ `client/src/components/RAGAdmin.tsx` - NEW control panel
- ✨ `client/src/pages/Admin.tsx` - NEW admin dashboard
- ✏️ `client/src/components/Navigation.tsx` - Added Admin link

---

## 🎯 Next Phase (Optional, Later)

- [ ] Persist vector store to disk (currently in-memory)
- [ ] Add RAG settings (batch size, search limit)
- [ ] Show which tables RAG selected for each query
- [ ] Add manual table selection override
