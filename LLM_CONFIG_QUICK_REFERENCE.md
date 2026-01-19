# LLM Configuration - Quick Reference

## 🎯 TL;DR - What Changed

You can now **always see** which LLM model is running and **easily control** which one to use.

### Where to See Active Model

**Header Badge** (easiest way)
```
┌─────────────────────────────────────────┐
│ 🏠 D365 F&O Data Agent  💻 gemini-3-flash-preview  │
│                         ↑                      │
│                         Shows active model    │
└─────────────────────────────────────────┘
```

Hover over the badge to see:
- Model name
- Provider type
- Temperature setting
- Max tokens setting

**Server Logs** (for debugging)
```
[LLM] invoke {
  url: 'https://oneapi.laisky.com/v1/chat/completions',
  model: 'gemini-3-flash-preview',
  configSource: 'database',  ← Where config came from
  ...
}
```

## 🔧 How to Change the Model

### Option 1: Use Database Config (Recommended)

1. Click **Settings** → **LLM Config** in the header
2. Click **Add New Configuration**
3. Fill in provider details and click **Create**
4. Click **Set Active** on the new config
5. Done! The header badge updates immediately

### Option 2: Edit .env (For Fallback)

```bash
# Add or update in .env
LLM_MODEL=gemini-3-flash-preview  # or your preferred model
LLM_API_KEY=sk-...
LLM_API_URL=https://oneapi.laisky.com
```

Restart the server. This is the fallback if no database config exists.

## 📊 Config Resolution Order

When LLM makes a request:

```
┌─────────────────────────┐
│  Database Config Exists? │
└──────────────┬──────────┘
              YES ✓
              │
              ├─→ Use database config
              │   (configSource: "database")
              │
NO ✗
│
├─→ .env variables available?
    │
    YES ✓
    │
    ├─→ Use .env: LLM_MODEL, LLM_API_KEY, LLM_API_URL
    │   (configSource: "env-fallback")
    │
    NO ✗
    │
    └─→ ERROR: No LLM configured
```

## 🚀 Real-World Examples

### Example 1: Start Fresh
```
1. You just deployed the app
2. Check header: Shows no LLM badge (no database config yet)
3. Server uses .env fallback: gemini-3-flash-preview
4. Logs show: configSource: "env-fallback"
```

### Example 2: Add Production OpenAI Config
```
1. Go to Settings → LLM Config
2. Click Add New Configuration
3. Select "OpenAI" provider
4. Enter API key: sk-...
5. Select model: gpt-4o
6. Click Create
7. Click Set Active
8. Header updates: Shows "gpt-4o"
9. Logs now show: configSource: "database"
```

### Example 3: Switch Between Models
```
Current: Using gemini-3-flash-preview from database
Want to try: gpt-4o-mini for cost savings

1. Go to Settings → LLM Config
2. Add second config for gpt-4o-mini
3. Test it with "Test" button
4. Click "Set Active" to switch
5. Header badge updates immediately
6. All subsequent queries use gpt-4o-mini
```

## 🔍 Debugging

### "Why is my config not being used?"

Check in this order:

1. **Is the config set as Active?**
   - Go to LLM Config page
   - Look for green border around your config
   - If not green, click "Set Active"

2. **Check server logs**
   ```
   Look for: [LLM] invoke
   Check configSource field:
   - "database" = Config is being used ✓
   - "env-fallback" = Config NOT active, using .env ✗
   ```

3. **Check header badge**
   - Should show your model name
   - If wrong, click Set Active again

4. **Restart server if needed**
   - Changes should be instant
   - But sometimes a restart helps

### "Config keeps switching to default"

Possible causes:

1. **Multiple active configs** - Only one can be active
   - Go to LLM Config page
   - Look for multiple green borders
   - Click Set Active on the one you want

2. **Database connection failed** - Falls back to .env
   - Check database is running
   - Check logs for database errors
   - .env fallback is working as intended

3. **API key expired/invalid** - Test the config
   - Go to LLM Config page
   - Find your config
   - Click "Test" button
   - Fix any errors shown

## 🎓 Understanding Each Part

### Config Source Values

```
configSource = "database"
  → Using your saved database config
  → Model, API key, temperature all from database
  → Most reliable, persists across restarts

configSource = "env-fallback"
  → Database config missing or failed to load
  → Using .env variables as fallback
  → Good for development/testing
  → Lost if .env is reset

configSource = "env-default"
  → Should not normally see this
  → Using hardcoded defaults (very rare)
```

### What Each Setting Does

| Setting | Effect | Example |
|---------|--------|---------|
| **Model** | Which LLM engine to use | `gemini-3-flash-preview`, `gpt-4o` |
| **API Key** | Authentication token | `sk-...` (hidden in UI) |
| **Endpoint** | API server location | `https://api.openai.com` |
| **Temperature** | Randomness (0-100) | 50 = balanced, 0 = deterministic, 100 = creative |
| **Max Tokens** | Max response length | 4000 tokens ≈ 3000 words |

## 📝 Environment Variables

Add these to `.env` if you want to customize defaults:

```bash
# Required
LLM_API_URL=https://oneapi.laisky.com
LLM_API_KEY=sk-...your-key...

# Optional - explicit fallback model
LLM_MODEL=gemini-3-flash-preview

# Optional - Manus built-in LLM
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=...
```

## ✅ Checklist: "Did I configure LLM correctly?"

- [ ] Can see model name in header badge
- [ ] Hovering badge shows all details
- [ ] Server logs show `[LLM] invoke` with my model
- [ ] `configSource` is "database" (not "env-fallback")
- [ ] "Test" button works without errors
- [ ] Can switch between configs quickly
- [ ] Can delete inactive configs
- [ ] Can't delete active config (good!)

## 🆘 Still Having Issues?

1. **Check the detailed guide**: [LLM_CONFIG_FIXES.md](LLM_CONFIG_FIXES.md)
2. **View console logs**: Press F12 → Console → Search `[LLM]`
3. **Verify .env file**: Make sure `LLM_API_KEY` and `LLM_API_URL` are set
4. **Restart server**: Sometimes needed after config changes
5. **Test connection**: Use "Test" button on config to validate
