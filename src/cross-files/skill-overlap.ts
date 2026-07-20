import { textSimilarity } from '../fixer/deduplicate.js'
import { parseRules } from '../parser/markdown.js'
import type { LintIssue, SkillMeta } from '../types.js'

/** 视为高度重叠的相似度阈值 */
const OVERLAP_THRESHOLD = 0.6

export interface SkillInfo {
  name: string
  meta: SkillMeta
  content: string
  path: string
}

/**
 * 检测两个 Skill 的触发域或指令是否高度重叠。
 *
 * 检测逻辑：
 * 1. description 相似度
 * 2. 规则内容相似度（Jaccard on rule text）
 *
 * @returns 重叠度 > 70% 的 Skill 对
 */
export function detectSkillOverlap(skills: SkillInfo[]): LintIssue[] {
  const issues: LintIssue[] = []

  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const a = skills[i]
      const b = skills[j]

      // 1. description 相似度
      const descSim = textSimilarity(
        a.meta.description || '',
        b.meta.description || '',
      )

      // 2. 规则内容相似度
      const rulesA = parseRules(a.content)
      const rulesB = parseRules(b.content)
      const allTextA = rulesA.map((r) => r.text).join(' ')
      const allTextB = rulesB.map((r) => r.text).join(' ')
      const rulesSim = textSimilarity(allTextA, allTextB)

      // 综合得分：description 权重 40%，规则内容权重 60%
      const combinedSim = descSim * 0.4 + rulesSim * 0.6

      if (combinedSim >= OVERLAP_THRESHOLD) {
        issues.push({
          ruleId: 'no-overlap-skills',
          severity: 'warning',
          file: `${a.name} ↔ ${b.name}`,
          message: `Skill 触发域高度重叠 — desc: ${Math.round(descSim * 100)}%, rules: ${Math.round(rulesSim * 100)}%`,
          fixable: false,
        })
      }
    }
  }

  return issues
}
