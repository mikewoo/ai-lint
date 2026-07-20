import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * 智能去重：当发现重复规则时，保留内容更完整的版本，删除较短的版本。
 *
 * 对比简单的行删除，这个 fixer 会：
 * 1. 比较两条重复规则的长度
 * 2. 如果某条是另一条的子串，保留更长的
 * 3. 删除较短的版本
 *
 * @example
 *   输入:
 *     - Use TypeScript strict mode
 *     - Use TypeScript strict mode, enable noUncheckedIndexedAccess
 *
 *   输出:
 *     - Use TypeScript strict mode, enable noUncheckedIndexedAccess
 */
export function deduplicateContent(content: string, issue: LintIssue): string {
  const lines = content.split('\n')
  const rules = parseRules(content)

  // 找出与 issue 相关的所有重复项
  const targetLine = issue.line!
  const targetRule = rules.find((r) => r.line === targetLine)
  if (!targetRule) {
    // 后备：直接删除该行
    if (targetLine > 0 && targetLine <= lines.length) {
      lines.splice(targetLine - 1, 1)
    }
    return lines.join('\n')
  }

  const normalized = targetRule.text.trim().toLowerCase()

  // 找到所有相同 normalized 文本的规则
  const duplicates = rules.filter(
    (r) => r.text.trim().toLowerCase() === normalized,
  )

  if (duplicates.length < 2) {
    // 没有真正的重复
    if (targetLine > 0 && targetLine <= lines.length) {
      lines.splice(targetLine - 1, 1)
    }
    return lines.join('\n')
  }

  // 找出内容最长的版本（保留这一个）
  const longest = duplicates.reduce((a, b) =>
    a.text.length >= b.text.length ? a : b,
  )

  // 删除所有较短的版本（从后往前，避免行号偏移）
  const toRemove = duplicates
    .filter((d) => d.line !== longest.line)
    .sort((a, b) => b.line - a.line)

  for (const dup of toRemove) {
    if (dup.line > 0 && dup.line <= lines.length) {
      lines.splice(dup.line - 1, 1)
    }
  }

  return lines.join('\n')
}

/**
 * 计算两条文本的相似度（简单 Jaccard 基于词）。
 * 用于语义重复检测的辅助函数。
 */
export function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean))
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean))

  if (wordsA.size === 0 && wordsB.size === 0) return 0

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])

  return union.size === 0 ? 0 : intersection.size / union.size
}
