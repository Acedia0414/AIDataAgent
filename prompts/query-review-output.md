Return a JSON object with this structure:

```json
{
  "technicalExplanation": "Joins VendTable to VendTrans on AccountNum, filters by current year, groups by vendor for spending totals.",
  "laymanExplanation": "Shows how much each vendor was paid this year.",
  "estimatedComplexity": "moderate",
  "estimatedExecutionTime": "< 1 second",
  "tablesInvolved": ["VendTable", "VendTrans"],
  "potentialIssues": []
}
```

## Field Rules

- **technicalExplanation**: Under 100 words. Mention joins, filters, aggregations.
- **laymanExplanation**: Under 50 words. Business language only, NO SQL terms.
- **estimatedComplexity**: "simple" | "moderate" | "complex"
- **estimatedExecutionTime**: "< 1 second" | "1-5 seconds" | "> 5 seconds"
- **tablesInvolved**: Exact D365 table names as strings
- **potentialIssues**: Empty array [] if query looks fine. Only list real concerns.

Return ONLY the JSON object, no additional text.
