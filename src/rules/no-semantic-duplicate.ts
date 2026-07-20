import type { LintIssue } from '../types.js'
import { textSimilarity } from '../fixer/deduplicate.js'
import { parseRules } from '../parser/markdown.js'

/** 视为语义重复的最小相似度阈值 */
const SIMILARITY_THRESHOLD = 0.50

/** 完全字面相同不重复报告（已由 no-duplicate 处理） */
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

        // 跳过完全相同的（已由 no-duplicate 处理）
        if (sim > LITERAL_SAME_THRESHOLD) continue

        if (sim >= SIMILARITY_THRESHOLD) {
          issues.push({
            ruleId: 'no-semantic-duplicate',
            severity: 'warning',
            file: filePath,
            line: rules[j].line,
            message: `"${truncate(rules[i].text, 40)}" 与 (行 ${rules[i].line}) "${truncate(rules[j].text, 40)}" 语义相似 (${Math.round(sim * 100)}%)`,
            fixable: false,
          })
        }
      }
    }

    return issues
  },
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
