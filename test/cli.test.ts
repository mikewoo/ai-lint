import { execSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const CLI = join(import.meta.dirname!, '..', 'dist', 'cli.js')

describe('CLI integration', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ai-lint-cli-test-'))

    // Create config files with and without issues
    // CLAUDE.md with issues
    writeFileSync(join(tmpDir, 'CLAUDE.md'), [
      '# Test Rules',
      '- Use TypeScript strict mode',
      '- Use TypeScript strict mode',
      '- Please be absolutely sure to always run tests',
    ].join('\n'))

    // skill with frontmatter
    mkdirSync(join(tmpDir, 'skills', 'good-skill'), { recursive: true })
    writeFileSync(join(tmpDir, 'skills', 'good-skill', 'SKILL.md'), [
      '---',
      'name: good-skill',
      'description: A good skill with proper frontmatter',
      '---',
      '# Good Skill',
      '- Do something useful',
    ].join('\n'))

    // skill without frontmatter
    mkdirSync(join(tmpDir, 'skills', 'bad-skill'), { recursive: true })
    writeFileSync(join(tmpDir, 'skills', 'bad-skill', 'SKILL.md'), [
      '# Bad Skill',
      '- Has no frontmatter',
    ].join('\n'))

    // empty directory
    mkdirSync(join(tmpDir, 'empty-dir'), { recursive: true })
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('ai-lint discovers files and outputs correct format', () => {
    const output = execSync(`node ${CLI} ${tmpDir}`, { encoding: 'utf-8' })

    expect(output).toContain('CLAUDE.md')
    expect(output).toContain('health:')
    expect(output).toContain('no-duplicate')
    expect(output).toContain('no-verbose')
    expect(output).toContain('good-skill')
    expect(output).toContain('bad-skill')
    expect(output).toContain('no-missing-frontmatter')
    expect(output).toContain('files scanned')
  })

  it('ai-lint --json outputs valid JSON', () => {
    const output = execSync(`node ${CLI} ${tmpDir} --json`, { encoding: 'utf-8' })
    const parsed = JSON.parse(output)

    expect(parsed.files).toBeDefined()
    expect(Array.isArray(parsed.files)).toBe(true)
    expect(parsed.files.length).toBeGreaterThanOrEqual(2)
    expect(parsed.summary).toBeDefined()
    expect(typeof parsed.summary.errors).toBe('number')
    expect(typeof parsed.summary.warnings).toBe('number')
  })

  it('ai-lint --ci exits 1 when there are issues', () => {
    expect(() => {
      execSync(`node ${CLI} ${tmpDir} --ci`, { encoding: 'utf-8', stdio: 'pipe' })
    }).toThrow()
  })

  it('ai-lint --ci exits 0 when no issues', () => {
    const result = execSync(`node ${CLI} ${join(tmpDir, 'empty-dir')} --ci`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    expect(result).toBeDefined()
  })

  it('ai-lint --no-color disables color output', () => {
    const output = execSync(`node ${CLI} ${tmpDir} --no-color`, { encoding: 'utf-8' })
    // should not contain ANSI escape codes
    expect(output).not.toContain('[')
  })

  it('ai-lint explain shows rule details', () => {
    const output = execSync(`node ${CLI} explain no-duplicate`, { encoding: 'utf-8' })
    expect(output).toContain('no-duplicate')
    expect(output).toContain('Detect literal duplicate')
  })

  it('ai-lint explain errors on unknown rule', () => {
    expect(() => {
      execSync(`node ${CLI} explain nonexistent-rule`, { encoding: 'utf-8', stdio: 'pipe' })
    }).toThrow()
  })

  it('ai-lint fix --dry-run previews without modifying files', () => {
    const before = execSync(`node ${CLI} ${tmpDir} --json`, { encoding: 'utf-8' })
    const beforeParsed = JSON.parse(before)
    const beforeErrors = beforeParsed.summary.errors

    const output = execSync(`node ${CLI} fix ${tmpDir} --dry-run`, { encoding: 'utf-8' })
    expect(output).toContain('Would fix')

    // files should not be modified
    const after = execSync(`node ${CLI} ${tmpDir} --json`, { encoding: 'utf-8' })
    const afterParsed = JSON.parse(after)
    expect(afterParsed.summary.errors).toBe(beforeErrors)
  })
})
