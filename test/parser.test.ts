import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '../src/parser/frontmatter.js'
import { parseRules } from '../src/parser/markdown.js'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8')

describe('parseRules', () => {
  it('extracts rule entries from healthy config', () => {
    const content = fixture('healthy-claude.md')
    const rules = parseRules(content)

    expect(rules.length).toBeGreaterThanOrEqual(5)
    expect(rules[0]).toMatchObject({
      text: expect.stringContaining('TypeScript'),
      line: expect.any(Number),
    })
  })

  it('skips heading lines', () => {
    const content = fixture('healthy-claude.md')
    const rules = parseRules(content)

    const hasHeadings = rules.some((r) =>
      r.text.includes('Project Rules') || r.text.includes('Coding Standards'),
    )
    expect(hasHeadings).toBe(false)
  })

  it('skips empty lines', () => {
    const content = '# Title\n\n\n- Rule one\n'
    const rules = parseRules(content)

    expect(rules).toHaveLength(1)
    expect(rules[0].text).toBe('Rule one')
  })

  it('skips horizontal rules', () => {
    const content = '- Rule one\n---\n- Rule two\n'
    const rules = parseRules(content)

    expect(rules).toHaveLength(2)
  })

  it('skips code block content', () => {
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

  it('detects duplicate lines', () => {
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

  it('filters out entries that are too short', () => {
    const content = '- OK rule that is long enough\n- short\n'
    const rules = parseRules(content)

    expect(rules).toHaveLength(1)
    expect(rules[0].text).toBe('OK rule that is long enough')
  })

  it('skips frontmatter content', () => {
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

    // content inside frontmatter should not be parsed as rules
    const hasFrontmatterContent = rules.some(
      (r) => r.text.includes('test-skill') || r.text.includes('A test skill'),
    )
    expect(hasFrontmatterContent).toBe(false)
    expect(rules.length).toBeGreaterThanOrEqual(2)
  })

  it('preserves line number information', () => {
    const content = fixture('healthy-claude.md')
    const rules = parseRules(content)

    for (const rule of rules) {
      expect(rule.line).toBeGreaterThan(0)
      expect(rule.raw).toBeTruthy()
    }
  })

  it('handles ordered lists', () => {
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

  it('captures rule text in standalone paragraphs', () => {
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
  it('parses valid frontmatter', () => {
    const content = fixture('skills/skill-a/SKILL.md')
    const meta = parseFrontmatter(content)

    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('brandkit')
    expect(meta!.description).toContain('Premium brand-kit')
  })

  it('returns null when there is no frontmatter', () => {
    const content = '# Just a markdown file\n\nSome content here.\n'
    const meta = parseFrontmatter(content)

    expect(meta).toBeNull()
  })

  it('returns null when name is missing', () => {
    const content = '---\ndescription: Missing name field\n---\n# Content\n'
    const meta = parseFrontmatter(content)

    expect(meta).toBeNull()
  })

  it('returns null for unclosed frontmatter', () => {
    const content = '---\nname: incomplete\n'
    const meta = parseFrontmatter(content)

    expect(meta).toBeNull()
  })

  it('strips quotes from values', () => {
    const content = '---\nname: "quoted-skill"\ndescription: \'A description\'\n---\n# Content\n'
    const meta = parseFrontmatter(content)

    expect(meta!.name).toBe('quoted-skill')
    expect(meta!.description).toBe('A description')
  })

  it('parses skill-b frontmatter', () => {
    const content = fixture('skills/skill-b/SKILL.md')
    const meta = parseFrontmatter(content)

    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('logo-creator')
    expect(meta!.description).toContain('logo design')
  })

  it('skips comment lines in frontmatter', () => {
    const content = '---\n# This is a comment\nname: my-skill\ndescription: test\n---\n# Content\n'
    const meta = parseFrontmatter(content)

    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('my-skill')
  })
})
