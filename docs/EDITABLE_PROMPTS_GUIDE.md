# Editable Prompts System - User Guide

## Overview

**The LLM prompts are now stored in separate markdown files in the `prompts/` folder!**

Non-technical users (business analysts, product managers, QA team) can now directly modify AI prompts without touching code.

## Quick Start

### Where Are the Prompts?

📁 **Folder**: `/prompts/` directory (in the root)

Key files:
- [`query-generator-system.md`](../prompts/query-generator-system.md) - Core SQL generation instructions
- [`query-generator-output.md`](../prompts/query-generator-output.md) - Output format specification
- [`intent-classifier-system.md`](../prompts/intent-classifier-system.md) - Question classification logic
- [`multi-step-workflow-system.md`](../prompts/multi-step-workflow-system.md) - Complex query handling

###  Who Can Edit?

✅ **Anyone** - No coding skills required!
✅ Business analysts
✅ Product managers
✅ QA team
✅ Domain experts

### How to Edit

1. Open the relevant prompt file in `/prompts/` folder (e.g., `query-generator-system.md`)
2. Find the section you want to modify
3. Edit the text in plain English (follows Markdown format)
4. Save the file
5. Restart the application (prompts load automatically)

## Query Generation Modes

The system now supports **three modes** for handling queries:

### Mode A - Schema Provided
Full table/column/relationship context is available. LLM generates SQL using only provided columns.

### Mode B - Schema Missing
Tables or columns are not available. LLM returns empty SQL and requests specific metadata files.

### Mode C - Inferred Standard D365 Tables (NEW!)
When standard D365 tables (like `DirPartyTable`, `CompanyInfo`) are missing, LLM uses built-in D365 knowledge to infer the schema and generate working SQL anyway.

**Confidence Levels:**
- `high` - Full schema provided
- `medium` - Partial schema, some assumptions
- `inferred` - Standard D365 tables assumed from built-in knowledge

## File Structure

The `prompts/` folder is organized into clear files:

```
prompts/
├── query-generator-system.md       # Core SQL generation logic
│   ├── Mode A (schema provided)
│   ├── Mode B (schema missing)
│   └── Mode C (inferred D365 tables) ← NEW
│
├── query-generator-output.md       # Output format specification
│   ├── JSON structure
│   ├── Confidence levels (high/medium/inferred)
│   └── assumedSchema field ← NEW
│
├── intent-classifier-system.md     # Question classification
├── multi-step-workflow-system.md   # Complex query handling
├── query-review-system.md          # SQL review logic
└── result-insights-system.md       # Result analysis
```

## Examples: What You Can Edit

### Example 1: Adding a New Rule

**Before:**
```markdown
#### RULES
1. Valid SQL Server (T-SQL) syntax only
2. Use relationships to join tables correctly
3. Only SELECT queries (no INSERT/UPDATE/DELETE)
```

**After:**
```markdown
#### RULES
1. Valid SQL Server (T-SQL) syntax only
2. Use relationships to join tables correctly
3. Only SELECT queries (no INSERT/UPDATE/DELETE)
4. Always limit results to 1000 rows unless specified
5. Include execution time estimates for complex queries
```

### Example 2: Updating Security Guidelines

**Before:**
```markdown
#### SECURITY
- User Roles: {userSecurityRoles}
- Only generate queries within user's access level
```

**After:**
```markdown
#### SECURITY
- User Roles: {userSecurityRoles}
- Only generate queries within user's access level
- Never expose personally identifiable information (PII)
- Log all queries accessing financial data
- Require manager approval for queries over 10,000 rows
```

### Example 3: Clarifying Output Format

**Before:**
```markdown
#### OUTPUT_FORMAT
Provide your response as a JSON object with the following structure:
{
  "sql": "The generated SQL query",
  "explanation": "A brief explanation"
}
```

**After:**
```markdown
#### OUTPUT_FORMAT
Provide your response as a JSON object with the following structure:
{
  "sql": "The generated SQL query (must be executable T-SQL)",
  "explanation": "A clear explanation in business terms, avoiding technical jargon",
  "estimatedRows": "Approximate number of rows this query will return",
  "performanceWarning": "Any potential performance concerns"
}
```

## Important: Variables (Don't Remove These!)

Variables are marked with curly braces `{variableName}` and get replaced with real data:

| Variable | Purpose | Example |
|----------|---------|---------|
| `{userSecurityRoles}` | User's access roles | "Admin, Finance Manager" |
| `{metadataContext}` | Database schema info | Table and column definitions |
| `{hintsText}` | Query-specific guidance | "Use COUNT(DISTINCT)" |
| `{originalQuestion}` | User's question | "Show me all customers" |
| `{sql}` | Generated SQL query | "SELECT * FROM..." |
| `{historyContext}` | Previous conversation | Last 5 messages |
| `{userMessage}` | Current user input | "Export to Excel" |

⚠️ **WARNING**: Do not remove these variables - the system needs them!

## How It Works Technically

```
┌──────────────┐
│ prompts.md   │  ← Non-technical users edit this
│ (Plain text) │
└──────┬───────┘
       │
       │ Read & Parse
       ▼
┌──────────────────┐
│ prompt-loader.ts │  ← Reads the markdown file
│ (Parser)         │
└──────┬───────────┘
       │
       │ Load into memory
       ▼
┌──────────────────┐
│ llm-prompts.ts   │  ← Provides API to code
│ (API Layer)      │
└──────┬───────────┘
       │
       │ Used by
       ▼
┌──────────────────────────────┐
│ Application Code              │
│ - queryGenerator.ts           │
│ - intentClassifier.ts         │
│ - queryPipeline.ts            │
│ - resultInsightsGenerator.ts  │
└───────────────────────────────┘
```

## Performance & Caching

- **File is read once** on startup
- **Cached in memory** for fast access
- **Auto-reloads** if file changes (checks modification time)
- **No performance impact** on AI calls

## Testing Your Changes

1. **Make a small edit** (e.g., add one rule)
2. **Save the file**
3. **Restart the server** (or wait for hot-reload)
4. **Test with a sample query**
5. **Check the AI response** - does it follow your new rule?

### Example Test

1. Edit `prompts.md` and add: "Always explain queries in simple terms"
2. Save and restart
3. Ask: "Show me all customers"
4. Check if the explanation is simpler than before

## Best Practices

### ✅ DO:

- **Keep prompts clear and specific**
- **Use bullet points for rules**
- **Add examples where helpful**
- **Test changes with sample queries**
- **Keep a backup before major changes**
- **Document why you made changes** (in file comments)

### ❌ DON'T:

- **Remove required sections** (ROLE, TASK, OUTPUT_FORMAT)
- **Delete variable placeholders** ({variableName})
- **Make prompts too long** (slower AI response + higher cost)
- **Use ambiguous language** (be specific!)
- **Edit while server is running** (changes may not apply until restart)

## Real-World Scenarios

### Scenario 1: Business Wants Stricter Security

**Problem**: AI generates queries that access sensitive data too freely

**Solution**: Edit the SECURITY section in QUERY GENERATOR:
```markdown
#### SECURITY
- User Roles: {userSecurityRoles}
- Only generate queries within user's access level
- **NEW** Never include SSN, credit card, or salary fields
- **NEW** Require explicit user confirmation for employee data
- **NEW** Log all queries accessing EmployeeTable
```

### Scenario 2: Improve Intent Classification

**Problem**: AI misclassifies file generation requests

**Solution**: Add more examples in INTENT CLASSIFIER:
```markdown
**3. FILE_GENERATION**: Questions that require running queries AND generating downloadable files

Examples:
- "Generate an Excel report of all sales orders from Q4"
- "Create a spreadsheet with customer details"
- "Export all inventory items to Excel"
- **NEW** "I need a report showing..."
- **NEW** "Can you create a file with..."
- **NEW** "Download customer list"
```

### Scenario 3: Add Domain-Specific Rules

**Problem**: AI doesn't understand company-specific business rules

**Solution**: Add custom rules in QUERY GENERATOR:
```markdown
#### RULES
1. Valid SQL Server (T-SQL) syntax only
2. Use relationships to join tables correctly
3. Only SELECT queries (no INSERT/UPDATE/DELETE)
4. Don't add DataAreaId filter unless user specifies company
5. Use meaningful aliases
6. **NEW** For inventory queries, always filter out items with status 'Obsolete'
7. **NEW** Financial queries must include fiscal year in the WHERE clause
8. **NEW** Customer queries should default to active customers only
```

## Troubleshooting

### Issue: Changes Don't Take Effect

**Solution**: Restart the application. The file is cached in memory.

### Issue: Syntax Errors After Editing

**Check**:
1. Did you accidentally remove a variable like `{userMessage}`?
2. Did you delete a required section header?
3. Did you break the markdown formatting?

**Fix**: Compare with the original file or restore from backup

### Issue: AI Behavior Is Worse After Changes

**Solution**: Revert your changes and test incrementally:
1. Restore the original `prompts.md`
2. Make ONE small change
3. Test thoroughly
4. Repeat until you find the problematic change

## Version Control

Good practice: Use git to track prompt changes

```bash
# Before making changes
git add prompts.md
git commit -m "Before: Update query generator rules"

# After making changes
git add prompts.md
git commit -m "After: Added stricter security rules for sensitive data"

# To revert if needed
git checkout HEAD~1 prompts.md
```

## Need Help?

1. **Check the built-in editing guide** in `prompts.md` (bottom of file)
2. **Review examples** in this document
3. **Ask a developer** to review before major changes
4. **Test in development** environment first
5. **Read the technical docs** at [docs/LLM_PROMPTS.md](LLM_PROMPTS.md)

## Summary

✨ **Key Takeaways**:
- Prompts are in `prompts.md` (plain text, easy to edit)
- No coding skills needed
- Changes take effect after restart
- Always test your changes
- Keep backups before major edits

🎯 **Benefits**:
- Faster iteration on AI behavior
- Non-technical team members can contribute
- Clear structure with sections (RULES, SECURITY, etc.)
- No need to wait for developers
- Easy to track changes with version control

---

**Happy editing! 🚀**
