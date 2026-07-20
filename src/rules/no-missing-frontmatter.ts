import type { LintIssue } from '../types.js'
import { parseFrontmatter } from '../parser/frontmatter.js'

/**
 * SKILL.md 最小 frontmatter 模板。
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
      // 完全没有 frontmatter
      issues.push({
        ruleId: 'no-missing-frontmatter',
        severity: 'error',
        file: filePath,
        line: 1,
        message: 'SKILL.md 缺少 YAML frontmatter（需要 name + description）',
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
        message: 'SKILL.md 的 frontmatter 缺少 description 字段',
        fixable: true,
      })
    }

    return issues
  },

  fix(content: string, issue: LintIssue): string {
    const meta = parseFrontmatter(content)

    if (!meta) {
      // 完全没有 frontmatter — 在前面添加模板
      const dirName = issue.file.split('/').slice(-2, -1)[0] || 'my-skill'
      return minimalFrontmatter(dirName) + content
    }

    if (!meta.description || meta.description.trim() === '') {
      // 缺少 description — 在 name 行后插入
      const lines = content.split('\n')
      let insertAfter = 1 // 默认在 name 行之后
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
