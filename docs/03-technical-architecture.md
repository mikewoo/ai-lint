# ai-lint Technical Architecture Document

> **Version**: v0.1.0 | **Date**: 2026-07-20

---

## 1. Architectural Style

**Single-machine static analyzer** -- pure file scanning, zero network, zero state.

```
┌──────────────────────────────────────────────────────────────────┐
│                     ai-lint CLI Entry Point                       │
│  ai-lint │ ai-lint fix │ ai-lint stats │ ai-lint explain          │
│  ai-lint init │ ai-lint install │ --ci │ --json │ --cross-files   │
└──────┬───────────────────────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────────┐
│                       Rule Engine (engine.ts)                     │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  runLint()      │  │  runFix()       │  │  runCrossFiles() │  │
│  │  Single-file    │  │  Single-file    │  │  Cross-file      │  │
│  │  scan pipeline  │  │  auto-fix       │  │  detection       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘  │
│           │                    │                     │             │
│  ┌────────▼────────────────────▼─────────────────────▼─────────┐  │
│  │                    12 Detection Rules                        │  │
│  │  no-duplicate │ no-conflict │ no-overconstrain │ no-verbose  │  │
│  │  no-semantic-duplicate │ no-stale-reference │ no-overlap    │  │
│  │  no-null-effect │ no-skill-bloat │ max-length │ ...          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────┬───────────────────────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────────┐
│                     Local File System                             │
│  CLAUDE.md / AGENTS.md / DESIGN.md / skills/*/SKILL.md           │
│  .cursorrules / .windsurfrules / GEMINI.md                       │
│  copilot-instructions.md / .cursor/rules/*.mdc                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Production Dependencies (4)

| Dependency | Purpose |
|------------|---------|
| `chalk` | Terminal output coloring |
| `commander` | CLI framework |
| `fs-extra` | File system operations |
| `pathe` | Cross-platform path handling |

### Dev Dependencies

| Dependency | Purpose |
|------------|---------|
| `typescript` | Type checking and compilation |
| `tsup` | ESM bundling with `dts` generation |
| `vitest` | Unit and integration testing |
| `@biomejs/biome` | Code linting and formatting |

### Explicitly Avoided

| Skipped | Reason |
|---------|--------|
| boxen | Output format does not need box borders; concise list style is closer to ESLint |
| ora | Scan speed < 1s, no loading animation needed |
| execa | Pure file scanning, no process execution |
| smol-toml | Target files are all Markdown / YAML frontmatter, no TOML |
| Ink | React renderer too heavy for a CLI linter |
| i18next | English-only output for global audience |

---

## 3. Directory Structure

```
ai-lint/
├── src/
│   ├── index.ts                  # Public API exports
│   ├── cli.ts                    # Commander-based CLI entry (shebanged)
│   ├── engine.ts                 # 3 pipelines: runLint, runFix, runCrossFiles
│   ├── types.ts                  # Shared types (RuleEntry, LintIssue, SkillMeta)
│   ├── utils.ts                  # Utility functions (truncate, estimateTokens)
│   │
│   ├── parser/
│   │   ├── markdown.ts           # Markdown rule parsing (extract list items)
│   │   └── frontmatter.ts        # YAML frontmatter extraction
│   │
│   ├── rules/
│   │   ├── types.ts              # Rule and CrossFileRule interfaces
│   │   ├── registry.ts           # Rule registry, lintFile, getFixer, getRulesForFile
│   │   ├── no-duplicate.ts       # Literal duplicate detection + fix
│   │   ├── no-semantic-duplicate.ts  # Keyword-hash-based semantic similarity
│   │   ├── no-conflict.ts        # Contradictory instruction detection
│   │   ├── no-overconstrain.ts   # Over-constraint detection
│   │   ├── no-verbose.ts         # Verbose phrasing detection + simplification fix
│   │   ├── no-global-path-rule.ts    # Mis-scoped global rule detection
│   │   ├── no-stale-reference.ts     # Dead file/path reference detection
│   │   ├── no-null-effect.ts     # Vague directive (platitude) detection
│   │   ├── no-skill-bloat.ts     # SKILL.md size threshold detection
│   │   ├── max-length.ts         # Config file rule count threshold
│   │   └── no-missing-frontmatter.ts # SKILL.md YAML header check + fix
│   │
│   ├── fixer/
│   │   ├── deduplicate.ts        # Remove duplicate lines, text similarity utility
│   │   └── simplify.ts           # Verbose-to-concise pattern replacement
│   │
│   ├── cross-files/
│   │   ├── skill-overlap.ts      # Cross-skill description overlap detection
│   │   └── conflict.ts           # Cross-file conflict detection
│   │
│   ├── report/
│   │   └── render.ts             # Terminal output (ESLint-style) + JSON render
│   │
│   └── discovery/
│       └── find-files.ts         # Auto-discovery of AI config files (6 locations)
│
├── test/
│   ├── fixtures/
│   │   ├── healthy-claude.md
│   │   ├── duplicate-claude.md
│   │   ├── conflict-claude.md
│   │   └── skills/               # Simulated skill directories
│   │       ├── skill-a/SKILL.md
│   │       └── skill-b/SKILL.md
│   ├── parser.test.ts            # Markdown + frontmatter parser tests
│   ├── rules.test.ts             # 12 rule unit tests (611 lines)
│   ├── fixer.test.ts             # Auto-fix unit tests
│   ├── cross-files.test.ts       # Cross-file conflict + overlap tests
│   ├── integration.test.ts       # End-to-end pipeline tests
│   ├── cli.test.ts               # CLI command integration tests
│   └── performance.test.ts       # Scan speed benchmarks (16 files, repeat runs)
│
├── package.json
├── tsconfig.json
├── tsup.config.ts                # ESM bundler config (dual entry: index + cli)
├── biome.json                    # Biome linter/formatter config
└── README.md
```

---

## 4. Core Module Design

### 4.1 Shared Types (`src/types.ts`)

```typescript
/** A parsed rule entry from Markdown */
interface RuleEntry {
  /** Rule text content (plain text after removing list markers) */
  text: string
  /** Original line number (1-based) */
  line: number
  /** Original line content (for precise location during fix) */
  raw: string
}

/** Issue severity level */
type Severity = 'error' | 'warning'

/** A single detection result */
interface LintIssue {
  ruleId: string           // e.g. 'no-duplicate'
  severity: Severity
  file: string             // relative path display name
  line?: number
  column?: number
  message: string          // human-readable description
  tokenWaste?: number      // estimated token waste
  fixable: boolean
}

/** Skill YAML frontmatter metadata */
interface SkillMeta {
  name: string
  description: string
  [key: string]: string
}
```

### 4.2 Rule Interfaces (`src/rules/types.ts`)

```typescript
/** Single-file lint rule interface */
interface Rule {
  id: string
  description: string
  /** Applicable file types (e.g. 'CLAUDE.md', 'SKILL.md') */
  files: string[]
  /** Check function — receives file content and path, returns issues */
  check(content: string, filePath: string): LintIssue[]
  /** Fix function (optional — absent means not auto-fixable) */
  fix?(content: string, issue: LintIssue): string
}

/** Cross-file lint rule interface (used by cross-files/ modules) */
interface CrossFileRule {
  id: string
  description: string
  /** Check function — receives a map of all file metadata */
  check(files: Map<string, { content: string; path: string }>): LintIssue[]
}
```

### 4.3 Engine -- Three Pipelines (`src/engine.ts`)

The engine exposes three independent pipelines, each with its own entry point:

```typescript
/** Lint pipeline: discover files, run applicable rules, summarize results */
function runLint(options: LintOptions): LintResult

/** Fix pipeline: lint, apply fix functions from bottom-to-top by line, re-lint */
function runFix(options: LintOptions): FixReport

/** Cross-file pipeline: detect cross-file conflicts and skill description overlap */
function runCrossFiles(options: LintOptions): LintResult

interface LintOptions {
  cwd?: string              // working directory (default: process.cwd())
  targetFile?: string       // single file path (skips discovery)
  rulesFilter?: string      // comma-separated rule IDs to apply
  fix?: boolean
  dryRun?: boolean
  crossFiles?: boolean
}
```

**lint pipeline** processes: resolve files -> read content -> filter rules -> run checks -> summarize.

**fix pipeline** processes: resolve files -> read content -> filter rules -> run checks -> sort by line descending (bottom-to-top) -> apply fixers -> re-detect remaining issues -> write to disk (unless dry-run).

**cross-files pipeline** processes: discover all files -> build file content map -> detect cross-file conflicts (shared by all file types) -> detect skill description overlap (skill files only) -> merge.

### 4.4 Rule Registry (`src/rules/registry.ts`)

Central module managing rule registration and file-to-rule mapping:

```typescript
/** All 11 single-file rules (12 total with 1 cross-file rule) registered in order */
const rules = [
  noDuplicate,
  noSemanticDuplicate,
  noVerbose,
  maxLength,
  noStaleReference,
  noGlobalPathRule,
  noConflict,
  noMissingFrontmatter,
  noOverconstrain,
  noNullEffect,
  noSkillBloat,
] as const

/** File name aliases: map variant names to canonical names for rule matching */
const FILE_ALIASES: Record<string, string> = {
  'DESIGN.md': 'CLAUDE.md',   // DESIGN.md uses CLAUDE.md rule set
  'Agent.md': 'AGENTS.md',     // Agent.md uses AGENTS.md rule set
}

/** Get all rules applicable to a given file name */
function getRulesForFile(fileName: string): Rule[]

/** Run all applicable rules against a given file (with per-rule error isolation) */
function lintFile(content: string, filePath: string, fileName: string): LintIssue[]

/** Get the fix function for a given rule ID */
function getFixer(ruleId: string): ((content: string, issue: LintIssue) => string) | undefined
```

The 12th rule, `no-overlap-skills` (cross-skill overlap detection), is implemented as a cross-file rule in `src/cross-files/skill-overlap.ts` rather than as a single-file rule. It is invoked through the `runCrossFiles()` pipeline.

### 4.5 File Discovery (`src/discovery/find-files.ts`)

Auto-discovers AI configuration files from 6 locations:

| Location | Files Discovered |
|----------|-----------------|
| Root directory | 8 known config file names |
| `.claude/` directory | 8 known config file names |
| `skills/*/` | `SKILL.md` (one per subdirectory) |
| `.claude/skills/*/` | `SKILL.md` (one per subdirectory) |
| `.opencode/skills/*/` | `SKILL.md` (OpenCode convention) |
| `.cursor/rules/` | `*.mdc` files (Cursor per-directory rules) |

**10 Supported File Types:**

| File | Category | Rule Coverage |
|------|----------|---------------|
| `CLAUDE.md` | Config | Full 12-rule coverage |
| `AGENTS.md` / `Agent.md` | Config | Full 12-rule coverage |
| `DESIGN.md` | Config | Aliased to CLAUDE.md rule set |
| `.cursorrules` | Config | Duplicates, conflicts, over-constrain, verbose, stale-ref |
| `.windsurfrules` | Config | Duplicates, conflicts, over-constrain, verbose, stale-ref |
| `GEMINI.md` | Config | Duplicates, conflicts, over-constrain, verbose, stale-ref |
| `copilot-instructions.md` | Config | Duplicates, conflicts, over-constrain, verbose, stale-ref |
| `SKILL.md` | Skill | 7 rule coverage + cross-skill overlap detection |
| `*.mdc` (`.cursor/rules/`) | Config | Full coverage (matched by file name) |

### 4.6 Parser -- Markdown Rule Extraction (`src/parser/markdown.ts`)

```typescript
/**
 * Parse Markdown text into a list of rule entries.
 *
 * Supports:
 * - Unordered list items: "- rule text" / "* rule text"
 * - Ordered list items: "1. rule text" / "1) rule text"
 * - Multi-line list items (continuation lines without a marker)
 *
 * Input:
 *   "- Use TypeScript strict mode"
 *   "- All functions must have JSDoc comments"
 *   "  1. Follow naming conventions"
 *
 * Output:
 *   [
 *     { text: "Use TypeScript strict mode", line: 2, raw: "- Use TypeScript strict mode" },
 *     { text: "All functions must have JSDoc comments", line: 3, raw: "- All functions must..." },
 *     { text: "Follow naming conventions", line: 4, raw: "  1. Follow naming conventions" },
 *   ]
 */
function parseRules(content: string): RuleEntry[]
```

### 4.7 Parser -- YAML Frontmatter (`src/parser/frontmatter.ts`)

```typescript
/**
 * Extract YAML frontmatter from SKILL.md files.
 *
 * Recognizes the standard `---` delimited YAML block at the start of a file.
 * Returns null if no frontmatter is present or parsing fails.
 *
 * Input:
 *   ---
 *   name: brandkit
 *   description: Premium brand-kit image generation skill...
 *   ---
 *   # BRANDKIT IMAGE GENERATION SKILL
 *
 * Output:
 *   { name: "brandkit", description: "Premium brand-kit..." }
 */
function parseFrontmatter(content: string): SkillMeta | null
```

### 4.8 Example Rule: no-duplicate

```typescript
export const noDuplicate = {
  id: 'no-duplicate' as const,
  description: 'Detect literal duplicate rules — identical text appearing more than once',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules',
          '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const seen = new Map<string, { line: number; raw: string }[]>()
    const issues: LintIssue[] = []

    for (const rule of rules) {
      const normalized = rule.text.trim().toLowerCase()
      if (seen.has(normalized)) {
        seen.get(normalized)!.push({ line: rule.line, raw: rule.raw })
      } else {
        seen.set(normalized, [{ line: rule.line, raw: rule.raw }])
      }
    }

    for (const [, occurrences] of seen) {
      if (occurrences.length > 1) {
        const first = occurrences[0]
        const displayText = first.raw.replace(/^\s*[-*+]\s+|\s*\d+[.)]\s+/, '').trim()
        const tokenWaste = estimateTokens(displayText) * (occurrences.length - 1)
        const lines = occurrences.map((o) => o.line)

        issues.push({
          ruleId: 'no-duplicate',
          severity: 'error',
          file: filePath,
          line: lines[1],         // second occurrence
          message: `"${truncate(displayText, 60)}" appears ${occurrences.length} times (lines ${lines.join(', ')})`,
          tokenWaste,
          fixable: true,
        })
      }
    }
    return issues
  },

  fix(content: string, issue: LintIssue): string {
    return deduplicateContent(content, issue)
  },
}
```

### 4.9 Cross-File Detection: Skill Overlap

```typescript
// Implemented in src/cross-files/skill-overlap.ts

interface SkillInfo {
  name: string
  meta: SkillMeta
  content: string
  path: string
}

/**
 * Detect two skills whose trigger domains or descriptions highly overlap.
 * Calculates Jaccard similarity over keyword sets extracted from descriptions.
 * Reports a warning when overlap exceeds 70%.
 */
function detectSkillOverlap(skills: SkillInfo[]): LintIssue[]
```

### 4.10 Health Score Calculation (`src/report/render.ts`)

```typescript
/**
 * Calculate file health score.
 * - Base score: 100
 * - Each error: -15
 * - Each warning: -5
 * - Minimum: 0
 */
function calcHealth(issues: LintIssue[]): number

/**
 * Summarize per-file results into aggregate counts.
 */
function summarize(fileResults: FileResult[]): LintResult

/**
 * Render ESLint-style terminal output with chalk coloring.
 */
function render(result: LintResult, rootDir: string): string

/**
 * Render JSON output for toolchain consumption.
 */
function renderJson(result: LintResult): string
```

---

## 5. CLI Command Architecture (`src/cli.ts`)

All commands are defined using `commander`. The CLI is registered as both `ai-lint` and the short alias `al`.

| Command | Description | Entry Function |
|---------|-------------|---------------|
| `ai-lint [path]` | Scan directory/file for issues (default command) | `runLint()` |
| `ai-lint fix [path]` | Auto-fix fixable issues | `runFix()` |
| `ai-lint stats [path]` | Display health score table for all files | `runLint()` + `calcHealth()` |
| `ai-lint init [path]` | Generate healthy AI config template | Local template strings |
| `ai-lint explain <rule-id>` | Show details for a specific rule | Rule registry lookup |
| `ai-lint install <tool>` | Install skill/rule into 8 AI tools | Local fs operations |

**Flags:**

| Flag | Applies To | Behavior |
|------|-----------|---------|
| `--ci` | lint (default) | Exit code 1 if any issues found |
| `--json` | lint (default) | Output results as JSON |
| `--no-color` | lint (default) | Disable chalk coloring |
| `--cross-files` | lint (default) | Enable cross-file detection |
| `--rules <ids>` | lint + fix | Limit to comma-separated rule IDs |
| `--dry-run` | fix | Preview fixes without writing to disk |
| `-t, --type <name>` | init | Template type: claude, agents, skill, design |
| `--global` | install | Install user-wide (skills only) |

---

## 6. Build and Publish

### package.json (key fields)

```json
{
  "name": "ai-lint",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "ai-lint": "dist/cli.js",
    "al": "dist/cli.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "lint": "biome check .",
    "format": "biome check --write .",
    "prepublishOnly": "npm run build"
  },
  "engines": { "node": ">=18.0.0" },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.1.0",
    "fs-extra": "^11.2.0",
    "pathe": "^1.1.2"
  }
}
```

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
})
```

Dual entry points: `src/index.ts` for programmatic API consumers, `src/cli.ts` for the CLI binary. Both share the same internal modules with no duplication.

### Usage

```bash
# Run without installing
npx ai-lint
npx al

# Scan + auto-fix
npx ai-lint fix
npx ai-lint fix --dry-run

# Cross-file detection
npx ai-lint --cross-files

# CI gate
npx ai-lint --ci --no-color

# Programmatic
import { runLint, runFix, runCrossFiles } from 'ai-lint'
```

---

## 7. Key Design Decisions

1. **Zero-config, zero-network.** The tool works immediately with no setup, no API keys, no telemetry. All scanning is local file I/O.

2. **ESLint-compatible mental model.** Rules have IDs, severities, and auto-fix functions. Output style follows a format familiar to ESLint users. Users with ESLint experience should find the concepts transferable.

3. **Error-isolated rule execution.** If a single rule throws, the engine catches the error and continues with remaining rules. A bug in one rule does not block the entire scan.

4. **Bottom-to-top fix ordering.** Fixes are applied from the highest line number to the lowest, so line numbers in subsequent fixes remain valid after earlier fixes are applied.

5. **Health score as a communication tool.** The 0-100 health score provides a quick summary of config quality. Note: the scoring weights (error=-15, warning=-5) are heuristics, not empirically calibrated. Teams can use score thresholds as a guideline but should review individual issues for decision-making.

6. **File name aliasing for seamless coverage.** `DESIGN.md` is aliased to the `CLAUDE.md` rule set. `Agent.md` (Cline convention) is aliased to `AGENTS.md`. Users don't need to know about internal aliases.

7. **Dual-entry build.** Separate `index.ts` (programmatic API) and `cli.ts` (binary) entry points let both use cases share the same engine without overhead.
