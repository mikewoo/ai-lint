# ai-lint

> The missing linter for AI prompt files. Like ESLint for JavaScript, but for your CLAUDE.md, rules, and skills.

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.0-34D058">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-34D058">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-34D058">
</p>

```bash
npx al
```

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [What It Detects](#what-it-detects)
- [Command Reference](#command-reference)
  - [`ai-lint` — Scan](#ai-lint----scan)
  - [`ai-lint fix` — Auto-Fix](#ai-lint-fix----auto-fix)
  - [`ai-lint stats` — Health Overview](#ai-lint-stats----health-overview)
  - [`ai-lint init` — Generate Templates](#ai-lint-init----generate-templates)
  - [`ai-lint explain` — Rule Details](#ai-lint-explain----rule-details)
  - [`ai-lint install` — Tool Integration](#ai-lint-install----tool-integration)
  - [CI Mode](#ci-mode)
  - [Programmatic Usage](#programmatic-usage)
- [Detection Rules](#detection-rules)
- [Configuration Files Supported](#configuration-files-supported)
- [Integrations — AI Tools](#integrations----ai-tools)
- [Why ai-lint?](#why-ai-lint)
- [Philosophy](#philosophy)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## Installation

### Run without installing (recommended)

```bash
npx ai-lint
# or the short alias:
npx al
```

### Global install

```bash
npm install -g ai-lint
# then use anywhere:
ai-lint
al           # short alias
```

### Local install

```bash
npm install --save-dev ai-lint
# add to package.json scripts:
#   "lint:ai": "ai-lint --ci"
```

---

## Quick Start

```bash
# 1. Scan the current directory
npx al

# 2. See what's wrong with your AI configs
#    (output shows file health scores + issues)

# 3. Auto-fix what can be fixed
npx al fix

# 4. Preview fixes before applying
npx al fix --dry-run

# 5. See your overall health at a glance
npx al stats
```

### Example Output

```bash
❯ npx al

  CLAUDE.md  health: 62/100 ⚠️

  ❌ no-duplicate:5  "Use TypeScript strict mode" appears 2 times (lines 4, 5)
  ❌ no-conflict:11  Indentation style (tabs vs spaces) — conflict: (line 10) vs (line 11)
  ⚠️ no-verbose:6  "please be absolutely sure to" → "please" — saves ~75%

  AGENTS.md  health: 100/100 ✅
    No issues found

  image-gen/SKILL.md  health: 85/100 ⚠️
  ❌ no-missing-frontmatter:1  SKILL.md is missing YAML frontmatter

  ■ 3 files scanned, 3 errors, 1 warning, 4 fixable

  💡 Run ai-lint fix to auto-fix 4 issues
```

---

## What It Detects

| Config File | Issues Found |
|-------------|-------------|
| `CLAUDE.md` / `AGENTS.md` | Duplicate rules, conflicting instructions, over-constraints, verbose phrasing, platitudes, stale references, scope leakage, token bloat |
| `SKILL.md` | Missing YAML frontmatter, skill bloat (too many rules/lines), cross-skill overlap |
| `.cursorrules` / `.windsurfrules` | Duplicates, conflicts, over-constraints, verbose phrasing, stale references |
| `GEMINI.md` / `copilot-instructions.md` | Duplicates, conflicts, over-constraints, verbose phrasing |
| `.cursor/rules/*.mdc` | Duplicates, conflicts, over-constraints (per-directory rules) |

---

## Command Reference

### `ai-lint` — Scan

Scan AI configuration files for issues. The most common command.

```bash
# Scan current directory
ai-lint
al

# Scan a specific directory
ai-lint /path/to/project

# Scan a single file
ai-lint ./CLAUDE.md

# JSON output (for toolchain consumption)
ai-lint --json

# Only check specific rules
ai-lint --rules=no-duplicate,no-verbose

# Cross-file detection (skill overlap, cross-file conflicts)
ai-lint --cross-files

# CI mode (exit 1 if issues found)
ai-lint --ci

# Disable colors (for CI logs)
ai-lint --no-color
```

**Use cases:**
- Daily health check before committing AI config changes
- Pre-commit hook to prevent bad configs from being committed
- CI pipeline quality gate
- JSON output for dashboards or monitoring tools

### `ai-lint fix` — Auto-Fix

Automatically fix detected issues where possible.

```bash
# Fix all auto-fixable issues
ai-lint fix
al fix

# Preview fixes without writing (safe to run always)
ai-lint fix --dry-run

# Fix a single file
ai-lint fix ./CLAUDE.md

# Only fix specific rule types
ai-lint fix --rules=no-duplicate,no-verbose
```

**What gets fixed:**
| Issue | Fix Behavior |
|-------|-------------|
| Duplicate rules | Keeps the most complete version, removes shorter copies |
| Verbose phrasing | Replaces with concise equivalent |
| Missing YAML frontmatter | Adds minimal `name` + `description` template |
| Semantic duplicates | Removes the later occurrence |

**What does NOT get auto-fixed** (requires human judgment):
- Conflicting instructions (tabs vs spaces — you decide)
- Over-constraints (check if the tech stack is actually used)
- Null-effect phrases (rewrite with specific guidance)
- Stale references (update or remove the path)
- Skill bloat / max-length (split or prune manually)

> **Tip:** Always run `ai-lint fix --dry-run` first to preview changes.

### `ai-lint stats` — Health Overview

Show health scores for all config files in a table.

```bash
ai-lint stats
al stats
```

```
  Health Score Summary

  ┌──────────────────────────────┬────────┬────────┐
  │ File                         │ Score  │ Status │
  ├──────────────────────────────┼────────┼────────┤
  │ CLAUDE.md                    │ 95/100 │ ✅ OK  │
  │ AGENTS.md                    │ 100/100│ ✅ OK  │
  │ brandkit/SKILL.md            │ 75/100 │ ⚠️ warn│
  └──────────────────────────────┴────────┴────────┘

  3 files  |  Average health: 90/100  |  Overall: healthy
```

**Use cases:**
- Quick project health snapshot
- Track health score trends over time (run before/after changes)
- CI summary output

### `ai-lint init` — Generate Templates

Create healthy AI config templates for new projects.

```bash
# Generate CLAUDE.md in current directory
ai-lint init
al init claude

# Generate AGENTS.md
al init agents

# Generate SKILL.md (in a skill subdirectory)
al init /path/to/skills/my-skill -t skill

# Short form (creates in current directory)
al init skill
al init design

# Generate in a specific directory
al init /path/to/project -t agents
```

**Available templates:**
| Type | File | Contents |
|------|------|---------|
| `claude` (default) | `CLAUDE.md` | Language, code style, testing, commits, dependencies |
| `agents` | `AGENTS.md` | Agent behavior, output format, constraints |
| `skill` | `SKILL.md` | YAML frontmatter, instructions, constraints |
| `design` | `DESIGN.md` | Colors, typography, spacing, components |

**Use cases:**
- Starting a new project with healthy AI configs from day one
- Onboarding team members with consistent templates
- Generating a baseline SKILL.md with proper frontmatter

### `ai-lint explain` — Rule Details

Get detailed information about a specific detection rule.

```bash
ai-lint explain no-duplicate
```

```
  no-duplicate
  Detect literal duplicate rules — identical text appearing more than once
  Files: CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, ...
```

**Use cases:**
- Understanding why a rule flagged something
- Learning which files a rule applies to
- Onboarding new contributors to the rule set

### `ai-lint install` — Tool Integration

Install ai-lint into your AI coding agent so it can check configs during conversations.

```bash
al install claude     # Claude Code (skill)
al install codex      # Codex CLI (skill)
al install opencode   # OpenCode (skill)
al install qoder      # Qoder (rule in AGENTS.md)
al install cursor     # Cursor (rule in .cursorrules)
al install windsurf   # Windsurf (rule in .windsurfrules)
al install gemini     # Gemini CLI (rule in GEMINI.md)
al install copilot    # GitHub Copilot (rule in copilot-instructions.md)
al install all        # All 8 tools at once

# User-wide install (skills only)
al install codex --global
```

**What it does:**
- **Skills** (Claude Code, Codex, OpenCode): Creates a `SKILL.md` the agent loads on demand
- **Rules** (Qoder, Cursor, Windsurf, Gemini, Copilot): Appends a config quality directive

**Verify:** Ask your AI agent "Check my config health" — it will run `npx al .`.

Full guide: [`integrations/README.md`](integrations/README.md)

---

### CI Mode

Designed for automated pipelines. Combine with other flags for maximum utility.

```bash
# Basic CI gate: fail if any issues
ai-lint --ci

# CI gate with JSON for log parsing
ai-lint --ci --json

# CI gate: only fail on errors, not warnings
# (warnings are always included, but you can filter in post-processing)

# CI with cross-file detection
ai-lint --ci --cross-files

# CI pipeline example (GitHub Actions)
- run: npx ai-lint --ci --no-color
```

**Exit codes:**
| Code | Meaning |
|:----:|---------|
| 0 | No issues found, or no AI config files found |
| 1 | One or more issues found (errors or warnings) |

### Programmatic Usage

```js
import { runLint, runFix, runCrossFiles } from 'ai-lint'

// Scan a directory
const result = runLint({ cwd: '/path/to/project' })
console.log(result.errors, result.warnings)

// Fix a directory
const report = runFix({ cwd: '/path/to/project', dryRun: true })
console.log(report.fixed, 'issues fixed')

// Cross-file detection
const cross = runCrossFiles({ cwd: '/path/to/project' })
console.log(cross.files[0].issues)

// Scan a single file with specific rules
const single = runLint({
  cwd: '/path/to/project',
  targetFile: 'CLAUDE.md',
  rulesFilter: 'no-duplicate,no-verbose',
})
```

---

## Detection Rules

| Rule | Severity | Auto-Fix | Description |
|------|:--:|:--:|------|
| `no-duplicate` | error | ✅ | Identical rule text appearing more than once |
| `no-semantic-duplicate` | warning | ✅ | Different wording expressing the same meaning |
| `no-conflict` | error | — | Contradictory instructions (e.g. tabs vs spaces) |
| `no-overconstrain` | warning | — | Rules constraining tech stacks not present in the project |
| `no-verbose` | warning | ✅ | Overly verbose phrasing that wastes tokens |
| `no-global-path-rule` | warning | — | Rules scoped to a specific path but written as global |
| `no-stale-reference` | warning | — | References to files or paths that don't exist |
| `no-null-effect` | warning | — | Platitudes and vague directives (e.g. "write good code") |
| `no-skill-bloat` | warning | — | SKILL.md files exceeding reasonable size thresholds |
| `max-length` | warning | — | Config files with excessive rule counts |
| `no-overlap-skills` | warning | — | Two skills with highly overlapping trigger domains |
| `no-missing-frontmatter` | error | ✅ | SKILL.md missing required YAML frontmatter |

---

## Configuration Files Supported

| File | Tools | Detection |
|------|-------|-----------|
| `CLAUDE.md` | Claude Code | Full detection |
| `AGENTS.md` | Codex / Qoder / Cline | Full detection |
| `SKILL.md` | Claude Code / Codex / Cursor | Full detection + cross-skill |
| `.cursorrules` | Cursor | Duplicates, conflicts, verbose |
| `.cursor/rules/*.mdc` | Cursor (per-directory) | Duplicates, conflicts, verbose |
| `.windsurfrules` | Windsurf | Duplicates, conflicts, verbose |
| `GEMINI.md` | Gemini CLI | Duplicates, conflicts, verbose |
| `copilot-instructions.md` | Copilot CLI | Duplicates, conflicts, verbose |

**Discovery locations:**
- Root directory
- `.claude/` directory
- `skills/*/` directories
- `.claude/skills/*/` directories
- `.cursor/rules/` directory (`.mdc` files)

---

## Integrations — AI Tools

Install ai-lint into your AI coding agent so it can check its own config files during conversations. Full guide: [`integrations/README.md`](integrations/README.md)

| Tool | Install | What It Does |
|------|---------|-------------|
| **Claude Code** | `cp integrations/claude-code/SKILL.md .claude/skills/ai-lint/` | Claude auto-checks config after edits |
| **Codex CLI** | `cp integrations/codex/SKILL.md .codex/skills/ai-lint/` | Codex auto-checks config after edits |
| **OpenCode** | `cp integrations/opencode/SKILL.md .opencode/skills/ai-lint/` | OpenCode auto-checks config after edits |
| **Qoder** | `npx al init agents` | AGENTS.md includes config quality rule |
| **Cursor** | `cat integrations/cursor/.cursorrules >> .cursorrules` | Cursor checks config after edits |
| **Windsurf** | `cat integrations/windsurf/.windsurfrules >> .windsurfrules` | Windsurf checks config after edits |
| **Gemini CLI** | `cat integrations/gemini/GEMINI.md >> GEMINI.md` | Gemini checks config after edits |
| **GitHub Copilot** | `cat integrations/copilot/copilot-instructions.md >> copilot-instructions.md` | Copilot checks config after edits |

---

## Why ai-lint?

**57 AI coding environment tools** exist as of July 2026. **Zero** do config health detection.

| Stat | Value |
|------|-------|
| Popular configs with "config smells" | **91%** |
| AI compliance drop (50 → 400 line CLAUDE.md) | **94% → 71%** |
| Direct competitors (config quality detection) | **0 / 57** |

Everyone is building config *managers*. Nobody is building config *doctors* — until now.

**ai-lint = ESLint for AI configs.** Static analysis → health score → auto-fix.

---

## Philosophy

- **Read-only by default.** `ai-lint` scans and reports; `ai-lint fix` only touches what you ask it to.
- **Zero config to start.** Run `npx al` with no setup.
- **Fast.** Sub-second scans for typical project sizes.
- **Zero network.** 100% local, no telemetry, no API calls.
- **ESLint-compatible mental model.** If you've used ESLint, you already know ai-lint.

---

## Acknowledgments

Inspired by open research and community discussions. Special thanks to:
- The **ccusage** community for advancing token transparency
- The **ZCF** community for exploring config standardization
- Academic research on "config smell" quantification

---

## License

[MIT](LICENSE)

> 中文文档：[README.zh-CN.md](./README.zh-CN.md)
