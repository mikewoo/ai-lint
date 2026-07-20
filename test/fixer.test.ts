import { describe, expect, it } from 'vitest'
import { deduplicateContent, textSimilarity } from '../src/fixer/deduplicate.js'
import { estimateSavings, simplifyText } from '../src/fixer/simplify.js'
import type { LintIssue } from '../src/types.js'

// ============================================================
// simplifyText
// ============================================================

describe('simplifyText', () => {
  it('简化中文冗余', () => {
    expect(simplifyText('请务必确保一定在提交前运行所有测试'))
      .toBe('请在提交前运行所有测试')
  })

  it('简化英文冗余', () => {
    expect(simplifyText('Please be absolutely sure to always run tests'))
      .toBe('Please always run tests')
  })

  it('去除引导填充词', () => {
    expect(simplifyText('I want you to use TypeScript strict mode'))
      .toBe('Use TypeScript strict mode')
  })

  it('去除记忆提醒词', () => {
    expect(simplifyText('Remember that you should always format before committing'))
      .toBe('You should always format before committing')
  })

  it('替换长短语为短词', () => {
    expect(simplifyText('Due to the fact that it is essential to run tests'))
      .toBe('Because must run tests')
  })

  it('合并多余空格', () => {
    expect(simplifyText('in   order   to   be  able  to  run'))
      .toBe('To run')
  })

  it('简洁文本保持不变', () => {
    const original = 'Use TypeScript strict mode'
    expect(simplifyText(original)).toBe(original)
  })

  it('空字符串不报错', () => {
    expect(simplifyText('')).toBe('')
  })
})

describe('estimateSavings', () => {
  it('估算冗余词的 token 节省量', () => {
    const savings = estimateSavings(
      'Please be absolutely sure to always run tests before committing',
      'Please always run tests before committing',
    )
    expect(savings).toBeGreaterThan(0)
  })

  it('相同文本节省为 0', () => {
    expect(estimateSavings('hello', 'hello')).toBe(0)
  })
})

// ============================================================
// deduplicateContent
// ============================================================

describe('deduplicateContent', () => {
  it('保留更完整的重复项，删除较短的', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Enable source maps',
      '- Use TypeScript strict mode, enable noUncheckedIndexedAccess',
    ].join('\n')

    const issue: LintIssue = {
      ruleId: 'no-duplicate',
      severity: 'error',
      file: 'test.md',
      line: 1,
      message: 'duplicate',
      fixable: true,
    }

    const fixed = deduplicateContent(content, issue)

    // 较短版本应被删除
    expect(fixed).not.toContain('- Use TypeScript strict mode\n- Enable')
    // 较长版本应保留
    expect(fixed).toContain('Use TypeScript strict mode, enable noUncheckedIndexedAccess')
    // 无关行应保留
    expect(fixed).toContain('Enable source maps')
  })

  it('相同长度的重复项：删除后来的', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Use TypeScript strict mode',
      '- Enable source maps',
    ].join('\n')

    const issue: LintIssue = {
      ruleId: 'no-duplicate',
      severity: 'error',
      file: 'test.md',
      line: 2,
      message: 'duplicate',
      fixable: true,
    }

    const fixed = deduplicateContent(content, issue)

    // 应该只剩一行 TypeScript 规则
    const occurrences = (fixed.match(/TypeScript strict mode/g) || []).length
    expect(occurrences).toBe(1)
  })

  it('仅有唯一规则时不修改', () => {
    const content = '- Unique rule that appears only once\n- Another unique rule\n'
    const issue: LintIssue = {
      ruleId: 'no-duplicate',
      severity: 'error',
      file: 'test.md',
      line: 1,
      message: 'test',
      fixable: true,
    }

    // 删目标行（因无真正重复）
    const fixed = deduplicateContent(content, issue)
    expect(fixed).toBe('- Another unique rule\n')
  })
})

// ============================================================
// textSimilarity
// ============================================================

describe('textSimilarity', () => {
  it('完全相同文本 = 100%', () => {
    expect(textSimilarity('use typescript', 'use typescript')).toBe(1)
  })

  it('完全不同文本 ≈ 0%', () => {
    expect(textSimilarity('apple', 'orange')).toBe(0)
  })

  it('部分重叠文本', () => {
    const sim = textSimilarity(
      'use typescript strict mode',
      'use typescript with no unchecked access',
    )
    expect(sim).toBeGreaterThan(0.2)
    expect(sim).toBeLessThan(0.8)
  })

  it('忽略大小写', () => {
    expect(textSimilarity('USE TYPESCRIPT', 'use typescript')).toBe(1)
  })

  it('空文本处理', () => {
    expect(textSimilarity('', '')).toBe(0)
    expect(textSimilarity('hello', '')).toBe(0)
  })
})
