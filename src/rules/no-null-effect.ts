import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * Null-effect constraint patterns — these phrasings are too vague or hollow for the AI
 * to extract executable behavioral instructions from.
 *
 * Characteristics:
 * - Subjective judgments without concrete standards ("good code", "clean", "elegant")
 * - Unverifiable platitudes ("ensure quality", "write well")
 * - Purely moralistic expressions ("should pay attention", "be careful")
 */
const NULL_EFFECT_PATTERNS: Array<{
  pattern: RegExp
  description: string
}> = [
  // === Chinese hollow expressions ===
  { pattern: /^(?:确保|保证|一定要?)\s*代码质量/, description: '"ensure code quality" — no concrete standard, not actionable' },
  { pattern: /写(?:出|好|出好).{0,6}(?:代码|程序)/, description: '"write good code" — subjective standard, AI cannot act on this' },
  { pattern: /代码(?:要|应该?|必须)\s*(?:干净|整洁|优雅)/, description: '"code should be clean" — no objective measurement standard' },
  { pattern: /注意.{0,6}(?:安全|性能|质量)/, description: '"pay attention to security" — no specific checks, equivalent to saying nothing' },
  { pattern: /(?:要?小心|谨慎)(?:处理|操作|使用)/, description: '"handle with care" — lacks specific guidance' },
  { pattern: /遵循.{0,6}(?:最佳|良好).{0,6}(?:实践|做法)/, description: '"follow best practices" — does not specify which practices' },
  { pattern: /(?:保持|维持).{0,6}(?:一致性|统一)/, description: '"maintain consistency" — does not specify what to be consistent about' },
  { pattern: /尽可能?.{0,6}(?:优化|减少|提高)/, description: '"optimize as much as possible" — no quantifiable target' },
  { pattern: /(?:应该?|要|应).{0,4}(?:有|具备).{0,6}(?:良好|优秀).{0,6}(?:设计|结构)/, description: '"should have good design" — not verifiable' },

  // === English hollow expressions ===
  { pattern: /^(?:make sure|ensure)\s+(?:the\s+)?code\s+(?:is|quality)/i, description: '"ensure code quality" — no measurable standard' },
  { pattern: /write\s+(?:good|clean|nice|beautiful)\b.{0,20}\bcode\b/i, description: '"write good code" — subjective, not actionable' },
  { pattern: /code\s+should\s+be\s+(?:clean|beautiful|elegant|good)/i, description: '"code should be clean" — not measurable' },
  { pattern: /be\s+careful(?:\s+(?:with|about|when))?/i, description: '"be careful" — no specific guidance' },
  { pattern: /follow\s+(?:best|good)\s+practices/i, description: '"follow best practices" — unspecified' },
  { pattern: /keep\s+(?:it|things)\s+(?:simple|consistent|clean)/i, description: '"keep it simple" — platitude' },
  { pattern: /(?:try|attempt)\s+to\s+(?:make|keep|ensure)/i, description: '"try to make" — non-committal, ambiguous' },
  { pattern: /do\s+(?:a\s+)?good\s+job/i, description: '"do a good job" — purely motivational' },
  { pattern: /always\s+strive\s+(?:for|to)/i, description: '"always strive for" — vague aspiration' },
]

/** Exclusions: expressions containing concrete tool/tech names are not considered hollow */
const EXCLUDE_PATTERNS = [
  /lint|test|type|format|build|deploy|commit|review|audit|scan|check|validate|verify|measure/i,
]

export const noNullEffect = {
  id: 'no-null-effect' as const,
  description: 'Detect constraints that produce no observable behavioral change (platitudes, vague directives)',
  files: ['CLAUDE.md', 'AGENTS.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    for (const rule of rules) {
      for (const { pattern, description } of NULL_EFFECT_PATTERNS) {
        pattern.lastIndex = 0
        if (!pattern.test(rule.text)) continue

        // Exclude if it contains concrete action keywords
        if (EXCLUDE_PATTERNS.some((ep) => ep.test(rule.text))) continue

        issues.push({
          ruleId: 'no-null-effect',
          severity: 'warning',
          file: filePath,
          line: rule.line,
          message: description,
          fixable: false,
        })
        break // Report each rule only once
      }
    }

    return issues
  },
}
