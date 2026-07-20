import type { SkillMeta } from '../types.js'

/**
 * Extracts YAML frontmatter from a Markdown file.
 *
 * Only processes frontmatter blocks wrapped by `---` at the start of the file.
 * No dependency on third-party YAML parsing libraries — only supports `key: value` format,
 * satisfying SKILL.md's frontmatter requirements.
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
 * @param content - Full content of the Markdown file
 * @returns Parsed metadata, or null if no frontmatter is present
 */
export function parseFrontmatter(content: string): SkillMeta | null {
  const lines = content.split('\n')

  // File must start with ---
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

    // Strip quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    meta[key] = value
  }

  // Must have name, otherwise treated as invalid frontmatter
  if (!meta.name) return null

  return meta
}
