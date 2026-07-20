import { readFileSync } from 'node:fs'
import { findFiles, shortPath } from './discovery/find-files.js'
import type { FileResult, LintResult } from './report/render.js'
import { summarize } from './report/render.js'
import { getFixer, lintFile } from './rules/registry.js'

export interface LintOptions {
  /** 扫描根目录 */
  cwd?: string
  /** 是否自动修复 */
  fix?: boolean
  /** --dry-run: 预览修复，不写入磁盘 */
  dryRun?: boolean
}

/**
 * 执行完整的 lint 流程。
 */
export function runLint(options: LintOptions = {}): LintResult {
  const cwd = options.cwd || process.cwd()
  const files = findFiles(cwd)

  const fileResults: FileResult[] = []

  for (const file of files) {
    const content = readFileSync(file.path, 'utf-8')
    const displayName = shortPath(file.path, cwd)
    const issues = lintFile(content, file.path, file.name)

    fileResults.push({ file, issues })
  }

  return summarize(fileResults)
}

/**
 * 执行 fix 流程。
 */
export function runFix(options: LintOptions = {}): { result: LintResult; fixed: number } {
  const cwd = options.cwd || process.cwd()
  const files = findFiles(cwd)
  let fixedCount = 0
  const fileResults: FileResult[] = []

  for (const file of files) {
    let content = readFileSync(file.path, 'utf-8')

    // 先检测所有问题
    const allIssues = lintFile(content, file.path, file.name)

    // 仅处理 fixable 的问题
    const fixable = allIssues.filter((i) => i.fixable)

    // 从后往前修复（避免行号偏移）
    const sorted = [...fixable].sort((a, b) => (b.line || 0) - (a.line || 0))

    for (const issue of sorted) {
      const fixer = getFixer(issue.ruleId)
      if (fixer) {
        try {
          const newContent = fixer(content, issue)
          if (newContent !== content) {
            content = newContent
            fixedCount++
          }
        } catch {
          // fix 失败，跳过
        }
      }
    }

    if (!options.dryRun && fixedCount > 0) {
      // 实际写入（需要 fs.writeFileSync，这里暂略，Day 6 完善）
    }

    // 修复后重新检测
    const remainingIssues = lintFile(content, file.path, file.name)

    fileResults.push({ file, issues: remainingIssues })
  }

  const result = summarize(fileResults)
  return { result, fixed: fixedCount }
}
