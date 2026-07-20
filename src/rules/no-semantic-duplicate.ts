import { truncate } from '../utils.js'
import type { LintIssue } from '../types.js'
import { textSimilarity } from '../fixer/deduplicate.js'
import { parseRules } from '../parser/markdown.js'

/** Minimum similarity threshold to consider as semantic duplicate */
const SIMILARITY_THRESHOLD = 0.50

/** Literal identical text is not reported again (already handled by no-duplicate) */
const LITERAL_SAME_THRESHOLD = 0.95

export const noSemanticDuplicate = {
  id: 'no-semantic-duplicate' as const,
  description: 'Detect semantically duplicate rules — different wording, same meaning',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    if (rules.length < 2) return issues

    // Track lines already grouped to avoid reporting each pair individually
    const grouped = new Set<number>()

    for (let i = 0; i < rules.length; i++) {
      if (grouped.has(rules[i].line)) continue

      const similarLines: number[] = [rules[i].line]
      for (let j = i + 1; j < rules.length; j++) {
        if (grouped.has(rules[j].line)) continue
        const sim = textSimilarity(rules[i].text, rules[j].text)

        if (sim > LITERAL_SAME_THRESHOLD) continue
        if (sim >= SIMILARITY_THRESHOLD) {
          similarLines.push(rules[j].line)
          grouped.add(rules[j].line)
        }
      }

      // Report only if there are actual duplicates in this cluster
      if (similarLines.length > 1) {
        grouped.add(rules[i].line)
        const lines = similarLines.join(', ')
        issues.push({
          ruleId: 'no-semantic-duplicate',
          severity: 'warning',
          file: filePath,
          line: similarLines[1],
          message: `Semantically similar rules on lines ${lines} (cluster of ${similarLines.length})`,
          fixable: true,
        })
      }
    }

    return issues
  },

  fix(content: string, issue: LintIssue): string {
    // Remove the duplicate line, keeping the first occurrence
    if (!issue.line) return content
    const lines = content.split('\n')
    const targetIdx = issue.line - 1
    if (targetIdx >= 0 && targetIdx < lines.length) {
      lines.splice(targetIdx, 1)
    }
    return lines.join('\n')
  },
}
