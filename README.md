# ai-lint

> The missing linter for AI prompt files. Like ESLint for JavaScript, but for your CLAUDE.md, rules, and skills.

<p align="center">
  <img alt="npm" src="https://img.shields.io/npm/v/ai-lint?color=34D058&label=npm">
  <img alt="license" src="https://img.shields.io/npm/l/ai-lint?color=34D058">
  <img alt="node" src="https://img.shields.io/node/v/ai-lint?color=34D058">
</p>

```bash
npx ai-lint
```

---

## What It Detects

| Config File | Issues Found |
|-------------|-------------|
| `CLAUDE.md` / `AGENTS.md` | Duplicate rules, conflicting instructions, over-constraints, verbose phrasing |
| `SKILL.md` | Skill bloat, missing YAML frontmatter, cross-skill overlap |
| `.cursorrules` / `.windsurfrules` | Duplicates, conflicts |
| `GEMINI.md` / `copilot-instructions.md` | Duplicates, conflicts |

## Quick Example

```bash
❯ npx ai-lint

  CLAUDE.md        health: 62/100 ⚠️

  ❌ no-duplicate       "Use TypeScript strict mode" appears 2× (lines 2, 4) — wastes ~1,200 tokens/day
  ❌ no-verbose         "Please be absolutely sure to always run..." (line 14) — could save 76%
  ⚠️  max-length         Total 412 tokens (threshold: 300) — compliance risk

  💡 Run `ai-lint fix` to auto-fix 2 issues
```

```bash
❯ npx ai-lint fix

  ✅ Merged duplicate: "Use TypeScript strict mode"
  ✅ Simplified verbose phrase: 25 → 6 tokens

  CLAUDE.md health: 94/100 ✅
```

## Commands

```bash
ai-lint                          # Scan all AI config files in current directory
ai-lint fix                      # Auto-fix lint issues (where fixable)
ai-lint fix --dry-run            # Preview fixes without writing to disk
ai-lint --cross-files            # Cross-file detection (skill overlap, conflicts)
ai-lint explain <rule-id>        # Explain a specific rule in detail
ai-lint --ci                     # CI mode (exit 1 if any issue found)
ai-lint --json                   # JSON output for programmatic consumption
```

## Detection Rules

| Rule | Description | Auto-Fix |
|------|-------------|:-------:|
| `no-duplicate` | Literal duplicate rules — identical text appearing more than once | ✅ |
| `no-semantic-duplicate` | Semantically duplicate rules — different wording, same meaning | - |
| `no-conflict` | Contradictory instructions within or across config files | - |
| `no-overconstrain` | Constraints that don't apply to the current context (wasting tokens) | - |
| `no-verbose` | Overly verbose phrasing — says in 25 words what needs 6 | ✅ |
| `no-global-path-rule` | Path-scoped rules written as global (applied to every directory) | - |
| `no-stale-reference` | References to files or paths that no longer exist | - |
| `no-null-effect` | Constraints that produce no observable behavioral change | - |
| `no-skill-bloat` | Skill file exceeds reasonable size threshold | - |
| `max-length` | Config file total token count exceeds threshold (default: 300) | - |
| `no-overlap-skills` | Two skills with highly overlapping trigger domains | - |
| `no-missing-frontmatter` | SKILL.md missing required YAML frontmatter (name, description) | ✅ |

## Why ai-lint?

**57 AI coding environment tools** exist as of July 2026. **Zero** do config health detection.

The numbers behind the problem:

| Stat | Value |
|------|-------|
| Popular configs with "config smells" | **91%** |
| AI compliance drop (50 → 400 line CLAUDE.md) | **94% → 71%** |
| Direct competitors (config quality detection) | **0 / 57** |

Everyone is building config *managers*. Nobody is building config *doctors* — until now.

**ai-lint = ESLint for AI configs.** Static analysis → health score → auto-fix.

## Philosophy

- **Read-only by default.** `ai-lint` scans and reports; `ai-lint fix` only touches what you ask it to.
- **Zero config to start.** Run `npx ai-lint` with no setup. Customize later.
- **Fast.** Sub-second scans for typical project sizes.
- **ESLint-compatible mental model.** If you've used ESLint, you already know ai-lint.

## Related Projects

| Project | Focus | Stars |
|---------|-------|------:|
| [1rgs/claude-code-proxy](https://github.com/1rgs/claude-code-proxy) | API routing & relay | 3.6K |
| [ccusage](https://github.com/anthropics/ccusage) | Token usage analytics | 16K |
| [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) | Config templates | 28.3K |
| **ai-lint** | **Config health detection** | ⭐ you are here |

## Acknowledgments

Inspired by open research and community discussions. Special thanks to:
- The **ccusage** community for advancing token transparency
- The **ZCF** community for exploring config standardization
- Academic research on "config smell" quantification

---

## License

[MIT](LICENSE)

> 中文文档：[README.zh-CN.md](./README.zh-CN.md)
