import { noConflict } from '../rules/no-conflict.js'
import type { LintIssue } from '../types.js'

export interface FileContent {
  path: string
  name: string
  content: string
}

/**
 * Cross-file conflict detection: runs noConflict.checkCross on every pair of files.
 */
export function detectCrossFileConflicts(files: FileContent[]): LintIssue[] {
  const issues: LintIssue[] = []

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const result = noConflict.checkCross(
        { content: files[i].content, path: files[i].path },
        { content: files[j].content, path: files[j].path },
      )
      issues.push(...result)
    }
  }

  return issues
}
