import type { LintIssue } from '../types.js'
import { simplifyText } from '../fixer/simplify.js'
import { parseRules } from '../parser/markdown.js'

/**
 * Verbose phrasing patterns — [pattern, replacement, englishPattern?]
 *
 * Each entry: match pattern → suggested replacement → optional English pattern (for bilingual detection)
 */
const VERBOSE_PATTERNS: Array<{
  pattern: RegExp
  replacement: string
  description: string
}> = [
  {
    pattern: /请务必确保一定(在|要|的?)/g,
    replacement: '请',
    description: '"please be absolutely sure to" (CN) → "please"',
  },
  {
    pattern: /请务必?一定?要?确保/g,
    replacement: '确保',
    description: '"please must ensure" (CN) → "ensure"',
  },
  {
    pattern: /一定?必须要/g,
    replacement: '必须',
    description: '"absolutely must" (CN) → "must"',
  },
  {
    pattern: /please (be absolutely sure to|make absolutely certain to|always make sure to)/gi,
    replacement: 'please ',
    description: '"please be absolutely sure to" → "please"',
  },
  {
    pattern: /it is (absolutely |completely |totally )?essential (that|to)/gi,
    replacement: 'must ',
    description: '"it is essential that" → "must"',
  },
  {
    pattern: /under no circumstances should you ever/gi,
    replacement: 'never',
    description: '"under no circumstances should you ever" → "never"',
  },
  {
    pattern: /at all times,? (you )?(must|should) (always )?/gi,
    replacement: 'always ',
    description: '"at all times you must always" → "always"',
  },
  {
    pattern: /in order to ensure that/gi,
    replacement: 'to ensure',
    description: '"in order to ensure that" → "to ensure"',
  },
  {
    pattern: /for the purpose(s)? of/gi,
    replacement: 'for',
    description: '"for the purpose of" → "for"',
  },
  {
    pattern: /due to the fact that/gi,
    replacement: 'because',
    description: '"due to the fact that" → "because"',
  },
  {
    pattern: /in the event that/gi,
    replacement: 'if',
    description: '"in the event that" → "if"',
  },
  {
    pattern: /a (large |great |significant )?number of/gi,
    replacement: 'many',
    description: '"a number of" → "many"',
  },
  {
    pattern: /(I want you to|I need you to|you need to|you have to)/gi,
    replacement: '',
    description: 'Instruction padding: remove "I want you to"',
  },
  {
    pattern: /(remember that|keep in mind that|note that|it is important to note that)/gi,
    replacement: '',
    description: 'Filler phrase: remove "remember that"',
  },
  {
    pattern: /(don't forget to|do not forget to)/gi,
    replacement: '',
    description: 'Filler: remove "don\'t forget to"',
  },
]

/** Minimum token savings to trigger detection (avoid reporting trivial optimizations) */
const MIN_TOKEN_SAVINGS = 3

export const noVerbose = {
  id: 'no-verbose' as const,
  description: 'Detect overly verbose phrasing that wastes tokens',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    for (const rule of rules) {
      for (const { pattern, replacement, description } of VERBOSE_PATTERNS) {
        // Reset lastIndex (required for global regex)
        pattern.lastIndex = 0

        const match = pattern.exec(rule.text)
        if (match) {
          const originalLen = match[0].length
          const replacementLen = replacement.length
          const tokensSaved = estimateTokenSavings(match[0], replacement)

          if (tokensSaved >= MIN_TOKEN_SAVINGS) {
            const savingsPct = replacementLen > 0
              ? Math.round((originalLen - replacementLen) / originalLen * 100)
              : 100 // empty replacement = 100% removal
            issues.push({
              ruleId: 'no-verbose',
              severity: 'warning',
              file: filePath,
              line: rule.line,
              message: `${description} — saves ~${savingsPct}%`,
              tokenWaste: tokensSaved,
              fixable: true,
            })
          }
        }
      }
    }

    return issues
  },

  fix(content: string, issue: LintIssue): string {
    if (!issue.line) return content

    const lines = content.split('\n')
    const targetLine = issue.line - 1
    if (targetLine < 0 || targetLine >= lines.length) return content

    lines[targetLine] = simplifyText(lines[targetLine])
    return lines.join('\n')
  },
}

function estimateTokenSavings(original: string, replacement: string): number {
  return estimateTokens(original) - estimateTokens(replacement)
}

function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (/[一-鿿]/.test(char)) {
      tokens += 0.67
    } else {
      tokens += 0.25
    }
  }
  return Math.round(tokens)
}
