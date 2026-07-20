import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/** 默认规则数上限 */
const DEFAULT_MAX_RULES = 15

/** 估算每条规则的平均 token 数 */
const AVG_RULE_TOKENS = 8

export const maxLength = {
  id: 'max-length' as const,
  description: 'Detect config files with excessive rule count (token bloat risk)',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(
    content: string,
    filePath: string,
    maxRules: number = DEFAULT_MAX_RULES,
  ): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    if (rules.length > maxRules) {
      const excess = rules.length - maxRules
      const estimatedTokens = excess * AVG_RULE_TOKENS

      issues.push({
        ruleId: 'max-length',
        severity: 'warning',
        file: filePath,
        line: rules[maxRules]?.line,
        message: `规则总数 ${rules.length} 超过阈值 ${maxRules}（超出 ${excess} 条），AI 遵守率存在下降风险`,
        tokenWaste: estimatedTokens,
        fixable: false,
      })
    }

    return issues
  },
}
