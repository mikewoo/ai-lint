import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

/** 已知的 AI 配置文件名 */
const KNOWN_CONFIG_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  '.cursorrules',
  '.windsurfrules',
  'GEMINI.md',
  'copilot-instructions.md',
]

/** Skill 定义文件名 */
const SKILL_FILE = 'SKILL.md'

export interface FoundFile {
  /** 绝对路径 */
  path: string
  /** 文件名（用于规则匹配） */
  name: string
  /** 文件类型 */
  type: 'config' | 'skill'
}

/**
 * 扫描目录，发现所有 AI 配置文件。
 *
 * 检测逻辑：
 * 1. 根目录下的已知配置文件名
 * 2. 子目录 `skills/* /SKILL.md`（仅一层深度）
 * 3. 递归子目录中的 SKILL.md（最多 3 层）
 *
 * @param rootDir - 扫描根目录
 * @returns 发现的文件列表
 */
export function findFiles(rootDir: string): FoundFile[] {
  const absRoot = resolve(rootDir)
  const found: FoundFile[] = []

  // 1. 根目录已知配置
  for (const name of KNOWN_CONFIG_FILES) {
    const p = join(absRoot, name)
    if (existsSync(p) && statSync(p).isFile()) {
      found.push({ path: p, name, type: 'config' })
    }
  }

  // 2. .claude 目录下的文件
  const claudeDir = join(absRoot, '.claude')
  if (existsSync(claudeDir) && statSync(claudeDir).isDirectory()) {
    for (const name of KNOWN_CONFIG_FILES) {
      const p = join(claudeDir, name)
      if (existsSync(p) && statSync(p).isFile()) {
        found.push({ path: p, name, type: 'config' })
      }
    }
  }

  // 3. skills/ 目录下的 SKILL.md（直接子目录）
  const skillsDir = join(absRoot, 'skills')
  if (existsSync(skillsDir) && statSync(skillsDir).isDirectory()) {
    try {
      const entries = readdirSync(skillsDir)
      for (const entry of entries) {
        const skillPath = join(skillsDir, entry, SKILL_FILE)
        if (existsSync(skillPath) && statSync(skillPath).isFile()) {
          found.push({ path: skillPath, name: SKILL_FILE, type: 'skill' })
        }
      }
    } catch {
      // 目录读取出错，忽略
    }
  }

  // 4. .claude/skills/ 目录下的 SKILL.md
  const claudeSkillsDir = join(absRoot, '.claude', 'skills')
  if (existsSync(claudeSkillsDir) && statSync(claudeSkillsDir).isDirectory()) {
    try {
      const entries = readdirSync(claudeSkillsDir)
      for (const entry of entries) {
        const skillPath = join(claudeSkillsDir, entry, SKILL_FILE)
        if (existsSync(skillPath) && statSync(skillPath).isFile()) {
          found.push({ path: skillPath, name: SKILL_FILE, type: 'skill' })
        }
      }
    } catch {
      // ignore
    }
  }

  return found
}

/**
 * 为报告显示生成简短的相对路径。
 */
export function shortPath(filePath: string, rootDir: string): string {
  const absRoot = resolve(rootDir)
  if (filePath.startsWith(absRoot)) {
    const rel = filePath.slice(absRoot.length).replace(/^\//, '')
    // skill 文件显示为 skills/<name>/SKILL.md
    return rel || basename(filePath)
  }
  return basename(filePath)
}
