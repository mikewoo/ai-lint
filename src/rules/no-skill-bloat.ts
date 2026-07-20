import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/** Default max rule count */
const DEFAULT_MAX_RULES = 20

/** Default max total line count */
const DEFAULT_MAX_LINES = 150

/** Estimated average tokens per rule */
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

    // Rule count exceeds threshold
    if (rules.length > maxRules) {
      const excess = rules.length - maxRules
      issues.push({
        ruleId: 'no-skill-bloat',
        severity: 'warning',
        file: filePath,
        line: rules[maxRules]?.line,
        message: `Skill has ${rules.length} instructions, exceeding threshold of ${maxRules} (${excess} over) — consider splitting into multiple Skills`,
        tokenWaste: excess * AVG_RULE_TOKENS,
        fixable: false,
      })
    }

    // Total line count exceeds threshold
    if (lines.length > maxLines) {
      issues.push({
        ruleId: 'no-skill-bloat',
        severity: 'warning',
        file: filePath,
        message: `Skill file is ${lines.length} lines, exceeding threshold of ${maxLines} lines — large file size slows loading`,
        fixable: false,
      })
    }

    return issues
  },
}
