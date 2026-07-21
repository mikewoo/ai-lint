import { parseFrontmatter } from '../parser/frontmatter.js'
import type { LintIssue } from '../types.js'

/**
 * Minimal SKILL.md frontmatter template.
 */
function minimalFrontmatter(skillName?: string): string {
  const name = skillName || 'my-skill'
  return [
    '---',
    `name: ${name}`,
    'description: TODO: describe what this skill does',
    '---',
    '',
  ].join('\n')
}

export const noMissingFrontmatter = {
  id: 'no-missing-frontmatter' as const,
  description: 'Detect SKILL.md files missing required YAML frontmatter (name, description)',
  files: ['SKILL.md'],

  check(content: string, filePath: string): LintIssue[] {
    const meta = parseFrontmatter(content)
    const issues: LintIssue[] = []

    if (!meta) {
      // No frontmatter at all
      issues.push({
        ruleId: 'no-missing-frontmatter',
        severity: 'error',
        file: filePath,
        line: 1,
        message: 'SKILL.md is missing YAML frontmatter (requires name + description)',
        fixable: true,
      })
      return issues
    }

    if (!meta.description || meta.description.trim() === '') {
      const lines = content.split('\n')
      let line: number | undefined
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('name:')) line = i + 1
      }

      issues.push({
        ruleId: 'no-missing-frontmatter',
        severity: 'error',
        file: filePath,
        line: line || 2,
        message: 'SKILL.md frontmatter is missing the description field',
        fixable: true,
      })
    }

    return issues
  },

  fix(content: string, issue: LintIssue): string {
    const meta = parseFrontmatter(content)

    if (!meta) {
      // No frontmatter at all — prepend the template
      const dirName = issue.file.split('/').slice(-2, -1)[0] || 'my-skill'
      return minimalFrontmatter(dirName) + content
    }

    if (!meta.description || meta.description.trim() === '') {
      // Missing description — insert after the name line
      const lines = content.split('\n')
      let insertAfter = 1 // Default: after the name line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('name:')) {
          insertAfter = i
          break
        }
      }
      lines.splice(insertAfter + 1, 0, 'description: TODO: describe what this skill does')
      return lines.join('\n')
    }

    return content
  },
}
