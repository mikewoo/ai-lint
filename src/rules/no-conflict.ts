import { truncate } from '../utils.js'
import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * Conflict pairs: keyword A ↔ keyword B. If both appear in the same file, it is a conflict.
 */
/** Special conflict types that need extra validation */
type ConflictKind = 'simple' | 'package-manager' | 'line-length'

const CONFLICT_PAIRS: Array<{ a: RegExp; b: RegExp; topic: string; kind: ConflictKind }> = [
  {
    a: /(?:use|使用)\s+(?:tabs|tab)\s+(?:for|来)?\s*indent/i,
    b: /(?:use|使用)\s+spaces?\s+(?:for|来)?\s*indent/i,
    topic: 'Indentation style (tabs vs spaces)', kind: 'simple',
  },
  {
    a: /always\s+use\s+semicolon/i,
    b: /(?:do\s+not\s+use|no|avoid)\s+semicolon/i,
    topic: 'Semicolon usage (use vs avoid)', kind: 'simple',
  },
  {
    a: /使用分号/,
    b: /(?:不使用|避免使用|禁止使用)分号/,
    topic: 'Semicolon usage (use vs avoid, CN)', kind: 'simple',
  },
  {
    a: /(?:prefer|use)\s+(?:single|')\s*quote/i,
    b: /(?:prefer|use)\s+(?:double|")\s*quote/i,
    topic: 'Quote style (single vs double)', kind: 'simple',
  },
  {
    a: /使用单引号/,
    b: /使用双引号/,
    topic: 'Quote style (single vs double, CN)', kind: 'simple',
  },
  {
    a: /(?:max(?:imum)?|最长)\s*(?:line\s*)?(?:length|宽度).*?(?:80|100|120)/i,
    b: /(?:max(?:imum)?|最长)\s*(?:line\s*)?(?:length|宽度).*?(?:80|100|120)/i,
    topic: 'Line length limit value conflict', kind: 'line-length',
  },
  {
    a: /(?:always|必须|务必|一定要?)\s+add\s+(?:type\s+)?annotation/i,
    b: /(?:avoid|skip|不要|避免)\s+(?:type\s+)?annotation/i,
    topic: 'Type annotation (add vs avoid)', kind: 'simple',
  },
  {
    a: /使用\s*(?:pnpm|npm|yarn)/,
    b: /使用\s*(?:pnpm|npm|yarn)/,
    topic: 'Package manager selection conflict', kind: 'package-manager',
  },
]

export const noConflict = {
  id: 'no-conflict' as const,
  description: 'Detect contradictory instructions within or across config files',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  /**
   * Single-file conflict detection.
   */
  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    for (const { a, b, topic, kind } of CONFLICT_PAIRS) {
      // Check for pairwise conflicts
      const matchA = rules.filter((r) => {
        a.lastIndex = 0
        return a.test(r.text)
      })
      const matchB = rules.filter((r) => {
        b.lastIndex = 0
        return b.test(r.text)
      })

      if (matchA.length > 0 && matchB.length > 0) {
        // Package manager: must be different managers to count as conflict
        if (kind === 'package-manager') {
          const pkgsA = extractPackageManager(matchA.map((r) => r.text))
          const pkgsB = extractPackageManager(matchB.map((r) => r.text))
          if (pkgsA.length === 0 || pkgsB.length === 0) continue
          const same = pkgsA.some((p) => pkgsB.includes(p))
          if (same) continue
        }

        // Line length: must have different values to count as conflict
        if (kind === 'line-length') {
          const numsA = extractNumbers(matchA.map((r) => r.text))
          const numsB = extractNumbers(matchB.map((r) => r.text))
          if (numsA.length === 0 || numsB.length === 0) continue
          const hasDiff = numsA.some((n) => !numsB.includes(n))
          if (!hasDiff) continue
        }

        issues.push({
          ruleId: 'no-conflict',
          severity: 'error',
          file: filePath,
          line: matchB[0].line,
          message: `${topic} — conflict: (line ${matchA[0].line}) vs (line ${matchB[0].line})`,
          fixable: false,
        })
      }
    }

    return issues
  },

  /**
   * Cross-file conflict detection: check whether two files have conflicting instructions.
   */
  checkCross(
    fileA: { content: string; path: string },
    fileB: { content: string; path: string },
  ): LintIssue[] {
    const rulesA = parseRules(fileA.content)
    const rulesB = parseRules(fileB.content)
    const issues: LintIssue[] = []

    for (const { a, b, topic } of CONFLICT_PAIRS) {
      const matchA = rulesA.filter((r) => {
        a.lastIndex = 0
        return a.test(r.text)
      })
      const matchB = rulesB.filter((r) => {
        b.lastIndex = 0
        return b.test(r.text)
      })

      if (matchA.length > 0 && matchB.length > 0) {
        const shortA = fileA.path.split('/').pop() || fileA.path
        const shortB = fileB.path.split('/').pop() || fileB.path

        issues.push({
          ruleId: 'no-conflict',
          severity: 'error',
          file: `${shortA} ↔ ${shortB}`,
          message: `${topic} — "${truncate(matchA[0].text, 30)}" vs "${truncate(matchB[0].text, 30)}"`,
          fixable: false,
        })
      }
    }

    return issues
  },
}

function extractPackageManager(texts: string[]): string[] {
  const pkgs: string[] = []
  for (const t of texts) {
    if (/pnpm/i.test(t)) pkgs.push('pnpm')
    if (/npm/i.test(t)) pkgs.push('npm')
    if (/yarn/i.test(t)) pkgs.push('yarn')
  }
  return [...new Set(pkgs)]
}

function extractNumbers(texts: string[]): number[] {
  const nums: number[] = []
  for (const t of texts) {
    const matches = t.match(/\d{2,3}/g)
    if (matches) nums.push(...matches.map(Number))
  }
  return [...new Set(nums)]
}
