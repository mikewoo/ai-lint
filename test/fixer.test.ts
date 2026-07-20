import { describe, expect, it } from 'vitest'
import { deduplicateContent, textSimilarity } from '../src/fixer/deduplicate.js'
import { estimateSavings, simplifyText } from '../src/fixer/simplify.js'
import type { LintIssue } from '../src/types.js'

// ============================================================
// simplifyText
// ============================================================

describe('simplifyText', () => {
  it('simplifies Chinese verbose text', () => {
    expect(simplifyText('请务必确保一定在提交前运行所有测试'))
      .toBe('请在提交前运行所有测试')
  })

  it('simplifies English verbose text', () => {
    expect(simplifyText('Please be absolutely sure to always run tests'))
      .toBe('Please always run tests')
  })

  it('removes leading filler words', () => {
    expect(simplifyText('I want you to use TypeScript strict mode'))
      .toBe('Use TypeScript strict mode')
  })

  it('removes memory reminder phrases', () => {
    expect(simplifyText('Remember that you should always format before committing'))
      .toBe('You should always format before committing')
  })

  it('replaces long phrases with short words', () => {
    expect(simplifyText('Due to the fact that it is essential to run tests'))
      .toBe('Because must run tests')
  })

  it('collapses extra whitespace', () => {
    expect(simplifyText('in   order   to   be  able  to  run'))
      .toBe('To run')
  })

  it('leaves concise text unchanged', () => {
    const original = 'Use TypeScript strict mode'
    expect(simplifyText(original)).toBe(original)
  })

  it('does not error on empty string', () => {
    expect(simplifyText('')).toBe('')
  })
})

describe('estimateSavings', () => {
  it('estimates token savings from verbose words', () => {
    const savings = estimateSavings(
      'Please be absolutely sure to always run tests before committing',
      'Please always run tests before committing',
    )
    expect(savings).toBeGreaterThan(0)
  })

  it('returns zero savings for identical text', () => {
    expect(estimateSavings('hello', 'hello')).toBe(0)
  })
})

// ============================================================
// deduplicateContent
// ============================================================

describe('deduplicateContent', () => {
  it('keeps the more complete duplicate, removes the shorter one', () => {
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

    // shorter version should be removed
    expect(fixed).not.toContain('- Use TypeScript strict mode\n- Enable')
    // longer version should be retained
    expect(fixed).toContain('Use TypeScript strict mode, enable noUncheckedIndexedAccess')
    // unrelated line should be retained
    expect(fixed).toContain('Enable source maps')
  })

  it('duplicates of equal length: removes the later one', () => {
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

    // should only have one TypeScript rule line
    const occurrences = (fixed.match(/TypeScript strict mode/g) || []).length
    expect(occurrences).toBe(1)
  })

  it('does not modify when there is only a unique rule', () => {
    const content = '- Unique rule that appears only once\n- Another unique rule\n'
    const issue: LintIssue = {
      ruleId: 'no-duplicate',
      severity: 'error',
      file: 'test.md',
      line: 1,
      message: 'test',
      fixable: true,
    }

    // removes target line (since there is no real duplicate)
    const fixed = deduplicateContent(content, issue)
    expect(fixed).toBe('- Another unique rule\n')
  })
})

// ============================================================
// textSimilarity
// ============================================================

describe('textSimilarity', () => {
  it('identical text = 100%', () => {
    expect(textSimilarity('use typescript', 'use typescript')).toBe(1)
  })

  it('completely different text ≈ 0%', () => {
    expect(textSimilarity('apple', 'orange')).toBe(0)
  })

  it('partially overlapping text', () => {
    const sim = textSimilarity(
      'use typescript strict mode',
      'use typescript with no unchecked access',
    )
    expect(sim).toBeGreaterThan(0.2)
    expect(sim).toBeLessThan(0.8)
  })

  it('ignores case', () => {
    expect(textSimilarity('USE TYPESCRIPT', 'use typescript')).toBe(1)
  })

  it('handles empty text', () => {
    expect(textSimilarity('', '')).toBe(0)
    expect(textSimilarity('hello', '')).toBe(0)
  })
})
