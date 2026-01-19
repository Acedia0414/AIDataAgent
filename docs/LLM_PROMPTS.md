# LLM Prompts Configuration

## Overview

All LLM prompts have been centralized in [llm-prompts.ts](./server/llm-prompts.ts) for better maintainability, testability, and version control.

## Benefits

- ✅ **Centralized Management**: All prompts in one place
- ✅ **Type Safety**: TypeScript interfaces for prompt contexts
- ✅ **Easy Testing**: Prompts can be unit tested independently
- ✅ **Version Control**: Track prompt changes over time
- ✅ **Reusability**: Shared prompts across multiple modules
- ✅ **Dynamic Generation**: Prompts are functions that accept context

## Structure

### Prompt Categories

1. **Query Generation** - Converts natural language to SQL
2. **Intent Classification** - Determines user intent (QA, Query, File Generation)
3. **Query Review** - Provides technical and layman explanations
4. **Result Insights** - Analyzes query results for patterns and insights
5. **Knowledge Base** - Context-aware SQL generation (future use)

### File Organization

```typescript
// Each prompt category has:
- Context Interface (defines required parameters)
- System Prompt (constant or function)
- User Prompt (function that accepts context)

// Example:
export interface QueryGeneratorContext {
  metadataContext: string;
  hintsText: string;
  userSecurityRoles: string[];
}

export function getQueryGeneratorSystemPrompt(context: QueryGeneratorContext): string {
  return `Formatted prompt with ${context.metadataContext}...`;
}
```

## Usage Examples

### Query Generator

```typescript
import { getQueryGeneratorSystemPrompt } from "./llm-prompts";

const systemPrompt = getQueryGeneratorSystemPrompt({
  metadataContext: "Schema information...",
  hintsText: "Query hints...",
  userSecurityRoles: ["Admin", "Finance"],
});

const response = await invokeLLM({
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userQuestion },
  ],
});
```

### Intent Classifier

```typescript
import {
  INTENT_CLASSIFIER_SYSTEM_PROMPT,
  getIntentClassificationPrompt,
} from "./llm-prompts";

const userPrompt = getIntentClassificationPrompt({
  userMessage: "Show me all customers",
  historyContext: "Previous conversation...",
});

const response = await invokeLLM({
  messages: [
    { role: "system", content: INTENT_CLASSIFIER_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ],
});
```

### Query Review

```typescript
import {
  QUERY_REVIEW_SYSTEM_PROMPT,
  getQueryReviewPrompt,
} from "./llm-prompts";

const reviewPrompt = getQueryReviewPrompt({
  sql: "SELECT * FROM CustTable WHERE...",
  originalQuestion: "Show me all customers",
});

const response = await invokeLLM({
  messages: [
    { role: "system", content: QUERY_REVIEW_SYSTEM_PROMPT },
    { role: "user", content: reviewPrompt },
  ],
});
```

### Result Insights

```typescript
import {
  RESULT_INSIGHTS_SYSTEM_PROMPT,
  getResultInsightsPrompt,
} from "./llm-prompts";

const insightsPrompt = getResultInsightsPrompt({
  originalQuestion: "Show me sales trends",
  sql: "SELECT...",
  rowCount: 150,
  sampleSize: 100,
  columns: ["CustomerName", "TotalSales"],
  sampleData: [...],
});

const response = await invokeLLM({
  messages: [
    { role: "system", content: RESULT_INSIGHTS_SYSTEM_PROMPT },
    { role: "user", content: insightsPrompt },
  ],
});
```

## Migrated Files

The following files now use centralized prompts:

- ✅ [server/queryGenerator.ts](./server/queryGenerator.ts)
- ✅ [server/intentClassifier.ts](./server/intentClassifier.ts)
- ✅ [server/queryPipeline.ts](./server/queryPipeline.ts)
- ✅ [server/resultInsightsGenerator.ts](./server/resultInsightsGenerator.ts)

## Adding New Prompts

To add a new prompt:

1. **Define the context interface** in `llm-prompts.ts`:
```typescript
export interface MyNewPromptContext {
  param1: string;
  param2: number;
}
```

2. **Create the prompt function**:
```typescript
export function getMyNewPrompt(context: MyNewPromptContext): string {
  return `Your prompt template with ${context.param1}...`;
}
```

3. **Add to LLM_PROMPTS export**:
```typescript
export const LLM_PROMPTS = {
  // ... existing prompts
  myNewPrompt: {
    system: "System prompt constant or function",
    user: getMyNewPrompt,
  },
} as const;
```

4. **Use in your code**:
```typescript
import { getMyNewPrompt } from "./llm-prompts";

const prompt = getMyNewPrompt({ param1: "value", param2: 42 });
```

## Environment-Based Prompts (Future Enhancement)

Consider adding environment variables for prompt customization:

```typescript
// .env
LLM_QUERY_GENERATOR_TEMPERATURE=0.7
LLM_QUERY_GENERATOR_CUSTOM_RULES="Additional rules..."

// llm-prompts.ts
const customRules = process.env.LLM_QUERY_GENERATOR_CUSTOM_RULES || "";
```

## Testing Prompts

Prompts can now be tested independently:

```typescript
import { getQueryGeneratorSystemPrompt } from "./llm-prompts";

describe("Query Generator Prompts", () => {
  it("should include metadata context", () => {
    const prompt = getQueryGeneratorSystemPrompt({
      metadataContext: "CustTable: Id, Name",
      hintsText: "",
      userSecurityRoles: ["Admin"],
    });

    expect(prompt).toContain("CustTable: Id, Name");
    expect(prompt).toContain("Admin");
  });
});
```

## Version History

### v1.0.0 (Current)
- Initial migration of all hardcoded prompts to centralized configuration
- Support for Query Generation, Intent Classification, Query Review, and Result Insights
- Type-safe context interfaces for all prompts

## Best Practices

1. **Always use type-safe contexts** - Define interfaces for all prompt parameters
2. **Keep prompts modular** - Separate system and user prompts when applicable
3. **Document expected outputs** - Include JSON schema examples in prompt comments
4. **Test prompt changes** - Verify LLM outputs after modifying prompts
5. **Version control** - Track prompt changes in git history for regression analysis
6. **Performance considerations** - Shorter prompts = faster responses and lower costs

## Related Documentation

- [LLM Core Implementation](./server/_core/llm.ts)
- [Query Pipeline](./server/queryPipeline.ts)
- [API Documentation](./API_DOCUMENTATION.md)
