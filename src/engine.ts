import { readFileSync, writeFileSync } from 'node:fs'
import { detectCrossFileConflicts } from './cross-files/conflict.js'
import { detectSkillOverlap, type SkillInfo } from './cross-files/skill-overlap.js'
import { findFiles, shortPath } from './discovery/find-files.js'
import { parseFrontmatter } from './parser/frontmatter.js'
import type { FileResult, LintResult } from './report/render.js'
import { summarize } from './report/render.js'
import { getFixer, lintFile } from './rules/registry.js'

export interface LintOptions {
  /** Scan root directory */
  cwd?: string
  /** Whether to auto-fix */
  fix?: boolean
  /** --dry-run: preview fixes, don't write to disk */
  dryRun?: boolean
  /** Whether to enable cross-file detection */
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
 * Execute the complete lint process.
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
 * Execute the fix process.
 *
 * For each file in turn: detect → fix fixable → write to disk (non-dry-run) → re-detect.
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

    // First detect all issues
    const allIssues = lintFile(content, file.path, file.name)

    // Only handle fixable issues
    const fixable = allIssues.filter((i) => i.fixable)

    // Fix from back to front (to avoid line number shifts)
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

    // Actually write to disk
    if (!options.dryRun && fileFixed > 0) {
      writeFileSync(file.path, content, 'utf-8')
    }

    // Re-detect after fix
    const remainingIssues = lintFile(content, file.path, file.name)

    fileResults.push({ file, issues: remainingIssues })
  }

  const result = summarize(fileResults)
  return { result, fixed: fixedCount, details: fixDetails }
}

/**
 * Cross-file detection: skill overlap + cross-file conflicts.
 */
export function runCrossFiles(options: LintOptions = {}): LintResult {
  const cwd = options.cwd || process.cwd()
  const files = findFiles(cwd)

  // 1. Cross-file conflict detection
  const conflictIssues = detectCrossFileConflicts(
    files.map((f) => ({
      path: f.path,
      name: shortPath(f.path, cwd),
      content: readFileSync(f.path, 'utf-8'),
    })),
  )

  // 2. Skill overlap detection
  const skillFiles = files.filter((f) => f.type === 'skill')
  const skills: SkillInfo[] = []

  for (const sf of skillFiles) {
    const content = readFileSync(sf.path, 'utf-8')
    const meta = parseFrontmatter(content)
    if (meta) {
      const skillName = sf.path.split('/').slice(-2, -1)[0] || sf.name
      skills.push({ name: skillName, meta, content, path: sf.path })
    }
  }

  const overlapIssues = detectSkillOverlap(skills)

  // Summary: generate pseudo FileResult
  const allIssues = [...conflictIssues, ...overlapIssues]

  const summary: LintResult = {
    files: [
      {
        file: { path: cwd, name: 'cross-files', type: 'config' },
        issues: allIssues,
      },
    ],
    errors: allIssues.filter((i) => i.severity === 'error').length,
    warnings: allIssues.filter((i) => i.severity === 'warning').length,
    fixable: allIssues.filter((i) => i.fixable).length,
  }

  return summary
}
