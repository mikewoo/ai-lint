import type { LintIssue } from '../types.js'
import { noConflict } from '../rules/no-conflict.js'

export interface FileContent {
  path: string
  name: string
  content: string
}

/**
 * 跨文件冲突检测：对每对文件运行 noConflict.checkCross。
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
