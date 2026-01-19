# Table Selection Strategies

## Overview

The query generator uses a **three-tier fallback system** to select which D365 table metadata to include in the LLM prompt. This allows testing different levels of AI reasoning capability.

## The Three Strategies

### 1. RAG (Semantic Search) - PRIMARY

**Configuration**: `ENABLE_RAG=true` (default)

**How it works:**
- Uses vector embeddings to semantically search for relevant tables
- Finds tables based on **meaning**, not just keywords
- Returns 10-20 most relevant tables

**Example:**
```
Query: "customer invoices from last month"
Result: CustInvoiceJour, CustInvoiceTrans, CustTable (semantic match)
```

**When it runs:**
- Only if `ENABLE_RAG=true`
- AND RAG vector index is ready

**Output:**
- Populates `relevantTables` with semantically matched tables

---

### 2. Keyword Matching - SECONDARY

**Configuration**: `ENABLE_KEYWORD_FALLBACK=true` (default)

**How it works:**
- Scans query for keywords and pattern-matches against table names
- Uses simple string matching: "vendor" → `VendTable`, `VendTrans`, `VendGroup`
- Also checks table descriptions

**Example:**
```
Query: "vendor payments"
Result: VendTable, VendTrans, VendPaym* (keyword match)
```

**When it runs:**
- Only if `ENABLE_KEYWORD_FALLBACK=true`
- AND (RAG was disabled/failed OR returned no results)

**Output:**
- Populates `relevantTables` with keyword-matched tables (20-50 typically)

---

### 3. First 50 Tables - TERTIARY

**Configuration**: `ENABLE_METADATA_FALLBACK=true` (default)

**How it works:**
- Takes first 50 tables alphabetically from database
- No intelligence, no relevance checking
- Safety mechanism to ensure LLM always has *some* schema context

**Example:**
```
Query: "vendor payments"
Result: CustAccountNum..., CustAging... (alphabetically first 50, likely wrong!)
```

**When it runs:**
- Always runs as final decision point
- If `relevantTables` is empty after RAG + Keyword
- AND `ENABLE_METADATA_FALLBACK=true`

**Output:**
- Sends first 50 tables alphabetically (often wrong tables for the query)

---

### 4. Zero Metadata Mode - EXTREME

**Configuration**: `ENABLE_METADATA_FALLBACK=false`

**How it works:**
- Sends **NO table metadata** to LLM
- LLM must rely entirely on:
  - Authoritative D365 naming conventions (from prompts)
  - General SQL knowledge
  - Inference from query context

**Example:**
```
Query: "vendor payments"
Metadata sent: NONE
LLM uses: Knowledge that vendors are in VendTable, payments in VendTrans
```

**When it runs:**
- Only if `ENABLE_METADATA_FALLBACK=false`
- AND no tables selected by RAG/Keyword

**Output:**
- Zero tables in context
- Tests pure LLM reasoning capability

---

## Decision Flow

```
User Query
    ↓
┌─────────────────────────────┐
│ 1. Check ENABLE_RAG         │
└─────────────────────────────┘
    │
    ├─ YES → RAG Search → relevantTables populated? → ✅ Use these
    │                                     ↓ NO
    └─ NO → Set usedFallback=true
              ↓
┌─────────────────────────────────────┐
│ 2. Check ENABLE_KEYWORD_FALLBACK    │
└─────────────────────────────────────┘
    │
    ├─ YES → Keyword Search → relevantTables populated? → ✅ Use these
    │                                       ↓ NO
    └─ NO → relevantTables stays empty
              ↓
┌─────────────────────────────────────┐
│ 3. Check ENABLE_METADATA_FALLBACK   │
└─────────────────────────────────────┘
    │
    ├─ YES → Use first 50 tables alphabetically
    │
    └─ NO → Use ZERO tables (pure LLM mode)
              ↓
        [Send to LLM]
```

---

## Configuration Matrix

| RAG | Keyword | Fallback | Result |
|-----|---------|----------|--------|
| ✅ true | ✅ true | ✅ true | **Full intelligence** - RAG with keyword backup |
| ❌ false | ✅ true | ✅ true | **Keyword only** - Pattern matching |
| ❌ false | ❌ false | ✅ true | **Dumb fallback** - First 50 tables (often wrong) |
| ❌ false | ❌ false | ❌ false | **Zero metadata** - Pure LLM reasoning |

---

## Environment Variables

Add to `.env`:

```bash
# RAG semantic search (requires vector index)
ENABLE_RAG=false

# Keyword pattern matching fallback
ENABLE_KEYWORD_FALLBACK=false

# First 50 tables fallback (dumb mode)
ENABLE_METADATA_FALLBACK=false
```

---

## Use Cases

### Production (Recommended)
```bash
ENABLE_RAG=true
ENABLE_KEYWORD_FALLBACK=true
ENABLE_METADATA_FALLBACK=true
```
**Result:** Best accuracy with multiple fallbacks

---

### Testing RAG Only
```bash
ENABLE_RAG=true
ENABLE_KEYWORD_FALLBACK=false
ENABLE_METADATA_FALLBACK=false
```
**Result:** Pure semantic search, no fallback

---

### Testing Keyword Only
```bash
ENABLE_RAG=false
ENABLE_KEYWORD_FALLBACK=true
ENABLE_METADATA_FALLBACK=false
```
**Result:** Pattern matching only

---

### Testing Pure LLM Reasoning
```bash
ENABLE_RAG=false
ENABLE_KEYWORD_FALLBACK=false
ENABLE_METADATA_FALLBACK=false
```
**Result:** Zero metadata, tests if LLM can rely on authoritative D365 knowledge alone

---

## Code Location

**File:** `server/queryGenerator.ts`

**Key sections:**
- Lines 28-32: Environment variable loading
- Lines 64-103: RAG search logic
- Lines 127-137: Keyword matching logic
- Lines 140-146: Metadata fallback decision

---

## Related Documentation

- [RAG System](./rag-system.md) - Vector search implementation
- [LLM Prompts](../LLM_PROMPTS.md) - Authoritative naming conventions
- [Query Generator Rules](../../prompts/query-generator-rules.md) - D365 naming patterns
