import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * 匹配文件路径引用的模式：
 * - 相对路径：`./src/foo.ts`, `../config.json`, `../../dir/file`
 * - 裸文件名：`tsconfig.json`, `package.json`（需有扩展名）
 */
const FILE_PATH_RE = /`?((?:\.{1,2}\/)+[\w./-]+\.[\w]+)`?/g

/** 匹配引用式路径：`/path/to/file.ext` 或 `~/path/file.ext` */
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
            message: `引用的路径不存在: "${ref}"`,
            fixable: false,
          })
        }
      }
    }

    // 也扫描非规则文本中的路径引用（如普通段落）
    for (const ref of extractPaths(content)) {
      // 避免重复报告
      if (issues.some((i) => i.message.includes(ref))) continue

      const fullPath = resolve(baseDir, ref)
      if (!existsSync(fullPath)) {
        // 找到引用所在行
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
          message: `引用的路径不存在: "${ref}"`,
          fixable: false,
        })
      }
    }

    return issues
  },
}

/**
 * 从文本中提取所有文件路径引用。
 * 只提取相对路径和包含扩展名的路径（排除 URL 和包名）。
 */
function extractPaths(text: string): string[] {
  const paths: string[] = []
  const seen = new Set<string>()

  // 先提取相对路径
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

  // 提取绝对路径，但跳过已被相对路径覆盖的区域
  ABS_PATH_RE.lastIndex = 0
  for (const match of text.matchAll(ABS_PATH_RE)) {
    const p = match[1]
    const absStart = match.index!
    // 跳过已被相对路径匹配覆盖的位置（如 ./healthy-claude.md 中被误提取的 /healthy-claude.md）
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
