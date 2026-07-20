#! /usr/bin/env node
import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import chalk from 'chalk'
import { Command } from 'commander'
import type { LintResult } from './report/render.js'
import { calcHealth, render, renderJson } from './report/render.js'
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
  .argument('[path]', 'directory or file to fix', process.cwd())
  .option('--dry-run', 'preview fixes without writing to disk')
  .option('--rules <ids>', 'comma-separated rule IDs to limit fixing to')
  .action((fixPath: string, options: { dryRun?: boolean; rules?: string }) => {
    const resolvedPath = resolve(fixPath || process.cwd())
    const isFile = existsSync(resolvedPath) && statSync(resolvedPath).isFile()
    const cwd = isFile ? dirname(resolvedPath) : resolvedPath
    const targetFile = isFile ? resolvedPath : undefined
    const { result, fixed, details } = runFix({ cwd, targetFile, rulesFilter: options.rules, dryRun: options.dryRun })

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
  .option('-t, --type <name>', 'template type: claude, agents, skill, design')
  .action(async (initPath: string, options: { type?: string }) => {
    // Resolve type: if the path argument is one of the template names, treat it as the type
    const templateNames = ['claude', 'agents', 'skill', 'design']
    let type = options.type || 'claude'
    let targetDir = resolve(initPath || process.cwd())

    if (!options.type && templateNames.includes(initPath)) {
      type = initPath
      targetDir = process.cwd()
    }

    const { writeFileSync, mkdirSync } = await import('node:fs')

    const templates: Record<string, { file: string; content: string }> = {
      claude: {
        file: 'CLAUDE.md',
        content: [
          '# Project Context',
          '',
          'Brief description of the project, its purpose, and tech stack.',
          '',
          '## Build & Test Commands',
          '- Build: `<insert build command>`',
          '- Test: `<insert test command>`',
          '- Lint: `<insert lint command>`',
          '',
          '## Code Style',
          '- Use `<language>` naming conventions',
          '- Maximum line length: `<N>` characters',
          '- Prefer `<convention A>` over `<convention B>`',
          '',
          '## Testing',
          '- Write unit tests for all new modules',
          '- Run tests before committing',
          '- Maintain reasonable test coverage',
          '',
          '## Architecture Constraints',
          '- Keep modules loosely coupled',
          '- Avoid circular dependencies',
          '- New features go in dedicated modules',
          '',
          '## Commit Guidelines',
          '- Follow conventional commits format',
          '- Keep commits small and focused',
        ].join('\n'),
      },
      agents: {
        file: 'AGENTS.md',
        content: [
          '# Project Overview',
          '',
          'Brief description of this project for AI coding agents.',
          '',
          '## Build & Test Commands',
          '- Build: `<insert build command>`',
          '- Test: `<insert test command with exact flags>`',
          '- Lint: `<insert lint command>`',
          '',
          '## Code Style',
          '- Language: `<language>`',
          '- Naming: `<convention>`',
          '- Formatter: `<tool>`',
          '',
          '## Testing Guidelines',
          '- Framework: `<test framework>`',
          '- Coverage target: `<N>%`',
          '- Run before committing',
          '',
          '## Architecture Constraints',
          '- Module structure: `<describe layout>`',
          '- Dependency rules: `<describe constraints>`',
          '- API boundaries: `<describe interfaces>`',
          '',
          '## Security Boundaries',
          '- Never log credentials or secrets',
          '- Validate all user inputs',
          '- Sanitize outputs before rendering',
          '',
          '## Commit & PR Guidelines',
          '- Follow conventional commits',
          '- Keep PRs under 400 lines diff',
          '- Include test evidence in PR description',
        ].join('\n'),
      },
      skill: {
        file: 'SKILL.md',
        content: [
          '---',
          'name: My Skill',
          'description: Describe what this skill does and when Claude should use it. Include trigger keywords and specific scenarios where this skill applies.',
          '---',
          '',
          '# My Skill',
          '',
          'Brief overview of what this skill enables.',
          '',
          '## When to Use',
          '',
          'Describe the conditions under which this skill should be activated.',
          'Be specific: mention file types, project structures, or user requests.',
          '',
          '## Instructions',
          '',
          '- First actionable instruction with clear expected behavior',
          '- Second instruction covering common edge cases',
          '- Third instruction for error handling or fallback behavior',
          '',
          '## Constraints',
          '',
          '- Only apply this skill when relevant context is detected',
          '- Respect existing project conventions and tooling',
          '- Do not override user-specified preferences',
        ].join('\n'),
      },
      design: {
        file: 'DESIGN.md',
        content: [
          '---',
          'name: my-project',
          'description: Design system for AI coding agents',
          'colors:',
          '  primary: "#1A1C1E"',
          '  primary-foreground: "#FFFFFF"',
          '  secondary: "#F3F4F6"',
          '  secondary-foreground: "#1A1C1E"',
          '  accent: "#2563EB"',
          '  accent-foreground: "#FFFFFF"',
          '  muted: "#6B7280"',
          '  border: "#D1D5DB"',
          '  background: "#FFFFFF"',
          '  destructive: "#DC2626"',
          '  destructive-foreground: "#FFFFFF"',
          'typography:',
          '  heading:',
          '    fontFamily: "system-ui, sans-serif"',
          '    fontWeight: "700"',
          '  body:',
          '    fontFamily: "system-ui, sans-serif"',
          '    fontSize: "16px"',
          '    fontWeight: "400"',
          '    lineHeight: "1.5"',
          '  code:',
          '    fontFamily: "monospace"',
          '    fontSize: "14px"',
          'rounded:',
          '  sm: "4px"',
          '  md: "8px"',
          '  lg: "12px"',
          'spacing:',
          '  xs: "4px"',
          '  sm: "8px"',
          '  md: "16px"',
          '  lg: "24px"',
          '  xl: "32px"',
          'components:',
          '  button-primary:',
          '    backgroundColor: "{colors.primary}"',
          '    textColor: "{colors.primary-foreground}"',
          '    rounded: "{rounded.md}"',
          '    padding: "{spacing.sm} {spacing.md}"',
          '  button-primary-hover:',
          '    backgroundColor: "{colors.accent}"',
          '  card:',
          '    backgroundColor: "{colors.secondary}"',
          '    rounded: "{rounded.lg}"',
          '    padding: "{spacing.lg}"',
          '---',
          '',
          '## Overview',
          '',
          'This design system describes the visual identity for [Project Name].',
          'Use it as the single source of truth for all AI-generated UI.',
          '',
          'The color palette is intentionally restrained — accent colors are for',
          'interactions only, not decoration. Typography uses system fonts for',
          'performance and consistency across platforms.',
          '',
          '## Colors',
          '',
          'Primary and secondary colors form the core brand palette. Accent is',
          'reserved for interactive elements (links, buttons, focus rings).',
          'Muted is for secondary text and disabled states. Destructive is for',
          'danger actions and error states.',
          '',
          'All color pairs must meet WCAG AA contrast ratio (4.5:1 minimum).',
          '',
          '## Typography',
          '',
          'Three text styles cover all use cases. Headings use bold weight.',
          'Body text is 16px for readability. Code blocks use monospace at 14px.',
          '',
          'Avoid using more than 2 font families. Scale heading sizes with the',
          'CSS `clamp()` function for responsive typography.',
          '',
          '## Layout',
          '',
          'Spacing follows an 8px base unit. Max content width is 1200px.',
          'Use the spacing scale tokens rather than arbitrary pixel values.',
          '',
          '## Elevation & Depth',
          '',
          'Use shadows sparingly for elevation only. Two levels:',
          '- Low: `0 1px 3px rgba(0,0,0,0.1)` for cards',
          '- High: `0 4px 12px rgba(0,0,0,0.15)` for modals and dropdowns',
          '',
          '## Shapes',
          '',
          'Border radius uses the rounded scale tokens. Buttons and inputs',
          'use `md` (8px). Cards and modals use `lg` (12px).',
          '',
          '## Components',
          '',
          'Component tokens reference color and spacing tokens via `{path.to.token}`.',
          'Add hover/focus/active variants as sibling entries with suffixed keys.',
          '',
          '## Do\'s and Don\'ts',
          '',
          '- **Do** use design tokens, not raw values, in all generated code',
          '- **Do** check color contrast before shipping UI',
          '- **Do** keep the design system file under 300 lines',
          "- **Don't** add new colors without updating the YAML tokens",
          "- **Don't** use accent color for non-interactive elements",
          "- **Don't** mix typography scales within the same component",
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

      const score = calcHealth(issues)
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
