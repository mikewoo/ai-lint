import chalk from 'chalk'
import type { SegmentCategory } from '../analyzer/segment.js'
import {
  CONTEXT_WINDOW_TOKENS,
  type CategoryBreakdown,
  type TokenBudget,
} from '../analyzer/token-budget.js'

/** Human-readable label + keep/trim hint for each category. */
const CATEGORY_LABEL: Record<SegmentCategory, string> = {
  rule: 'Rules',
  'trigger-table': 'Trigger table',
  methodology: 'Methodology',
  example: 'Examples',
  decoration: 'Decoration',
  meta: 'Meta',
}

/** Advisory hint shown next to each category. */
const CATEGORY_HINT: Record<SegmentCategory, string> = {
  rule: chalk.dim('core'),
  'trigger-table': chalk.dim('keep'),
  methodology: chalk.yellow('⚠️ trimmable'),
  example: chalk.dim('keep sparingly'),
  decoration: chalk.yellow('💡 removable'),
  meta: chalk.dim('keep'),
}

const BAR_WIDTH = 10

/** Render a fixed-width bar for a ratio in [0, 1]. */
function bar(ratio: number): string {
  const filled = Math.round(ratio * BAR_WIDTH)
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled)
}

/** Format a token count with thousands separators. */
function fmt(tokens: number): string {
  return tokens.toLocaleString('en-US')
}

/** Render one category line within a file breakdown. */
function renderCategory(c: CategoryBreakdown): string {
  const label = CATEGORY_LABEL[c.category].padEnd(14)
  const tokens = fmt(c.tokens).padStart(6)
  const pct = `(${Math.round(c.ratio * 100)}%)`.padStart(6)
  return `    ├── ${label} ${tokens} ${pct} ${bar(c.ratio)} ${CATEGORY_HINT[c.category]}`
}

/**
 * Render the full token budget report (terminal).
 */
export function renderTokenBudget(budget: TokenBudget): string {
  if (budget.files.length === 0) {
    return chalk.dim('\n  No AI config files found.\n')
  }

  const lines: string[] = ['', chalk.bold('  Token Budget'), chalk.dim(`  ${'━'.repeat(45)}`)]

  // Sort files by token count, largest first
  const sortedFiles = [...budget.files].sort((a, b) => b.tokens - a.tokens)

  for (const file of sortedFiles) {
    const share = budget.totalTokens > 0 ? Math.round((file.tokens / budget.totalTokens) * 100) : 0
    lines.push(
      `  ${chalk.bold(file.name.padEnd(32))} ${fmt(file.tokens).padStart(6)} tokens ${chalk.dim(`(${share}%)`)}`,
    )
    for (const c of file.breakdown) {
      lines.push(renderCategory(c))
    }
    lines.push('')
  }

  lines.push(chalk.dim(`  ${'━'.repeat(45)}`))
  const windowPct = ((budget.totalTokens / CONTEXT_WINDOW_TOKENS) * 100).toFixed(1)
  lines.push(
    `  ${chalk.bold('Total:')} ${fmt(budget.totalTokens)} tokens ${chalk.dim(`(${windowPct}% of a 200K context window)`)}`,
  )

  // Optimization hints from trimmable/removable categories
  const trimmable = budget.breakdown.filter(
    (c) => c.category === 'methodology' || c.category === 'decoration',
  )
  if (trimmable.length > 0) {
    lines.push('', chalk.dim('  💡 Optimization opportunities:'))
    for (const c of trimmable) {
      const verb = c.category === 'decoration' ? 'Remove decoration' : 'Compress methodology prose'
      lines.push(chalk.dim(`     - ${verb} → up to ~${fmt(c.tokens)} tokens`))
    }
  }

  lines.push('')
  return lines.join('\n')
}

/** Render the token budget as JSON (for toolchain consumption). */
export function renderTokenBudgetJson(budget: TokenBudget): string {
  return JSON.stringify(
    {
      totalTokens: budget.totalTokens,
      contextWindowPct: budget.totalTokens / CONTEXT_WINDOW_TOKENS,
      breakdown: budget.breakdown,
      files: budget.files.map((f) => ({
        name: f.name,
        tokens: f.tokens,
        breakdown: f.breakdown,
      })),
    },
    null,
    2,
  )
}
