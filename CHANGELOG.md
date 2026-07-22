# Changelog

All notable changes to ai-lint will be documented in this file.

---

## [Unreleased] v0.2.0 — Moat MVP

### Added
- **Token analysis engine** — semantic segmentation of AI config files into
  categories (rule / trigger-table / methodology / example / decoration / meta),
  with per-file and per-category token breakdown.
  - `ai-lint --tokens` — token budget report only (skips lint)
  - `ai-lint stats --tokens` — detailed token budget breakdown
  - `--tokens --json` for machine-readable output
- **Toolchain coverage detection** — flags AI config rules already enforced by
  ESLint/Prettier (e.g. "use const not var" when ESLint `no-var` is on), so they
  can be removed to save tokens. Zero false positives: only triggers when the
  tool config actually exists. Shown automatically in the default scan.
  - Supports `.eslintrc.json`, `.eslintrc` (legacy + flat array form),
    `.prettierrc`, `.prettierrc.json`, and `package.json` fields
  - JS-form configs (`.eslintrc.js`, `eslint.config.js`) deferred to v0.3
- New public API: `runTokenBudget`, `runToolchainCoverage`, `analyzeTokenBudget`,
  `segment`, `detectToolchainCoverage`
- 19 new tests covering segmentation, token aggregation, and toolchain coverage

### Changed
- Removed unused `truncate` import in `no-semantic-duplicate.ts`

---

## [Planned] v1.0.0

See [Improvement Roadmap](./docs/06-improvement-roadmap.md) for full details.

The roadmap is validation-first: a validation gate follows v0.2, and v0.3+ proceeds only if adoption data clears it.

| Version | Name | Highlights |
|---------|------|-----------|
| v0.2 | Moat MVP | Token analysis engine, toolchain coverage detection |
| v0.3 | Ecosystem | PR diff, auto-fix pre-commit, `.ai-lintrc.json`, conflict/dilution detection |
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
