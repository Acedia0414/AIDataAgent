# Prompts Folder

This folder contains all AI prompts used in the system.

## Structure

Each prompt is in a separate markdown file for easy editing:

### Query Generator
- `query-generator-system.md` - Who the AI is
- `query-generator-rules.md` - How it should behave
- `query-generator-output.md` - Expected response format

### Intent Classifier
- `intent-classifier-system.md` - System prompt
- `intent-classifier-categories.md` - Types of intents
- `intent-classifier-multistep.md` - Multi-step detection
- `intent-classifier-output.md` - Response format

### Query Review
- `query-review-system.md` - System prompt
- `query-review-guidelines.md` - Review guidelines
- `query-review-output.md` - Response format

### Result Insights
- `result-insights-system.md` - System prompt
- `result-insights-requirements.md` - Analysis requirements
- `result-insights-output.md` - Response format

## How to Edit

1. Find the file you want to modify
2. Open it in any text editor
3. Make your changes
4. Save the file
5. Restart the server

**That's it!** No coding needed.

## Examples

**To add a new rule:**
Edit `query-generator-rules.md`:
```
1. Valid SQL Server (T-SQL) syntax only
2. Use relationships to join tables correctly
3. [YOUR NEW RULE HERE]
```

**To change AI behavior:**
Edit any system prompt file to change how the AI responds.

## Backlog Items

- Security rule validation (disabled for demo)
- User role-based prompts (disabled for demo)
- Advanced permission checks (disabled for demo)
