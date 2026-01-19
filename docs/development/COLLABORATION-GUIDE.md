# Collaboration Guide

This guide helps multiple developers work on this project without stepping on each other's toes.

## Quick Start for New Collaborators

```bash
# 1. Clone the repo
git clone https://github.com/codingEzio/d365-data-agent.git
cd d365-data-agent

# 2. Install dependencies
pnpm install

# 3. Copy env template and fill in your values
cp .env.example .env
# Edit .env with your credentials

# 4. Run database migrations (if using local MySQL)
pnpm db:push

# 5. Start development server
pnpm dev
```

---

## Git Workflow: Feature Branches

**Never commit directly to `master`.** Use feature branches instead.

### Branch Naming Convention

```
TYPE/SHORT-DESCRIPTION
```

| Type       | Use for                                    |
|------------|-------------------------------------------|
| `feat/`    | New features                              |
| `fix/`     | Bug fixes                                 |
| `refactor/`| Code restructuring (no behavior change)   |
| `docs/`    | Documentation only                        |
| `chore/`   | Build, config, dependencies              |
| `test/`    | Adding/fixing tests                       |

**Examples:**
- `feat/customer-import-endpoint`
- `fix/null-invoice-date`
- `refactor/split-routers`

### Daily Workflow

```bash
# 1. Start from latest master
git checkout master
git pull origin master

# 2. Create your feature branch
git checkout -b feat/your-feature-name

# 3. Work, commit small chunks
git add -p  # Stage interactively (review each change)
git commit -m "feat: add initial endpoint"

# 4. Push your branch
git push -u origin feat/your-feature-name

# 5. Create Pull Request on GitHub for review
# 6. After approval, merge (squash if many small commits)
```

### Staying Synced with Master

```bash
# While on your feature branch
git fetch origin
git rebase origin/master

# If conflicts, resolve them, then:
git add .
git rebase --continue
```

---

## Avoiding Conflicts: File Ownership Zones

This project has clear boundaries. Try to stay in your "zone" when possible.

### Project Structure Overview

```
d365-data-agent/
├── client/                   # Frontend (React)
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── pages/            # Page-level components
│       ├── hooks/            # Custom React hooks
│       ├── contexts/         # React contexts
│       └── lib/              # Utilities (trpc, etc.)
│
├── server/                   # Backend (Node.js/tRPC)
│   ├── _core/                # Entry point & core setup
│   ├── routers.ts            # Main API routes
│   ├── routers-admin.ts      # Admin-specific routes
│   ├── routers-config.ts     # Config routes
│   ├── routers-knowledge.ts  # Knowledge base routes
│   ├── queryGenerator.ts     # LLM query generation
│   ├── queryPipeline.ts      # Query orchestration
│   ├── queryExecutor.ts      # SQL execution
│   ├── metadataParser.ts     # D365 metadata parsing
│   ├── rag/                  # RAG implementation
│   └── database/             # DB schemas & helpers
│
├── shared/                   # Shared types between client/server
├── prompts/                  # LLM prompt templates
└── docs/                     # Documentation
```

### Recommended Ownership Split

| Area | Focus | Key Files |
|------|-------|-----------|
| **Frontend** | UI, UX, components | `client/src/**` |
| **Backend API** | Endpoints, auth | `server/routers*.ts`, `server/auth/` |
| **Query Engine** | LLM, SQL generation | `queryGenerator.ts`, `queryPipeline.ts` |
| **Metadata** | D365 parsing, RAG | `metadataParser.ts`, `rag/` |
| **Database** | Schema, migrations | `server/database/`, `drizzle/` |

**Coordinate** when touching:
- `server/routers.ts` (main API file - has many routes)
- `shared/` (affects both client and server)
- `.env.example` (new env vars)
- `package.json` (new dependencies)

---

## Conflict-Prone Files & Mitigation

### Problem: Large Files with Many Functions

**`server/routers.ts`** is a conflict magnet because it contains many routes.

**Solution:** We've already split into multiple router files. Continue this pattern:
- `routers.ts` - Core query/chat routes
- `routers-admin.ts` - Admin routes
- `routers-config.ts` - Configuration routes
- `routers-knowledge.ts` - Knowledge base routes

If adding new routes, consider: *Does this fit an existing file, or should it be a new `routers-*.ts`?*

### Problem: Shared Types

**Solution:** Add types incrementally, don't restructure existing ones without discussion.

```typescript
// Good: Add new interface
export interface NewFeatureInput {
  // ...
}

// Risky: Modifying existing interface many places depend on
export interface QueryInput {
  question: string;
  newRequiredField: string;  // ← Breaks existing code
}
```

### Problem: Migration Conflicts

**Solution:** Never edit existing migration files. Only add new ones.

```bash
# If you need schema changes:
pnpm db:push  # Generates new migration file with timestamp
```

---

## Communication Patterns

### Before Starting Work

1. Check GitHub Issues / PR list - is someone already working on this?
2. Quick message: "I'm working on X, touching files A, B, C"
3. If uncertain about approach, discuss first

### Commit Message Format

```
TYPE: short summary (max 50 chars)

Optional body explaining:
- What changed
- Why it changed
- Any caveats
```

**Examples:**
```
feat: add customer import endpoint

- POST /api/customers/import accepts CSV
- Validates required fields before insert
- Returns summary of imported/skipped rows
```

```
fix: handle null invoice date in query

The D365 export sometimes has NULL InvoiceDate.
Added COALESCE fallback to prevent query errors.
```

### Pull Request Template

When creating a PR, include:

```markdown
## What does this PR do?
Brief description of changes

## How to test
1. Step one
2. Step two
3. Expected result

## Files changed
- `server/routers.ts` - Added new endpoint
- `client/src/pages/Import.tsx` - New import UI

## Checklist
- [ ] Tested locally
- [ ] No TypeScript errors (`pnpm check`)
- [ ] Updated docs if needed
```

---

## Local Environment Differences

Each developer will have different:
- Database credentials
- API keys
- Port preferences

### .env.example Discipline

When adding new env vars:

1. Add to `.env.example` with description
2. Add fallback/default in code where sensible
3. Document in this guide if it's critical

```typescript
// Good: Fallback for optional config
const port = process.env.PORT || 5000;

// Good: Clear error for required config
if (!process.env.AZURE_SQL_SERVER) {
  throw new Error('AZURE_SQL_SERVER is required');
}
```

---

## Testing Before Push

```bash
# Quick checklist before pushing:
pnpm check          # TypeScript errors
pnpm test           # Run tests
pnpm lint:md        # Markdown linting (optional)

# If all pass, safe to push
```

---

## Resolving Conflicts

### Simple Text Conflicts

```bash
# After git rebase or merge shows conflicts:
# 1. Open conflicted file
# 2. Look for <<<<<<< and >>>>>>> markers
# 3. Choose the correct version (or combine)
# 4. Remove the markers
# 5. git add <file>
# 6. git rebase --continue
```

### Complex Conflicts

If a merge looks scary:

```bash
# Abort and discuss
git rebase --abort

# Or save your work and start fresh
git stash
git checkout master
git pull
# Discuss with teammate, then reapply
```

---

## Emergency Procedures

### I Pushed to Master by Accident

```bash
# If no one else has pulled yet:
git reset --hard HEAD~1
git push --force-with-lease

# If others have pulled, DON'T force push
# Create a revert commit instead:
git revert HEAD
git push
```

### My Branch is a Mess

```bash
# Save your actual changes
git diff > my-changes.patch

# Reset to clean state
git checkout master
git pull
git checkout -b feat/clean-restart

# Reapply your changes manually or:
git apply my-changes.patch
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start fresh branch | `git checkout master && git pull && git checkout -b feat/name` |
| See what you changed | `git status` and `git diff` |
| Stage specific lines | `git add -p` |
| Sync with master | `git fetch origin && git rebase origin/master` |
| Check before push | `pnpm check && pnpm test` |
| Push new branch | `git push -u origin feat/name` |

---

## Recommended Reading

- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [How to Write a Git Commit Message](https://cbea.ms/git-commit/)
