/** 一条解析后的规则条目 */
export interface RuleEntry {
  /** 规则文本内容（去除列表标记后的纯文本） */
  text: string
  /** 原始行号（1-based） */
  line: number
  /** 原始行内容（用于 fix 时精确定位） */
  raw: string
}

/** 问题严重级别 */
export type Severity = 'error' | 'warning'

/** 一条检测结果 */
export interface LintIssue {
  ruleId: string
  severity: Severity
  file: string
  line?: number
  column?: number
  message: string
  /** 估算的 Token 浪费量 */
  tokenWaste?: number
  fixable: boolean
}

/** Skill YAML frontmatter 元信息 */
export interface SkillMeta {
  name: string
  description: string
  [key: string]: string
}
