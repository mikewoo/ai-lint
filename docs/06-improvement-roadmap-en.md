# ai-lint Improvement Roadmap

> **Version**: v1.0 | **Date**: 2026-07-21 | **Status**: Planning
>
> Based on deep analysis of the sdad-agentpm (v18.0.0) initialized project pmAgent, and ongoing research into the AI programming configuration ecosystem.

---

## 0. Decision Background

### 0.1 Analysis Sources

| Source | Content | Insight |
|------|------|------|
| sdad-agentpm deep research | 102 agents, 20 source documents, 25 claim verifications | The npm package is a shell (7 files/26.5KB); value lies in the methodology system and Hook enforcement |
| pmAgent project dissection | 722 files, 8-layer architecture file-by-file analysis | Hook quality gates + knowledge base layering + Skill process definitions are the core design assets |
| ai-lint testing on pmAgent | 22 files scanned, 21 errors / 41 warnings | Exposed real issues: broken references, content bloat, cross-file drift |
| 57-competitor survey | 6 segments fully covered | Token analysis + config quality detection is an untapped market |

### 0.2 Product Positioning Evolution

```
v0.1.x (current): AI config file static checker
v0.2+  (target):  AI config system health diagnostics + optimization engine
```

Core shift: from "checking if individual files are well-written" to "helping users make AI understand intent more accurately with fewer tokens."

### 0.3 Decision Framework

Each feature is evaluated against three criteria:

| Criterion | Question |
|------|------|
| Universality | Will every AI config user encounter this? |
| Moat | Can any other tool solve this besides ai-lint? |
| Actionability | Can users take immediate action after seeing the result? |

3/3 → P0, 2/3 → P1, 1/3 → P2, 0/3 → Won't do.

---

## 1. Version Planning Overview

| Version | Name | Goal | Est. Duration |
|------|------|------|---------|
| **v0.2** | Token Era | Token analysis engine + rule conflict detection | 1-2 weeks |
| **v0.3** | Ecosystem | PR visibility + dilution detection + auto-fix pre-commit | 1-2 weeks |
| **v0.4** | Deep Diagnostics | Reference integrity + cross-file drift + rot detection + methodology audit | 1-2 weeks |
| **v1.0** | Stable | Architecture consolidation, performance, docs, rule marketplace foundation | 1 week |

---

## 2. v0.2 — Token Era (P0)

### 2.1 Goals

Enable users to answer three questions:
1. How many tokens does my AI config consume?
2. Which files/sections are the biggest token consumers?
3. What can be trimmed, and exactly how much can I save?

### 2.2 Token Analysis Engine

#### 2.2.1 Architecture

```
Input files
  │
  ├── parseMarkdown() → Semantic segmentation
  │     ├── Metadata (frontmatter, title, version)
  │     ├── Methodology / rationale
  │     ├── Trigger tables / lookup tables
  │     ├── Execution rules
  │     ├── Code examples
  │     └── Decorative content (separators, emoji, ASCII art)
  │
  ├── Classification → TokenEstimator
  │     └── Aggregate token consumption by category
  │
  └── Report generation
        ├── TokenBudgetReport (overall)
        ├── TokenPerFile (file-level)
        └── OptimizationSuggestion (actionable advice)
```

#### 2.2.2 Implementation Details

**Token estimation**: Extend the existing estimation algorithm (CJK 0.67x coefficient) for categorized estimation.

**Segmentation strategy**:
- Identify `##` heading boundaries → major sections
- Identify list blocks, code blocks, quote blocks → sub-sections
- Identify decorative content (separators `---` / `━━━`, emoji) → mark as non-essential

**Classification rules** (initial version, extensible):

| Category | Identification Pattern | Recommendation |
|------|---------|---------|
| `meta` | Frontmatter, version lines | Keep |
| `methodology` | Paragraphs containing keywords like "pillar", "methodology", "philosophy" | Can trim |
| `trigger-table` | Tables with "trigger", "keyword" column headers | Keep but suggest compression |
| `rule` | Numbered list items starting with verbs | Core, keep |
| `example` | Code blocks | Keep sparingly |
| `decoration` | Separators, emoji, ASCII art | Suggest removal |
| `redundant` | Content already flagged by `no-duplicate` / `no-semantic-duplicate` | Suggest merge |

**Redundancy Analysis** (sub-capability of the Token analysis engine):

The engine identifies content that "consumes tokens without adding information." Two complementary detection dimensions:

**Dimension 1: Toolchain Coverage Detection (🟢 High Confidence)**

Instead of guessing "what the AI knows," detect "what the project's toolchain already enforces." Rules already enforced by the toolchain are wasted tokens in AI configs — violating code will be caught at pre-commit/CI anyway.

| Toolchain | Detection Method | Example | Version |
|--------|---------|------|:--:|
| ESLint | Parse `.eslintrc.*` (including flat config `eslint.config.js`) → extract rules → compare with AI config rules | ESLint has `no-var`, CLAUDE.md says "use const not var" → redundant | v0.2 |
| Prettier | Parse `.prettierrc.*` → compare formatting rules | Prettier has `tabWidth: 2`, CLAUDE.md says "use 2-space indent" → redundant | v0.2 |
| TypeScript | Parse `tsconfig.json` (with extends chain) → compare type rules | `strict: true`, CLAUDE.md says "avoid implicit any" → redundant | v0.3 |
| Biome | Parse `biome.json` → extract rules → compare | Biome has `noConsoleLog`, CLAUDE.md says "no console.log" → redundant | v0.3 |
| ai-lint itself | Parse `.ai-lintrc.json` → compare duplicate exemptions | Ignored path in config, same path exempted in hook file → double exemption | v0.3 |

> **Version split rationale**: ESLint and Prettier together cover the lint/format needs of most frontend projects, and both have mature config parsing libraries. TypeScript's extends chain parsing and Biome's config format are more complex with narrower benefit, deferred to v0.3.

```
💡 Toolchain Coverage Detection:
ESLint (no-var) already enforces "use const not var"
  → CLAUDE.md line 67 "use const not var" can be safely removed
  → Save ~15 tokens; ESLint catches var declarations at pre-commit

Prettier (tabWidth: 2) already enforces indentation style
  → CLAUDE.md line 82 "use 2-space indent" can be safely removed
  → Save ~12 tokens

5 toolchain-covered rules found, ~120 tokens can be saved
```

> Note: Toolchain coverage detection **only triggers when the corresponding tool config actually exists**. If the project has no ESLint, ESLint coverage is not checked. This is a zero-false-positive design — it only reports redundancy that is deterministically enforced by the toolchain.

**Dimension 2: Overridden Generic Rules (🟡 Advisory)**

| Redundancy Type | Identification | Example | Detection Method |
|---------|---------|------|---------|
| Overridden generic rules | Vague statements superseded by more specific rules | "Ensure code quality" (covered by specific lint rules), "Follow best practices" (no concrete target) | Generic rule pattern matching + `no-null-effect` integration |

Detection logic: a vague generic rule exists (e.g., "ensure code quality", "follow best practices") **and** 3+ specific rules cover the same domain → the generic rule is redundant.

> **Explicitly excluded**: "Common programming knowledge" (e.g., "use const not var") and "Framework basics" (e.g., "use Vue 3 Composition API") are not detected by guessing AI knowledge boundaries — different models have vastly different knowledge levels, and these rules often serve to establish a project baseline rather than teach the AI basic syntax. Instead, **toolchain coverage detection** answers the same question ("is this rule necessary") but based on verifiable facts rather than speculation.

**Compression Suggestion Engine**:

Generates actionable optimization suggestions based on classification and redundancy analysis. **Compression strategies are divided into two safety tiers**:

```
🟢 Safe auto-fix (ai-lint fix handles automatically):
├── De-decoration: Remove visual elements that don't affect AI understanding
│   Example: "━━━━━━━━━━" → blank line (save ~12 tokens/instance)
│   Guarantee: Pure visual elements, zero semantic impact
│
└── Example trimming: Keep 1 representative example, remove redundant ones
    Example: 3 identical code examples → keep 1 + comment
    Guarantee: Kept example is logically equivalent to removed ones

🟡 Advisory only (ai-lint fix does NOT auto-process; user must decide manually):
├── Merge similar: Multiple semantically similar rules → one refined rule
│   Example: "No console.log" + "Remove debug logs before commit" + "No TODO"
│        → "Remove all debug output before commit (console.log, TODO)"
│   Risk: Merging may change emphasis; multiple repetitions may be an intentional reinforcement signal
│
├── Wording simplification: Verbose phrasing → concise phrasing
│   Example: "Under no circumstances should you modify config files to suppress errors"
│        → "Never modify config files to suppress errors"
│   Risk: Natural language has no AST equivalence guarantee; simplification may lose subtle semantics
│
└── Methodology compression: Long explanatory paragraphs → single-line reference
    Example: 200-word methodology section → "Follow SDAD seven-pillar methodology (see docs/sdad.md)"
    Risk: Requires user confirmation that the replacement accurately conveys the original intent
```

> **Design principle**: Code auto-fix equivalence is guaranteed by AST; natural language has no such guarantee. Therefore, auto-fix only handles **deterministically safe** changes (de-decoration, redundant example removal). Semantic changes are presented as informational suggestions only, requiring manual user action.

**Trigger Table Optimization** (safe auto-fix, special case):

Trigger table wording can be safely auto-fixed because trigger matching is keyword-based, not semantic:

```
🟢 Trigger table de-duplication:
   "Create page, Generate page, Implement feature, Develop feature, Build feature"
   → "Create|Generate|Implement|Develop|Build feature" (merge shared suffix)
   Save ~15 tokens, no impact on matching
```

#### 2.2.3 Output Format

**Default output (appended at end of ai-lint scan)**:

```
Token Budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE.md                            3,200 tokens (34%)
  ├── Rules           1,200 (37%) ████████░░ Core
  ├── Trigger table     800 (25%) █████░░░░░ Essential
  ├── Methodology       700 (22%) █████░░░░░ ⚠️ Trimmable
  ├── Decoration        300 (9%)  ██░░░░░░░░ 💡 Save ~250
  └── Examples          200 (6%)  █░░░░░░░░░ Reasonable

page-generator/SKILL.md              2,800 tokens (29%)
req-doc/SKILL.md                     2,100 tokens (22%)
rules/ (5 files)                     1,400 tokens (15%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 9,500 tokens (4.8% of context window)

💡 Optimization suggestions:
  1. CLAUDE.md separators/emoji decoration → save ~250 tokens
  2. Methodology paragraphs can compress to single-line reference → save ~400 tokens
  3. Estimated after optimization: 8,850 tokens (7% savings)
```

**Detailed mode (`ai-lint stats --tokens`)**: Shows full category breakdown.

#### 2.2.4 CLI Interface

```
ai-lint                      # Default scan, append token summary at end
ai-lint --tokens             # Output token analysis report only (skip lint)
ai-lint stats --tokens       # Detailed token report, file/category breakdown with suggestions
```

**Difference between `--tokens` and `stats --tokens`**:

| Command | Output Granularity | Includes Lint | Use Case |
|------|---------|:--:|------|
| `ai-lint` (default) | Aggregated summary (3-5 lines) | Yes | Daily use, quick overview |
| `ai-lint --tokens` | File-level report | No | Just want token distribution, don't care about lint |
| `ai-lint stats --tokens` | File + section + category detail | No | Deep optimization: which section, which category costs most |

#### 2.2.5 New Source Files

```
src/
├── analyzer/
│   ├── token.ts            # TokenEstimator core algorithm
│   ├── segment.ts          # Semantic segmenter
│   └── classify.ts         # Content classifier
└── report/
    └── token-budget.ts     # Token report renderer
```

#### 2.2.6 Tests

```
test/
└── token.test.ts           # Coverage:
                            #   - Single-file token estimation accuracy
                            #   - Segmentation classification correctness
                            #   - Multi-file aggregation
                            #   - Edge cases: empty file, frontmatter-only, code-block-only
```

### 2.3 Rule Conflict Detection

#### 2.3.1 Design Principles

Only detect **deterministically verifiable** conflict types:

| Type | Definition | Confidence |
|------|------|:------:|
| Hard conflict | Two rules directly contradict each other | 100% |
| Soft conflict | One rule renders another ineffective | 90%+ |
| Trigger conflict | Two skills compete for the same trigger word | 100% |

**Won't do** vague "this rule may reduce AI compliance" — no experimental data.

#### 2.3.2 Hard Conflict Detection

Cross-file scanning, based on keyword pair matching:

```
Detection patterns:
├── "Use Chinese" ↔ "Use English"              → Language direction conflict
├── "Never modify X config" ↔ "Modify X config" → Operation conflict
├── "Strictly follow A" ↔ "Follow B instead"    → Priority conflict
└── "Always use X" ↔ "Avoid using X"            → Choice conflict
```

Implementation: Extend `no-conflict`'s `CONFLICT_PAIRS` dictionary, add cross-file scanning capability.

#### 2.3.3 Soft Conflict Detection

One rule logically invalidates another:

```
Scenarios:
├── CLAUDE.md: "All changes must go through code-reviewer"
│   config.json: codeReview.mode = "off"
│   → Review gate is disabled, the above rule is ineffective
│
├── CLAUDE.md: "All user-facing output must be in Chinese"
│   .windsurfrules: This rule not included
│   → Rule won't apply when using Windsurf
│
└── design-advisor.md: "Must read knowledge/conventions/coding.md first"
    .claude/agentpm-knowledge/conventions/coding.md: File does not exist
    → Mandatory prerequisite step cannot execute
```

#### 2.3.4 Trigger Word Conflict Detection

Scan CLAUDE.md trigger tables for cross-skill trigger word overlap:

```
⚠️ Trigger word conflict:
"Create page" → matches both page-generator and brainstorming
"Add feature" → matches both brainstorming and page-generator
"Generate page" → matches both page-generator and annotation

→ AI may select the wrong skill, causing unexpected behavior
```

Implementation: Build an inverted index of the CLAUDE.md skill trigger table, detect how many skills each trigger word maps to.

#### 2.3.5 New/Modified Source Files

```
src/
├── rules/
│   ├── no-conflict.ts       # Extended: cross-file conflict + soft conflict
│   └── no-trigger-conflict.ts  # New: trigger word conflict detection
└── cross-files/
    └── conflict.ts          # Extended: cross-file hard/soft conflicts
```

### 2.4 v0.2 Milestones

| Item | Deliverable | Acceptance Criteria |
|------|--------|---------|
| Token analysis engine | `src/analyzer/token.ts` + report rendering | Categorized report for pmAgent project, token estimation error <10%, semantic segmentation macro-F1 >= 0.85 |
| Hard conflict detection | Cross-file conflict scanning | Detect at least 1 real conflict in pmAgent |
| Trigger conflict detection | `no-trigger-conflict` rule | Detect trigger word overlap in pmAgent |
| Tests | ~20 new tests | All passing, covering Token + conflict checks |
| Docs | README update + new CLI flag docs | `npx ai-lint --help` shows new options |

---

## 3. v0.3 — Ecosystem (P1)

### 3.1 Goals

1. Integrate ai-lint into the development workflow (without disrupting users)
2. Help users identify rule dilution problems

### 3.2 PR Visibility Integration

#### 3.2.1 Design Philosophy

No pre-commit blocking (advisory rules shouldn't forcibly block commits). Instead, **PR diff reports**:

- No blocking = don't burden developers
- Provide visibility = inform reviewers
- Modeled after bundle-size bots, a proven and acceptable pattern

#### 3.2.2 Feature Spec

**`ai-lint --diff`**: Only report new issues introduced by the current changes.

```
Workflow:
git diff --name-only origin/main...HEAD   → Get changed file list
  ├── Filter: AI config files only
  └── ai-lint scans each
       ├── Compare with committed version (git show HEAD:path)
       └── Only report newly introduced issues

Output:
📊 AI Config Diff (3 files changed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE.md: +400 tokens (now 3,200)
  + 3 new rules added
  ⚠️ Rule count now 29, approaching dilution threshold (30)

page-generator/SKILL.md: +1,200 tokens (now 4,500)
  ❌ New duplicate rule: line 267 duplicates line 189

No regressions detected.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 3.2.3 GitHub Actions Integration

New workflow template under `integrations/github-actions/`:

```yaml
name: AI Config Review

on:
  pull_request:
    paths:
      - 'CLAUDE.md'
      - 'AGENTS.md'
      - '.claude/**'
      - '.cursor/**'
      - 'SKILL.md'
      - '**/SKILL.md'
      - '.windsurfrules'
      - 'GEMINI.md'
      - 'DESIGN.md'

jobs:
  ai-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npx @itdest/ai-lint --diff
        # --diff: always exit 0, informational report only, never blocks PR
        # Results displayed as PR comment for reviewer reference
```

#### 3.2.4 `ai-lint install` Extension

Add `--ci` option to the existing `ai-lint install` command:

```
npx ai-lint install --ci github-actions    # Generate .github/workflows/ai-lint.yml
npx ai-lint install --ci husky             # Generate .husky/pre-commit (--fix --staged only)
```

### 3.3 Rule Dilution Detection

#### 3.3.1 Problem Definition

When too many peer rules exist, LLM attention to later list items may drop (see Liu et al. 2023 on long-context retrieval; applicability to rule lists is analogous but not independently verified).

#### 3.3.2 Detection Logic

```
Thresholds:
├── Green:  <=15 peer rules  → Safe
├── Yellow: 16-25             → Warning, suggest prioritization
└── Red:    >25               → Error, strongly suggest splitting

Detection scope:
├── Numbered lists under ## Execution Rules in CLAUDE.md
├── Step lists in any SKILL.md
└── Rule lists in .cursorrules / .windsurfrules
```

#### 3.3.3 Output Format

```
⚠️ Rule dilution warning: CLAUDE.md lines 45-128
33 peer rules, exceeds 25 threshold (Red zone)
LLM attention to later list items drops significantly (see Lost in the Middle, Liu et al. 2023)

Affected rules (positions 22-33):
  Line 118: "Agent orchestration rules"       ← Important rule at the end
  Line 125: "code-reviewer invocation standard" ← Core quality gate, may be ignored

Suggestions:
  → Split 33 rules into two tiers:
     CRITICAL (8 rules) — must follow
     STANDARD (25 rules) — best practice
  → Or split by scenario into .claude/rules/ sub-files (recommended, auto-loaded)
  → Or use no-null-effect rule to identify low-information rules that can be removed
```

#### 3.3.4 Implementation Location

```
src/
└── rules/
    └── no-dilution.ts       # New rule
```

### 3.4 Auto-fix Pre-commit Integration

#### 3.4.1 Design

**Auto-fix only, no blocking.** Consistent with ESLint's `--fix` mode: silently fix deterministic issues (dedup, simplify), advisory issues remain as warnings but don't block commits.

```
# .husky/pre-commit content
npx @itdest/ai-lint --staged --fix
# Note: no --fail-on-error, does not block commits
# If ai-lint modified files, re-stage them
git add -u
```

- `--staged`: Only check AI config files in `git diff --staged --name-only`
- `--fix`: Auto-fix fixable issues (dedup, simplify redundant wording, add frontmatter)
- **No blocking**: Exit 0 after fix, even with unresolved warnings
- Hash comparison: Only prompt user to review changes if files were actually modified

**Why not `--max-warnings 0`?**

ESLint's `--max-warnings 0` makes sense in CI — JS code warnings (like `no-unused-vars`) usually indicate real problems. But ai-lint's warnings are advisory (skill too long, too many rules); users may have good reasons to exceed thresholds. Forced blocking only leads to users uninstalling the hook.

#### 3.4.2 CLI Changes

```
ai-lint --staged            # Only check staged files
ai-lint --staged --fix      # Auto-fix staged files
ai-lint --staged --json     # JSON output (for CI)
```

### 3.5 Configuration Mechanism (`.ai-lintrc.json`)

#### 3.5.1 Design Principles

v0.2-v0.3 introduce many new rules, each with thresholds. To avoid hardcoded values that users can't adapt, introduce a configuration file in v0.3:

- All thresholds have defaults; the config file is **completely optional**
- Full functionality with zero config; config file only for customization
- Config priority: `.ai-lintrc.json` > defaults
- Supports glob pattern `ignore` lists

#### 3.5.2 Config Structure

```json
{
  "rules": {
    "no-dilution": {
      "warnThreshold": 15,
      "errorThreshold": 25
    },
    "no-skill-bloat": {
      "maxLines": 200,
      "maxInstructions": 30
    },
    "no-stale-tool-config": {
      "warnDays": 14,
      "errorDays": 60
    }
  },
  "tokenBudget": {
    "warnPercent": 5,
    "fileWarnPercent": 15
  },
  "ignore": [
    "skills/gpt-image-generator/**",
    ".claude/agentpm-knowledge/**"
  ],
  "deep": {
    "checkRefs": true,
    "checkDrift": false,
    "checkRot": true
  }
}
```

**Purpose of the `deep` section**: Allows fine-grained control over deep checks. For example, a project using only Claude Code can disable `checkDrift` to avoid pointless cross-directory hash comparisons. CLI flags can also override this config: `ai-lint --deep --no-check-drift`.

#### 3.5.3 Config File Discovery

Unlike ESLint's cascading config, ai-lint only looks for `.ai-lintrc.json` in the **project root directory** (same level as `.claude/`), with no cascading merge. Rationale: AI config context is project-level; there's no scenario for sub-directory independent configs.

#### 3.5.4 Implementation Location

```
src/
└── config/
    ├── loader.ts            # Config file loading + default merging
    ├── schema.ts            # JSON Schema definition (for IDE autocompletion)
    └── validator.ts         # Config validation
```

### 3.6 v0.3 Milestones

| Item | Deliverable | Acceptance Criteria |
|------|--------|---------|
| `ai-lint --diff` | Full diff mode functionality | Meaningful diff report for pmAgent commit scenarios |
| GitHub Actions template | `integrations/github-actions/` | Runs correctly on test repo |
| `ai-lint install --ci` | CLI extension | One-command CI config file generation |
| `.ai-lintrc.json` config | `src/config/` loading + validation + schema | Custom thresholds take effect, ignore list works |
| Rule dilution detection | `no-dilution` rule | Detects pmAgent CLAUDE.md's 33-rule dilution |
| `--staged` flag | CLI extension | Only checks staged files |
| Tests | ~20 new tests | Covering diff/staged/dilution/config |

---

## 4. v0.4 — Deep Diagnostics (P2)

### 4.1 Goals

Deep health checks for complex AI config systems (multi-tool, multi-skill, long-term maintenance). Not enabled by default; activated via `--deep`.

### 4.2 Reference Integrity Checks

#### 4.2.1 Detection Rules

| Rule ID | What It Detects | User Value |
|---------|---------|---------|
| `no-dead-skill-ref` | Whether skill files referenced in CLAUDE.md trigger tables exist | Wrote trigger words but file is missing |
| `no-dead-agent-ref` | Whether agent files referenced via `subagent_type: "xxx"` in skills/rules exist | Orchestration pipeline breaks |
| `no-dead-knowledge-ref` | Whether `Read(".../knowledge/xxx.md")` paths in agent definitions are valid | Sub-agents can't load specs, work from guesswork |
| `no-orphan-skill` | Skills under `skills/` not referenced by any trigger table | Dead code, consumes tokens but never triggers |
| `no-orphan-agent` | Agents under `agents/` not referenced by any skill/rule | Same as above |

#### 4.2.2 Implementation Details

- Parse CLAUDE.md trigger tables → extract all skill names → check filesystem
- Parse `subagent_type: "xxx"` references → check agent file existence
- Parse `Read("path")` references → check path validity
- Build reference graph → detect orphan files (reverse reference check)

#### 4.2.3 Output Format

```
❌ no-dead-skill-ref: CLAUDE.md line 90
"backend-generator" skill referenced but file does not exist:
  Expected location: .claude/skills/backend-generator/SKILL.md
  Impact: After matching trigger word "implement backend", AI can't find skill definition

❌ no-dead-knowledge-ref: agents/page-spec-loader.md line 16
Read("phase2-design/ui-libs/ant-design-vue/components") referenced file does not exist
  Impact: page-spec-loader agent fails to load specs

⚠️ no-orphan-skill: .claude/skills/deprecated-helper/SKILL.md
This skill is not referenced by any trigger table and will never be triggered
  Impact: Occupies ~1,200 tokens of disk space
  Suggestion: Delete or add to CLAUDE.md trigger table
```

### 4.3 Cross-File Drift Detection

#### 4.3.1 Detection Rules

| Rule ID | What It Detects |
|---------|---------|
| `no-config-drift` | Same skill/agent has inconsistent content across different tool directories |
| `no-stale-tool-config` | A tool config directory's last modified time is far earlier than the main config |
| `no-missing-tool-config` | Project-specific skills not reflected in all tool configs |
| `no-missing-rule` | Core execution rules from CLAUDE.md not reflected in all tool configs |

#### 4.3.2 Detection Logic

```
no-config-drift:
├── Iterate all SKILL.md under .claude/skills/
├── Map by skill name to other tool directories (.cursor/ .kiro/ .trae/)
├── Compare file hashes
└── Hash mismatch → report time diff, line count diff

no-stale-tool-config:
├── Get CLAUDE.md last modified time T_main
├── Get each tool config directory's last modified time T_tool
├── If T_tool is > 7 days earlier than T_main → warning
└── If > 30 days → error
```

#### 4.3.3 Output Format

```
⚠️ no-config-drift: diagram-generator/SKILL.md
  .claude/skills/    version hash: a3f2b1c (365 lines, updated 2026-07-19)
  .cursor/skills/    version hash: d8e4a9f (342 lines, updated 2026-07-15)
  .kiro/skills/      version hash: a3f2b1c (365 lines, updated 2026-07-19)
  → Cursor version 4 days behind, 23 lines different, missing 2 steps

❌ no-stale-tool-config: .codex/
  AGENTS.md last modified 2026-03-15 (128 days ago)
  CLAUDE.md has had 14 updates since then
  → Codex config may be severely outdated, suggest deleting or re-syncing
```

### 4.4 Rot Detection

#### 4.4.1 Detection Rules

| Rule ID | What It Detects |
|---------|---------|
| `no-stale-file-ref` | File paths referenced in rules no longer exist |
| `no-deprecated-pattern` | Known deprecated patterns in use (e.g., old Claude Code settings.json format) |
| `no-unmaintained-config` | Config file not updated for > N days |

### 4.5 Methodology Coverage Scoring

#### 4.5.1 Positioning

Available via `ai-lint --audit` audit mode. Provides **navigation value**, not prescriptive value.

Target scenarios:
- New users setting up AI programming environment, unsure what to configure
- Team leads auditing AI protection levels across multiple projects

#### 4.5.2 Detection Dimensions

| Dimension | Detection Basis | Weight |
|------|---------|:----:|
| Spec-First | Has req-doc skill or SRS templates | 15% |
| Agent-Orchestrated | Has agents/ directory + orchestration rules | 15% |
| Knowledge-Injected | Has rules/ + knowledge/ directories | 15% |
| Test-First | Has TDD skill or testing rules | 10% |
| Review-Gated | Has code-reviewer agent configured | 20% |
| Verify-Before-Claim | Has verification-before-completion skill | 10% |
| Decision-First | Has ADR templates or decision process | 5% |
| Prompt-Defense | Has security baseline (key protection, prompt injection defense) | 10% |

#### 4.5.3 Output Format

```
Methodology Audit: pmAgent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Spec-First            ✅  15/15  req-doc skill + SRS templates
Agent-Orchestrated    ✅  15/15  21 agents + orchestration rules
Knowledge-Injected    ✅  15/15  hooks + 46 knowledge docs
Test-First            ✅  10/10  TDD skill present
Review-Gated          ✅  20/20  code-reviewer + stop-quality-gate
Verify-Before-Claim   ✅  10/10  verification skill present
Decision-First        ⚠️   0/5   No ADR template found
Prompt-Defense        ⚠️   5/10  Has defense baseline, missing injection
                                  protection rules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: 90/100 (A)

Suggestions:
  → Add ADR decision process template to cover Decision-First
  → Add prompt injection protection rules for full Prompt-Defense score
```

### 4.6 v0.4 CLI Interface

Deep checks provide fine-grained control while keeping the `--deep` shortcut:

```
ai-lint --check-refs              # Reference integrity only
ai-lint --check-drift             # Cross-file drift only
ai-lint --check-rot               # Rot detection only
ai-lint --deep                    # All deep checks (shortcut, equals all three above)
ai-lint --audit                   # Methodology audit mode
ai-lint --deep --audit            # Full check

# --no- prefix overrides config file deep settings
ai-lint --deep --no-check-drift   # All deep checks except drift
```

> See section 3.5 `.ai-lintrc.json` `deep` config section for the rationale behind fine-grained flags. Users can permanently disable unneeded checks in the config file, or temporarily override via CLI flags.

### 4.7 v0.4 Milestones

| Item | Deliverable | Acceptance Criteria |
|------|--------|---------|
| `--deep` mode | Reference + drift + rot detection | Detect at least 3 real issues in pmAgent |
| `--audit` mode | Methodology coverage scoring | Produce differentiated results for pmAgent vs empty project |
| Tests | ~25 new tests | Covering all deep check rules |
| Docs | Roadmap update | Mark v0.4 items as implemented |

---

## 5. v1.0 — Stable

### 5.1 Goals

Architecture consolidation, performance optimization, documentation completion.

### 5.2 Content

| Item | Description |
|------|------|
| Rule registry refactor | Unified Registry pattern, supporting rule metadata query and indexing |
| Performance optimization | Large project (500+ files) scan time < 500ms |
| --deep performance | Deep check caching mechanism, avoiding redundant file reads |
| Error message i18n | Chinese/English error message toggle (`--locale zh/en`) |
| Documentation | Individual doc pages + examples for each rule |
| Semantic versioning | Strict semver compliance |
| Rule marketplace foundation | Standard interface and doc template for community-contributed rules |

### 5.3 Milestones

| Item | Acceptance Criteria |
|------|---------|
| Architecture consolidation | Unified rule registry, no ad-hoc rule loading |
| Performance | 500 files scan < 500ms |
| Documentation | 12+ rules each have dedicated doc pages |
| Tests | >= 200 tests, >= 90% coverage |

---

## 6. Won't Do (Explicitly Excluded)

| Direction | Exclusion Reason | Re-evaluation Condition |
|------|---------|------------|
| Methodology coverage as default check | Prescriptive output, user resentment | — Converted to `--audit` mode |
| Pre-commit blocking (`--max-warnings 0`) | Advisory rules shouldn't forcibly block commits | — Converted to auto-fix integration |
| Subjective skill quality assessment | Too subjective, tiny skill author community, no unified standard | — Converted to structural checks |
| LLM compliance effectiveness prediction | Requires experimental data; would be pseudo-science now | After accumulating sufficient user feedback data |
| VS Code extension | Market and user base not large enough | Re-evaluate after v1.0 |
| Rule marketplace | Community not large enough; focus on core features first | Establish foundation interface in v1.0 |

---

## 7. Cumulative Timeline

```
Week 1-2    v0.2 Token Era
            ├── Token analysis engine
            ├── Rule conflict detection (hard/soft/trigger)
            └── Validation on pmAgent + zcf projects

Week 3-4    v0.3 Ecosystem
            ├── PR visibility (--diff + GitHub Actions)
            ├── Rule dilution detection
            ├── Auto-fix pre-commit (--staged --fix)
            └── Internal dogfooding

Week 5-6    v0.4 Deep Diagnostics
            ├── Reference integrity checks (--deep)
            ├── Cross-file drift detection
            ├── Rot detection
            ├── Methodology audit (--audit)
            └── Multi-project comparison validation

Week 7      v1.0 Stable
            ├── Architecture consolidation
            ├── Performance optimization
            ├── Documentation completion
            └── npm publish v1.0.0
```

---

## 8. Success Metrics

In addition to functional acceptance, track the following metrics per version:

| Version | Key Metric | Target | Measurement |
|------|---------|:----:|------|
| v0.2 | npm weekly downloads | > 100 | npm registry API |
| v0.2 | Token analysis reports cited by users on social media | >= 3 times | Manual tracking |
| v0.3 | GitHub Actions template used by non-self-maintained repos | >= 5 repos | GitHub search |
| v0.4 | Community blog/tutorial produced from `--audit` mode | >= 1 article | Manual tracking |
| v1.0 | npm total downloads | > 1,000 | npm registry API |
| v1.0 | GitHub stars | > 100 | GitHub API |
| v1.0 | Community feedback issues (not self-submitted) | >= 10 issues | GitHub Issues |

> These metrics are not for "evaluation" but for **judging whether the direction needs adjustment**. If v0.2 weekly downloads are < 50 two weeks after release, either the value proposition isn't reaching users or the target audience is wrong — prioritize promotion over piling on more features.

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|------|---------|
| Token estimation bias too large | Loss of user trust | Use known tokenizer (tiktoken) as reference benchmark, label error margins |
| Conflict detection false positive rate too high | User fatigue | Only do deterministic detection; don't report fuzzy matches |
| Deep check performance poor | --deep unusable | File read caching + incremental checks + parallelization |
| Slow user growth | Lack of feedback for feature validation | Prioritize dogfooding on known projects (pmAgent, zcf) |
| AI config standard fragmentation | Rules need frequent adaptation | Unified internal IR; format differences handled at parse layer |

---

## 10. Appendix: Current Architecture Reference

### 10.1 Existing Rules (v0.1.2, 12 rules)

```
no-duplicate            error    auto-fix   ✅
no-semantic-duplicate   warning  auto-fix   ✅
no-conflict             error    -          ✅
no-overconstrain        warning  -          ✅
no-verbose              warning  auto-fix   ✅
no-global-path-rule     warning  -          ✅
no-stale-reference      warning  -          ✅
no-null-effect          warning  -          ✅
no-skill-bloat          warning  -          ✅
max-length              warning  -          ✅
no-overlap-skills       warning  -          ✅ (cross-file)
no-missing-frontmatter  error    auto-fix   ✅
```

### 10.2 Existing CLI Commands (v0.1.2, 8 commands)

```
ai-lint [path]              # Default scan
ai-lint fix [path]          # Auto-fix
ai-lint stats [path]        # Health overview
ai-lint init [path]         # Template generation
ai-lint explain <rule-id>   # Rule details
ai-lint install <tool>      # Tool integration
--ci                        # CI mode: exit 1 on errors (errors only, not warnings)
--json                      # JSON output
```

**Semantic distinction between `--ci` and `--diff`**:

| Flag | Behavior | Use Case |
|------|------|---------|
| `--diff` | Exit 0 always, only output newly introduced issues from current changes | PR comment bot (informational only, never blocks merge) |
| `--ci` | Exit 1 if errors found (errors = no-duplicate, no-conflict, no-missing-frontmatter; warnings do not trigger exit 1) | Strict CI pipeline (blocks deterministic issues, passes advisory warnings) |

### 10.3 New/Changed (v0.2 → v1.0)

```
New rules:
  no-trigger-conflict     error    v0.2  Trigger word conflict detection
  no-dilution             warning  v0.3  Rule dilution detection
  no-dead-skill-ref       error    v0.4  Dead skill reference
  no-dead-agent-ref       error    v0.4  Dead agent reference
  no-dead-knowledge-ref   error    v0.4  Dead knowledge reference
  no-orphan-skill         warning  v0.4  Orphaned skill
  no-orphan-agent         warning  v0.4  Orphaned agent
  no-config-drift         warning  v0.4  Cross-tool content drift
  no-stale-tool-config    warning  v0.4  Stale tool config
  no-missing-tool-config  warning  v0.4  Missing tool config
  no-missing-rule         warning  v0.4  Rule not in all tool configs
  no-stale-file-ref       warning  v0.4  Stale file reference
  no-deprecated-pattern   warning  v0.4  Deprecated pattern detection
  no-unmaintained-config  warning  v0.4  Unmaintained config

Extended rules:
  no-conflict             Extended: cross-file hard/soft conflict    v0.2
  no-skill-bloat          Added token-cost dimension                  v0.2

New features:
  Token analysis engine   Built-in (ai-lint)          v0.2
  --tokens flag           Detailed token report        v0.2
  --diff flag             PR diff mode                  v0.3
  --staged flag           Staged file scan              v0.3
  .ai-lintrc.json         Project-level config          v0.3
  --check-refs flag       Reference integrity check     v0.4
  --check-drift flag      Cross-file drift check        v0.4
  --check-rot flag        Rot detection                 v0.4
  --deep flag             All deep checks (shortcut)    v0.4
  --audit flag            Methodology audit             v0.4

New integrations:
  GitHub Actions          PR comment bot                v0.3
  Husky pre-commit        Auto-fix integration           v0.3
```

---

> **Maintainer's note**: This roadmap is based on the ecosystem snapshot of 2026-07-21. The AI programming tool ecosystem evolves extremely rapidly (AGENTS.md standard, new tools, protocol changes). Re-evaluate priorities before each version's development. Feedback welcome via GitHub Issues.
