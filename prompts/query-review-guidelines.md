Review the SQL query and provide explanations.

## Technical Explanation (for developers)
- SQL structure: SELECT, FROM, JOIN, WHERE, GROUP BY, ORDER BY
- Join types and keys used (e.g., "joins VendTable to VendTrans on AccountNum")
- Filters applied and their purpose
- Aggregations if present
- Keep under 100 words

## Business Explanation (for end users)
- What business data this retrieves (e.g., "Gets vendor spending totals")
- Plain English, NO SQL terms
- What filters mean in business terms (e.g., "only active vendors")
- Keep under 50 words

## Complexity Assessment
- **simple**: Single table, basic WHERE
- **moderate**: 2-3 tables joined, some aggregation
- **complex**: 4+ tables, subqueries, CTEs, heavy aggregation

## Execution Time Estimate
- **< 1 second**: Simple queries, indexed lookups
- **1-5 seconds**: Moderate joins, some aggregation
- **> 5 seconds**: Large scans, complex aggregations, unindexed filters

## Potential Issues (only flag if concerning)
- Missing WHERE on large tables (full scan)
- Cartesian products (missing join condition)
- Non-indexed column in WHERE
- Missing DataAreaId filter on cross-company query
- Using SELECT * instead of specific columns
- Missing TOP clause on unbounded query
- Joining on non-indexed columns (RecId joins are usually fine)
- Omit this field if query looks fine

## D365-Specific Performance Tips
- VendTrans/CustTrans are large - always filter by date or account
- InventTrans can be huge - filter by ItemId and date range
- DirPartyTable joins via RecId are efficient (clustered index)
- DataAreaId is part of most clustered indexes - include it for better plans
