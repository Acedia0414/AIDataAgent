# LLM Improvements & Refactoring Tracker (2026-01-16)

This document tracks the tasks requested to improve D365 Data Agent, specifically focusing on model configuration, UI improvements, and stricter D365-specific logical behavior.

## Goals
1. **Model Upgrade**: Ensure default model is GPT-5.x.
2. **UI Simplification**: Simplify model usage display (Model Name + Cost).
3. **Smart Schema Inference**: Ensure the agent uses authoritative D365 table names (e.g., `VendTable`) instead of generic names (`vendors`) when schema is missing, to enable downstream features like "Copy Context".

## TODO List

### Part 1: Configuration & UI
- [x] **Verify & Update Model Config**: Change default model to GPT-5.x (or confirm configuration mechanism).
- [x] **Simplify UI**: Update the chat interface to show only Model Name and Pricing info.

### Part 2: Core Logic & Context Handling
- [x] **Refine Prompts**: Update `query-generator-system.md` (and others) to enforce `AxTable` (e.g. `VendTable`) naming conventions strictly.
- [x] **Enhance Mode B/C**: Ensure "missing schema" scenarios produce D365 valid table names in `tablesNeeded`.
  - Implemented `getAllAxTableNames` filesystem scanner.
  - Added "Validator Loop" in `queryGenerator.ts` to retry if LLM hallucinates generic names (e.g. `vendors`).
- [x] **Analyze "Copy Context" Dependency**: Done. "Copy Context" calls `getSchemaContext` which strictly looks for `${TableName}.xml` in `Ax/AxTable`. My validation loop fixes this by ensuring the LLM only outputs names that map to actual XML files (case-sensitive).

## Summary of Changes
1. **Model**: Switched to `gpt-5.1-2025-11-13`.
2. **UI**: Cleaned up the Badge (shown Name + Pricing only).
3. **Logic**: Implemented a "Validator Loop" in `queryGenerator.ts` that:
   - Scans `Ax/AxTable` for valid filenames.
   - Intercepts LLM hallucinations (e.g., `vendors` or `vendtable` lowercase).
   - Feeds a correction prompt back to the LLM.
   - Ensures the frontend always receives actionable D365 table names.
4. **Registry**: Refactored `getAllAxTableNames` into a robust `MetadataRegistry` singleton (`server/metadataRegistry.ts`) that:
   - Scans `AxTable`, `AxView`, and `AxDataEntityView`.
   - Updated `queryGenerator.ts` validation to use this registry.
   - Updated `routers.ts` schema fetching to use this registry for file paths.

## Next Steps
- **Parser Update Required**: `metadataParserV2.ts` currently throws if the XML root is not `AxTable`. It needs update to handle `AxView` and `AxDataEntityView` to fully support "Copy Context" for those objects.
- Monitor the logs to see how often the retry loop is triggered.



## Progress Log

- **2026-01-16**: Created tracker. Starting analysis of codebase.
