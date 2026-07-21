# ai-lint Project Charter

> **Version**: v0.1.0 | **Date**: 2026-07-20 | **Status**: Fully Built | **License**: MIT

---

## 1. Project Background

### 1.1 Real Pain Points

Based on 6 parallel research streams (2026-07-19 ~ 20), 22 real demand signals were mined from GitHub Issues, Reddit, and developer communities:

- **Pain Point #1**: A $200 plan exhausted in 70 minutes — users have no idea where their tokens are going
- **Pain Point #2**: When CLAUDE.md grows from 50 to 400 lines, AI compliance drops from 94% to 71%
- **Pain Point #7**: 91% of popular AGENTS.md/CLAUDE.md files contain "config smells" — lint-leakage at 62%, context-bloat at 42%

**What users actually care about is not the config format (JSON vs TOML), but the semantic health of the configuration** — is there redundancy? Are there conflicts? How many tokens are being wasted?

### 1.2 Competitive Gap

A comprehensive survey of 57 competing tools reveals:

| Track | Competitors | Has "config health detection"? |
|-------|-------------|:---:|
| Token Analysis | 13+ | No |
| Dashboards | 10+ | No |
| Routing / Proxies | 10+ | No |
| Compression / Optimization | 9 | No |
| Config Management | 7+ | No |
| IDE Built-in | 7+ | No |

**Out of 57 competitors, exactly 0 are doing config quality detection.** Every competitor is building "management" tooling. Nobody is building "diagnostics."

---

## 2. Project Positioning

### 2.1 One-Line Summary

> **`npx ai-lint` — Like ESLint for your code, but for your AI programming configuration files.**

### 2.2 The ESLint Analogy

```
ESLint → JavaScript code quality detection
ai-lint → AI programming config health detection

ESLint                          ai-lint
──────                          ──────
Input   .js / .ts               CLAUDE.md / AGENTS.md / SKILL.md / .cursorrules / .windsurfrules / GEMINI.md / copilot-instructions.md / .cursor/rules/*.mdc / DESIGN.md / Agent.md
Detect  no-unused-vars           no-duplicate / no-conflict / no-skill-bloat / no-null-effect
Output  error / warning          issue line number + token waste estimate + fix suggestion
Fix     eslint --fix             ai-lint fix
Ecosystem eslint-plugin-xxx      Rule marketplace (future)
```

### 2.3 What We Do NOT Do

| Not Doing | Reason |
|-----------|--------|
| Config read/write management | 57 competitors already doing it |
| Token usage statistics | ccusage at 16K stars dominates |
| Dashboard | 10+ competitors |
| Protocol translation | CCR at 35K stars |
| **Do only one thing**: Tell you where your config has problems, and help you fix them |

### 2.4 Moat

It is not "config format knowledge" (which is publicly available). It is the **ability to judge what constitutes a bad configuration** — this requires accumulation of real-world cases and academic research underpinning.

---

## 3. Supported File Types

ai-lint scans **8 distinct file types** (plus aliases) across 5 AI coding tools and ecosystems:

| File | Used By | Detection Dimensions |
|------|---------|---------------------|
| `CLAUDE.md` | Claude Code | Redundancy, conflict, over-constraint, verbosity, stale refs, bloat |
| `AGENTS.md` | Codex / Qoder / Cline | Same as above |
| `Agent.md` | Codex / Various agents | Alias for AGENTS.md, same rules applied |
| `SKILL.md` | Claude Code / Codex / Qoder / Cursor | Bloat, dead references, missing frontmatter, cross-skill overlap |
| `.cursorrules` | Cursor | Redundancy, conflict, over-constraint |
| `.cursor/rules/*.mdc` | Cursor (modular rules) | Same as .cursorrules |
| `.windsurfrules` | Windsurf | Redundancy, conflict, over-constraint |
| `GEMINI.md` | Gemini CLI | Redundancy, conflict, over-constraint |
| `copilot-instructions.md` | GitHub Copilot CLI | Redundancy, conflict, over-constraint |
| `DESIGN.md` | Design-system agents | Alias for CLAUDE.md, same rules applied |

Discovery also covers `.claude/`, `.codex/skills/`, `.opencode/skills/`, and `.claude/skills/` directories.

---

## 4. Current Implementation State

### 4.1 Rules (12 Rules)

| # | Rule ID | Category | Auto-fix? |
|---|---------|----------|:---:|
| R1 | `no-duplicate` | Literal duplication | Yes |
| R2 | `no-semantic-duplicate` | Semantic duplication (similarity >= 50%) | Yes |
| R3 | `no-conflict` | Contradictory instructions (within + cross-file) | No |
| R4 | `no-overconstrain` | Tech-stack mismatch constraints | No |
| R5 | `no-verbose` | Verbose phrasing (CN + EN patterns) | Yes |
| R6 | `no-global-path-rule` | Path-scoped rules written globally | No |
| R7 | `no-stale-reference` | References to non-existent files/paths | No |
| R8 | `no-null-effect` | Hollow platitudes with no actionable effect | No |
| R9 | `no-skill-bloat` | SKILL.md exceeding size thresholds | No |
| R10 | `max-length` | Excessive rule count risking compliance drop | No |
| R11 | `no-overlap-skills` | Cross-skill trigger domain overlap | No |
| R12 | `no-missing-frontmatter` | SKILL.md missing YAML frontmatter | Yes |

### 4.2 CLI Commands (8)

| Command | Function |
|---------|----------|
| `ai-lint [path]` | Scan all AI config files (default) |
| `ai-lint fix [path]` | Auto-fix fixable issues (duplicates, verbose phrasing, frontmatter) |
| `ai-lint explain <rule-id>` | Display detailed explanation of a specific rule |
| `ai-lint init [path]` | Generate a healthy AI config template (claude, agents, skill, design) |
| `ai-lint stats [path]` | Display health score summary table for all config files |
| `ai-lint install <tool>` | Install ai-lint as a skill/rule into 8 AI coding tools |
| `ai-lint --ci` | CI mode — exit code 1 if any issues found |
| `ai-lint --json` | JSON output for tool consumption |

Additional flags: `--cross-files`, `--rules <ids>`, `--no-color`, `--dry-run` (fix), `-t, --type` (init), `--global` (install).

### 4.3 Key Metrics

| Metric | Value |
|--------|-------|
| Production dependencies | 4 (chalk, commander, fs-extra, pathe) |
| Test count | 114 (7 test files, all passing) |
| Scan performance | 11ms for 16 files (avg 4ms over repeated runs) |
| Single file scan | 48ms |
| License | MIT |
| Runtime | 100% local, zero cloud dependencies |
| Platforms | macOS / Linux / Windows (WSL) |
| Node.js | >= 18.0.0 |

---

## 5. Technical Constraints

| Constraint | Requirement | Status |
|------------|-------------|:---:|
| Local execution | 100% local, zero cloud dependencies | Met |
| Dependency count | <= 5 production dependencies | Met (4) |
| Performance | Scan entire project <= 1 second | Met (11ms) |
| Cross-platform | macOS / Linux / Windows (WSL) | Met |
| License | MIT | Met |

---

## 6. Relationship to Competitors

ai-lint does not replace any existing tool. It sits on top of all of them as a "diagnostic layer":

- Users initialize environments with ZCF -> use ai-lint to check if the config is healthy
- Users view token consumption with ccusage -> use ai-lint to find the root cause of waste
- Users route models with CCR -> use ai-lint to check if routing config has conflicts

Positioned to complement existing tools rather than replace them.
