import { readFileSync, writeFileSync } from 'node:fs'
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

export interface FixDetail {
  file: string
  ruleId: string
  message: string
  line?: number
}

export interface FixReport {
  result: LintResult
  fixed: number
  details: FixDetail[]
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
    const issues = lintFile(content, file.path, file.name)

    fileResults.push({ file, issues })
  }

  return summarize(fileResults)
}

/**
 * 执行 fix 流程。
 *
 * 对每个文件依次：检测 → 修复 fixable → 写入磁盘（非 dry-run）→ 重新检测。
 */
export function runFix(options: LintOptions = {}): FixReport {
  const cwd = options.cwd || process.cwd()
  const files = findFiles(cwd)
  let fixedCount = 0
  const fixDetails: FixDetail[] = []
  const fileResults: FileResult[] = []

  for (const file of files) {
    let content = readFileSync(file.path, 'utf-8')
    const displayName = shortPath(file.path, cwd)
    let fileFixed = 0

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
            fileFixed++
            fixDetails.push({
              file: displayName,
              ruleId: issue.ruleId,
              message: issue.message,
              line: issue.line,
            })
          }
        } catch {
          // fix 失败，跳过
        }
      }
    }

    // 实际写入磁盘
    if (!options.dryRun && fileFixed > 0) {
      writeFileSync(file.path, content, 'utf-8')
    }

    // 修复后重新检测
    const remainingIssues = lintFile(content, file.path, file.name)

    fileResults.push({ file, issues: remainingIssues })
  }

  const result = summarize(fileResults)
  return { result, fixed: fixedCount, details: fixDetails }
}
