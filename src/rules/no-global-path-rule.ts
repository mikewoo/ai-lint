import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * 暗示规则应限定作用域的短语模式。
 * 匹配「针对 X 目录」「在 X 文件中」「For the X directory」等表述，
 * 表示该规则可能只适用于特定路径，不应写成全局规则。
 *
 * 每组：前缀匹配 → 提取其后紧邻的路径/目录名作为作用域目标。
 */
const SCOPED_HINTS: { prefix: RegExp; extract: RegExp }[] = [
  // 在/针对/对于 X 目录/模块/文件/文件夹
  {
    prefix: /(?:在|针对?|对?于)\s+(?:the\s+)?/gi,
    extract: /`?([\w./-]+)`?\s*(?:目录|文件夹|文件|模块|下|中|里|内|的)/gi,
  },
  // For/In/Under the X directory/module/file
  {
    prefix: /(?:for|in|under)\s+(?:the\s+)?/gi,
    extract: /`?([\w./-]+)`?\s*(?:directory|directories|folder|folders|file|files|module|modules|component|components)/gi,
  },
  // Only in/for X
  {
    prefix: /(?:only|仅)\s+(?:in|for|under|在|适用于?)\s+(?:the\s+)?/gi,
    extract: /`?([\w./-]+)`?/gi,
  },
  // Specifically in/for X
  {
    prefix: /specifically\s+(?:in|for)\s+(?:the\s+)?/gi,
    extract: /`?([\w./-]+)`?/gi,
  },
  // 适用于 X 目录
  {
    prefix: /(?:适用于?|applies?\s+to)\s+(?:the\s+)?/gi,
    extract: /`?([\w./-]+)`?\s*(?:目录|文件夹|文件|模块|下|中|里|内|的|component|module|directory|folder|file)/gi,
  },
  // X目录/X文件夹/X文件 中/下/内 的所有/全部
  {
    prefix: /(?<=[\s,，])/g,
    extract: /`?([\w./-]+(?:目录|文件夹|文件|模块))`?\s*(?:中?的?|下?的?|内?的?)?\s*(?:所有|全部|all|every)/gi,
  },
]

/** 当前文件类型的名称→对应的范围文件标志（避免对自己报错） */
const FILE_SCOPE_MAP: Record<string, string[]> = {
  'CLAUDE.md': ['CLAUDE.md', 'claude.md'],
  'AGENTS.md': ['AGENTS.md', 'agents.md'],
  'SKILL.md': ['SKILL.md', 'skill.md'],
}

export const noGlobalPathRule = {
  id: 'no-global-path-rule' as const,
  description: 'Detect path-scoped rules written as global (applied to every directory unnecessarily)',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []
    const fileName = filePath.split('/').pop() || filePath

    for (const rule of rules) {
      for (const { prefix, extract } of SCOPED_HINTS) {
        prefix.lastIndex = 0
        const prefixMatch = prefix.exec(rule.text)
        if (!prefixMatch) continue

        // 在前缀之后的位置搜索路径
        const afterPrefix = prefixMatch.index + prefixMatch[0].length
        const rest = rule.text.slice(afterPrefix)
        extract.lastIndex = 0
        const extractMatch = extract.exec(rest)
        if (!extractMatch) continue

        const scopeTarget = extractMatch[1]

        // 如果引用的是当前文件自身，不报告
        const selfRefs = FILE_SCOPE_MAP[fileName] || []
        if (selfRefs.some((s) => scopeTarget.toLowerCase().includes(s.toLowerCase()))) {
          continue
        }

        issues.push({
          ruleId: 'no-global-path-rule',
          severity: 'warning',
          file: filePath,
          line: rule.line,
          message: `规则似乎限定作用于 "${scopeTarget}"，但未使用 path-scoped 语法 — 会应用到所有目录`,
          fixable: false,
        })
        break
      }
    }

    return issues
  },
}
