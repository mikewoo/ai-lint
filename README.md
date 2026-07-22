# ai-lint

> The linter and optimizer for AI prompt files. Like ESLint for JavaScript, but for your CLAUDE.md, rules, and skills.

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.2-34D058">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-34D058">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-34D058">
</p>

```bash
npx @itdest/ai-lint
```

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Integrations — AI Tools](#integrations--ai-tools)
- [What It Detects](#what-it-detects)
- [Command Reference](#command-reference)
  - [`ai-lint` — Scan](#ai-lint--scan)
  - [`ai-lint fix` — Auto-Fix](#ai-lint-fix--auto-fix)
  - [`ai-lint stats` — Health Overview](#ai-lint-stats--health-overview)
  - [`ai-lint init` — Generate Templates](#ai-lint-init--generate-templates)
  - [`ai-lint explain` — Rule Details](#ai-lint-explain--rule-details)
  - [`ai-lint install` — Tool Integration](#ai-lint-install--tool-integration)
  - [CI Mode](#ci-mode)
  - [Programmatic Usage](#programmatic-usage)
- [Detection Rules](#detection-rules)
- [Configuration Files Supported](#configuration-files-supported)
- [Why ai-lint?](#why-ai-lint)
- [Roadmap](#roadmap)
- [Philosophy](#philosophy)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## Installation

### Run without installing (recommended)

```bash
npx @itdest/ai-lint
```

### Global install

```bash
npm install -g @itdest/ai-lint
# then use anywhere:
ai-lint
al           # short alias
```

### Local install

```bash
npm install --save-dev @itdest/ai-lint
# add to package.json scripts:
#   "lint:ai": "ai-lint --ci"
```

---

## Quick Start

```bash
# 1. Scan the current directory
npx @itdest/ai-lint

# Or install globally for short aliases (al, ai-lint):
npm install -g @itdest/ai-lint
al        # short alias
ai-lint   # full name

# 2. See what's wrong with your AI configs
# 3. Auto-fix what can be fixed
al fix

# 4. Preview fixes before applying
al fix --dry-run

# 5. See your overall health at a glance
al stats
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

## Integrations — AI Tools

Install ai-lint into your AI coding agent so it can check its own config files during conversations. Full guide: [`integrations/README.md`](integrations/README.md)

**How it works**: Each integration adds a skill or rule file that the AI agent reads during conversations. The agent can then check config health on demand ("check my config health") or automatically after editing config files. No API keys, no network calls — the checks run locally via the ai-lint CLI.

| Tool | Install | Method |
|------|---------|--------|
| **Claude Code** | `al install claude` | Installs ai-lint skill into `.claude/skills/ai-lint/` |
| **Codex CLI** | `al install codex` | Installs ai-lint skill into `.codex/skills/ai-lint/` |
| **OpenCode** | `al install opencode` | Installs ai-lint skill into `.opencode/skills/ai-lint/` |
| **Qoder** | `al install qoder` | Appends config health rule to `AGENTS.md` |
| **Cursor** | `al install cursor` | Appends config health rule to `.cursorrules` |
| **Windsurf** | `al install windsurf` | Appends config health rule to `.windsurfrules` |
| **Gemini CLI** | `al install gemini` | Appends config health rule to `GEMINI.md` |
| **GitHub Copilot** | `al install copilot` | Appends config health rule to `copilot-instructions.md` |

All tools at once: `al install all`. Requires global install (`npm i -g @itdest/ai-lint`). For manual installation without global install, see [`integrations/README.md`](integrations/README.md).

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

# Token budget report only (skip lint)
ai-lint --tokens

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

When ESLint or Prettier config is present, the scan also reports **toolchain coverage** — rules in your AI config that the toolchain already enforces (e.g. "use const not var" when ESLint's `no-var` is on), so you can remove them to save tokens. This only appears when the tool config actually exists.

### Token Budget

See where your AI config's tokens go. Every config file is segmented into categories (rules, trigger tables, methodology prose, examples, decoration, meta) and counted.

```bash
# Compact token budget report
ai-lint --tokens

# Detailed breakdown per file and category
ai-lint stats --tokens

# Machine-readable
ai-lint --tokens --json
```

Example output:

```
  Token Budget
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLAUDE.md                          3,200 tokens (34%)
    ├── Rules              1,200 (37%) ████░░░░░░ core
    ├── Trigger table        800 (25%) ███░░░░░░░ keep
    ├── Methodology          700 (22%) ██░░░░░░░░ ⚠️ trimmable
    └── Decoration           300  (9%) █░░░░░░░░░ 💡 removable
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total: 3,200 tokens (1.6% of a 200K context window)
```

> Token counts are estimates from a character-based heuristic (CJK weighted higher), meant for relative comparison and spotting bloat — not exact billing. Real BPE tokenizers vary by model.

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
| Verbose phrasing | Replaces with concise equivalent (semantic equivalence not guaranteed for natural language; review suggested changes) |
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

**Verify:** Ask your AI agent "Check my config health" — it will run `npx @itdest/ai-lint .`.

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

## Why ai-lint?

AI config files accumulate issues over time: duplicate rules, conflicting instructions, verbose phrasing that wastes context window tokens, and references to files that no longer exist. Manual review doesn't scale as configs grow across multiple tools and team members.

A survey of 57 tools in the AI coding ecosystem (July 2026) found that config quality detection is an underserved category. Most tools focus on managing or sharing configurations; none provide automated diagnostics for the config files themselves.

| Observation | Source |
|------|-------|
| Config quality detection among 57 AI coding tools | 0 found (competitive survey) |
| CLAUDE.md growth from 50 to 400 lines correlates with instruction compliance decline | Community reports (see docs/05-research-report.md) |
| Common config issues: duplication, conflict, verbose phrasing, stale references | User feedback + pmAgent field test |

ai-lint scans your AI config files, assigns a health score, and auto-fixes what it can.

---

## Philosophy

- **Read-only by default.** `ai-lint` scans and reports; `ai-lint fix` only touches what you ask it to.
- **Zero config to start.** Run `npx @itdest/ai-lint` with no setup. After global install, use `al`.
- **Fast.** Sub-second scans for projects with up to ~20 AI config files.
- **Zero network.** 100% local, no telemetry, no API calls.
- **ESLint-compatible mental model.** Rule IDs, severities, and auto-fix follow patterns familiar to ESLint users.

---

## Roadmap

**ai-lint is evolving from a single-file checker to a system-wide diagnostics engine.** The roadmap is validation-first: v0.2 ships a focused MVP, then a validation gate decides whether to continue — features are shipped and validated one version at a time, not committed upfront.

| Version | Theme | Key Features |
|---------|-------|--------------|
| **v0.2** | Moat MVP | Token analysis engine, toolchain coverage detection |
| **🚦 Gate** | Validation | Observe real adoption before building further |
| **v0.3** | Ecosystem | PR diff bot, auto-fix pre-commit, `.ai-lintrc.json`, conflict/dilution detection |
| **v0.4** | Deep Diagnostics | Reference integrity, cross-file drift, rot detection, methodology audit |
| **v1.0** | Stable | Architecture consolidation, i18n, rule marketplace foundation |

👉 [Full roadmap →](./docs/06-improvement-roadmap.md)

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
