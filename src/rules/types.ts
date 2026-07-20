import type { LintIssue } from '../types.js'

/** 单文件检测规则接口 */
export interface Rule {
  id: string
  description: string
  /** 适用文件类型（如 'CLAUDE.md', 'SKILL.md'） */
  files: string[]
  /** 检查函数 */
  check(content: string, filePath: string): LintIssue[]
  /** 修复函数（可选） */
  fix?(content: string, issue: LintIssue): string
}

/** 跨文件检测规则接口 */
export interface CrossFileRule {
  id: string
  description: string
  /** 检查函数 — 接收所有文件的元信息映射 */
  check(files: Map<string, { content: string; path: string }>): LintIssue[]
}
