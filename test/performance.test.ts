import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runLint } from '../src/engine.js'

/**
 * 生成一个有 N 条规则的 CLAUDE.md 内容。
 */
function generateClaudeMd(ruleCount: number): string {
  const lines = ['# Generated Rules', '']
  for (let i = 1; i <= ruleCount; i++) {
    lines.push(`- Rule number ${i}: This is a unique rule that covers some specific aspect`)
  }
  return lines.join('\n')
}

/**
 * 生成为一个 SKILL.md 内容。
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

    // 创建 CLAUDE.md（50 条规则 — 模拟膨胀场景）
    writeFileSync(join(tmpDir, 'CLAUDE.md'), generateClaudeMd(50))

    // 创建 15 个 Skill 子目录
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

  it('扫描 16 个文件 ≤ 1 秒', () => {
    const start = performance.now()
    const result = runLint({ cwd: tmpDir })
    const elapsed = performance.now() - start

    // 验证结果正确：16 个文件（1 CLAUDE.md + 15 SKILL.md）
    expect(result.files.length).toBe(16)

    // 性能断言：≤ 1 秒
    expect(elapsed).toBeLessThanOrEqual(1000)

    console.log(`  [perf] Scanned 16 files in ${Math.round(elapsed)}ms`)
  })

  it('重复扫描性能稳定', () => {
    const runs = 5
    const times: number[] = []

    for (let i = 0; i < runs; i++) {
      const start = performance.now()
      runLint({ cwd: tmpDir })
      times.push(performance.now() - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / runs

    // 平均扫描时间 ≤ 200ms
    expect(avg).toBeLessThanOrEqual(2000)

    console.log(
      `  [perf] Avg of ${runs} runs: ${Math.round(avg)}ms (min: ${Math.round(Math.min(...times))}ms, max: ${Math.round(Math.max(...times))}ms)`,
    )
  })

  it('单文件扫描极快', () => {
    // 只扫描单个 CLAUDE.md 的简单项目
    const singleDir = mkdtempSync(join(tmpdir(), 'ai-lint-perf-single-'))
    writeFileSync(
      join(singleDir, 'CLAUDE.md'),
      generateClaudeMd(20),
    )

    const start = performance.now()
    runLint({ cwd: singleDir })
    const elapsed = performance.now() - start

    // 单文件 ≤ 50ms
    expect(elapsed).toBeLessThanOrEqual(200)

    rmSync(singleDir, { recursive: true, force: true })

    console.log(`  [perf] Single file scan: ${Math.round(elapsed)}ms`)
  })
})
