#! /usr/bin/env node
import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import chalk from 'chalk'
import { Command } from 'commander'
import type { LintResult } from './report/render.js'
import { render, renderJson } from './report/render.js'
import { runCrossFiles, runFix, runLint } from './engine.js'

const program = new Command()

program
  .name('ai-lint')
  .description('The missing linter for AI prompt files — scan your CLAUDE.md, rules, and skills for issues')
  .version('0.1.0')
  .argument('[path]', 'directory or file to scan', process.cwd())
  .option('--ci', 'exit with code 1 if any issues found')
  .option('--json', 'output results as JSON')
  .option('--no-color', 'disable colored output (useful in CI)')
  .option('--cross-files', 'enable cross-file detection')
  .option('--rules <ids>', 'comma-separated rule IDs to limit detection to')
  .action((scanPath: string, options: { ci?: boolean; json?: boolean; noColor?: boolean; crossFiles?: boolean; rules?: string }) => {
    const resolvedPath = resolve(scanPath || process.cwd())
    const isFile = existsSync(resolvedPath) && statSync(resolvedPath).isFile()
    const cwd = isFile ? dirname(resolvedPath) : resolvedPath
    const targetFile = isFile ? resolvedPath : undefined

    if (options.noColor) {
      chalk.level = 0
    }

    const result = runLint({ cwd, targetFile, rulesFilter: options.rules })
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

// ai-lint init [path] --type <name>
program
  .command('init')
  .description('generate a healthy AI config template')
  .argument('[path]', 'directory to create the template in', process.cwd())
  .option('--type <name>', 'template type: claude, agents, skill, design', 'claude')
  .action(async (initPath: string, options: { type?: string }) => {
    const targetDir = resolve(initPath || process.cwd())
    const type = options.type || 'claude'
    const { writeFileSync, mkdirSync } = await import('node:fs')

    const templates: Record<string, { file: string; content: string }> = {
      claude: {
        file: 'CLAUDE.md',
        content: [
          '---',
          'description: Project rules and conventions for AI assistants',
          '---',
          '',
          '# Project Rules',
          '',
          '## Language & Types',
          '- Use TypeScript strict mode for all new code',
          '- Prefer `const` over `let`, avoid `var`',
          '- Export all public APIs with explicit return types',
          '',
          '## Code Style',
          '- Use tabs for indentation',
          '- Maximum line length: 100 characters',
          '- Always use semicolons',
          '',
          '## Testing',
          '- Write unit tests for all new modules',
          '- Run `npm test` before committing',
          '- Maintain test coverage above 80%',
          '',
          '## Commits',
          '- Follow conventional commits format',
          '- Keep commits small and focused',
          '- Reference issue numbers in commit messages',
          '',
          '## Dependencies',
          '- Prefer built-in Node.js APIs over third-party packages',
          '- Minimize production dependencies',
          '- Pin dependency versions in package.json',
        ].join('\n'),
      },
      agents: {
        file: 'AGENTS.md',
        content: [
          '# Agent Rules',
          '',
          '## Behavior',
          '- Always validate output before returning results',
          '- If a task fails, retry with exponential backoff',
          '- Report errors clearly with context, not just stack traces',
          '',
          '## Output',
          '- Keep responses concise and actionable',
          '- Use the project code style in all generated code',
          '- Include reasoning for non-obvious decisions',
          '',
          '## Constraints',
          '- Never modify files without explicit user confirmation',
          '- Respect .gitignore when suggesting file operations',
          '- Do not install packages without asking',
        ].join('\n'),
      },
      skill: {
        file: 'SKILL.md',
        content: [
          '---',
          'name: my-skill',
          'description: TODO: describe what this skill does in one sentence',
          '---',
          '',
          '# Skill Title',
          '',
          'Brief overview of what this skill enables.',
          '',
          '## Instructions',
          '- First instruction for this skill',
          '- Second instruction with more detail',
          '- Third instruction covering edge cases',
          '',
          '## Constraints',
          '- Only apply this skill when relevant context is detected',
          '- Respect existing project conventions',
        ].join('\n'),
      },
      design: {
        file: 'DESIGN.md',
        content: [
          '# Design System',
          '',
          '## Colors',
          '- Primary: #000000',
          '- Secondary: #666666',
          '- Accent: (choose based on brand)',
          '',
          '## Typography',
          '- Headings: system sans-serif, bold',
          '- Body: system sans-serif, 16px',
          '- Code: monospace, 14px',
          '',
          '## Spacing',
          '- Base unit: 8px',
          '- Padding: multiples of base unit',
          '- Max content width: 1200px',
          '',
          '## Components',
          '- Use consistent border-radius (4px)',
          '- Shadows: use sparingly, only for elevation',
          '- Keep components accessible (WCAG AA minimum)',
        ].join('\n'),
      },
    }

    const tpl = templates[type]
    if (!tpl) {
      console.log(`\n  Unknown template type: "${type}"\n`)
      console.log(`  Available: ${Object.keys(templates).join(', ')}\n`)
      process.exit(1)
    }

    const targetFile = resolve(targetDir, tpl.file)
    if (existsSync(targetFile)) {
      console.log(`\n  ${tpl.file} already exists at ${targetDir}/\n`)
      console.log('  Use ai-lint to scan it instead.\n')
      process.exit(1)
    }

    try {
      mkdirSync(targetDir, { recursive: true })
      writeFileSync(targetFile, tpl.content, 'utf-8')
      console.log(`\n  ✅ Created ${targetFile}\n`)
      console.log(`  Run ${chalk.bold('ai-lint')} to verify it's healthy.\n`)
    } catch (err) {
      console.error(`\n  Failed to create template: ${err}\n`)
      process.exit(1)
    }
  })

// ai-lint stats
program
  .command('stats')
  .description('show health score trends for AI config files')
  .argument('[path]', 'directory to scan', process.cwd())
  .action((statsPath: string) => {
    const cwd = resolve(statsPath || process.cwd())
    const result = runLint({ cwd })

    if (result.files.length === 0) {
      console.log('\n  No AI config files found.\n')
      return
    }

    console.log(chalk.bold('\n  Health Score Summary\n'))
    console.log('  ┌──────────────────────────────┬────────┬────────┐')
    console.log('  │ File                         │ Score  │ Status │')
    console.log('  ├──────────────────────────────┼────────┼────────┤')

    const scores: number[] = []
    for (const { file, issues } of result.files) {
      const displayName = file.type === 'skill'
        ? file.path.split('/').slice(-2).join('/').padEnd(28)
        : file.name.padEnd(28)

      const score = Math.max(0, 100 - issues.filter((i) => i.severity === 'error').length * 15 - issues.filter((i) => i.severity === 'warning').length * 5)
      scores.push(score)

      const status = score >= 90 ? chalk.green('✅ OK') : score >= 60 ? chalk.yellow('⚠️  warn') : chalk.red('❌ poor')
      const scoreStr = `${score}/100`.padStart(6)

      console.log(`  │ ${displayName} │ ${scoreStr} │ ${status}     │`)
    }

    console.log('  └──────────────────────────────┴────────┴────────┘')

    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const avgStatus = avg >= 90 ? chalk.green('healthy') : avg >= 60 ? chalk.yellow('needs attention') : chalk.red('critical')

    console.log(`\n  ${result.files.length} files  |  Average health: ${avg}/100  |  Overall: ${avgStatus}\n`)
  })

program.parse()
