import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * 无效约束模式 — 这些表述过于模糊或空洞，AI 无法从中提取可执行的行为指令。
 *
 * 特征：
 * - 无具体标准的主观评判（"好代码"、"干净"、"优雅"）
 * - 无法验证的泛泛之谈（"确保质量"、"写得好"）
 * - 纯道义性表述（"应该注意"、"要小心"）
 */
const NULL_EFFECT_PATTERNS: Array<{
  pattern: RegExp
  description: string
}> = [
  // === 中文空洞表述 ===
  { pattern: /^(?:确保|保证|一定要?)\s*代码质量/, description: '「确保代码质量」— 无具体标准，无法执行' },
  { pattern: /写(?:出|好|出好).{0,6}(?:代码|程序)/, description: '「写出好代码」— 主观标准，AI 无法据此行为' },
  { pattern: /代码(?:要|应该?|必须)\s*(?:干净|整洁|优雅)/, description: '「代码要干净」— 无客观衡量标准' },
  { pattern: /注意.{0,6}(?:安全|性能|质量)/, description: '「注意安全」— 无具体检查项，等同于没说' },
  { pattern: /(?:要?小心|谨慎)(?:处理|操作|使用)/, description: '「小心处理」— 缺少具体做法' },
  { pattern: /遵循.{0,6}(?:最佳|良好).{0,6}(?:实践|做法)/, description: '「遵循最佳实践」— 未指明具体实践' },
  { pattern: /(?:保持|维持).{0,6}(?:一致性|统一)/, description: '「保持一致性」— 未指定一致什么' },
  { pattern: /尽可能?.{0,6}(?:优化|减少|提高)/, description: '「尽可能优化」— 无量化目标' },
  { pattern: /(?:应该?|要|应).{0,4}(?:有|具备).{0,6}(?:良好|优秀).{0,6}(?:设计|结构)/, description: '「应有良好设计」— 无法验证' },

  // === 英文空洞表述 ===
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

/** 排除项：包含具体工具/技术名称的不算空洞 */
const EXCLUDE_PATTERNS = [
  /lint|test|type|format|build|deploy|commit|review|audit|scan|check|validate|verify|measure/i,
]

export const noNullEffect = {
  id: 'no-null-effect' as const,
  description: 'Detect constraints that produce no observable behavioral change (platitudes, vague directives)',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    for (const rule of rules) {
      for (const { pattern, description } of NULL_EFFECT_PATTERNS) {
        pattern.lastIndex = 0
        if (!pattern.test(rule.text)) continue

        // 排除包含具体操作关键词的
        if (EXCLUDE_PATTERNS.some((ep) => ep.test(rule.text))) continue

        issues.push({
          ruleId: 'no-null-effect',
          severity: 'warning',
          file: filePath,
          line: rule.line,
          message: description,
          fixable: false,
        })
        break // 每条规则只报告一次
      }
    }

    return issues
  },
}
