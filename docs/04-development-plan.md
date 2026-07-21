# ai-lint Development Plan (Retrospective)

> **Version**: v0.1.0 | **Date**: 2026-07-20 | **Duration**: 2 weeks (completed)

---

## 1. Milestones

| Milestone | Target | Deliverable | Acceptance Criteria | Status |
|-----------|--------|-------------|---------------------|:------:|
| **M1** | End of Week 1 | `ai-lint` single-file scan | 6 basic rules operational | Done |
| **M2** | End of Week 2 | `ai-lint fix` + cross-file + release | npm publish + README | Done |

---

## 2. Week 1: Core Scan Engine

### Day 1: Project Scaffold + Parser

```
[x] Initialize TypeScript project
[x] Implement Markdown parser (parseRules)
[x] Implement YAML frontmatter parser (parseFrontmatter)
[x] Unit tests (using real fixtures)
```

### Day 2: 3 Core Rules

```
[x] no-duplicate — literal duplicate detection + fix
[x] no-verbose — verbose phrasing detection + fix (pattern dictionary)
[x] max-length — config file rule count detection
[x] Unit tests
```

### Day 3: 3 Advanced Rules

```
[x] no-stale-reference — dead reference detection
[x] no-global-path-rule — mis-scoped global rule detection
[x] no-missing-frontmatter — YAML header missing detection + fix
[x] Unit tests
```

### Day 4: CLI Skeleton + Rendering

```
[x] Commander command definitions
[x] Terminal output rendering (chalk, ESLint-style)
[x] File discovery (auto-detect AI config files in directory)
[x] ai-lint command fully operational
```

### Day 5: Week 1 Wrap-Up

```
[x] Integration tests (real CLAUDE.md + 15 skills)
[x] Performance tests (scan 16 files <= 1s)
[x] Bug fixes
```

**Milestone M1**: `ai-lint` operational -- Done

---

## 3. Week 2: Fix + Cross-File + Release

### Day 6: fix Command

```
[x] Implement fixer/deduplicate.ts
[x] Implement fixer/simplify.ts
[x] ai-lint fix command
[x] ai-lint fix --dry-run
```

### Day 7: Semantic Rules + Cross-File

```
[x] no-semantic-duplicate — keyword-hash-based semantic similarity
[x] no-conflict — intra-file contradictory instruction detection
[x] Cross-file conflict detection (cross-files/conflict.ts)
[x] Cross-skill overlap detection (cross-files/skill-overlap.ts)
[x] ai-lint --cross-files flag
```

### Day 8: Remaining Rules

```
[x] no-overconstrain — over-constraint detection
[x] no-null-effect — vague directive (platitude) detection
[x] no-skill-bloat — SKILL.md size threshold detection
```

### Day 9: CI Mode + Documentation

```
[x] ai-lint --ci (exit 1 if issues found)
[x] ai-lint --json output
[x] ai-lint stats command (health score table)
[x] ai-lint explain command (rule detail lookup)
[x] ai-lint init command (template generation)
[x] ai-lint install command (8-tool integration)
[x] README.md (with co-existence statement + example output)
[x] Short alias: al
```

### Day 10: Release

```
[x] npm publish
[x] Validate npx ai-lint
```

**Milestone M2**: v0.1.0 released -- Done

---

## 4. What Was Actually Built

The 2-week plan was executed in full. Below is a summary of the deliverable against the original plan.

### Rules: 12 (planned 12)

| # | Rule | Severity | Auto-Fix | Status |
|:-:|------|:--------:|:--------:|:------:|
| 1 | `no-duplicate` | error | Yes | Done |
| 2 | `no-semantic-duplicate` | warning | Yes | Done |
| 3 | `no-conflict` | error | No | Done |
| 4 | `no-overconstrain` | warning | No | Done |
| 5 | `no-verbose` | warning | Yes | Done |
| 6 | `no-global-path-rule` | warning | No | Done |
| 7 | `no-stale-reference` | warning | No | Done |
| 8 | `no-null-effect` | warning | No | Done |
| 9 | `no-skill-bloat` | warning | No | Done |
| 10 | `max-length` | warning | No | Done |
| 11 | `no-overlap-skills` | warning | No | Done (cross-file) |
| 12 | `no-missing-frontmatter` | error | Yes | Done |

### Commands: 8 (planned 4)

| Command | Type | Planned | Status |
|---------|------|:------:|:------:|
| `ai-lint [path]` | Default / scan | Yes | Done |
| `ai-lint fix [path]` | Subcommand | Yes | Done |
| `ai-lint stats [path]` | Subcommand | No (scope creep) | Done |
| `ai-lint init [path]` | Subcommand | No (scope creep) | Done |
| `ai-lint explain <rule-id>` | Subcommand | No (scope creep) | Done |
| `ai-lint install <tool>` | Subcommand | No (scope creep) | Done |
| `--ci` | Flag | Yes | Done |
| `--json` | Flag | Yes | Done |

### Engine: 3 Pipelines (planned 3)

| Pipeline | Function | Status |
|----------|----------|:------:|
| Lint | `runLint()` -- discover files, run rules, summarize | Done |
| Fix | `runFix()` -- lint, sort descending, fix, re-lint, write | Done |
| Cross-files | `runCrossFiles()` -- cross-file conflict + skill overlap | Done |

### Supported File Types: 10

| File | Discovery Locations |
|------|-------------------|
| `CLAUDE.md` | Root, `.claude/` |
| `AGENTS.md` / `Agent.md` | Root, `.claude/` |
| `DESIGN.md` | Root, `.claude/` |
| `.cursorrules` | Root, `.claude/` |
| `.windsurfrules` | Root, `.claude/` |
| `GEMINI.md` | Root, `.claude/` |
| `copilot-instructions.md` | Root, `.claude/` |
| `SKILL.md` | `skills/*/`, `.claude/skills/*/`, `.opencode/skills/*/` |
| `*.mdc` | `.cursor/rules/` |

### Test Coverage: 114 Tests (7 Test Files)

| Test File | Focus |
|-----------|-------|
| `rules.test.ts` | All 12 rules, edge cases, multi-file coverage |
| `parser.test.ts` | Markdown parsing, frontmatter extraction |
| `fixer.test.ts` | Deduplicate, simplify fixes |
| `cross-files.test.ts` | Cross-file conflict, skill overlap |
| `integration.test.ts` | End-to-end pipeline: lint -> fix -> re-lint |
| `cli.test.ts` | CLI command behavior, exit codes, JSON output |
| `performance.test.ts` | 16-file scan benchmark, repeat stability |

### Performance (Measured)

| Scenario | Result |
|----------|--------|
| Single file scan | ~1ms |
| 16 files (1 CLAUDE.md + 15 skills) | Well under 1s (typically ~10-15ms) |
| Repeat scan stability | Consistent across 5 consecutive runs |

### Production Dependencies: 4

| Dependency | Purpose |
|------------|---------|
| `chalk` | Terminal coloring |
| `commander` | CLI framework |
| `fs-extra` | File system operations |
| `pathe` | Cross-platform path handling |

### Build System

| Tool | Purpose |
|------|---------|
| `tsup` | ESM bundling (dual entry: index + cli), `.d.ts` generation |
| `vitest` | Test runner (114 tests, ~2.7s full suite) |
| `biome` | Code linting and formatting |

---

## 5. Future Iterations

| Version | Feature | Priority |
|---------|---------|:--------:|
| v0.2 | `no-conflict` semantic conflict detection (NLP-assisted) | P2 |
| v0.3 | Custom rule support (`.ai-lintrc.json`) | P2 |
| v0.4 | VS Code extension | P3 |
| v1.0 | Rule marketplace (community-contributed rules) | P4 |

---

## 6. Risk Retrospective

| Risk (Identified) | Outcome |
|-------------------|---------|
| Semantic detection accuracy insufficient | Addressed: MVP uses literal matching only; semantic duplicate uses keyword-hash overlap with a moderate threshold. More sophisticated NLP deferred to v0.2. |
| Diverse real-world file formats | Addressed: benchmarked against 15 real skills + multiple CLAUDE.md variants. Parser supports unordered, ordered, and multi-line list items. |
| Maintainer burnout | Addressed: 2-week MVP delivered on time. Collecting community feedback before deciding next investment. |

---

## 7. Out-of-Scope Features Added During Development

The following features were added during development despite not being in the original 2-week plan, as they were judged to provide sufficient value relative to their implementation cost:

1. **`ai-lint stats`** -- Health score table view. Built in a single afternoon by wrapping the existing `runLint()` + `calcHealth()` pipeline.

2. **`ai-lint init`** -- Template generation for CLAUDE.md, AGENTS.md, SKILL.md, DESIGN.md. Eliminates the "blank page" problem for new projects.

3. **`ai-lint explain`** -- Rule detail lookup. Trivial implementation (rule registry lookup), high educational value for new users.

4. **`ai-lint install`** -- One-command installation into 8 AI coding tools (Claude Code, Codex, OpenCode, Qoder, Cursor, Windsurf, Gemini, Copilot). Replaces manual copy-paste workflows.

5. **`al` short alias** -- Registered as a second binary name (`"al": "dist/cli.js"`). Saves 4 keystrokes, matches the `npx` ergonomics of tools like `eslint`.
