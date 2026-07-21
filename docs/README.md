# ai-lint Project Documentation

> The linter and optimizer for AI prompt files. Like ESLint for JavaScript, but for your CLAUDE.md, rules, and skills.

---

## Documentation Index

| # | Document | Core Content |
|---|------|---------|
| 01 | [Project Charter](./01-project-charter.md) | Positioning, ESLint analogy, scope boundaries, competitive moat |
| 02 | [Requirements Specification](./02-requirements-spec.md) | 12 detection rules x 10 file types, CLI command design |
| 03 | [Technical Architecture](./03-technical-architecture.md) | Architecture diagram, 4 production dependencies, Rule interface, Parser design |
| 04 | [Development Plan](./04-development-plan.md) | 2-week / 10-day retrospective |
| 05 | [Research Report Summary](./05-research-report.md) | 6-stream merged findings, falsification validation |
| 06 | [Improvement Roadmap](./06-improvement-roadmap.md) | v0.2 → v1.0 validation-first roadmap, token analyzer, toolchain coverage, deep diagnostics（中文） |
| 06-EN | [Improvement Roadmap (EN)](./06-improvement-roadmap-en.md) | English version of the improvement roadmap |

---

## One-Line Product Description

> **`npx ai-lint`** — Scans and optimizes your AI config files for duplicate rules, conflicting instructions, token-waste patterns, and toolchain redundancy. Auto-fixes what it can.

## Key Data Points

| Data Point | Value | Source |
|------|------|------|
| Competitor landscape | 57 tools | Stream A |
| Direct competitors (config quality detection) | **0** | Stream A |
| Real demand signals | 22 | Stream B |
| Top pain point | CLAUDE.md bloat (94%→71% compliance rate) | Stream B |
| Falsification pass rate (this direction) | **0/7** | Stream F |
| MVP timeline | 2 weeks | 04-Development Plan |
| Production dependencies | 4 | 03-Technical Architecture |
| Config file types supported | 8 | 02-Requirements Specification |
| Detection rules | 12 | 02-Requirements Specification |

## Comparison: ESLint vs ai-lint

```
ESLint  → JavaScript code quality (static analysis → lint → fix)
ai-lint → AI config health     (static analysis → scan → fix)
```

| Dimension | ESLint | ai-lint |
|-----------|--------|---------|
| Domain | JavaScript / TypeScript source code | AI prompt & config files (Markdown) |
| Detects | Syntax errors, style issues, logic bugs | Duplicate rules, conflicts, verbose phrasing, token bloat |
| Auto-fix | ✅ | ✅ (`ai-lint fix`) |
| Extensible rules | ✅ Plugin system | ✅ Rule interface (planned) |
| CI integration | ✅ | ✅ (`ai-lint --ci`) |
| Zero-config start | ❌ (needs config file) | ✅ (`npx al` with no setup) |
| Network required | ❌ (local only) | ❌ (100% local, no telemetry) |

> Note: ESLint can run with zero config using built-in defaults (`npx eslint .`). The comparison above refers to the common practice of configuring ESLint with a `.eslintrc` file for project-specific rules, which ai-lint also supports via `.ai-lintrc.json` (planned).

## Project Links

- **Main README** — [`../README.md`](../README.md): Installation, command reference, all detection rules, integrations overview
- **Changelog** — [`../CHANGELOG.md`](../CHANGELOG.md): Release history and planned versions
- **Integrations Guide** — [`../integrations/README.md`](../integrations/README.md): Installing ai-lint into Claude Code, Codex CLI, OpenCode, Qoder, Cursor, Windsurf, Gemini CLI, and GitHub Copilot
- **中文 README** — [`../README.zh-CN.md`](../README.zh-CN.md): Chinese-language version of the main README
