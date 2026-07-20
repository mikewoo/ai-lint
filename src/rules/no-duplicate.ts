import type { LintIssue } from '../types.js'
import { deduplicateContent } from '../fixer/deduplicate.js'
import { parseRules } from '../parser/markdown.js'

/**
 * no-duplicate — Literal duplicate rule detection.
 *
 * Detects identical rule text appearing multiple times in a file.
 * Only reports the second and subsequent duplicates; the first occurrence is preserved.
 */
export const noDuplicate = {
  id: 'no-duplicate' as const,
  description: 'Detect literal duplicate rules — identical text appearing more than once',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

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
        // Use original text (non-lowercase) for readability
        const displayText = first.raw.replace(/^\s*[-*+]\s+|\s*\d+[.)]\s+/, '').trim()
        const tokenWaste = estimateTokens(displayText) * (occurrences.length - 1)
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

/**
 * Estimate token count for a string.
 * Rough rule: Latin 1 token ≈ 4 chars, CJK 1 token ≈ 1.5 chars.
 */
function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (/[一-鿿]/.test(char)) {
      tokens += 0.67 // CJK char ≈ 1.5 chars/token → 1 CJK char ≈ 0.67 token
    } else {
      tokens += 0.25 // Latin char ≈ 4 chars/token
    }
  }
  return Math.max(1, Math.round(tokens))
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
