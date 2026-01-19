# LLM Configuration Fixes - January 16, 2026

## Problem Statement

The LLM API was always falling back to `gemini-3-flash-preview` for an unclear reason, making it difficult to debug and control which model is actually being used. The issues were:

1. **Hardcoded Fallback Mismatch**: `llm.ts` had `gpt-4o-mini-2024-07-18` as fallback, but the actual running model was `gemini-3-flash-preview` from `.env`
2. **No Visibility**: No clear logging showing which config source was being used (database, env variables, or fallback)
3. **Config Page Issues**: The LLMSettings page lacked proper validation and feedback
4. **No UI Indicator**: Users couldn't see which model was active without checking logs or database

## Root Cause

The system has a 3-level fallback hierarchy:
```
Database Config (highest priority)
    ↓ (if fails)
Environment Variables (.env)
    ↓ (if fails)
Hardcoded Fallbacks
```

The problem was that the hardcoded fallback didn't match what was in `.env`, causing confusion when the database config was unavailable.

## Solutions Implemented

### 1. ✅ Fixed LLM Fallback Defaults
**Files**: `server/_core/env.ts`, `server/_core/llm.ts`, `.env`

- Added `LLM_MODEL` environment variable support in `env.ts`
- Updated fallback in `llm.ts` to use `ENV.llmModel` instead of hardcoded `gpt-4o-mini-2024-07-18`
- Set default to `gemini-3-flash-preview` (matching current setup)
- Added `LLM_MODEL=gemini-3-flash-preview` to `.env`

```typescript
// Before
let activeModel = "gpt-4o-mini-2024-07-18"; // Wrong!

// After
let activeModel = ENV.llmModel; // From .env or default "gemini-3-flash-preview"
```

### 2. ✅ Added Config Source Tracking
**File**: `server/_core/llm.ts`

Added `configSource` variable to track where the active config came from:
```typescript
let configSource = "env-default"; // Initialize with env default

// When database config loads successfully:
configSource = "database"; // Changed to database

// When database config fails:
configSource = "env-fallback"; // Falls back to env
```

### 3. ✅ Enhanced LLM Request Logging
**File**: `server/_core/llm.ts`

Updated console.log to include config source:
```typescript
console.log('[LLM] invoke', {
  url: apiUrl,
  model: activeModel,
  configSource,  // NEW - shows where config came from
  messages: messages.length,
  tools: tools?.length || 0,
  maxTokens: activeMaxTokens,
  temperature: activeTemperature,
  previews: messagePreview,
});
```

**What you'll see in logs:**
```
[LLM] invoke {
  url: 'https://oneapi.laisky.com/v1/chat/completions',
  model: 'gemini-3-flash-preview',
  configSource: 'database',  ← Shows this is from your database config
  messages: 2,
  tools: 0,
  maxTokens: 4000,
  temperature: 0.5,
  previews: [...]
}
```

### 4. ✅ Fixed LLMSettings Page Validation
**File**: `client/src/pages/LLMSettings.tsx`

Added form validation in `handleCreate`:
- Validates model selection is not empty
- Requires API key for external providers
- Requires endpoint for custom/Azure providers
- Requires deployment name for Azure OpenAI
- Shows clear error messages via toast notifications

### 5. ✅ Added Visual LLM Indicator
**File**: `client/src/components/PageHeader.tsx`

Added a badge in the header showing the active LLM model:
- Always visible in the top navigation
- Shows: `[icon] gemini-3-flash-preview`
- Hover tooltip shows full details:
  - Model name
  - Provider
  - Temperature & Max Tokens
  - Link to LLM Config page
- Makes it immediately obvious which model is running

## Usage Guide

### Checking Which Model is Active

**Method 1: UI Badge (Easiest)**
- Look at the top header - you'll see a small badge with the model name
- Hover over it to see full details

**Method 2: Console Logs**
- Open browser console (F12)
- Look for `[LLM] invoke` logs
- Check the `configSource` field to see if it's using:
  - `"database"` - Your database config is active
  - `"env-default"` - Using .env variables (no database config)
  - `"env-fallback"` - Database load failed, fell back to .env

### Creating a New LLM Configuration

1. Go to **Settings → LLM Config** in the header
2. Click **Add New Configuration**
3. Select provider type:
   - **Custom Provider** - Use any OpenAI-compatible API (like Laisky)
   - **OpenAI** - Use OpenAI's API directly
   - **Azure OpenAI** - Use Azure deployment
   - **Manus Built-in** - Built-in LLM (no API key needed)
4. Fill in required fields (form will validate and show errors)
5. Click **Create Configuration**
6. Click **Set Active** to use this configuration
7. (Optional) Click **Test** to verify connectivity

### Changing Which Model to Use

1. Go to **Settings → LLM Config**
2. In the "Saved Configurations" section, click **Set Active** on the config you want
3. The active config will be highlighted and used immediately
4. The header badge will update to show the new model

### Debugging Why Wrong Model is Used

1. **Check the header badge** - Does it show the model you expect?
2. **Check console logs** - Open F12, search for `[LLM]`
3. **Verify database config exists** - Go to LLM Config page, is there an "Active Configuration" card?
4. **Check .env as fallback** - If no database config, what's in `LLM_MODEL=` in your `.env`?

## Environment Variables

### Required Variables in `.env`

```bash
# Cloud LLM API (Laisky endpoint)
LLM_API_URL=https://oneapi.laisky.com
LLM_API_KEY=sk-...your-key...

# Default model when database config unavailable
LLM_MODEL=gemini-3-flash-preview

# Optional: Manus built-in LLM
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=...
```

## Technical Details

### Configuration Resolution Order

When `invokeLLM` is called:

1. **Load from Database** (if available & configured)
   - Model, API key, temperature, max tokens
   - Provider-specific settings (endpoint, deployment name)
   - `configSource = "database"`

2. **Fall back to .env Variables** (if database load fails)
   - Uses `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL` from `.env`
   - Uses `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` if available
   - `configSource = "env-fallback"`

3. **Error** (if both fail)
   - Throws error: "LLM_API_KEY or BUILT_IN_FORGE_API_KEY is not configured"

### Database Schema

Configuration stored in `llm_configurations` table:
```sql
id           INT          -- Primary key
provider     ENUM         -- 'openai', 'azure_openai', 'manus_builtin', 'custom'
model        VARCHAR(100) -- Model ID (e.g., 'gpt-4', 'gemini-3-flash-preview')
apiKey       TEXT         -- Encrypted API key
endpoint     VARCHAR(500) -- Custom endpoint (optional)
deploymentName VARCHAR(255) -- Azure deployment name (optional)
temperature  INT          -- 0-100 (converted to 0.0-1.0 for API)
maxTokens    INT          -- Max response tokens
isActive     BOOLEAN      -- Only one config can be active at a time
lastTestedAt TIMESTAMP    -- When connection was last verified
createdAt    TIMESTAMP
updatedAt    TIMESTAMP
```

## Testing Checklist

- [ ] Header badge shows the correct model
- [ ] Hover tooltip shows full LLM details
- [ ] Create new LLM config and validation works
- [ ] Set config as active and header badge updates
- [ ] Test config connectivity with "Test" button
- [ ] Console logs show `[LLM] invoke` with correct configSource
- [ ] Deleting inactive configs works
- [ ] Can't delete active config (prevents accidental removal)
- [ ] Form validation prevents invalid configurations

## Files Modified

1. `server/_core/env.ts` - Added `llmModel` field
2. `server/_core/llm.ts` - Fixed fallback, added config source tracking & logging
3. `.env` - Added `LLM_MODEL` variable
4. `client/src/pages/LLMSettings.tsx` - Added form validation
5. `client/src/components/PageHeader.tsx` - Added LLM status badge

## Commit

```bash
git commit -m "fix: LLM config visibility and fallback defaults

- Add LLM_MODEL env var support for explicit model selection
- Fix fallback model to match .env (gemini-3-flash-preview)
- Add configSource tracking: database|env-fallback|env-default
- Log which config source is being used in [LLM] invoke logs
- Add form validation to LLMSettings page
- Add visual LLM model badge in page header
- Header badge shows active model + tooltip with full details
"
```

## Next Steps

### Enhancement Ideas

1. **Model Performance Metrics**
   - Log response time, token usage per model
   - Track cost per request based on pricing

2. **Fallback Strategy**
   - Auto-fallback if primary LLM fails
   - Implement retry logic with exponential backoff

3. **Cost Tracking**
   - Dashboard showing cost per provider
   - Usage statistics and trends

4. **Model Recommendations**
   - Suggest models based on query complexity
   - Auto-select based on token usage predictions

## References

- Database Config API: [routers-config.ts](server/routers-config.ts)
- LLM Core Logic: [llm.ts](server/_core/llm.ts)
- Settings UI: [LLMSettings.tsx](client/src/pages/LLMSettings.tsx)
- Header Component: [PageHeader.tsx](client/src/components/PageHeader.tsx)
