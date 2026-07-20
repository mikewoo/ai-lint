import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * Patterns for matching file path references:
 * - Relative paths: `./src/foo.ts`, `../config.json`, `../../dir/file`
 * - Bare filenames: `tsconfig.json`, `package.json` (must have an extension)
 */
const FILE_PATH_RE = /`?((?:\.{1,2}\/)+[\w./-]+\.[\w]+)`?/g

/** Match absolute-style paths: `/path/to/file.ext` or `~/path/file.ext` */
const ABS_PATH_RE = /`?(\/[a-zA-Z0-9._/-]+\.[\w]+)`?/g

export const noStaleReference = {
  id: 'no-stale-reference' as const,
  description: 'Detect references to files or paths that no longer exist',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(content: string, filePath: string): LintIssue[] {
    const baseDir = dirname(resolve(filePath))
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    for (const rule of rules) {
      const paths = extractPaths(rule.text)

      for (const ref of paths) {
        const fullPath = resolve(baseDir, ref)
        if (!existsSync(fullPath)) {
          issues.push({
            ruleId: 'no-stale-reference',
            severity: 'warning',
            file: filePath,
            line: rule.line,
            message: `Referenced path does not exist: "${ref}"`,
            fixable: false,
          })
        }
      }
    }

    // Also scan non-rule text for path references (e.g. plain paragraphs)
    for (const ref of extractPaths(content)) {
      // Avoid duplicate reports
      if (issues.some((i) => i.message.includes(ref))) continue

      const fullPath = resolve(baseDir, ref)
      if (!existsSync(fullPath)) {
        // Find the line where the reference appears
        const lines = content.split('\n')
        let line: number | undefined
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(ref)) {
            line = i + 1
            break
          }
        }

        issues.push({
          ruleId: 'no-stale-reference',
          severity: 'warning',
          file: filePath,
          line,
          message: `Referenced path does not exist: "${ref}"`,
          fixable: false,
        })
      }
    }

    return issues
  },
}

/**
 * Extract all file path references from text.
 * Only extracts relative paths and paths with extensions (excludes URLs and package names).
 */
function extractPaths(text: string): string[] {
  const paths: string[] = []
  const seen = new Set<string>()

  // Extract relative paths first
  const relativePaths: { path: string; start: number; end: number }[] = []

  FILE_PATH_RE.lastIndex = 0
  for (const match of text.matchAll(FILE_PATH_RE)) {
    const p = match[1]
    if (/^v?\d+\.\d+/.test(p)) continue
    if (!seen.has(p)) {
      seen.add(p)
      relativePaths.push({ path: p, start: match.index!, end: match.index! + match[0].length })
    }
  }

  paths.push(...relativePaths.map((r) => r.path))

  // Extract absolute paths, but skip regions already covered by relative path matches
  ABS_PATH_RE.lastIndex = 0
  for (const match of text.matchAll(ABS_PATH_RE)) {
    const p = match[1]
    const absStart = match.index!
    // Skip positions already covered by relative path matches (e.g. /healthy-claude.md spuriously extracted from ./healthy-claude.md)
    const overlapped = relativePaths.some(
      (r) => absStart >= r.start && absStart < r.end,
    )
    if (overlapped) continue
    if (seen.has(p)) continue
    seen.add(p)
    paths.push(p)
  }

  return paths
}
