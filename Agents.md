# AGENTS.md — Copilot Agent Instructions

## Forward-Looking

- this will be eventually deployed to like Vultr VPS (tried), VPS on Azure/GoogleCloud (haven't tried) so that exposed to the outside world for boss to grab the URL and send it to someone then me open a meeting with boss and other ppl to demo this, BUT this isn't the focus at the moment, but I thought I should let you know and log this somewhere :)

## Non-negotiables (read first)
- Do not ask what OS/shell I use. Assume **macOS + fish shell**.
- Follow these rules even if the task request doesn’t restate them.

## Environment (macOS + fish)
- All terminal commands must be compatible with **fish** (no `export FOO=bar`).
  - Use fish-style env vars: `set -gx FOO bar`
- Prefer commands that work on macOS default tooling. If a command is GNU-only, mention it explicitly.

## Config & Secrets (.env)
- Assume most runtime config is in **.env**.
- Before proposing changes, **check for existing env vars and settings** (and reference them in the plan).
- Never print secrets or paste real secret values.
- Never commit `.env`. If new vars are required:
  - update `.env.example` (or equivalent) and document the new vars briefly.
- When making edits to it, if the key(s) already in it but have a different val this time, we comment it the existing out then add a new line with the same key but different value, don't replace the value directly

## Git workflow & commits
- Keep commits **small and themed**. Avoid one giant “do everything” commit.
- Prefer commit types like: `feat`, `impl`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.
- Commit message format:
  - `TYPE: short summary`
  - optional body lines for context / caveats / follow-ups

Examples:
- `feat: add customer import endpoint`
- `fix: handle null invoice date`
- `impl: switch repo scripts to fish-friendly commands`

## Quality bar (don’t ship broken)
- If you change behavior, add/adjust tests when practical.
- Run the smallest relevant checks (lint/tests/build) and fix failures before declaring done.
- Keep changes minimal and consistent with existing project style.

## Tracker

- we have quite a few docs under the `/docs/` folder
    - every once in a while, let's make edits to the docs in it based on what status the project is now
    - for major edits happened or feat. added, ofc we need to have similar set of docs added for it

## Communication style
- Be concise.
- When blocked, state:
  1) what you tried
  2) what you observed
  3) the next best action

## Safer edits
- Prefer editing the smallest surface area possible.
- Avoid large refactors unless explicitly requested.

## PR hygiene
- Include a short PR summary + “how to test” steps.
- Link related issues/tickets if present.

## Dependency discipline
- Avoid adding new dependencies unless it meaningfully reduces complexity.
- If adding a dependency, justify it in 1–2 lines and note alternatives considered.

## Repo navigation
- Before coding, locate the correct layer:
  - config → domain → persistence → API/UI
- Avoid duplicating logic; reuse existing helpers/utilities.

## Logging
- Since we are in the demo stage, I do prefer I could see the progress at least in the terminal side, some may could be added in the UI side as well, but do this only I requested, you could prompt me though if really think adding to UI will be beneficial

## File Operations Outside Workspace

Fish shell doesn't support heredoc (`<< EOF`). To append multi-line content to files outside workspace:

```fish
printf 'line1\nline2\nline3\n' >> /path/to/file.md
```

- Use `\n` for newlines
- Escape single quotes with `'\''` (end quote, escaped quote, start quote)
- This method is tracked in fish history for reference

