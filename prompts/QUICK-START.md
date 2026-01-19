# Prompts Folder - Quick Visual Guide

## 📁 Folder Structure

```
prompts/
├── README.md                          ← You are here!
│
├── 🤖 Query Generator (SQL Generation)
│   ├── query-generator-system.md      ← Who the AI is
│   ├── query-generator-rules.md       ← How it behaves
│   └── query-generator-output.md      ← Response format
│
├── 🎯 Intent Classifier (What user wants)
│   ├── intent-classifier-system.md    ← System role
│   ├── intent-classifier-categories.md ← Types of requests
│   ├── intent-classifier-multistep.md ← Multi-step detection
│   └── intent-classifier-output.md    ← Response format
│
├── 📊 Query Review (Explain SQL)
│   ├── query-review-system.md         ← System role
│   ├── query-review-guidelines.md     ← How to review
│   └── query-review-output.md         ← Response format
│
└── 💡 Result Insights (Analyze data)
    ├── result-insights-system.md      ← System role
    ├── result-insights-requirements.md ← What to analyze
    └── result-insights-output.md      ← Response format
```

## ✏️ How to Edit (3 Steps)

### 1. Find the File
Want to change how SQL queries are generated?
→ Edit `query-generator-rules.md`

Want to add new intent categories?
→ Edit `intent-classifier-categories.md`

Want better data insights?
→ Edit `result-insights-requirements.md`

### 2. Make Your Changes
Open the file in **any** text editor:
- Notepad (Windows)
- TextEdit (Mac)
- VS Code
- Any markdown editor

Just edit the text. That's it!

### 3. Restart Server
Save the file and restart the server.
Changes take effect immediately.

## 🎨 Examples

### Add a New Rule
**File**: `query-generator-rules.md`

**Before**:
```
1. Valid SQL Server (T-SQL) syntax only
2. Use relationships to join tables correctly
3. Only SELECT queries (no INSERT/UPDATE/DELETE)
```

**After**:
```
1. Valid SQL Server (T-SQL) syntax only
2. Use relationships to join tables correctly
3. Only SELECT queries (no INSERT/UPDATE/DELETE)
4. Always limit results to 1000 rows
5. Add comments explaining complex joins
```

### Change AI Tone
**File**: `result-insights-system.md`

**Before**:
```
You are an expert data analyst who provides clear, actionable insights from query results.
```

**After**:
```
You are a friendly data analyst who explains insights in simple, everyday language that anyone can understand.
```

### Modify Output Format
**File**: `query-generator-output.md`

**Before**:
```json
{
  "sql": "The generated SQL query",
  "explanation": "A brief explanation"
}
```

**After**:
```json
{
  "sql": "The generated SQL query",
  "explanation": "A clear explanation in business terms",
  "estimatedRows": "Approximate row count",
  "performance": "Fast/Medium/Slow"
}
```

## 🚫 What NOT to Edit

### System Prompt Files (Usually)
These files define the AI's role:
- `*-system.md` files

**Why?** These are fine-tuned. Change only if you know what you're doing.

**When is it OK?** To adjust tone or expertise level.

### Output Format Files (Carefully)
These define JSON structure:
- `*-output.md` files

**Why?** Changing these may break the code that reads the response.

**When is it OK?** Ask a developer first.

## ✅ Safe to Edit

### Rules Files
- `query-generator-rules.md` ← **Very safe!**

Add rules, remove rules, reorder - go crazy!

### Guidelines & Requirements
- `query-review-guidelines.md` ← **Safe!**
- `result-insights-requirements.md` ← **Safe!**

These tell the AI what to look for. Edit freely!

### Categories & Examples
- `intent-classifier-categories.md` ← **Safe!**

Add more examples to improve classification.

## 🔄 How It Works

```
┌─────────────────┐
│  You edit file  │  ← prompts/query-generator-rules.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Server restarts │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  File is read   │  ← prompt-loader.ts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cached 5 seconds│  ← Fast performance
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI uses it    │  ← Your changes are live!
└─────────────────┘
```

## 📝 Tips

### Test Small Changes First
1. Edit one file
2. Save
3. Restart
4. Test with a query
5. See if it works better

### Keep Backups
Before major changes:
```bash
cp query-generator-rules.md query-generator-rules.md.backup
```

### Use Version Control
If available:
```bash
git diff prompts/query-generator-rules.md  # See what changed
git checkout prompts/query-generator-rules.md  # Undo changes
```

### Add Comments
In markdown, you can add comments:
```markdown
<!-- This rule was added on Jan 15, 2026 to handle large datasets -->
1. Always limit results to 1000 rows
```

## 🎯 Common Use Cases

### Business Rule: Exclude Test Data
**File**: `query-generator-rules.md`
```
7. Always exclude records where CompanyId starts with 'TEST'
8. Filter out inactive or deleted records by default
```

### Better Intent Detection
**File**: `intent-classifier-categories.md`

Add company-specific terms:
```
**2. QUERY_REQUIRED**: Questions that require database queries

Examples:
- "Show me all customers"
- "Find vendors in California"
- **[NEW]** "Pull the PO list"
- **[NEW]** "What's in inventory?"
```

### Customize Insights
**File**: `result-insights-requirements.md`

Add business context:
```
**7. Business Context**
- Compare to last month/quarter/year
- Flag any values exceeding budget
- Highlight trends affecting revenue
```

## 🆘 Troubleshooting

### Changes Don't Work
✅ Did you save the file?
✅ Did you restart the server?
✅ Is the file in the `prompts/` folder?
✅ Did you edit the right file?

### AI Behaves Strangely
→ Revert your changes
→ Make smaller, incremental edits
→ Test each change individually

### Syntax Errors
→ Check for special characters
→ Make sure JSON in output files is valid
→ Remove any accidental formatting

## 📚 More Help

- See `prompts/README.md` for technical details
- Check `docs/EDITABLE_PROMPTS_GUIDE.md` for full guide
- Ask a developer for complex changes

---

**Remember**: These files control AI behavior. Edit with care, test thoroughly, and have fun! 🎉
