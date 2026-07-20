import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '../src/parser/frontmatter.js'
import { parseRules } from '../src/parser/markdown.js'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8')

describe('parseRules', () => {
  it('从健康配置中提取规则条目', () => {
    const content = fixture('healthy-claude.md')
    const rules = parseRules(content)

    expect(rules.length).toBeGreaterThanOrEqual(5)
    expect(rules[0]).toMatchObject({
      text: expect.stringContaining('TypeScript'),
      line: expect.any(Number),
    })
  })

  it('跳过标题行', () => {
    const content = fixture('healthy-claude.md')
    const rules = parseRules(content)

    const hasHeadings = rules.some((r) =>
      r.text.includes('Project Rules') || r.text.includes('Coding Standards'),
    )
    expect(hasHeadings).toBe(false)
  })

  it('跳过空行', () => {
    const content = '# Title\n\n\n- Rule one\n'
    const rules = parseRules(content)

    expect(rules).toHaveLength(1)
    expect(rules[0].text).toBe('Rule one')
  })

  it('跳过水平分割线', () => {
    const content = '- Rule one\n---\n- Rule two\n'
    const rules = parseRules(content)

    expect(rules).toHaveLength(2)
  })

  it('跳过代码块内容', () => {
    const content = [
      '- Rule outside code block',
      '```',
      '- This should be skipped',
      '- This too',
      '```',
      '- Rule after code block',
    ].join('\n')

    const rules = parseRules(content)

    expect(rules).toHaveLength(2)
    expect(rules[0].text).toBe('Rule outside code block')
    expect(rules[1].text).toBe('Rule after code block')
  })

  it('检测重复行', () => {
    const content = fixture('duplicate-claude.md')
    const rules = parseRules(content)

    const texts = rules.map((r) => r.text.toLowerCase())
    const duplicates = texts.filter(
      (t, i) => texts.indexOf(t) !== i,
    )

    expect(duplicates.length).toBeGreaterThan(0)
    expect(duplicates).toContain('use typescript strict mode')
    expect(duplicates).toContain('run npm test before committing')
  })

  it('过滤过短的条目', () => {
    const content = '- OK rule that is long enough\n- short\n'
    const rules = parseRules(content)

    expect(rules).toHaveLength(1)
    expect(rules[0].text).toBe('OK rule that is long enough')
  })

  it('跳过 frontmatter 内容', () => {
    const content = [
      '---',
      'name: test-skill',
      'description: A test skill',
      '---',
      '# Skill Title',
      '- First rule',
      '- Second rule',
    ].join('\n')

    const rules = parseRules(content)

    // frontmatter 中的内容不应被解析为规则
    const hasFrontmatterContent = rules.some(
      (r) => r.text.includes('test-skill') || r.text.includes('A test skill'),
    )
    expect(hasFrontmatterContent).toBe(false)
    expect(rules.length).toBeGreaterThanOrEqual(2)
  })

  it('保留行号信息', () => {
    const content = fixture('healthy-claude.md')
    const rules = parseRules(content)

    for (const rule of rules) {
      expect(rule.line).toBeGreaterThan(0)
      expect(rule.raw).toBeTruthy()
    }
  })

  it('处理有序列表', () => {
    const content = [
      '# Steps',
      '1. First step in the process',
      '2. Second step in the process',
      '3. Third step in the process',
    ].join('\n')

    const rules = parseRules(content)

    expect(rules).toHaveLength(3)
    expect(rules[0].text).toBe('First step in the process')
    expect(rules[1].text).toBe('Second step in the process')
  })

  it('捕获独立段落中的规则文本', () => {
    const content = [
      'Always use TypeScript for new files.',
      '',
      'Never commit directly to main branch.',
    ].join('\n')

    const rules = parseRules(content)

    expect(rules).toHaveLength(2)
    expect(rules[0].text).toBe('Always use TypeScript for new files.')
    expect(rules[1].text).toBe('Never commit directly to main branch.')
  })
})

describe('parseFrontmatter', () => {
  it('解析有效的 frontmatter', () => {
    const content = fixture('skills/skill-a/SKILL.md')
    const meta = parseFrontmatter(content)

    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('brandkit')
    expect(meta!.description).toContain('Premium brand-kit')
  })

  it('无 frontmatter 时返回 null', () => {
    const content = '# Just a markdown file\n\nSome content here.\n'
    const meta = parseFrontmatter(content)

    expect(meta).toBeNull()
  })

  it('name 缺失时返回 null', () => {
    const content = '---\ndescription: Missing name field\n---\n# Content\n'
    const meta = parseFrontmatter(content)

    expect(meta).toBeNull()
  })

  it('未闭合的 frontmatter 返回 null', () => {
    const content = '---\nname: incomplete\n'
    const meta = parseFrontmatter(content)

    expect(meta).toBeNull()
  })

  it('去除值的引号', () => {
    const content = '---\nname: "quoted-skill"\ndescription: \'A description\'\n---\n# Content\n'
    const meta = parseFrontmatter(content)

    expect(meta!.name).toBe('quoted-skill')
    expect(meta!.description).toBe('A description')
  })

  it('解析 skill-b 的 frontmatter', () => {
    const content = fixture('skills/skill-b/SKILL.md')
    const meta = parseFrontmatter(content)

    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('logo-creator')
    expect(meta!.description).toContain('logo design')
  })

  it('跳过 frontmatter 中的注释行', () => {
    const content = '---\n# This is a comment\nname: my-skill\ndescription: test\n---\n# Content\n'
    const meta = parseFrontmatter(content)

    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('my-skill')
  })
})
