/** A parsed rule entry */
export interface RuleEntry {
  /** Rule text content (plain text after removing list markers) */
  text: string
  /** Original line number (1-based) */
  line: number
  /** Original line content (for precise location during fix) */
  raw: string
}

/** Issue severity level */
export type Severity = 'error' | 'warning'

/** A detection result */
export interface LintIssue {
  ruleId: string
  severity: Severity
  file: string
  line?: number
  column?: number
  message: string
  /** Estimated token waste */
  tokenWaste?: number
  fixable: boolean
}

/** Skill YAML frontmatter metadata */
export interface SkillMeta {
  name: string
  description: string
  [key: string]: string
}
