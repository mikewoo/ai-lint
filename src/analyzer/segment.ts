import { estimateTokens } from '../utils.js'

/**
 * Semantic category of a markdown segment.
 *
 * Categories drive the token-budget report: each carries a different
 * "worth keeping" signal, so users can see where their token budget goes.
 */
export type SegmentCategory =
  | 'meta' // frontmatter, version lines — keep
  | 'methodology' // philosophy / rationale prose — often trimmable
  | 'trigger-table' // skill trigger keyword tables — keep, compressible
  | 'rule' // actionable instructions — core, keep
  | 'example' // code blocks — keep sparingly
  | 'decoration' // separators, standalone emoji, ASCII art — removable

/** One classified, token-counted slice of a markdown document. */
export interface Segment {
  category: SegmentCategory
  /** 1-based inclusive line range in the source document. */
  lineStart: number
  lineEnd: number
  /** Estimated token count for this segment's raw text. */
  tokens: number
}

/** Keywords that mark a paragraph as methodology/rationale prose. */
const METHODOLOGY_KEYWORDS = [
  '支柱',
  '方法论',
  '理念',
  '哲学',
  '原则',
  '覆盖',
  '机制',
  '编排',
  '交付',
  'SDAD',
  'methodology',
  'philosophy',
  'principle',
  'rationale',
  'pillar',
]

/** Bold/italic emphasis that wraps a short section label like **五大支柱：** */
const EMPHASIS_LABEL_RE = /^\*{1,2}[^*]+\*{1,2}[：:\s]*$/

/** HTML comment */
const HTML_COMMENT_RE = /^<!--/

/** Matches a line that is purely decorative (rules, emoji-only, ASCII art). */
const DECORATION_RE =
  /^(?:[-*_=~━─]{3,}|[│┌┐└┘├┤┬┴┼]+|\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*)$/u

const HEADING_RE = /^#{1,6}\s+/
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+/
const FENCE_RE = /^`{3,}|^~{3,}/
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/
const TRIGGER_HEADER_RE = /触发|关键词|trigger|keyword/i

/** Minimum non-blank chars for a paragraph to count as methodology prose. */
const MIN_PROSE_LENGTH = 40

interface RawBlock {
  lines: string[]
  lineStart: number
  lineEnd: number
}

/**
 * Split raw markdown into blocks separated by blank lines, with fenced code
 * blocks and frontmatter kept intact as single blocks.
 */
function splitBlocks(content: string): RawBlock[] {
  const lines = content.split('\n')
  const blocks: RawBlock[] = []
  let current: string[] = []
  let currentStart = 0
  let inFence = false
  let inFrontmatter = false
  let frontmatterDelims = 0

  const flush = (endLine: number) => {
    if (current.length > 0) {
      blocks.push({ lines: current, lineStart: currentStart + 1, lineEnd: endLine })
      current = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Frontmatter: opening --- on line 0 through its closing ---
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true
      frontmatterDelims = 1
      currentStart = i
      current.push(line)
      continue
    }
    if (inFrontmatter) {
      current.push(line)
      if (trimmed === '---') {
        frontmatterDelims++
        if (frontmatterDelims >= 2) {
          inFrontmatter = false
          flush(i + 1)
        }
      }
      continue
    }

    // Fenced code: keep the whole fence (including delimiters) as one block
    if (FENCE_RE.test(trimmed)) {
      if (!inFence) {
        flush(i)
        currentStart = i
        inFence = true
        current.push(line)
      } else {
        current.push(line)
        inFence = false
        flush(i + 1)
      }
      continue
    }
    if (inFence) {
      current.push(line)
      continue
    }

    // Blank line closes the current block
    if (trimmed === '') {
      flush(i)
      continue
    }

    if (current.length === 0) currentStart = i
    current.push(line)
  }

  flush(lines.length)
  return blocks
}

/** Classify a single (non-code, non-frontmatter) block into a category. */
function classifyBlock(block: RawBlock): SegmentCategory {
  const nonBlank = block.lines.map((l) => l.trim()).filter(Boolean)
  const first = nonBlank[0] ?? ''

  // Fenced code block → example
  if (FENCE_RE.test(first)) return 'example'

  // Frontmatter block starts and ends with ---
  if (first === '---' && nonBlank[nonBlank.length - 1] === '---') return 'meta'

  // Whole block is decorative (every line is a separator / emoji / ASCII art)
  if (nonBlank.every((l) => DECORATION_RE.test(l))) return 'decoration'

  // HTML comment → meta (boilerplate, not actionable)
  if (nonBlank.some((l) => HTML_COMMENT_RE.test(l))) return 'meta'

  // Markdown table → trigger-table if header mentions trigger/keyword, else methodology-ish
  const tableRows = nonBlank.filter((l) => TABLE_ROW_RE.test(l))
  if (tableRows.length >= 2) {
    if (TRIGGER_HEADER_RE.test(tableRows[0])) return 'trigger-table'
    // Tables that are NOT trigger tables are usually reference/lookup tables
    // (methodology pillars, comparison tables) — not actionable rules
    return 'methodology'
  }

  // Heading-only block → meta (section scaffolding, not content)
  if (nonBlank.every((l) => HEADING_RE.test(l))) return 'meta'

  // Short emphasis label like **五大支柱：** or **Version:** → meta
  if (nonBlank.every((l) => EMPHASIS_LABEL_RE.test(l) || l.length < 3)) return 'meta'

  // Blockquote version/update line (e.g. "> **版本：v18**") → meta
  if (nonBlank.length === 1 && /^>/.test(first)) return 'meta'

  // List items → rule (actionable instructions)
  if (nonBlank.some((l) => LIST_ITEM_RE.test(l))) return 'rule'

  // Long prose containing methodology keywords → methodology
  const joined = nonBlank.join(' ')
  if (joined.length >= MIN_PROSE_LENGTH) {
    const lower = joined.toLowerCase()
    if (METHODOLOGY_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) {
      return 'methodology'
    }
  }

  // Default: treat as a rule (actionable content carries the most weight)
  return 'rule'
}

/**
 * Segment a markdown document into classified, token-counted slices.
 *
 * Blocks are separated by blank lines; fenced code and frontmatter stay
 * intact. Each block is classified into a {@link SegmentCategory} and
 * annotated with an estimated token count.
 *
 * @param content - Raw markdown text
 * @returns Ordered list of classified segments
 */
export function segment(content: string): Segment[] {
  return splitBlocks(content).map((block) => {
    const text = block.lines.join('\n')
    // Frontmatter blocks are pre-detected in splitBlocks (start line 1, --- delims)
    const category =
      block.lineStart === 1 && block.lines[0]?.trim() === '---' ? 'meta' : classifyBlock(block)
    return {
      category,
      lineStart: block.lineStart,
      lineEnd: block.lineEnd,
      tokens: estimateTokens(text),
    }
  })
}
