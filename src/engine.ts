import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { detectCrossFileConflicts } from './cross-files/conflict.js'
import { type SkillInfo, detectSkillOverlap } from './cross-files/skill-overlap.js'
import { type FoundFile, findFiles, shortPath } from './discovery/find-files.js'
import { parseFrontmatter } from './parser/frontmatter.js'
import type { FileResult, LintResult } from './report/render.js'
import { summarize } from './report/render.js'
import { getFixer, lintFile } from './rules/registry.js'
import type { LintIssue } from './types.js'

export interface LintOptions {
  cwd?: string
  targetFile?: string
  rulesFilter?: string
  fix?: boolean
  dryRun?: boolean
  crossFiles?: boolean
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
 * Resolve file list: single file or directory discovery.
 */
function resolveFiles(options: LintOptions): { cwd: string; files: FoundFile[] } {
  const cwd = options.cwd || process.cwd()

  if (options.targetFile) {
    const targetPath = resolve(cwd, options.targetFile)
    // Prevent path traversal: refuse files outside the working directory
    if (!targetPath.startsWith(resolve(cwd)) || !existsSync(targetPath)) {
      return { cwd, files: [] }
    }
    const name = basename(targetPath)
    const isSkill = name === 'SKILL.md'
    return { cwd, files: [{ path: targetPath, name, type: isSkill ? 'skill' : 'config' }] }
  }
  return { cwd, files: findFiles(cwd) }
}

/**
 * Build filter set from comma-separated rule IDs.
 */
function resolveFilter(options: LintOptions): Set<string> | null {
  return options.rulesFilter
    ? new Set(
        options.rulesFilter
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null
}

/**
 * Apply rule filter to an issue array, returning filtered copy.
 */
function filterIssues(issues: LintIssue[], filterIds: Set<string> | null): LintIssue[] {
  return filterIds ? issues.filter((i) => filterIds.has(i.ruleId)) : issues
}

export function runLint(options: LintOptions = {}): LintResult {
  const { files } = resolveFiles(options)
  if (files.length === 0) return { files: [], errors: 0, warnings: 0, fixable: 0 }

  const filterIds = resolveFilter(options)
  const fileResults: FileResult[] = []

  for (const file of files) {
    const content = readFileSync(file.path, 'utf-8')
    const issues = filterIssues(lintFile(content, file.path, file.name), filterIds)
    fileResults.push({ file, issues })
  }

  return summarize(fileResults)
}

export function runFix(options: LintOptions = {}): FixReport {
  const { cwd, files } = resolveFiles(options)
  if (files.length === 0) {
    return { result: { files: [], errors: 0, warnings: 0, fixable: 0 }, fixed: 0, details: [] }
  }

  const filterIds = resolveFilter(options)
  let fixedCount = 0
  const fixDetails: FixDetail[] = []
  const fileResults: FileResult[] = []

  for (const file of files) {
    let content = readFileSync(file.path, 'utf-8')
    const displayName = shortPath(file.path, cwd)
    let fileFixed = 0

    const allIssues = filterIssues(lintFile(content, file.path, file.name), filterIds)
    const fixable = allIssues.filter((i) => i.fixable)
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
          // fix failed, skip
        }
      }
    }

    if (!options.dryRun && fileFixed > 0) {
      writeFileSync(file.path, content, 'utf-8')
    }

    // Re-detect after fix (with same filter)
    const remainingIssues = filterIssues(lintFile(content, file.path, file.name), filterIds)
    fileResults.push({ file, issues: remainingIssues })
  }

  return { result: summarize(fileResults), fixed: fixedCount, details: fixDetails }
}

export function runCrossFiles(options: LintOptions = {}): LintResult {
  const cwd = options.cwd || process.cwd()
  const files = findFiles(cwd)

  // Read files once, reuse content
  const fileContents = new Map<string, { content: string; path: string; name: string }>()
  for (const f of files) {
    const content = readFileSync(f.path, 'utf-8')
    fileContents.set(f.path, { content, path: f.path, name: shortPath(f.path, cwd) })
  }

  // Cross-file conflict detection (reuse file contents)
  const conflictIssues = detectCrossFileConflicts([...fileContents.values()])

  // Skill overlap detection (reuse skill contents)
  const skillInfos: SkillInfo[] = []
  for (const sf of files) {
    if (sf.type !== 'skill') continue
    const cached = fileContents.get(sf.path)
    if (!cached) continue
    const meta = parseFrontmatter(cached.content)
    if (meta) {
      const skillName = sf.path.split('/').slice(-2, -1)[0] || sf.name
      skillInfos.push({ name: skillName, meta, content: cached.content, path: sf.path })
    }
  }

  const overlapIssues = detectSkillOverlap(skillInfos)
  const allIssues = [...conflictIssues, ...overlapIssues]

  return {
    files: [{ file: { path: cwd, name: 'cross-files', type: 'config' }, issues: allIssues }],
    errors: allIssues.filter((i) => i.severity === 'error').length,
    warnings: allIssues.filter((i) => i.severity === 'warning').length,
    fixable: allIssues.filter((i) => i.fixable).length,
  }
}
