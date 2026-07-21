# Changelog

All notable changes to ai-lint will be documented in this file.

---

## [Planned] v1.0.0

See [Improvement Roadmap](./docs/06-improvement-roadmap.md) for full details.

| Version | Name | Highlights |
|---------|------|-----------|
| v0.2 | Token Era | Token analysis engine, conflict detection (hard/soft/trigger) |
| v0.3 | Ecosystem | PR diff, dilution detection, auto-fix pre-commit, `.ai-lintrc.json` |
| v0.4 | Deep Diagnostics | Reference integrity, cross-file drift, rot detection, methodology audit |
| v1.0 | Stable | Architecture consolidation, performance, docs, i18n |

---

## [0.1.2] — 2026-07-21

### Fixed
- `no-global-path-rule`: false positives on prepositional "in" and "in" inside "within"
- `no-semantic-duplicate`: conflict pairs no longer reported as semantic duplicates
- `parseRules()`: wrapped lines now merged instead of truncated; blockquote (`>`) extraction
- Root-level `SKILL.md` discovery in `findFiles()`
- Stats table column alignment (`padStart(6)` → `padStart(7)`)

### Changed
- `max-length` default threshold: 15 → 20
- `init` templates: consolidated AGENTS/DESIGN templates to reduce token waste
- CLI version reads dynamically from `package.json`
- CI: GitHub Actions upgraded to `checkout@v6` + `setup-node@v6`

### Added
- `biome.json` for project code style enforcement
- 5 parser tests (wrapped merge, no-merge uppercase, no-merge CJK, sentence-ending stop, blockquote)
- `runCrossFiles` export documented in README

---

## [0.1.1] — 2026-07-21

### Fixed
- Various bug fixes from initial release testing

---

## [0.1.0] — 2026-07-20

### Initial Release

**12 detection rules:**
- `no-duplicate` (error, auto-fix) — literal duplicate detection
- `no-semantic-duplicate` (warning, auto-fix) — Jaccard similarity-based semantic duplicate
- `no-conflict` (error) — contradictory instruction detection
- `no-overconstrain` (warning) — over-constraint detection
- `no-verbose` (warning, auto-fix) — filler phrase detection
- `no-global-path-rule` (warning) — mis-scoped global rule detection
- `no-stale-reference` (warning) — dead reference detection
- `no-null-effect` (warning) — vague directive/platitude detection
- `no-skill-bloat` (warning) — skill file size threshold
- `max-length` (warning) — rule count threshold
- `no-overlap-skills` (warning, cross-file) — cross-skill overlap detection
- `no-missing-frontmatter` (error, auto-fix) — YAML frontmatter validation

**8 CLI commands:**
- `ai-lint [path]` — default scan
- `ai-lint fix [path]` — auto-fix
- `ai-lint stats [path]` — health overview
- `ai-lint init [path]` — template generation
- `ai-lint explain <rule-id>` — rule details
- `ai-lint install <tool>` — 8-tool integration
- `--ci` — CI mode (exit 1 on errors)
- `--json` — JSON output

**Supported file types:** CLAUDE.md, AGENTS.md, Agent.md, DESIGN.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md, SKILL.md, *.mdc

**Performance:** 16 files < 1s, 122 tests
