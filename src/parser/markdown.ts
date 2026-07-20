import type { RuleEntry } from '../types.js'

/**
 * Matches Markdown unordered list items:
 *   - text
 *   * text
 *   + text
 * Supports nested indentation (e.g. "  - text" → treated as top-level list)
 */
const LIST_ITEM_RE = /^\s*[-*+]\s+/

/**
 * Matches Markdown ordered list items:
 *   1. text
 *   1) text
 */
const ORDERED_LIST_RE = /^\s*\d+[.)]\s+/

/**
 * Matches Markdown headings:
 *   # heading
 *   ## heading
 */
const HEADING_RE = /^#{1,6}\s+/

/**
 * Matches horizontal rules:
 *   ---
 *   ***
 *   ___
 */
const HR_RE = /^[-*_]{3,}\s*$/

/**
 * Matches code fence boundaries:
 *   ```
 *   ~~~
 */
const FENCE_RE = /^`{3,}|^~{3,}/

/** Minimum character count for text to be considered a "valuable rule" */
const MIN_RULE_LENGTH = 8

/**
 * Parses Markdown text into a list of rule entries.
 *
 * Extraction rules:
 * 1. List items (`-` / `*` / `+` / `1.`) — strip list markers, keep text
 * 2. Standalone paragraphs (non-blank, non-heading, non-horizontal-rule) — treated as potential rules
 * 3. Skip code block content
 *
 * @param content - Raw Markdown text
 * @returns Array of rule entries, sorted by line number
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

    // Detect frontmatter boundaries (--- at the start of the file)
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

    // Detect code fence boundaries
    if (FENCE_RE.test(trimmed)) {
      inCodeBlock = !inCodeBlock
      continue
    }

    // Skip code block content
    if (inCodeBlock) continue

    // Skip blank lines
    if (trimmed === '') continue

    // Skip headings
    if (HEADING_RE.test(trimmed)) continue

    // Skip horizontal rules
    if (HR_RE.test(trimmed)) continue

    // Skip standalone link/image lines
    if (/^\[.+\]:\s*(http|<)/.test(trimmed)) continue
    if (/^!\[.+\]\(.+\)$/.test(trimmed) && trimmed.length < 50) continue

    // Skip HTML comments
    if (trimmed.startsWith('<!--')) continue

    // List items
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
      // Standalone paragraph — treated as potential rule
      // Requirement: must start with an uppercase letter or CJK character (to avoid catching code snippet remnants)
      if (isRuleLikeLine(trimmed) && trimmed.length >= MIN_RULE_LENGTH) {
        // Merge consecutive non-list paragraphs (e.g. multi-line paragraphs)
        // Simplified: each standalone line becomes one rule entry
        entries.push({ text: trimmed, line: lineNumber, raw })
      }
    }
  }

  return entries
}

/**
 * Determines whether a line of text looks like a "rule".
 * Rule line characteristics: starts with an uppercase letter, CJK character, or common instruction word.
 */
function isRuleLikeLine(text: string): boolean {
  // CJK character start
  if (/^[一-鿿]/.test(text)) return true

  // English uppercase letter or digit start
  if (/^[A-Z0-9]/.test(text)) return true

  // Common instruction keyword starters
  const instructionStarters = [
    'always', 'never', 'ensure', 'make', 'use', 'avoid',
    'prefer', 'do not', "don't", 'all ', 'every ', 'you ',
    'when ', 'if ', 'for ', 'the ',
  ]
  const lower = text.toLowerCase()
  return instructionStarters.some((s) => lower.startsWith(s))
}
