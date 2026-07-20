import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/** 默认规则数上限 */
const DEFAULT_MAX_RULES = 20

/** 默认总行数上限 */
const DEFAULT_MAX_LINES = 150

/** 估算每条规则的 token 数 */
const AVG_RULE_TOKENS = 8

export const noSkillBloat = {
  id: 'no-skill-bloat' as const,
  description: 'Detect SKILL.md files exceeding reasonable size thresholds',
  files: ['SKILL.md'],

  check(
    content: string,
    filePath: string,
    maxRules: number = DEFAULT_MAX_RULES,
    maxLines: number = DEFAULT_MAX_LINES,
  ): LintIssue[] {
    const issues: LintIssue[] = []
    const lines = content.split('\n')
    const rules = parseRules(content)

    // 规则数超限
    if (rules.length > maxRules) {
      const excess = rules.length - maxRules
      issues.push({
        ruleId: 'no-skill-bloat',
        severity: 'warning',
        file: filePath,
        line: rules[maxRules]?.line,
        message: `Skill 指令数 ${rules.length} 超过阈值 ${maxRules}（超出 ${excess} 条），考虑拆分为多个 Skill`,
        tokenWaste: excess * AVG_RULE_TOKENS,
        fixable: false,
      })
    }

    // 总行数超限
    if (lines.length > maxLines) {
      issues.push({
        ruleId: 'no-skill-bloat',
        severity: 'warning',
        file: filePath,
        message: `Skill 文件 ${lines.length} 行超过阈值 ${maxLines} 行，体积过大影响加载`,
        fixable: false,
      })
    }

    return issues
  },
}
