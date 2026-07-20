import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { maxLength } from '../src/rules/max-length.js'
import { noDuplicate } from '../src/rules/no-duplicate.js'
import { noGlobalPathRule } from '../src/rules/no-global-path-rule.js'
import { noMissingFrontmatter } from '../src/rules/no-missing-frontmatter.js'
import { noConflict } from '../src/rules/no-conflict.js'
import { noNullEffect } from '../src/rules/no-null-effect.js'
import { noOverconstrain } from '../src/rules/no-overconstrain.js'
import { noSemanticDuplicate } from '../src/rules/no-semantic-duplicate.js'
import { noSkillBloat } from '../src/rules/no-skill-bloat.js'
import { noStaleReference } from '../src/rules/no-stale-reference.js'
import { noVerbose } from '../src/rules/no-verbose.js'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8')

// ============================================================
// no-duplicate
// ============================================================

describe('no-duplicate', () => {
  it('detects literal duplicate rules', () => {
    const content = fixture('duplicate-claude.md')
    const issues = noDuplicate.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThanOrEqual(2)

    const messages = issues.map((i) => i.message)
    expect(messages.some((m) => m.includes('TypeScript strict mode'))).toBe(true)
    expect(messages.some((m) => m.includes('Run npm test'))).toBe(true)

    // verify severity level
    for (const issue of issues) {
      expect(issue.severity).toBe('error')
      expect(issue.ruleId).toBe('no-duplicate')
      expect(issue.fixable).toBe(true)
    }
  })

  it('healthy config produces no duplicate reports', () => {
    const content = fixture('healthy-claude.md')
    const issues = noDuplicate.check(content, 'CLAUDE.md')

    expect(issues).toHaveLength(0)
  })

  it('estimates token waste', () => {
    const content = fixture('duplicate-claude.md')
    const issues = noDuplicate.check(content, 'CLAUDE.md')

    for (const issue of issues) {
      expect(issue.tokenWaste).toBeDefined()
      expect(issue.tokenWaste!).toBeGreaterThan(0)
    }
  })

  it('fix removes duplicate line (keeps first occurrence)', () => {
    const content = '- Rule one\n- Rule two\n- Rule one\n- Rule three\n'
    const issues = noDuplicate.check(content, 'test.md')
    expect(issues).toHaveLength(1)

    const fixed = noDuplicate.fix(content, issues[0])
    expect(fixed).toBe('- Rule one\n- Rule two\n- Rule three\n')
  })

  it('empty content produces no errors', () => {
    const issues = noDuplicate.check('', 'empty.md')
    expect(issues).toHaveLength(0)
  })

  it('handles case-insensitive duplicates', () => {
    const content = '- USE TYPESCRIPT\n- Use TypeScript\n'
    const issues = noDuplicate.check(content, 'test.md')
    expect(issues.length).toBe(1)
  })
})

// ============================================================
// no-verbose
// ============================================================

describe('no-verbose', () => {
  it('detects Chinese verbose expressions', () => {
    const content = [
      '- 请务必确保一定在提交前运行所有测试',
    ].join('\n')

    const issues = noVerbose.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-verbose')
    expect(issues[0].fixable).toBe(true)
    expect(issues[0].tokenWaste).toBeGreaterThan(0)
  })

  it('detects English verbose expressions', () => {
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

  it('detects filler words', () => {
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

  it('concise rules produce no reports', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Run tests before committing',
      '- Format code with Biome',
    ].join('\n')

    const issues = noVerbose.check(content, 'CLAUDE.md')
    expect(issues).toHaveLength(0)
  })

  it('fix replaces verbose expressions', () => {
    const content = '- Please be absolutely sure to always run tests\n'
    const issues = noVerbose.check(content, 'test.md')
    expect(issues.length).toBeGreaterThan(0)

    const fixed = noVerbose.fix(content, issues[0])
    expect(fixed).not.toBe(content)
    // after fix, should not detect issues again
    const recheck = noVerbose.check(fixed, 'test.md')
    expect(recheck).toHaveLength(0)
  })

  it('filters out trivial optimizations (saves < 3 tokens)', () => {
    // "due to" → too short, should not trigger
    const content = '- due to\n'
    const issues = noVerbose.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// max-length
// ============================================================

describe('max-length', () => {
  it('does not report when rule count is below threshold', () => {
    const content = fixture('healthy-claude.md')
    const issues = maxLength.check(content, 'CLAUDE.md', 20)

    expect(issues).toHaveLength(0)
  })

  it('reports when rule count exceeds threshold', () => {
    // generate content with more than 5 rules (each ≥ 8 chars)
    const rules = Array.from({ length: 8 }, (_, i) => `- Rule number ${i + 1} here`)
    const content = rules.join('\n')

    const issues = maxLength.check(content, 'CLAUDE.md', 5)

    expect(issues).toHaveLength(1)
    expect(issues[0].ruleId).toBe('max-length')
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].tokenWaste).toBeGreaterThan(0)
    expect(issues[0].fixable).toBe(false)
  })

  it('message includes the exceeded count', () => {
    const rules = Array.from({ length: 12 }, (_, i) => `- Rule number ${i + 1} here`)
    const content = rules.join('\n')

    const issues = maxLength.check(content, 'test.md', 7)

    expect(issues[0].message).toContain('5')
  })

  it('uses default threshold', () => {
    const issues = maxLength.check('', 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('reports line number pointing to first exceeding rule', () => {
    const rules = Array.from({ length: 12 }, (_, i) => `- Rule number ${i + 1} here`)
    const content = rules.join('\n')

    const issues = maxLength.check(content, 'test.md', 5)

    // line number of the 6th rule
    expect(issues[0].line).toBe(6)
  })
})

// ============================================================
// no-stale-reference
// ============================================================

describe('no-stale-reference', () => {
  it('detects non-existent file references', () => {
    const content = '- Reference to ./nonexistent/file.ts for config\n'
    const issues = noStaleReference.check(content, 'test/CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-stale-reference')
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].fixable).toBe(false)
  })

  it('existing file references are not reported', () => {
    const content = '- Reference to ./healthy-claude.md for examples\n'
    const issues = noStaleReference.check(
      content,
      resolve(import.meta.dirname, 'fixtures/CLAUDE.md'),
    )

    for (const issue of issues) {
      expect(issue.message).not.toContain('healthy-claude.md')
    }
  })

  it('non-existent relative path reports with line number', () => {
    const content = '- Use config from ./missing-config.json\n'
    const issues = noStaleReference.check(content, '/tmp/test.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].line).toBe(1)
  })

  it('skips version numbers (not treated as file paths)', () => {
    const content = '- Use version v1.0.0 for the build\n'
    const issues = noStaleReference.check(content, '/tmp/test.md')

    const pathIssues = issues.filter((i) =>
      i.message.includes('v1.0.0'),
    )
    expect(pathIssues).toHaveLength(0)
  })

  it('also detects path references in plain paragraphs', () => {
    const content = 'The configuration is stored in ./nowhere-config.json on disk.\n'
    const issues = noStaleReference.check(content, '/tmp/test.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].message).toContain('./nowhere-config.json')
  })
})

// ============================================================
// no-global-path-rule
// ============================================================

describe('no-global-path-rule', () => {
  it('detects global rules scoped to a specific directory', () => {
    const content = '- 在 src/components 目录中的所有组件必须添加单元测试\n'
    const issues = noGlobalPathRule.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-global-path-rule')
    expect(issues[0].fixable).toBe(false)
  })

  it('detects English path-scoped rules', () => {
    const cases = [
      '- For the src/modules directory, all exports must be explicit',
      '- Only in the lib folder should you use dynamic imports',
      '- Specifically in src/routes, use lazy loading',
      '- Applies to the components directory only',
    ]

    for (const c of cases) {
      const issues = noGlobalPathRule.check(c, 'CLAUDE.md')
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('detects Chinese path-scoped expressions', () => {
    const cases = [
      '- 针对 utils 目录下的所有文件使用具名导出',
      '- 适用于 components 模块的组件必须包含 PropTypes',
    ]

    for (const c of cases) {
      const issues = noGlobalPathRule.check(c, 'CLAUDE.md')
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('generic rules are not reported', () => {
    const content = '- Use TypeScript strict mode\n- Run tests before committing\n'
    const issues = noGlobalPathRule.check(content, 'CLAUDE.md')

    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// no-missing-frontmatter
// ============================================================

describe('no-missing-frontmatter', () => {
  it('detects SKILL.md missing frontmatter', () => {
    const content = '# My Skill\n\nSome instructions here.\n'
    const issues = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')

    expect(issues).toHaveLength(1)
    expect(issues[0].ruleId).toBe('no-missing-frontmatter')
    expect(issues[0].severity).toBe('error')
    expect(issues[0].fixable).toBe(true)
  })

  it('detects frontmatter missing description', () => {
    const content = '---\nname: my-skill\n---\n# My Skill\n'
    const issues = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].message).toContain('description')
  })

  it('complete frontmatter is not reported', () => {
    const content = fixture('skills/skill-a/SKILL.md')
    const issues = noMissingFrontmatter.check(content, 'skills/skill-a/SKILL.md')

    expect(issues).toHaveLength(0)
  })

  it('fix adds template for file without frontmatter', () => {
    const content = '# My Skill\n\nSome instructions.\n'
    const issue = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')[0]

    const fixed = noMissingFrontmatter.fix(content, issue)

    expect(fixed).toContain('---')
    expect(fixed).toContain('name:')
    expect(fixed).toContain('description:')
    expect(fixed).toContain('# My Skill')

    // after fix, should not detect issues again
    const recheck = noMissingFrontmatter.check(fixed, 'skills/my-skill/SKILL.md')
    expect(recheck).toHaveLength(0)
  })

  it('fix prepends missing description field', () => {
    const content = '---\nname: my-skill\n---\n# Content\n'
    const issue = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')[0]

    const fixed = noMissingFrontmatter.fix(content, issue)

    expect(fixed).toContain('description:')
    const recheck = noMissingFrontmatter.check(fixed, 'skills/my-skill/SKILL.md')
    expect(recheck).toHaveLength(0)
  })

  it('only applies to SKILL.md', () => {
    expect(noMissingFrontmatter.files).toEqual(['SKILL.md'])
  })
})

// ============================================================
// no-semantic-duplicate
// ============================================================

describe('no-semantic-duplicate', () => {
  it('detects semantically similar but differently worded rules', () => {
    const content = [
      '- Always use TypeScript strict mode for new files',
      '- Use TypeScript strict mode for all new files always',
    ].join('\n')

    const issues = noSemanticDuplicate.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-semantic-duplicate')
    expect(issues[0].fixable).toBe(true)
  })

  it('identical rules are not reported (left to no-duplicate)', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Use TypeScript strict mode',
    ].join('\n')

    const issues = noSemanticDuplicate.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('semantically unrelated rules are not reported', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Run tests before committing',
      '- Format with Biome',
    ].join('\n')

    const issues = noSemanticDuplicate.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('single rule does not error', () => {
    const issues = noSemanticDuplicate.check('- One rule\n', 'test.md')
    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// no-conflict
// ============================================================

describe('no-conflict', () => {
  it('detects indentation conflict (tabs vs spaces)', () => {
    const content = [
      '- Use tabs for indentation',
      '- Use spaces for indentation',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-conflict')
    expect(issues[0].severity).toBe('error')
  })

  it('detects semicolon usage conflict', () => {
    const content = [
      '- Always use semicolons at end of statements',
      '- Do not use semicolons in your code',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')
    expect(issues.length).toBeGreaterThan(0)
  })

  it('detects quote style conflict', () => {
    const content = [
      '- Prefer single quotes for strings',
      '- Use double quotes for all strings',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')
    expect(issues.length).toBeGreaterThan(0)
  })

  it('non-conflicting rules are not reported', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Run tests before committing',
      '- Format code with Biome',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('cross-file conflict detection', () => {
    const fileA = {
      content: '- Use tabs for indentation\n- Always use semicolons\n',
      path: 'project/CLAUDE.md',
    }

    const fileB = {
      content: '- Use spaces for indentation\n- Avoid semicolons\n',
      path: 'project/AGENTS.md',
    }

    const issues = noConflict.checkCross(fileA, fileB)
    expect(issues.length).toBeGreaterThan(0)
  })
})

// ============================================================
// no-overconstrain
// ============================================================

describe('no-overconstrain', () => {
  it('detects tech stack constraints not applicable to current project', () => {
    // references GraphQL but current directory has no package.json/graphql config files
    const content = '- All GraphQL queries must include error handling with Apollo Client\n'
    const issues = noOverconstrain.check(content, '/tmp/nonexistent-dir/CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-overconstrain')
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].fixable).toBe(false)
  })

  it('detects over-constraining for multiple tech stacks', () => {
    const content = [
      '- Use React hooks for all state management',
      '- Configure Docker containers for local development',
    ].join('\n')

    const issues = noOverconstrain.check(content, '/tmp/nonexistent-dir/CLAUDE.md')

    // both tech stacks are not in the directory, should report twice
    expect(issues.length).toBeGreaterThanOrEqual(2)
  })

  it('generic rules are not reported as over-constraining', () => {
    const content = '- Use TypeScript strict mode\n- Format with Biome\n- Run tests regularly\n'
    const issues = noOverconstrain.check(content, '/tmp/test.md')

    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// no-null-effect
// ============================================================

describe('no-null-effect', () => {
  it('detects Chinese vacuous expressions', () => {
    const cases = [
      '- 确保代码质量达到标准',
      '- 写出干净整洁的代码',
      '- 注意安全性和性能',
      '- 遵循最佳实践和良好做法',
      '- 代码要保持一致性和统一风格',
    ]

    for (const c of cases) {
      const issues = noNullEffect.check(c, 'CLAUDE.md')
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('detects English vacuous expressions', () => {
    const cases = [
      '- Make sure the code is high quality',
      '- Write clean and beautiful code',
      '- Code should be elegant and maintainable',
      '- Follow best practices at all times',
      '- Keep it simple and clean',
    ]

    for (const c of cases) {
      const issues = noNullEffect.check(c, 'CLAUDE.md')
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('specific actionable rules are not reported', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Run npm test before committing',
      '- Format code with Biome',
    ].join('\n')

    const issues = noNullEffect.check(content, 'CLAUDE.md')
    expect(issues).toHaveLength(0)
  })

  it('rules containing specific action words are not reported (even with minor vacuity)', () => {
    // "注意检查" starts with "注意" but contains "检查" (specific action)
    const content = '- 注意检查代码格式和类型安全\n'
    const issues = noNullEffect.check(content, 'test.md')

    // 包含 "check" / "检查" → 不算空洞
    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// no-skill-bloat
// ============================================================

describe('no-skill-bloat', () => {
  it('reports when skill rule count exceeds limit', () => {
    const rules = Array.from({ length: 25 }, (_, i) => `- Rule number ${i + 1} for testing\n`)
    const content = ['---', 'name: test', 'description: test', '---', '# Skill', ...rules].join('\n')

    const issues = noSkillBloat.check(content, 'skills/test/SKILL.md', 20)

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-skill-bloat')
    expect(issues[0].message).toContain('25')
  })

  it('reports when skill line count exceeds limit', () => {
    const lines = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`)
    const content = lines.join('\n')

    const issues = noSkillBloat.check(content, 'skills/test/SKILL.md', 100, 150)

    const lineIssues = issues.filter((i) => i.message.includes('lines'))
    expect(lineIssues.length).toBeGreaterThan(0)
  })

  it('normal-sized skill is not reported', () => {
    const content = ['---', 'name: normal', 'description: A normal skill', '---', '# Normal', '- Rule one', '- Rule two'].join('\n')

    const issues = noSkillBloat.check(content, 'skills/normal/SKILL.md')
    expect(issues).toHaveLength(0)
  })

  it('only applies to SKILL.md', () => {
    expect(noSkillBloat.files).toEqual(['SKILL.md'])
  })
})
