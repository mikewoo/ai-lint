import { textSimilarity } from '../fixer/deduplicate.js'
import { parseRules } from '../parser/markdown.js'
import type { LintIssue, SkillMeta } from '../types.js'

/** Similarity threshold considered highly overlapping */
const OVERLAP_THRESHOLD = 0.6

export interface SkillInfo {
  name: string
  meta: SkillMeta
  content: string
  path: string
}

/**
 * Detects whether two Skills' trigger domains or instructions are highly overlapping.
 *
 * Detection logic:
 * 1. Description similarity
 * 2. Rule content similarity (Jaccard on rule text)
 *
 * @returns Skill pairs with > 70% overlap
 */
export function detectSkillOverlap(skills: SkillInfo[]): LintIssue[] {
  const issues: LintIssue[] = []

  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const a = skills[i]
      const b = skills[j]

      // 1. Description similarity
      const descSim = textSimilarity(a.meta.description || '', b.meta.description || '')

      // 2. Rule content similarity
      const rulesA = parseRules(a.content)
      const rulesB = parseRules(b.content)
      const allTextA = rulesA.map((r) => r.text).join(' ')
      const allTextB = rulesB.map((r) => r.text).join(' ')
      const rulesSim = textSimilarity(allTextA, allTextB)

      // Combined score: description weight 40%, rule content weight 60%
      const combinedSim = descSim * 0.4 + rulesSim * 0.6

      if (combinedSim >= OVERLAP_THRESHOLD) {
        issues.push({
          ruleId: 'no-overlap-skills',
          severity: 'warning',
          file: `${a.name} ↔ ${b.name}`,
          message: `Skill trigger domains are highly overlapping — desc: ${Math.round(descSim * 100)}%, rules: ${Math.round(rulesSim * 100)}%`,
          fixable: false,
        })
      }
    }
  }

  return issues
}
