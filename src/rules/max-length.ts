import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/** Default max rule count */
const DEFAULT_MAX_RULES = 15

/** Estimated average tokens per rule */
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
        message: `Rule count ${rules.length} exceeds threshold ${maxRules} (${excess} over), AI compliance rate at risk of declining`,
        tokenWaste: estimatedTokens,
        fixable: false,
      })
    }

    return issues
  },
}
