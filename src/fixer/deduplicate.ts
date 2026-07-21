import { parseRules } from '../parser/markdown.js'
import type { LintIssue } from '../types.js'

/**
 * Smart deduplication: when duplicate rules are found, keep the more complete version and delete the shorter one.
 *
 * Compared to simple line deletion, this fixer will:
 * 1. Compare the length of two duplicate rules
 * 2. If one is a substring of the other, keep the longer one
 * 3. Delete the shorter version
 *
 * @example
 *   Input:
 *     - Use TypeScript strict mode
 *     - Use TypeScript strict mode, enable noUncheckedIndexedAccess
 *
 *   Output:
 *     - Use TypeScript strict mode, enable noUncheckedIndexedAccess
 */
export function deduplicateContent(content: string, issue: LintIssue): string {
  const lines = content.split('\n')
  const rules = parseRules(content)

  // Find all duplicates related to the issue (0 fails the > 0 guards below)
  const targetLine = issue.line ?? 0
  const targetRule = rules.find((r) => r.line === targetLine)
  if (!targetRule) {
    // Fallback: delete the line directly
    if (targetLine > 0 && targetLine <= lines.length) {
      lines.splice(targetLine - 1, 1)
    }
    return lines.join('\n')
  }

  const normalized = targetRule.text.trim().toLowerCase()

  // Find all rules with the same normalized text
  const duplicates = rules.filter((r) => r.text.trim().toLowerCase() === normalized)

  if (duplicates.length < 2) {
    // No real duplicates found
    if (targetLine > 0 && targetLine <= lines.length) {
      lines.splice(targetLine - 1, 1)
    }
    return lines.join('\n')
  }

  // Find the longest version (keep this one)
  const longest = duplicates.reduce((a, b) => (a.text.length >= b.text.length ? a : b))

  // Remove all shorter versions (from back to front to avoid line number shifting)
  const toRemove = duplicates.filter((d) => d.line !== longest.line).sort((a, b) => b.line - a.line)

  for (const dup of toRemove) {
    if (dup.line > 0 && dup.line <= lines.length) {
      lines.splice(dup.line - 1, 1)
    }
  }

  return lines.join('\n')
}

/**
 * Calculate similarity between two texts (simple word-based Jaccard).
 * Helper function for semantic duplicate detection.
 */
export function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean))
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean))

  if (wordsA.size === 0 && wordsB.size === 0) return 0

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])

  return union.size === 0 ? 0 : intersection.size / union.size
}
