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
- `npx al --ci --json` — CI mode with machine-readable output

## When to Use

Run `npx al .` automatically after any of the following:
- Editing CLAUDE.md, AGENTS.md, or SKILL.md
- Creating or modifying rules files (.cursorrules, .windsurfrules, etc.)
- User asks "check my config" or "is my CLAUDE.md healthy"
- User commits AI config changes
- Before generating a new SKILL.md

## After Running

- If health score is 100/100, tell the user their config is clean
- If issues are found, summarize the top problems and suggest `npx al fix --dry-run`
- If fixable issues exist, offer to run `npx al fix`
- If conflicts or null-effects are found, explain they require human judgment
