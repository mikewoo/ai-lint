#! /usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import type { LintResult } from './report/render.js'
import { render, renderJson } from './report/render.js'
import { runCrossFiles, runLint, runFix } from './engine.js'

const program = new Command()

program
  .name('ai-lint')
  .description('The missing linter for AI prompt files — scan your CLAUDE.md, rules, and skills for issues')
  .version('0.1.0')
  .argument('[path]', 'directory to scan', process.cwd())
  .option('--ci', 'exit with code 1 if any issues found')
  .option('--json', 'output results as JSON')
  .option('--no-color', 'disable colored output (useful in CI)')
  .option('--cross-files', 'enable cross-file detection')
  .action((scanPath: string, options: { ci?: boolean; json?: boolean; noColor?: boolean; crossFiles?: boolean }) => {
    const cwd = scanPath || process.cwd()

    if (options.noColor) {
      chalk.level = 0
    }

    const result = runLint({ cwd })
    const crossResult = options.crossFiles ? runCrossFiles({ cwd }) : null

    if (options.json) {
      const jsonOutput = crossResult
        ? { ...crossResult, crossFiles: crossResult.files[0]?.issues || [] }
        : result
      console.log(renderJson(jsonOutput as LintResult))
    } else {
      console.log(render(result, cwd))
      if (crossResult && crossResult.files[0]?.issues.length > 0) {
        console.log(chalk.bold('\n  ── Cross-file Detection ──\n'))
        for (const issue of crossResult.files[0].issues) {
          const icon = issue.severity === 'error' ? '❌' : '⚠️'
          const color = issue.severity === 'error' ? chalk.red : chalk.yellow
          console.log(`  ${color(`${icon} ${issue.ruleId}`)}  ${issue.file}  ${issue.message}`)
        }
        console.log()
      }
    }

    const totalErrors = result.errors + (crossResult?.errors || 0)
    const totalWarnings = result.warnings + (crossResult?.warnings || 0)

    if (options.ci && (totalErrors > 0 || totalWarnings > 0)) {
      process.exit(1)
    }
  })

// ai-lint fix [path]
program
  .command('fix')
  .description('auto-fix lint issues where possible')
  .argument('[path]', 'directory to scan', process.cwd())
  .option('--dry-run', 'preview fixes without writing to disk')
  .action((fixPath: string, options: { dryRun?: boolean }) => {
    const cwd = fixPath || process.cwd()
    const { result, fixed, details } = runFix({ cwd, fix: true, dryRun: options.dryRun })

    // Display per-item fix details
    for (const d of details) {
      const prefix = options.dryRun ? '  ◌' : '  ✅'
      console.log(`${prefix} ${d.ruleId.padEnd(24)} ${d.file}${d.line ? `:${d.line}` : ''}`)
    }

    if (options.dryRun) {
      console.log(`\n  Would fix ${fixed} issue${fixed !== 1 ? 's' : ''} (dry-run)\n`)
    } else if (fixed > 0) {
      console.log(`\n  ✅ Fixed ${fixed} issue${fixed !== 1 ? 's' : ''}\n`)
    } else {
      console.log('\n  No fixable issues found\n')
    }

    console.log(render(result, cwd))
  })

// ai-lint explain <rule-id>
program
  .command('explain')
  .description('explain a specific rule in detail')
  .argument('<rule-id>', 'rule ID to explain')
  .action(async (ruleId: string) => {
    const { rules } = await import('./rules/registry.js')
    const rule = rules.find((r) => r.id === ruleId)

    if (!rule) {
      console.log(`\n  Unknown rule: "${ruleId}"\n`)
      console.log('  Available rules:')
      for (const r of rules) {
        console.log(`    ${r.id} — ${r.description}`)
      }
      console.log()
      process.exit(1)
    }

    console.log(`\n  ${rule.id}`)
    console.log(`  ${rule.description}`)
    console.log(`  Files: ${rule.files.join(', ')}`)
    console.log()
  })

program.parse()
