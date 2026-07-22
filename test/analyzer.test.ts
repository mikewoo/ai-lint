import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { segment } from '../src/analyzer/segment.js'
import { analyzeTokenBudget } from '../src/analyzer/token-budget.js'
import { detectToolchainCoverage } from '../src/analyzer/toolchain.js'

describe('segment', () => {
  it('classifies frontmatter as meta', () => {
    const content = '---\nname: test\ndescription: a skill\n---\n\n- Do the thing\n'
    const segs = segment(content)
    expect(segs[0].category).toBe('meta')
  })

  it('classifies list blocks as rules', () => {
    const segs = segment('- Always validate input\n- Never trust user data\n')
    expect(segs[0].category).toBe('rule')
  })

  it('classifies fenced code as example', () => {
    const segs = segment('```ts\nconst x = 1\n```\n')
    expect(segs[0].category).toBe('example')
  })

  it('classifies separator lines as decoration', () => {
    const segs = segment('━━━━━━━━━━━━━━\n')
    expect(segs[0].category).toBe('decoration')
  })

  it('classifies methodology prose by keyword', () => {
    const content =
      'This project follows the seven-pillar methodology, a philosophy of rigorous specification-first development that guides every decision.\n'
    const segs = segment(content)
    expect(segs[0].category).toBe('methodology')
  })

  it('classifies trigger keyword tables as trigger-table', () => {
    const content = '| Trigger | Skill |\n|------|------|\n| create page | page-gen |\n'
    const segs = segment(content)
    expect(segs[0].category).toBe('trigger-table')
  })

  it('assigns non-zero tokens and line ranges', () => {
    const segs = segment('- A meaningful actionable rule here\n')
    expect(segs[0].tokens).toBeGreaterThan(0)
    expect(segs[0].lineStart).toBe(1)
  })

  it('returns empty for empty input', () => {
    expect(segment('')).toEqual([])
  })
})

describe('analyzeTokenBudget', () => {
  it('aggregates tokens across files', () => {
    const budget = analyzeTokenBudget([
      { name: 'CLAUDE.md', content: '- Rule one here\n- Rule two here\n' },
      { name: 'AGENTS.md', content: '- Another rule entirely\n' },
    ])
    expect(budget.files).toHaveLength(2)
    expect(budget.totalTokens).toBe(budget.files[0].tokens + budget.files[1].tokens)
  })

  it('builds per-category breakdown with ratios summing to ~1', () => {
    const budget = analyzeTokenBudget([
      { name: 'CLAUDE.md', content: '# Title\n\n- Rule one here\n\n```\ncode block\n```\n' },
    ])
    const sum = budget.files[0].breakdown.reduce((s, c) => s + c.ratio, 0)
    expect(sum).toBeCloseTo(1, 1)
  })

  it('handles empty file list', () => {
    const budget = analyzeTokenBudget([])
    expect(budget.totalTokens).toBe(0)
    expect(budget.files).toEqual([])
  })
})

describe('detectToolchainCoverage', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ai-lint-tc-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const claude = '- Always use const instead of var\n- Write comprehensive tests\n'

  it('returns empty when no toolchain config exists (zero false positive)', () => {
    expect(detectToolchainCoverage(dir, claude)).toEqual([])
  })

  it('detects ESLint no-var redundancy', () => {
    writeFileSync(join(dir, '.eslintrc.json'), '{"rules":{"no-var":"error"}}')
    const found = detectToolchainCoverage(dir, claude)
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ tool: 'ESLint', setting: 'no-var', line: 1 })
    expect(found[0].tokensSaved).toBeGreaterThan(0)
  })

  it('does not flag rules the toolchain does not cover', () => {
    writeFileSync(join(dir, '.eslintrc.json'), '{"rules":{"no-var":"error"}}')
    const found = detectToolchainCoverage(dir, claude)
    expect(found.some((r) => r.ruleText.includes('comprehensive tests'))).toBe(false)
  })

  it('detects Prettier indentation redundancy', () => {
    writeFileSync(join(dir, '.prettierrc'), '{"tabWidth":2}')
    const found = detectToolchainCoverage(dir, '- Use 2 space indentation everywhere\n')
    expect(found).toHaveLength(1)
    expect(found[0].tool).toBe('Prettier')
  })

  it('ignores disabled ESLint rules', () => {
    writeFileSync(join(dir, '.eslintrc.json'), '{"rules":{"no-var":"off"}}')
    expect(detectToolchainCoverage(dir, claude)).toEqual([])
  })

  it('reads Prettier config from package.json field', () => {
    writeFileSync(join(dir, 'package.json'), '{"prettier":{"singleQuote":true}}')
    const found = detectToolchainCoverage(dir, '- Use single quotes for all strings\n')
    expect(found).toHaveLength(1)
    expect(found[0].setting).toContain('singleQuote')
  })

  it('handles malformed config gracefully', () => {
    writeFileSync(join(dir, '.eslintrc.json'), '{not valid json')
    expect(detectToolchainCoverage(dir, claude)).toEqual([])
  })

  it('parses flat config array form', () => {
    writeFileSync(join(dir, '.eslintrc.json'), '[{"rules":{"no-var":"error"}}]')
    const found = detectToolchainCoverage(dir, claude)
    expect(found).toHaveLength(1)
    expect(found[0].setting).toBe('no-var')
  })
})
