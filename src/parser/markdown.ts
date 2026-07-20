import type { RuleEntry } from '../types.js'

/**
 * 匹配 Markdown 无序列表项：
 *   - 文本
 *   * 文本
 *   + 文本
 * 支持嵌套缩进（如 "  - 文本" → 视为一级列表）
 */
const LIST_ITEM_RE = /^\s*[-*+]\s+/

/**
 * 匹配 Markdown 有序列表项：
 *   1. 文本
 *   1) 文本
 */
const ORDERED_LIST_RE = /^\s*\d+[.)]\s+/

/**
 * 匹配 Markdown 标题：
 *   # 标题
 *   ## 标题
 */
const HEADING_RE = /^#{1,6}\s+/

/**
 * 匹配水平分割线：
 *   ---
 *   ***
 *   ___
 */
const HR_RE = /^[-*_]{3,}\s*$/

/**
 * 匹配代码块边界：
 *   ```
 *   ~~~
 */
const FENCE_RE = /^`{3,}|^~{3,}/

/** 被视为「有价值规则文本」的最小字符数 */
const MIN_RULE_LENGTH = 8

/**
 * 将 Markdown 文本解析为规则条目列表。
 *
 * 提取规则：
 * 1. 列表项（`-` / `*` / `+` / `1.`）→ 去除列表标记，保留文本
 * 2. 独立段落（非空行、非标题、非分割线）→ 视为潜在规则
 * 3. 跳过代码块内容
 *
 * @param content - Markdown 原始文本
 * @returns 规则条目数组，按行号排序
 */
export function parseRules(content: string): RuleEntry[] {
  const lines = content.split('\n')
  const entries: RuleEntry[] = []
  let inCodeBlock = false
  let inFrontmatter = false
  let frontmatterDelimCount = 0

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    const lineNumber = i + 1

    // 检测 frontmatter 边界（文件开头的 ---）
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true
      frontmatterDelimCount = 1
      continue
    }
    if (inFrontmatter) {
      if (trimmed === '---') {
        frontmatterDelimCount++
        if (frontmatterDelimCount >= 2) {
          inFrontmatter = false
        }
      }
      continue
    }

    // 检测代码块边界
    if (FENCE_RE.test(trimmed)) {
      inCodeBlock = !inCodeBlock
      continue
    }

    // 跳过代码块内容
    if (inCodeBlock) continue

    // 跳过空行
    if (trimmed === '') continue

    // 跳过标题
    if (HEADING_RE.test(trimmed)) continue

    // 跳过水平分割线
    if (HR_RE.test(trimmed)) continue

    // 跳过纯链接/图片行
    if (/^\[.+\]:\s*(http|<)/.test(trimmed)) continue
    if (/^!\[.+\]\(.+\)$/.test(trimmed) && trimmed.length < 50) continue

    // 跳过 HTML 注释
    if (trimmed.startsWith('<!--')) continue

    // 列表项
    const listMatch = trimmed.match(LIST_ITEM_RE)
    const orderedMatch = trimmed.match(ORDERED_LIST_RE)

    if (listMatch) {
      const text = trimmed.slice(listMatch[0].length).trim()
      if (text.length >= MIN_RULE_LENGTH) {
        entries.push({ text, line: lineNumber, raw })
      }
    } else if (orderedMatch) {
      const text = trimmed.slice(orderedMatch[0].length).trim()
      if (text.length >= MIN_RULE_LENGTH) {
        entries.push({ text, line: lineNumber, raw })
      }
    } else {
      // 独立段落 — 视为潜在规则
      // 要求：以大写字母或中文开头（避免捕获代码片段残余）
      if (isRuleLikeLine(trimmed) && trimmed.length >= MIN_RULE_LENGTH) {
        // 合并连续的非列表段落（如多行段落）
        // 简化处理：每个独立行作为一个规则条目
        entries.push({ text: trimmed, line: lineNumber, raw })
      }
    }
  }

  return entries
}

/**
 * 判断一行文本是否像一条「规则」。
 * 规则行特征：以大写字母、中文、或常见指令词开头。
 */
function isRuleLikeLine(text: string): boolean {
  // 中文开头
  if (/^[一-鿿]/.test(text)) return true

  // 英文大写字母或数字开头
  if (/^[A-Z0-9]/.test(text)) return true

  // 常见指令关键词开头
  const instructionStarters = [
    'always', 'never', 'ensure', 'make', 'use', 'avoid',
    'prefer', 'do not', "don't", 'all ', 'every ', 'you ',
    'when ', 'if ', 'for ', 'the ',
  ]
  const lower = text.toLowerCase()
  return instructionStarters.some((s) => lower.startsWith(s))
}
