# ai-lint Requirements Specification

> **Version**: v0.1.0 | **Date**: 2026-07-20 | **Status**: Implemented

---

## 1. Core Detection Rules (12 Rules)

### Rule Directory

```
src/rules/
├── no-duplicate.ts           # Literal duplicate detection
├── no-semantic-duplicate.ts  # Semantic duplicate detection
├── no-conflict.ts            # Contradictory instruction detection (within + cross-file)
├── no-overconstrain.ts       # Over-constraint detection (tech stack mismatch)
├── no-verbose.ts             # Verbose phrasing detection (CN + EN)
├── no-global-path-rule.ts    # Misplaced path-scoped rule detection
├── no-stale-reference.ts     # Dead reference detection
├── no-null-effect.ts         # Hollow constraint detection
├── no-skill-bloat.ts         # SKILL.md size bloat detection
├── max-length.ts             # Config rule-count bloat detection
├── no-overlap-skills.ts      # Cross-skill overlap detection (cross-file)
└── no-missing-frontmatter.ts # YAML frontmatter missing detection
```

---

### R1: no-duplicate — Literal Duplication

**Rule ID**: `no-duplicate`
**Applies to**: CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md
(Alias files: Agent.md, DESIGN.md, and .cursor/rules/*.mdc inherit coverage from their canonical counterparts.)
**Auto-fixable**: Yes
**Category**: Error

**What it detects**: Identical rule text appearing 2 or more times within the same file. The detection normalizes text (trim + lowercase) before comparison. Only the second and subsequent occurrences are flagged; the first occurrence is treated as canonical.

```
Error [no-duplicate] "Use TypeScript strict mode" appears 3 times (lines 2, 4, 9)
  -> Waste: ~12 tokens per occurrence x ~100 rounds/day = ~2,400 tokens/day
  -> Fix: Deduplicate, keep first occurrence only
```

**Implementation**: Uses `parseRules()` from the markdown parser to extract individual rule entries, then tracks normalized text in a map. Duplicates are reported with original (non-normalized) text for readability. Token waste is estimated using `estimateTokens()`.

---

### R2: no-semantic-duplicate — Semantic Duplication

**Rule ID**: `no-semantic-duplicate`
**Applies to**: CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md
(Alias coverage: same as R1)
**Auto-fixable**: No (requires human judgment)
**Category**: Warning

**What it detects**: Two or more rules that express the same meaning using different wording. Uses text similarity (Jaccard-based token overlap) with a threshold of >= 50%. Entries above 95% similarity are excluded (already caught by `no-duplicate`).

```
Warning [no-semantic-duplicate] Lines 14 and 16 have 85% semantic overlap
  "Run npm run test before committing" (line 14)
  "Run npm run test before committing and ensure all pass" (line 16)
  -> Fix: Merge into "Run `npm run test` before committing (all tests must pass)"
```

**Implementation**: Pure algorithmic similarity — no LLM dependency. Computes token-level Jaccard index between all rule pairs. Once a rule is grouped with similar rules, it is excluded from further pairwise checks to avoid redundant reports.

---

### R3: no-conflict — Contradictory Instructions

**Rule ID**: `no-conflict`
**Applies to**: CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md (within-file)
**Cross-file**: Yes — detects conflicts between different config files
(Alias coverage: same as R1)
**Auto-fixable**: No (requires human judgment)
**Category**: Error (within-file), Warning (cross-file)

**What it detects**: Two rules that express contradictory requirements. Uses a predefined conflict-pair dictionary covering:

| Conflict Type | Example Pair |
|---------------|-------------|
| Indentation | "use tabs for indent" vs "use spaces for indent" |
| Semicolons | "always use semicolons" vs "do not use semicolons" |
| Quote style | "use single quotes" vs "use double quotes" |
| Package manager | "use npm" vs "use yarn/pnpm" |
| Line length | Two different max line lengths in the same file |

```
Error [no-conflict] "Always use single quotes" (line 12) vs "Use double quotes" (line 28)
  -> Fix: Requires manual resolution — flag as ERROR, no automatic fix
```

**Cross-file variant**: Runs the same conflict-pair check across pairs of files (e.g., CLAUDE.md vs .cursorrules). Cross-file conflicts are reported as warnings, since different tools may legitimately have different conventions.

---

### R4: no-overconstrain — Tech Stack Mismatch

**Rule ID**: `no-overconstrain`
**Applies to**: CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md
(Alias coverage: Agent.md -> AGENTS.md, DESIGN.md -> CLAUDE.md)
**Auto-fixable**: No
**Category**: Warning

**What it detects**: Rules that mention a technology stack not present in the project, causing the AI to carry irrelevant constraints. Detection works by scanning rule text for tech keywords and checking for corresponding config files on disk.

| Tech Keyword | Detection File |
|-------------|---------------|
| React / JSX / useState | `package.json` (checked for react dependency) |
| Vue / .vue / Pinia | `package.json` (checked for vue dependency) |
| Angular / ngModule | `package.json`, `angular.json` |
| Next.js / getServerSideProps | `package.json`, `next.config.*` |
| Python / pytest / Django | `requirements.txt`, `pyproject.toml`, `setup.py` |
| TypeScript | `tsconfig.json` |
| Go | `go.mod` |
| Rust / Cargo | `Cargo.toml` |
| Docker | `Dockerfile`, `docker-compose.yml` |

```
Warning [no-overconstrain] "All React components must use hooks" — but no React found in package.json
  -> AI loads this constraint into every conversation, but it never applies
  -> Waste: ~15 tokens per round
```

---

### R5: no-verbose — Verbose Phrasing

**Rule ID**: `no-verbose`
**Applies to**: CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md
(Alias coverage: same as R1)
**Auto-fixable**: Yes
**Category**: Error

**What it detects**: Overly verbose phrasing that wastes tokens without adding semantic value. Uses a dictionary of common verbose patterns with suggested replacements, covering both Chinese and English:

**Chinese patterns** (partial list):
| Pattern | Replacement | Savings |
|---------|------------|---------|
| "请务必确保一定" | "请" | ~5 tokens |
| "请务必一定要确保" | "确保" | ~4 tokens |
| "一定必须要" | "必须" | ~2 tokens |

**English patterns** (partial list):
| Pattern | Replacement | Savings |
|---------|------------|---------|
| "please be absolutely sure to" | "please" | ~4 tokens |
| "it is essential that" | "must" | ~3 tokens |
| "under no circumstances should you ever" | "never" | ~5 tokens |
| "at all times you must always" | "always" | ~4 tokens |
| "in order to ensure that" | "to ensure" | ~3 tokens |
| "for the purpose of" | "for" | ~3 tokens |
| "due to the fact that" | "because" | ~4 tokens |
| "in the event that" | "if" | ~3 tokens |
| "a number of" | "many" | ~2 tokens |

Also removes instruction padding: "I want you to", "remember that", "don't forget to".

```
Error [no-verbose] "请务必确保一定在提交前运行所有测试用例" (25 tokens, line 14)
  -> "提交前运行测试" (6 tokens) — saves 76%
  -> Auto-fixable
```

---

### R6: no-global-path-rule — Misplaced Path-Scoped Rules

**Rule ID**: `no-global-path-rule`
**Applies to**: CLAUDE.md, AGENTS.md
(Alias coverage: Agent.md -> AGENTS.md, DESIGN.md -> CLAUDE.md)
**Auto-fixable**: No
**Category**: Warning

**What it detects**: Rules that are scoped to a specific directory or file but are written in a global config file, causing the AI to load them into every conversation regardless of relevance. Uses pattern matching to detect path-scoped phrasing:

| Pattern Type | Example Match |
|-------------|--------------|
| Directory-specific | "for the `docs/` directory", "in `src/components/`" |
| File-specific | "only in `.ts` files", "applicable to `*.vue`" |
| Chinese path scope | "针对 `docs/` 目录", "适用于 `src/` 下的文件" |

```
Warning [no-global-path-rule] "For the docs/ directory, use X format" — appears in global CLAUDE.md
  -> This rule loads in every conversation, but only applies to docs/ scenarios
  -> Waste: ~200 tokens per round in non-docs conversations
  -> Fix: Move to path-scoped rules or use conditional phrasing
```

---

### R7: no-stale-reference — Dead References

**Rule ID**: `no-stale-reference`
**Applies to**: CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md
(Alias coverage: same as R1)
**Auto-fixable**: No
**Category**: Warning

**What it detects**: References to files, directories, or paths that no longer exist on disk. Scans for relative paths (`./src/foo.ts`, `../config.json`) and absolute paths (`/path/to/file.ext`). Validates each reference against the filesystem.

```
Warning [no-stale-reference] CLAUDE.md references "@docs/architecture/overview.md" — file does not exist
  -> The AI agent will attempt to read this file and fail, wasting an API call
  -> Fix: Remove the reference or restore the file
```

**Scope**: References that escape the config file's directory are skipped to avoid false positives for paths that may exist outside the project.

---

### R8: no-null-effect — Hollow Constraints

**Rule ID**: `no-null-effect`
**Applies to**: CLAUDE.md, AGENTS.md
(Alias coverage: Agent.md -> AGENTS.md, DESIGN.md -> CLAUDE.md)
**Auto-fixable**: No
**Category**: Warning

**What it detects**: Constraints that produce no observable behavioral change — subjective judgments, unverifiable platitudes, and purely motivational expressions that the AI cannot translate into concrete action.

**Chinese hollow patterns** (partial list):
| Pattern | Why it's hollow |
|---------|----------------|
| "确保代码质量" | No concrete standard, not actionable |
| "写出好的代码" | Subjective — AI cannot determine what "good" means |
| "代码要干净整洁" | No objective measurement |
| "注意安全性" | No specific checks — equivalent to saying nothing |
| "小心处理" | Lacks specific guidance |
| "遵循最佳实践" | Does not specify which practices |

**English hollow patterns** (partial list):
| Pattern | Why it's hollow |
|---------|----------------|
| "ensure code quality" | No measurable standard |
| "write good/clean code" | Subjective, not actionable |
| "code should be clean" | Not measurable |
| "be careful with..." | No specific guidance |
| "follow best practices" | Unspecified |
| "keep it simple" | Platitude |
| "try to make/keep/ensure" | Non-committal, ambiguous |
| "do a good job" | Purely motivational |

```
Warning [no-null-effect] "Write good, clean code" (line 22)
  -> This is a platitude — no observable behavioral change results from it
  -> Fix: Replace with concrete, verifiable standards
```

---

### R9: no-skill-bloat — SKILL.md Size Bloat

**Rule ID**: `no-skill-bloat`
**Applies to**: SKILL.md only
**Auto-fixable**: No
**Category**: Warning

**What it detects**: SKILL.md files that exceed reasonable size thresholds. Measures two dimensions:

| Threshold | Default | Meaning |
|-----------|---------|---------|
| Rule count | 20 instructions | Too many instructions overload the AI context |
| Line count | 150 lines | Large files consume excessive input tokens per trigger |

```
Warning [no-skill-bloat] imagegen-frontend-mobile/SKILL.md: 45 instructions (threshold: 20)
  -> 25 rules over the limit
  -> Consider splitting into multiple focused Skills
  -> Estimated waste: ~200 tokens per trigger
```

---

### R10: max-length — Config Rule Count Bloat

**Rule ID**: `max-length`
**Applies to**: CLAUDE.md, AGENTS.md
(Alias coverage: Agent.md -> AGENTS.md, DESIGN.md -> CLAUDE.md)
**Auto-fixable**: No
**Category**: Warning

**What it detects**: Config files with an excessive number of rules, which research shows causes AI compliance rate to decline. Default threshold is 15 rules.

```
Warning [max-length] CLAUDE.md: 28 rules (threshold: 15, 13 over)
  -> Research: AI compliance drops from 94% (50 lines) to 71% (400 lines)
  -> Estimated token waste: ~104 tokens per conversation
  -> Fix: Prioritize and trim rules, or move some to path-scoped configs
```

---

### R11: no-overlap-skills — Cross-Skill Overlap

**Rule ID**: `no-overlap-skills`
**Type**: Cross-file rule
**Applies to**: SKILL.md pairs (any two Skills in the project)
**Auto-fixable**: No
**Category**: Warning

**What it detects**: Two Skills whose trigger domains or instruction sets are highly overlapping. Uses a combined similarity score:

- **Description similarity** (weight: 40%): Jaccard similarity between the two Skills' YAML `description` fields
- **Rule content similarity** (weight: 60%): Jaccard similarity between the full instruction text of both Skills

**Threshold**: Combined similarity >= 60% triggers a warning.

```
Warning [no-overlap-skills] design-taste-frontend/SKILL.md <-> design-taste-frontend-v1/SKILL.md
  -> Description overlap: 82%, Rules overlap: 78%
  -> Combined similarity: 80%
  -> Recommendation: Uninstall the v1 (legacy) version or mark it as deprecated
```

---

### R12: no-missing-frontmatter — Missing YAML Frontmatter

**Rule ID**: `no-missing-frontmatter`
**Applies to**: SKILL.md only
**Auto-fixable**: Yes
**Category**: Error

**What it detects**: SKILL.md files that are missing required YAML frontmatter (`---` delimited block at the top of the file). Checks for:

1. Frontmatter block entirely missing -> **Error**: "SKILL.md is missing YAML frontmatter (requires name + description)"
2. `name` field missing -> **Error**: "SKILL.md frontmatter is missing required field: name"
3. `description` field missing or empty -> **Error**: "SKILL.md frontmatter is missing required field: description"

```
Error [no-missing-frontmatter] minimalist-ui/SKILL.md: missing "name" field
  -> Skill may not be correctly identified and loaded by the AI agent
  -> Auto-fixable: injects minimal frontmatter with name + description placeholders
```

**Fix behavior**: Inserts a minimal valid frontmatter block. If the file has no frontmatter, a new block is prepended. If specific fields are missing, they are inserted into the existing block.

---

## 2. Cross-File Detection

In addition to the 10 single-file rules, ai-lint supports cross-file analysis via `--cross-files`:

### Cross-File Conflict Detection

Runs `no-conflict` checks between every pair of config files in the project. If CLAUDE.md mandates single quotes but .cursorrules mandates double quotes, a cross-file conflict is reported as a warning.

### Cross-Skill Overlap Detection (R11)

As described above, detects overlapping trigger domains between any two SKILL.md files in the project, including Skills across different directories (.claude/skills/, skills/, .opencode/skills/).

### CLI Invocation

```
ai-lint --cross-files          # Includes cross-file analysis in the scan
```

---

## 3. Output Formats

### Default Scan (`ai-lint`)

```
> npx ai-lint

  CLAUDE.md        Health: 62/100 (needs attention)
  AGENTS.md        Health: 78/100 (ok)
  brandkit/SKILL   Health: 55/100 (needs attention)

  -- 3 files, 3 issues --

  CLAUDE.md
  Error [no-duplicate] "TypeScript strict mode" appears 2x (lines 2, 4) — wastes ~1,200 tokens/day
  Error [no-verbose] "请务必确保一定在提交前运行所有测试用例" (line 14) — 76% reducible

  brandkit/SKILL.md
  Warning [no-skill-bloat] 45 instructions (threshold: 20) — ~200 tokens per trigger

  -- 2 fixes available, 1 warning --
  Run `ai-lint fix` to auto-fix 2 issues
```

### JSON Output (`ai-lint --json`)

```
> npx ai-lint --json
{"files":[{"file":"CLAUDE.md","issues":[...]}],"errors":2,"warnings":1}
```

### Stats View (`ai-lint stats`)

```
> npx ai-lint stats

  Health Score Summary

  | File                         | Score  | Status |
  |------------------------------|--------|--------|
  | CLAUDE.md                    |  62/100| warn   |
  | AGENTS.md                    |  78/100| ok     |
  | brandkit/SKILL.md            |  55/100| warn   |

  3 files  |  Average health: 65/100  |  Overall: needs attention
```

### Cross-File Output

```
> npx ai-lint --cross-files

  -- Cross-file Detection --

  Warning [no-overlap-skills]  design-taste-frontend <-> design-taste-frontend-v1
    Description overlap: 82%
    Recommendation: Uninstall the v1 (legacy) version
```

---

## 4. CLI Command Reference

| Command | Description |
|---------|-------------|
| `ai-lint [path]` | Scan all AI config files in the given directory (default: cwd). Accepts a file path to scan a single file. |
| `ai-lint fix [path]` | Auto-fix fixable issues (no-duplicate, no-verbose, no-missing-frontmatter). Conflicts and semantic duplicates require manual resolution. |
| `ai-lint fix --dry-run` | Preview what fixes would be applied without modifying files. |
| `ai-lint explain <rule-id>` | Display detailed description and applicable file types for a specific rule. |
| `ai-lint init [path]` | Generate a healthy AI config template. Supports types: `claude`, `agents`, `skill`, `design`. |
| `ai-lint stats [path]` | Display a health score summary table for all discovered config files. |
| `ai-lint install <tool>` | Install ai-lint as a skill or config rule into AI coding tools. Supports: claude, codex, opencode, qoder, cursor, windsurf, gemini, copilot, all. |
| `ai-lint --ci` | CI mode — exit code 1 if any errors or warnings are found. |
| `ai-lint --json` | Output results as JSON for consumption by other tools. |
| `ai-lint --cross-files` | Enable cross-file analysis (inter-file conflicts and skill overlap). |
| `ai-lint --rules <ids>` | Limit detection to a comma-separated list of rule IDs. |
| `ai-lint --no-color` | Disable colored output (useful in CI/log files). |

**Binary aliases**: `ai-lint` and `al` are equivalent (`npx al fix` works the same as `npx ai-lint fix`).

---

## 5. Detection Dimension Matrix

### Primary File Types

| Rule | CLAUDE.md | AGENTS.md | SKILL.md | .cursorrules | .windsurf-rules | GEMINI.md | copilot-instructions.md |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| R1 no-duplicate | Error | Error | Error | Error | Error | Error | Error |
| R2 no-semantic-duplicate | Warning | Warning | Warning | Warning | Warning | Warning | Warning |
| R3 no-conflict | Error | Error | Error | Error | Error | Error | Error |
| R4 no-overconstrain | Warning | Warning | -- | Warning | Warning | Warning | Warning |
| R5 no-verbose | Error | Error | Error | Error | Error | Error | Error |
| R6 no-global-path-rule | Warning | Warning | -- | -- | -- | -- | -- |
| R7 no-stale-reference | Warning | Warning | Warning | Warning | Warning | Warning | Warning |
| R8 no-null-effect | Warning | Warning | -- | -- | -- | -- | -- |
| R9 no-skill-bloat | -- | -- | Warning | -- | -- | -- | -- |
| R10 max-length | Warning | Warning | -- | -- | -- | -- | -- |

### Alias and Extended File Types

| Rule | Agent.md | DESIGN.md | .cursor/rules/*.mdc |
|------|:---:|:---:|:---:|
| R1 no-duplicate | Error (AGENTS.md alias) | Error (CLAUDE.md alias) | Error |
| R2 no-semantic-duplicate | Warning | Warning | Warning |
| R3 no-conflict | Error | Error | Error |
| R4 no-overconstrain | Warning | Warning | Warning |
| R5 no-verbose | Error | Error | Error |
| R6 no-global-path-rule | Warning | Warning | -- |
| R7 no-stale-reference | Warning | Warning | Warning |
| R8 no-null-effect | Warning | Warning | -- |
| R9 no-skill-bloat | -- | -- | -- |
| R10 max-length | Warning | Warning | -- |

**Notes**:
- `Agent.md` inherits all rules applicable to `AGENTS.md` via the file alias mapping
- `DESIGN.md` inherits all rules applicable to `CLAUDE.md` via the file alias mapping
- `.cursor/rules/*.mdc` files are modular Cursor rules and inherit the same rule coverage as `.cursorrules`
- R9 (no-skill-bloat) and R12 (no-missing-frontmatter) apply exclusively to `SKILL.md` files

### Cross-File Rules

| Rule | Scope | Severity |
|------|-------|----------|
| R3 no-conflict (cross-file) | Any pair of config files | Warning |
| R11 no-overlap-skills | Any pair of SKILL.md files | Warning |

---

## 6. File Discovery Logic

ai-lint scans the following locations for AI configuration files:

1. **Root directory** — known config files: CLAUDE.md, AGENTS.md, Agent.md, DESIGN.md, .cursorrules, .windsurfrules, GEMINI.md, copilot-instructions.md
2. **`.claude/` directory** — same known config files
3. **`skills/` directory** — SKILL.md in direct child directories
4. **`.claude/skills/` directory** — SKILL.md in direct child directories
5. **`.opencode/skills/` directory** — SKILL.md in direct child directories (OpenCode convention)
6. **`.cursor/rules/` directory** — `.mdc` files (modular Cursor rules)

---

## 7. Auto-Fix Coverage

Three rules are auto-fixable:

| Rule | Fix Strategy |
|------|-------------|
| R1 no-duplicate | Removes 2nd+ occurrences of identical text, preserving the first occurrence |
| R5 no-verbose | Replaces verbose phrasing with concise alternatives using pattern dictionary |
| R12 no-missing-frontmatter | Injects minimal valid YAML frontmatter with placeholder values |

Rules requiring human judgment (not auto-fixable): R2 (semantic duplicates), R3 (conflicts), R4 (over-constraint), R6 (path scope), R7 (stale refs), R8 (null effect), R9 (bloat), R10 (length), R11 (skill overlap).

---

## 8. Acceptance Criteria (All Met)

- [x] `ai-lint` scans all AI config files in the current directory
- [x] `ai-lint fix` auto-fixes 3 categories of issues (no-duplicate, no-verbose, no-missing-frontmatter)
- [x] `ai-lint --cross-files` detects cross-skill overlap and cross-file conflicts
- [x] `ai-lint --ci` exits with code 1 when issues are found
- [x] Scanning 16 files (multiple Skills + CLAUDE.md + AGENTS.md) in 11ms (well under 1 second)
- [x] Zero network requests — 100% local execution
- [x] 4 production dependencies (under the 5-dependency limit)
- [x] 114 tests passing across 7 test files
- [x] Binary aliases: `ai-lint` and `al` both functional
