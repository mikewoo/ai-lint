import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * Phrase patterns that suggest a rule should be scoped to a specific path.
 * Matches expressions like "for the X directory", "in X files", "针对 X 目录",
 * indicating the rule may only apply to a specific path and should not be global.
 *
 * Each group: prefix match → extract the immediately following path/directory name as the scope target.
 */
const SCOPED_HINTS: { prefix: RegExp; extract: RegExp }[] = [
  // In/for/regarding X directory/module/file/folder (Chinese)
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
  // Applies to X directory
  {
    prefix: /(?:适用于?|applies?\s+to)\s+(?:the\s+)?/gi,
    extract: /`?([\w./-]+)`?\s*(?:目录|文件夹|文件|模块|下|中|里|内|的|component|module|directory|folder|file)/gi,
  },
  // All/everything in X directory/folder/file/module
  {
    prefix: /(?<=[\s,，])/g,
    extract: /`?([\w./-]+(?:目录|文件夹|文件|模块))`?\s*(?:中?的?|下?的?|内?的?)?\s*(?:所有|全部|all|every)/gi,
  },
]

/** File type name → corresponding self-reference flags (to avoid self-reporting) */
const FILE_SCOPE_MAP: Record<string, string[]> = {
  'CLAUDE.md': ['CLAUDE.md', 'claude.md'],
  'AGENTS.md': ['AGENTS.md', 'agents.md'],
  'SKILL.md': ['SKILL.md', 'skill.md'],
}

export const noGlobalPathRule = {
  id: 'no-global-path-rule' as const,
  description: 'Detect path-scoped rules written as global (applied to every directory unnecessarily)',
  files: ['CLAUDE.md', 'AGENTS.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []
    const fileName = filePath.split('/').pop() || filePath

    for (const rule of rules) {
      for (const { prefix, extract } of SCOPED_HINTS) {
        prefix.lastIndex = 0
        const prefixMatch = prefix.exec(rule.text)
        if (!prefixMatch) continue

        // Search for path after the prefix position
        const afterPrefix = prefixMatch.index + prefixMatch[0].length
        const rest = rule.text.slice(afterPrefix)
        extract.lastIndex = 0
        const extractMatch = extract.exec(rest)
        if (!extractMatch) continue

        const scopeTarget = extractMatch[1]

        // If referencing the current file itself, skip reporting
        const selfRefs = FILE_SCOPE_MAP[fileName] || []
        if (selfRefs.some((s) => scopeTarget.toLowerCase().includes(s.toLowerCase()))) {
          continue
        }

        issues.push({
          ruleId: 'no-global-path-rule',
          severity: 'warning',
          file: filePath,
          line: rule.line,
          message: `Rule appears scoped to "${scopeTarget}" but is not using path-scoped syntax — will apply to all directories`,
          fixable: false,
        })
        break
      }
    }

    return issues
  },
}
