import type { LintIssue } from '../types.js'
import { deduplicateContent } from '../fixer/deduplicate.js'
import { parseRules } from '../parser/markdown.js'

/**
 * no-duplicate — 字面重复规则检测。
 *
 * 检测完全相同的规则文本在文件中出现多次。
 * 只报告第二次及之后出现的重复项，第一次保留。
 */
export const noDuplicate = {
  id: 'no-duplicate' as const,
  description: 'Detect literal duplicate rules — identical text appearing more than once',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const seen = new Map<string, { line: number; raw: string }[]>()
    const issues: LintIssue[] = []

    for (const rule of rules) {
      const normalized = rule.text.trim().toLowerCase()
      if (seen.has(normalized)) {
        seen.get(normalized)!.push({ line: rule.line, raw: rule.raw })
      } else {
        seen.set(normalized, [{ line: rule.line, raw: rule.raw }])
      }
    }

    for (const [, occurrences] of seen) {
      if (occurrences.length > 1) {
        const first = occurrences[0]
        // 使用原始文本（非小写），保留可读性
        const displayText = first.raw.replace(/^\s*[-*+]\s+|\s*\d+[.)]\s+/, '').trim()
        const tokenWaste = estimateTokens(displayText) * (occurrences.length - 1)
        const lines = occurrences.map((o) => o.line)

        issues.push({
          ruleId: 'no-duplicate',
          severity: 'error',
          file: filePath,
          line: lines[1],
          message: `"${truncate(displayText, 60)}" 出现 ${occurrences.length} 次 (行 ${lines.join(', ')})`,
          tokenWaste,
          fixable: true,
        })
      }
    }

    return issues
  },

  fix(content: string, issue: LintIssue): string {
    return deduplicateContent(content, issue)
  },
}

/**
 * 估算文本的 token 数量。
 * 粗略规则：英文 1 token ≈ 4 字符，中文 1 token ≈ 1.5 字符。
 */
function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (/[一-鿿]/.test(char)) {
      tokens += 0.67 // 中文字符 ≈ 1.5 字符/token → 1 中文字 ≈ 0.67 token
    } else {
      tokens += 0.25 // 英文字符 ≈ 4 字符/token
    }
  }
  return Math.max(1, Math.round(tokens))
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
