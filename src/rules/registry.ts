import type { LintIssue } from '../types.js'
import { maxLength } from './max-length.js'
import { noConflict } from './no-conflict.js'
import { noDuplicate } from './no-duplicate.js'
import { noGlobalPathRule } from './no-global-path-rule.js'
import { noMissingFrontmatter } from './no-missing-frontmatter.js'
import { noNullEffect } from './no-null-effect.js'
import { noOverconstrain } from './no-overconstrain.js'
import { noSemanticDuplicate } from './no-semantic-duplicate.js'
import { noSkillBloat } from './no-skill-bloat.js'
import { noStaleReference } from './no-stale-reference.js'
import { noVerbose } from './no-verbose.js'

/** 已注册的单文件规则 */
const rules = [
  noDuplicate,
  noSemanticDuplicate,
  noVerbose,
  maxLength,
  noStaleReference,
  noGlobalPathRule,
  noConflict,
  noMissingFrontmatter,
  noOverconstrain,
  noNullEffect,
  noSkillBloat,
] as const

/**
 * 获取适用于指定文件类型的所有规则。
 */
export function getRulesForFile(fileName: string) {
  return rules.filter((r) =>
    r.files.some((f) =>
      f === fileName ||
      fileName.toLowerCase().endsWith(f.toLowerCase()) ||
      f === '*' ||
      (f === 'SKILL.md' && fileName.endsWith('SKILL.md')),
    ),
  )
}

/**
 * 对指定文件运行所有适用的规则。
 */
export function lintFile(
  content: string,
  filePath: string,
  fileName: string,
): LintIssue[] {
  const applicable = getRulesForFile(fileName)
  const allIssues: LintIssue[] = []

  for (const rule of applicable) {
    try {
      const issues = rule.check(content, filePath)
      allIssues.push(...issues)
    } catch (err) {
      // 规则执行出错时报告但不中断
      console.error(`Rule ${rule.id} failed on ${filePath}:`, err)
    }
  }

  return allIssues
}

/**
 * 获取修复函数。
 */
export function getFixer(ruleId: string) {
  const rule = rules.find((r) => r.id === ruleId)
  return rule && 'fix' in rule ? (rule as unknown as { fix: (content: string, issue: LintIssue) => string }).fix : undefined
}

export { rules }
