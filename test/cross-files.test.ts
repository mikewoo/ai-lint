import { describe, expect, it } from 'vitest'
import { detectCrossFileConflicts } from '../src/cross-files/conflict.js'
import { detectSkillOverlap, type SkillInfo } from '../src/cross-files/skill-overlap.js'

describe('detectCrossFileConflicts', () => {
  it('detects cross-file indentation conflict', () => {
    const files = [
      {
        path: '/project/CLAUDE.md',
        name: 'CLAUDE.md',
        content: '- Use tabs for indentation\n- Always use semicolons\n',
      },
      {
        path: '/project/AGENTS.md',
        name: 'AGENTS.md',
        content: '- Use spaces for indentation\n- Do not use semicolons\n',
      },
    ]

    const issues = detectCrossFileConflicts(files)

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-conflict')
    expect(issues[0].file).toContain('↔')
  })

  it('non-conflicting file pairs are not reported', () => {
    const files = [
      {
        path: '/project/CLAUDE.md',
        name: 'CLAUDE.md',
        content: '- Use TypeScript\n- Run tests\n',
      },
      {
        path: '/project/AGENTS.md',
        name: 'AGENTS.md',
        content: '- Format with Biome\n- Use camelCase\n',
      },
    ]

    const issues = detectCrossFileConflicts(files)
    expect(issues).toHaveLength(0)
  })

  it('single file is not reported', () => {
    const files = [
      {
        path: '/project/CLAUDE.md',
        name: 'CLAUDE.md',
        content: '- Use tabs\n',
      },
    ]

    const issues = detectCrossFileConflicts(files)
    expect(issues).toHaveLength(0)
  })
})

describe('detectSkillOverlap', () => {
  it('detects highly overlapping skills', () => {
    const skills: SkillInfo[] = [
      {
        name: 'image-generator',
        meta: { name: 'image-generator', description: 'Generate images from text prompts using AI' },
        content: [
          '---',
          'name: image-generator',
          'description: Generate images from text prompts using AI',
          '---',
          '# Image Generator',
          '- Generate images from text descriptions',
          '- Support aspect ratios for image output',
          '- Output images in PNG format',
          '- Use AI to create high quality images',
          '- Format output images for web use',
        ].join('\n'),
        path: '/project/skills/image-gen/SKILL.md',
      },
      {
        name: 'ai-artist',
        meta: { name: 'ai-artist', description: 'Create AI images from text prompts and descriptions' },
        content: [
          '---',
          'name: ai-artist',
          'description: Create AI images from text prompts and descriptions',
          '---',
          '# AI Artist',
          '- Generate images using text prompts',
          '- Support image aspect ratios for output',
          '- Output images using PNG format',
          '- Create high quality images with AI',
          '- Format images for web output use',
        ].join('\n'),
        path: '/project/skills/ai-artist/SKILL.md',
      },
    ]

    const issues = detectSkillOverlap(skills)

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].ruleId).toBe('no-overlap-skills')
    expect(issues[0].severity).toBe('warning')
  })

  it('skills from different domains are not reported as overlapping', () => {
    const skills: SkillInfo[] = [
      {
        name: 'image-gen',
        meta: { name: 'image-gen', description: 'Generate images from text prompts' },
        content: '---\nname: image-gen\ndescription: Generate images\n---\n# Image Gen\n- Create images\n',
        path: '/skills/a/SKILL.md',
      },
      {
        name: 'code-review',
        meta: { name: 'code-review', description: 'Review code for bugs and style issues' },
        content: '---\nname: code-review\ndescription: Review code\n---\n# Code Review\n- Check for bugs\n',
        path: '/skills/b/SKILL.md',
      },
    ]

    const issues = detectSkillOverlap(skills)
    expect(issues).toHaveLength(0)
  })

  it('does not report with 0-1 skills', () => {
    const singleSkill: SkillInfo[] = [
      {
        name: 'only-skill',
        meta: { name: 'only-skill', description: 'A single skill' },
        content: '---\nname: only-skill\n---\n# Skill\n- Do something\n',
        path: '/skills/x/SKILL.md',
      },
    ]

    expect(detectSkillOverlap(singleSkill)).toHaveLength(0)
    expect(detectSkillOverlap([])).toHaveLength(0)
  })
})
