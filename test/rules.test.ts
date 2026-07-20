import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { maxLength } from '../src/rules/max-length.js'
import { noDuplicate } from '../src/rules/no-duplicate.js'
import { noGlobalPathRule } from '../src/rules/no-global-path-rule.js'
import { noMissingFrontmatter } from '../src/rules/no-missing-frontmatter.js'
import { noConflict } from '../src/rules/no-conflict.js'
import { noSemanticDuplicate } from '../src/rules/no-semantic-duplicate.js'
import { noStaleReference } from '../src/rules/no-stale-reference.js'
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

// ============================================================
// no-stale-reference
// ============================================================

describe('no-stale-reference', () => {
  it('检测不存在的文件引用', () => {
    const content = '- Reference to ./nonexistent/file.ts for config\n'
    const issues = noStaleReference.check(content, 'test/CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-stale-reference')
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].fixable).toBe(false)
  })

  it('存在的文件引用不报告', () => {
    const content = '- Reference to ./healthy-claude.md for examples\n'
    const issues = noStaleReference.check(
      content,
      resolve(import.meta.dirname, 'fixtures/CLAUDE.md'),
    )

    for (const issue of issues) {
      expect(issue.message).not.toContain('healthy-claude.md')
    }
  })

  it('不存在的相对路径报告带行号', () => {
    const content = '- Use config from ./missing-config.json\n'
    const issues = noStaleReference.check(content, '/tmp/test.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].line).toBe(1)
  })

  it('跳过版本号（不当作文件路径）', () => {
    const content = '- Use version v1.0.0 for the build\n'
    const issues = noStaleReference.check(content, '/tmp/test.md')

    const pathIssues = issues.filter((i) =>
      i.message.includes('v1.0.0'),
    )
    expect(pathIssues).toHaveLength(0)
  })

  it('普通段落中的路径引用也检测', () => {
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
  it('检测作用于特定目录的全局规则', () => {
    const content = '- 在 src/components 目录中的所有组件必须添加单元测试\n'
    const issues = noGlobalPathRule.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-global-path-rule')
    expect(issues[0].fixable).toBe(false)
  })

  it('检测英文的路径限定规则', () => {
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

  it('检测中文的路径限定表述', () => {
    const cases = [
      '- 针对 utils 目录下的所有文件使用具名导出',
      '- 适用于 components 模块的组件必须包含 PropTypes',
    ]

    for (const c of cases) {
      const issues = noGlobalPathRule.check(c, 'CLAUDE.md')
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('通用规则不报告', () => {
    const content = '- Use TypeScript strict mode\n- Run tests before committing\n'
    const issues = noGlobalPathRule.check(content, 'CLAUDE.md')

    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// no-missing-frontmatter
// ============================================================

describe('no-missing-frontmatter', () => {
  it('检测缺失 frontmatter 的 SKILL.md', () => {
    const content = '# My Skill\n\nSome instructions here.\n'
    const issues = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')

    expect(issues).toHaveLength(1)
    expect(issues[0].ruleId).toBe('no-missing-frontmatter')
    expect(issues[0].severity).toBe('error')
    expect(issues[0].fixable).toBe(true)
  })

  it('检测缺失 description 的 frontmatter', () => {
    const content = '---\nname: my-skill\n---\n# My Skill\n'
    const issues = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].message).toContain('description')
  })

  it('完整 frontmatter 不报告', () => {
    const content = fixture('skills/skill-a/SKILL.md')
    const issues = noMissingFrontmatter.check(content, 'skills/skill-a/SKILL.md')

    expect(issues).toHaveLength(0)
  })

  it('fix 为无 frontmatter 文件添加模板', () => {
    const content = '# My Skill\n\nSome instructions.\n'
    const issue = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')[0]

    const fixed = noMissingFrontmatter.fix(content, issue)

    expect(fixed).toContain('---')
    expect(fixed).toContain('name:')
    expect(fixed).toContain('description:')
    expect(fixed).toContain('# My Skill')

    // 修复后不应再检测到问题
    const recheck = noMissingFrontmatter.check(fixed, 'skills/my-skill/SKILL.md')
    expect(recheck).toHaveLength(0)
  })

  it('fix 为缺失 description 的前补字段', () => {
    const content = '---\nname: my-skill\n---\n# Content\n'
    const issue = noMissingFrontmatter.check(content, 'skills/my-skill/SKILL.md')[0]

    const fixed = noMissingFrontmatter.fix(content, issue)

    expect(fixed).toContain('description:')
    const recheck = noMissingFrontmatter.check(fixed, 'skills/my-skill/SKILL.md')
    expect(recheck).toHaveLength(0)
  })

  it('只对 SKILL.md 生效', () => {
    expect(noMissingFrontmatter.files).toEqual(['SKILL.md'])
  })
})

// ============================================================
// no-semantic-duplicate
// ============================================================

describe('no-semantic-duplicate', () => {
  it('检测语义相似但措辞不同的规则', () => {
    const content = [
      '- Always use TypeScript strict mode for new files',
      '- Use TypeScript strict mode for all new files always',
    ].join('\n')

    const issues = noSemanticDuplicate.check(content, 'CLAUDE.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-semantic-duplicate')
    expect(issues[0].fixable).toBe(false)
  })

  it('完全相同的规则不报告（留给 no-duplicate）', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Use TypeScript strict mode',
    ].join('\n')

    const issues = noSemanticDuplicate.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('语义不相关的规则不报告', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Run tests before committing',
      '- Format with Biome',
    ].join('\n')

    const issues = noSemanticDuplicate.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('单条规则不报错', () => {
    const issues = noSemanticDuplicate.check('- One rule\n', 'test.md')
    expect(issues).toHaveLength(0)
  })
})

// ============================================================
// no-conflict
// ============================================================

describe('no-conflict', () => {
  it('检测缩进方式冲突 (tabs vs spaces)', () => {
    const content = [
      '- Use tabs for indentation',
      '- Use spaces for indentation',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-conflict')
    expect(issues[0].severity).toBe('error')
  })

  it('检测分号使用冲突', () => {
    const content = [
      '- Always use semicolons at end of statements',
      '- Do not use semicolons in your code',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')
    expect(issues.length).toBeGreaterThan(0)
  })

  it('检测引号风格冲突', () => {
    const content = [
      '- Prefer single quotes for strings',
      '- Use double quotes for all strings',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')
    expect(issues.length).toBeGreaterThan(0)
  })

  it('无冲突的规则不报告', () => {
    const content = [
      '- Use TypeScript strict mode',
      '- Run tests before committing',
      '- Format code with Biome',
    ].join('\n')

    const issues = noConflict.check(content, 'test.md')
    expect(issues).toHaveLength(0)
  })

  it('跨文件冲突检测', () => {
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
