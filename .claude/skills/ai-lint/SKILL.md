---
name: AI Lint
description: Run ai-lint to check AI config file health. Use after editing CLAUDE.md, AGENTS.md, SKILL.md, or any rules files. Use when the user asks to check config quality, fix config issues, or wants a health score.
---

# AI Lint

Run `npx al` to detect and fix issues in AI configuration files.

## Commands

- `npx al .` — Quick scan of all AI config files
- `npx al fix --dry-run` — Preview fixes before applying
- `npx al fix` — Apply auto-fixes
- `npx al stats` — Show health score table
- `npx al --cross-files` — Cross-file conflict and overlap detection

## When to Use

Run `npx al .` automatically after:
- Editing CLAUDE.md, AGENTS.md, or SKILL.md
- Creating or modifying rules files (.cursorrules, etc.)
- User asks "check my config" or "is my CLAUDE.md healthy"

## After Running

- If health score 100/100, tell user config is clean
- If issues found, summarize problems and suggest `npx al fix --dry-run`
- If fixable issues exist, offer to run `npx al fix`
- If conflicts or null-effects found, explain they require human judgment