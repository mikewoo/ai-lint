import type { LintIssue } from '../types.js'

/** Single-file lint rule interface */
export interface Rule {
  id: string
  description: string
  /** Applicable file types (e.g. 'CLAUDE.md', 'SKILL.md') */
  files: string[]
  /** Check function */
  check(content: string, filePath: string): LintIssue[]
  /** Fix function (optional) */
  fix?(content: string, issue: LintIssue): string
}

/** Cross-file lint rule interface */
export interface CrossFileRule {
  id: string
  description: string
  /** Check function — receives a map of all file metadata */
  check(files: Map<string, { content: string; path: string }>): LintIssue[]
}
