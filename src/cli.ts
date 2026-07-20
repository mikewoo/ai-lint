#! /usr/bin/env node
import { Command } from 'commander'
import { runLint, runFix } from './engine.js'
import { render, renderJson } from './report/render.js'

const program = new Command()

program
  .name('ai-lint')
  .description('The missing linter for AI prompt files — scan your CLAUDE.md, rules, and skills for issues')
  .version('0.1.0')
  .argument('[path]', 'directory to scan', process.cwd())
  .option('--ci', 'exit with code 1 if any issues found')
  .option('--json', 'output results as JSON')
  .option('--cross-files', 'enable cross-file detection')
  .action((scanPath: string, options: { ci?: boolean; json?: boolean; crossFiles?: boolean }) => {
    const cwd = scanPath || process.cwd()

    const result = runLint({ cwd })

    if (options.json) {
      console.log(renderJson(result))
    } else {
      console.log(render(result, cwd))
    }

    if (options.ci && (result.errors > 0 || result.warnings > 0)) {
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
    const { result, fixed } = runFix({ cwd, fix: true, dryRun: options.dryRun })

    if (options.dryRun) {
      console.log(`\n  Would fix ${fixed} issue${fixed !== 1 ? 's' : ''} (dry-run)\n`)
    } else {
      console.log(`\n  ✅ Fixed ${fixed} issue${fixed !== 1 ? 's' : ''}\n`)
    }

    console.log(render(result, cwd))
  })

// ai-lint explain <rule-id>
program
  .command('explain')
  .description('explain a specific rule in detail')
  .argument('<rule-id>', 'rule ID to explain')
  .action((ruleId: string) => {
    // 懒加载规则注册表来获取描述
    const { rules } = require('./rules/registry.js')
    const rule = rules.find((r: { id: string; description: string; files: string[] }) => r.id === ruleId)

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
