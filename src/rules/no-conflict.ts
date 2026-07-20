import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * 冲突对：关键词 A ↔ 关键词 B，如果同一文件中同时出现，即为冲突。
 */
const CONFLICT_PAIRS: Array<{ a: RegExp; b: RegExp; topic: string }> = [
  {
    a: /(?:use|使用)\s+(?:tabs|tab)\s+(?:for|来)?\s*indent/i,
    b: /(?:use|使用)\s+spaces?\s+(?:for|来)?\s*indent/i,
    topic: '缩进方式 (tabs vs spaces)',
  },
  {
    a: /always\s+use\s+semicolon/i,
    b: /(?:do\s+not\s+use|no|avoid)\s+semicolon/i,
    topic: '分号使用 (use vs avoid)',
  },
  {
    a: /使用分号/,
    b: /(?:不使用|避免使用|禁止使用)分号/,
    topic: '分号使用 (使用 vs 避免)',
  },
  {
    a: /(?:prefer|use)\s+(?:single|')\s*quote/i,
    b: /(?:prefer|use)\s+(?:double|")\s*quote/i,
    topic: '引号风格 (single vs double)',
  },
  {
    a: /使用单引号/,
    b: /使用双引号/,
    topic: '引号风格 (单引号 vs 双引号)',
  },
  {
    a: /(?:max(?:imum)?|最长)\s*(?:line\s*)?(?:length|宽度).*?(?:80|100|120)/i,
    b: /(?:max(?:imum)?|最长)\s*(?:line\s*)?(?:length|宽度).*?(?:80|100|120)/i,
    topic: '行宽限制数值冲突',
  },
  {
    a: /(?:always|必须|务必|一定要?)\s+add\s+(?:type\s+)?annotation/i,
    b: /(?:avoid|skip|不要|避免)\s+(?:type\s+)?annotation/i,
    topic: '类型注解 (添加 vs 避免)',
  },
  {
    a: /使用\s*(?:pnpm|npm|yarn)/,
    b: /使用\s*(?:pnpm|npm|yarn)/,
    topic: '包管理器选择冲突',
  },
]

export const noConflict = {
  id: 'no-conflict' as const,
  description: 'Detect contradictory instructions within or across config files',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md', '.cursorrules', '.windsurfrules', 'GEMINI.md', 'copilot-instructions.md'],

  /**
   * 单文件冲突检测。
   */
  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []

    for (const { a, b, topic } of CONFLICT_PAIRS) {
      // 检查是否存在两两冲突
      const matchA = rules.filter((r) => {
        a.lastIndex = 0
        return a.test(r.text)
      })
      const matchB = rules.filter((r) => {
        b.lastIndex = 0
        return b.test(r.text)
      })

      if (matchA.length > 0 && matchB.length > 0) {
        // 特别处理包管理器：需要是不同的包管理器才算冲突
        if (topic.includes('包管理器')) {
          const pkgsA = extractPackageManager(matchA.map((r) => r.text))
          const pkgsB = extractPackageManager(matchB.map((r) => r.text))
          if (pkgsA.length === 0 || pkgsB.length === 0) continue
          const same = pkgsA.some((p) => pkgsB.includes(p))
          if (same) continue
        }

        // 特别处理行宽：需要数值不同才算冲突
        if (topic.includes('行宽')) {
          const numsA = extractNumbers(matchA.map((r) => r.text))
          const numsB = extractNumbers(matchB.map((r) => r.text))
          if (numsA.length === 0 || numsB.length === 0) continue
          const hasDiff = numsA.some((n) => !numsB.includes(n))
          if (!hasDiff) continue
        }

        issues.push({
          ruleId: 'no-conflict',
          severity: 'error',
          file: filePath,
          line: matchB[0].line,
          message: `${topic} — 冲突: (行 ${matchA[0].line}) 与 (行 ${matchB[0].line})`,
          fixable: false,
        })
      }
    }

    return issues
  },

  /**
   * 跨文件冲突检测：检查两个文件是否有冲突指令。
   */
  checkCross(
    fileA: { content: string; path: string },
    fileB: { content: string; path: string },
  ): LintIssue[] {
    const rulesA = parseRules(fileA.content)
    const rulesB = parseRules(fileB.content)
    const issues: LintIssue[] = []

    for (const { a, b, topic } of CONFLICT_PAIRS) {
      const matchA = rulesA.filter((r) => {
        a.lastIndex = 0
        return a.test(r.text)
      })
      const matchB = rulesB.filter((r) => {
        b.lastIndex = 0
        return b.test(r.text)
      })

      if (matchA.length > 0 && matchB.length > 0) {
        const shortA = fileA.path.split('/').pop() || fileA.path
        const shortB = fileB.path.split('/').pop() || fileB.path

        issues.push({
          ruleId: 'no-conflict',
          severity: 'error',
          file: `${shortA} ↔ ${shortB}`,
          message: `${topic} — "${truncate(matchA[0].text, 30)}" vs "${truncate(matchB[0].text, 30)}"`,
          fixable: false,
        })
      }
    }

    return issues
  },
}

function extractPackageManager(texts: string[]): string[] {
  const pkgs: string[] = []
  for (const t of texts) {
    if (/pnpm/i.test(t)) pkgs.push('pnpm')
    if (/npm/i.test(t)) pkgs.push('npm')
    if (/yarn/i.test(t)) pkgs.push('yarn')
  }
  return [...new Set(pkgs)]
}

function extractNumbers(texts: string[]): number[] {
  const nums: number[] = []
  for (const t of texts) {
    const matches = t.match(/\d{2,3}/g)
    if (matches) nums.push(...matches.map(Number))
  }
  return [...new Set(nums)]
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
