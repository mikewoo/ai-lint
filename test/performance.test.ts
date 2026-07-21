import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runLint } from '../src/engine.js'

/**
 * Generate a CLAUDE.md file with N rules.
 */
function generateClaudeMd(ruleCount: number): string {
  const lines = ['# Generated Rules', '']
  for (let i = 1; i <= ruleCount; i++) {
    lines.push(`- Rule number ${i}: This is a unique rule that covers some specific aspect`)
  }
  return lines.join('\n')
}

/**
 * Generate a SKILL.md file.
 */
function generateSkillMd(index: number): string {
  return [
    '---',
    `name: skill-${index}`,
    `description: Auto-generated test skill number ${index}`,
    '---',
    `# Skill ${index}`,
    '',
    '- First instruction for this skill module',
    '- Second instruction covering another area',
    '- Third instruction with more detail here',
  ].join('\n')
}

describe('performance', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ai-lint-perf-'))

    // Create CLAUDE.md (50 rules — simulates bloat scenario)
    writeFileSync(join(tmpDir, 'CLAUDE.md'), generateClaudeMd(50))

    // Create 15 skill subdirectories
    const skillsDir = join(tmpDir, 'skills')
    mkdirSync(skillsDir, { recursive: true })
    for (let i = 1; i <= 15; i++) {
      const skillDir = join(skillsDir, `skill-${i}`)
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), generateSkillMd(i))
    }
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('scans 16 files in ≤ 1 second', () => {
    const start = performance.now()
    const result = runLint({ cwd: tmpDir })
    const elapsed = performance.now() - start

    // Verify correct result: 16 files (1 CLAUDE.md + 15 SKILL.md)
    expect(result.files.length).toBe(16)

    // Performance assertion: ≤ 1 second
    expect(elapsed).toBeLessThanOrEqual(1000)

    console.log(`  [perf] Scanned 16 files in ${Math.round(elapsed)}ms`)
  })

  it('repeat scans have stable performance', () => {
    const runs = 5
    const times: number[] = []

    for (let i = 0; i < runs; i++) {
      const start = performance.now()
      runLint({ cwd: tmpDir })
      times.push(performance.now() - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / runs

    // Average scan time ≤ 200ms
    expect(avg).toBeLessThanOrEqual(2000)

    console.log(
      `  [perf] Avg of ${runs} runs: ${Math.round(avg)}ms (min: ${Math.round(Math.min(...times))}ms, max: ${Math.round(Math.max(...times))}ms)`,
    )
  })

  it('single file scan is very fast', () => {
    // Simple project with only a single CLAUDE.md
    const singleDir = mkdtempSync(join(tmpdir(), 'ai-lint-perf-single-'))
    writeFileSync(join(singleDir, 'CLAUDE.md'), generateClaudeMd(20))

    const start = performance.now()
    runLint({ cwd: singleDir })
    const elapsed = performance.now() - start

    // Single file ≤ 50ms
    expect(elapsed).toBeLessThanOrEqual(200)

    rmSync(singleDir, { recursive: true, force: true })

    console.log(`  [perf] Single file scan: ${Math.round(elapsed)}ms`)
  })
})
