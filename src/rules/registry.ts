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

/** Registered single-file rules */
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
 * Get all rules applicable to a given file type.
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
 * Run all applicable rules against a given file.
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
      // Report rule execution errors without aborting
      console.error(`Rule ${rule.id} failed on ${filePath}:`, err)
    }
  }

  return allIssues
}

/**
 * Get the fix function for a rule.
 */
export function getFixer(ruleId: string) {
  const rule = rules.find((r) => r.id === ruleId)
  return rule && 'fix' in rule ? (rule as unknown as { fix: (content: string, issue: LintIssue) => string }).fix : undefined
}

export { rules }
