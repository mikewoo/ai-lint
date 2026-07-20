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

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const sim = textSimilarity(rules[i].text, rules[j].text)

        // Skip literal duplicates (already handled by no-duplicate)
        if (sim > LITERAL_SAME_THRESHOLD) continue

        if (sim >= SIMILARITY_THRESHOLD) {
          issues.push({
            ruleId: 'no-semantic-duplicate',
            severity: 'warning',
            file: filePath,
            line: rules[j].line,
            message: `"${truncate(rules[i].text, 40)}" is semantically similar to (line ${rules[i].line}) "${truncate(rules[j].text, 40)}" (${Math.round(sim * 100)}%)`,
            fixable: true,
          })
        }
      }
    }

    return issues
  },

  fix(content: string, issue: LintIssue): string {
    // Remove the later (shorter) occurrence, keeping the earlier one
    if (!issue.line) return content
    const lines = content.split('\n')
    const targetIdx = issue.line - 1
    if (targetIdx >= 0 && targetIdx < lines.length) {
      lines.splice(targetIdx, 1)
    }
    return lines.join('\n')
  },
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
