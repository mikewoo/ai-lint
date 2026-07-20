import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { maxLength } from '../src/rules/max-length.js'
import { noDuplicate } from '../src/rules/no-duplicate.js'
import { noVerbose } from '../src/rules/no-verbose.js'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8')

// ============================================================
// no-duplicate
// ============================================================

describe('no-duplicate', () => {
  it('检测字面重复的规则', () => {
    const content = fixture('duplicate-claude.md')
    const issues = noDuplicate.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThanOrEqual(2)

    const messages = issues.map((i) => i.message)
    expect(messages.some((m) => m.includes('TypeScript strict mode'))).toBe(true)
    expect(messages.some((m) => m.includes('Run npm test'))).toBe(true)

    // 验证严重级别
    for (const issue of issues) {
      expect(issue.severity).toBe('error')
      expect(issue.ruleId).toBe('no-duplicate')
      expect(issue.fixable).toBe(true)
    }
  })

  it('健康配置不产生重复报告', () => {
    const content = fixture('healthy-claude.md')
    const issues = noDuplicate.check(content, 'CLAUDE.md')

    expect(issues).toHaveLength(0)
  })

  it('估算 token 浪费量', () => {
    const content = fixture('duplicate-claude.md')
    const issues = noDuplicate.check(content, 'CLAUDE.md')

    for (const issue of issues) {
      expect(issue.tokenWaste).toBeDefined()
      expect(issue.tokenWaste!).toBeGreaterThan(0)
    }
  })

  it('fix 移除重复行（保留第一次出现）', () => {
    const content = '- Rule one\n- Rule two\n- Rule one\n- Rule three\n'
    const issues = noDuplicate.check(content, 'test.md')
    expect(issues).toHaveLength(1)

    const fixed = noDuplicate.fix(content, issues[0])
    expect(fixed).toBe('- Rule one\n- Rule two\n- Rule three\n')
  })

  it('空内容不报错', () => {
    const issues = noDuplicate.check('', 'empty.md')
    expect(issues).toHaveLength(0)
  })

  it('处理大小写不敏感的重复', () => {
    const content = '- USE TYPESCRIPT\n- Use TypeScript\n'
    const issues = noDuplicate.check(content, 'test.md')
    expect(issues.length).toBe(1)
  })
})

// ============================================================
// no-verbose
// ============================================================

describe('no-verbose', () => {
  it('检测中文冗余表述', () => {
    const content = [
      '- 请务必确保一定在提交前运行所有测试',
    ].join('\n')

    const issues = noVerbose.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-verbose')
    expect(issues[0].fixable).toBe(true)
    expect(issues[0].tokenWaste).toBeGreaterThan(0)
  })

  it('检测英文冗余表述', () => {
    const cases = [
      '- Please be absolutely sure to always run tests before committing',
      '- It is essential that you follow the style guide',
      '- Under no circumstances should you ever skip the CI pipeline',
      '- In order to ensure that all tests pass, check the coverage report',
      '- Due to the fact that TypeScript is strict, use explicit types',
      '- For the purpose of consistency, use tabs for indentation',
    ]

    for (const c of cases) {
      const issues = noVerbose.check(c, 'CLAUDE.md')
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('检测填充词', () => {
    const cases = [
      '- I want you to use TypeScript strict mode',
      '- Remember that you should always format before committing',
      "- Don't forget to update the changelog",
    ]

    for (const c of cases) {
      const issues = noVerbose.check(c, 'CLAUDE.md')
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('简洁规则不产生报告', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Run tests before committing',
      '- Format code with Biome',
    ].join('\n')

    const issues = noVerbose.check(content, 'CLAUDE.md')
    expect(issues).toHaveLength(0)
  })

  it('fix 替换冗余表述', () => {
    const content = '- Please be absolutely sure to always run tests\n'
    const issues = noVerbose.check(content, 'test.md')
    expect(issues.length).toBeGreaterThan(0)

    const fixed = noVerbose.fix(content, issues[0])
    expect(fixed).not.toBe(content)
    // 修复后不应再检测到问题
    const recheck = noVerbose.check(fixed, 'test.md')
    expect(recheck).toHaveLength(0)
  })

  it('过滤微小优化（节省 < 3 tokens）', () => {
    // "due to" → 太短，不应该触发
    const content = '- due to\n'
    const issues = noVerbose.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// max-length
// ============================================================

describe('max-length', () => {
  it('规则数低于阈值时不报告', () => {
    const content = fixture('healthy-claude.md')
    const issues = maxLength.check(content, 'CLAUDE.md', 20)

    expect(issues).toHaveLength(0)
  })

  it('规则数超过阈值时报告', () => {
    // 生成超过 5 条规则的内容（每条 ≥ 8 字符）
    const rules = Array.from({ length: 8 }, (_, i) => `- Rule number ${i + 1} here`)
    const content = rules.join('\n')

    const issues = maxLength.check(content, 'CLAUDE.md', 5)

    expect(issues).toHaveLength(1)
    expect(issues[0].ruleId).toBe('max-length')
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].tokenWaste).toBeGreaterThan(0)
    expect(issues[0].fixable).toBe(false)
  })

  it('消息中包含超出的条数', () => {
    const rules = Array.from({ length: 12 }, (_, i) => `- Rule number ${i + 1} here`)
    const content = rules.join('\n')

    const issues = maxLength.check(content, 'test.md', 7)

    expect(issues[0].message).toContain('5')
  })

  it('使用默认阈值', () => {
    const issues = maxLength.check('', 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('报告行号指向第一条超限规则', () => {
    const rules = Array.from({ length: 12 }, (_, i) => `- Rule number ${i + 1} here`)
    const content = rules.join('\n')

    const issues = maxLength.check(content, 'test.md', 5)

    // 第 6 条规则的行号
    expect(issues[0].line).toBe(6)
  })
})
