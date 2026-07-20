import type { SkillMeta } from '../types.js'

/**
 * 从 Markdown 文件中提取 YAML frontmatter。
 *
 * 只处理文件开头的 `---` 包裹的 frontmatter 块。
 * 不依赖第三方 YAML 解析库 — 仅支持 `key: value` 格式，
 * 符合 SKILL.md 的 frontmatter 需求。
 *
 * @example
 *   ---
 *   name: brandkit
 *   description: Premium brand-kit image generation skill
 *   ---
 *   # BRANDKIT IMAGE GENERATION SKILL
 *
 *   parseFrontmatter(content)
 *   // => { name: "brandkit", description: "Premium brand-kit..." }
 *
 * @param content - Markdown 文件完整内容
 * @returns 解析出的元信息，无 frontmatter 返回 null
 */
export function parseFrontmatter(content: string): SkillMeta | null {
  const lines = content.split('\n')

  // 文件必须以 --- 开头
  if (lines[0]?.trim() !== '---') return null

  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
  if (endIndex === -1) return null

  const meta: SkillMeta = { name: '', description: '' }

  for (let i = 1; i < endIndex; i++) {
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue

    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    // 去除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    meta[key] = value
  }

  // 必须有 name，否则视为无效 frontmatter
  if (!meta.name) return null

  return meta
}
