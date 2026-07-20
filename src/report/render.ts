import chalk from 'chalk'
import type { FoundFile } from '../discovery/find-files.js'
import type { LintIssue, Severity } from '../types.js'

/** Summary of detection results per file */
export interface FileResult {
  file: FoundFile
  issues: LintIssue[]
}

/** Overall detection results */
export interface LintResult {
  files: FileResult[]
  errors: number
  warnings: number
  fixable: number
}

const SEVERITY_ICON: Record<Severity, string> = {
  error: '❌',
  warning: '⚠️',
}

const SEVERITY_COLOR: Record<Severity, (s: string) => string> = {
  error: chalk.red,
  warning: chalk.yellow,
}

/**
 * Render terminal output (ESLint-style).
 */
export function render(result: LintResult, _rootDir: string): string {
  if (result.files.length === 0) {
    return chalk.dim('\n  No AI config files found.\n')
  }

  const lines: string[] = ['\n']

  for (const { file, issues } of result.files) {
    const health = calcHealth(issues)
    const healthColor = health >= 90 ? chalk.green : health >= 60 ? chalk.yellow : chalk.red
    const healthIcon = health >= 90 ? '✅' : health >= 60 ? '⚠️' : '❌'

    // File header
    const displayName = file.type === 'skill'
      ? file.path.split('/').slice(-2).join('/')
      : file.name

    lines.push(`  ${chalk.bold(displayName)}  ${healthColor(`health: ${health}/100`)} ${healthIcon}`)

    if (issues.length === 0) {
      lines.push(chalk.dim('    No issues found'))
      lines.push('')
      continue
    }

    // Sort by severity: error first
    const sorted = [...issues].sort((a, b) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1
      if (a.severity !== 'error' && b.severity === 'error') return 1
      return (a.line || 0) - (b.line || 0)
    })

    for (const issue of sorted) {
      const icon = SEVERITY_ICON[issue.severity]
      const color = SEVERITY_COLOR[issue.severity]
      const ruleId = chalk.dim(issue.ruleId)
      const lineInfo = issue.line ? chalk.dim(`:${issue.line}`) : ''
      const tokenInfo = issue.tokenWaste
        ? chalk.dim(`  (~${issue.tokenWaste} tokens)`)
        : ''

      lines.push(`  ${color(`${icon} ${ruleId}`)}${lineInfo}  ${issue.message}${tokenInfo}`)
    }

    lines.push('')
  }

  // Summary
  const summaryParts: string[] = []
  if (result.errors > 0) summaryParts.push(chalk.red(`${result.errors} error${result.errors > 1 ? 's' : ''}`))
  if (result.warnings > 0) summaryParts.push(chalk.yellow(`${result.warnings} warning${result.warnings > 1 ? 's' : ''}`))
  if (result.fixable > 0) summaryParts.push(chalk.dim(`${result.fixable} fixable`))

  const fileWord = result.files.length === 1 ? 'file' : 'files'
  lines.push(`  ${chalk.bold('■')} ${result.files.length} ${fileWord} scanned, ${summaryParts.join(', ')}`)

  if (result.fixable > 0) {
    lines.push(chalk.dim(`\n  💡 Run ${chalk.bold('ai-lint fix')} to auto-fix ${result.fixable} issue${result.fixable > 1 ? 's' : ''}`))
  }

  lines.push('')
  return lines.join('\n')
}

/**
 * Render JSON output (for toolchain consumption).
 */
export function renderJson(result: LintResult): string {
  const output = result.files.map(({ file, issues }) => ({
    file: file.path,
    name: file.name,
    type: file.type,
    health: calcHealth(issues),
    issues: issues.map((i) => ({
      ruleId: i.ruleId,
      severity: i.severity,
      line: i.line,
      column: i.column,
      message: i.message,
      tokenWaste: i.tokenWaste,
      fixable: i.fixable,
    })),
  }))

  return JSON.stringify({ files: output, summary: { errors: result.errors, warnings: result.warnings, fixable: result.fixable } }, null, 2)
}

/**
 * Calculate file health score.
 * - Base score 100
 * - Each error: -15
 * - Each warning: -5
 * - Minimum 0
 */
export function calcHealth(issues: LintIssue[]): number {
  let score = 100
  for (const issue of issues) {
    score -= issue.severity === 'error' ? 15 : 5
  }
  return Math.max(0, score)
}

/**
 * Summarize detection results.
 */
export function summarize(fileResults: FileResult[]): LintResult {
  let errors = 0
  let warnings = 0
  let fixable = 0

  const files: FileResult[] = []

  for (const fr of fileResults) {
    files.push(fr)
    for (const issue of fr.issues) {
      if (issue.severity === 'error') errors++
      else warnings++
      if (issue.fixable) fixable++
    }
  }

  return { files, errors, warnings, fixable }
}
