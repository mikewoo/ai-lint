import { deduplicateContent } from '../fixer/deduplicate.js'
import { parseRules } from '../parser/markdown.js'
import type { LintIssue } from '../types.js'
import { estimateTokens, truncate } from '../utils.js'

/**
 * no-duplicate — Literal duplicate rule detection.
 *
 * Detects identical rule text appearing multiple times in a file.
 * Only reports the second and subsequent duplicates; the first occurrence is preserved.
 */
export const noDuplicate = {
  id: 'no-duplicate' as const,
  description: 'Detect literal duplicate rules — identical text appearing more than once',
  files: [
    'CLAUDE.md',
    'AGENTS.md',
    'SKILL.md',
    '.cursorrules',
    '.windsurfrules',
    'GEMINI.md',
    'copilot-instructions.md',
  ],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const seen = new Map<string, { line: number; raw: string }[]>()
    const issues: LintIssue[] = []

    for (const rule of rules) {
      const normalized = rule.text.trim().toLowerCase()
      const existing = seen.get(normalized)
      if (existing) {
        existing.push({ line: rule.line, raw: rule.raw })
      } else {
        seen.set(normalized, [{ line: rule.line, raw: rule.raw }])
      }
    }

    for (const [, occurrences] of seen) {
      if (occurrences.length > 1) {
        const first = occurrences[0]
        // Use original text (non-lowercase) for readability
        const displayText = first.raw.replace(/^\s*[-*+]\s+|\s*\d+[.)]\s+/, '').trim()
        const tokenWaste = Math.max(1, estimateTokens(displayText)) * (occurrences.length - 1)
        const lines = occurrences.map((o) => o.line)

        issues.push({
          ruleId: 'no-duplicate',
          severity: 'error',
          file: filePath,
          line: lines[1],
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
