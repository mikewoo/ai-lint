import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

/** Known AI configuration file names */
const KNOWN_CONFIG_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  '.cursorrules',
  '.windsurfrules',
  'GEMINI.md',
  'copilot-instructions.md',
]

/** Skill definition file name */
const SKILL_FILE = 'SKILL.md'

export interface FoundFile {
  /** Absolute path */
  path: string
  /** File name (used for rule matching) */
  name: string
  /** File type */
  type: 'config' | 'skill'
}

/**
 * Scan a directory to discover all AI configuration files.
 *
 * Detection logic:
 * 1. Known configuration file names in the root directory
 * 2. Files under .claude/ directory
 * 3. SKILL.md under skills/ directory (direct child dirs)
 * 4. SKILL.md under .claude/skills/ directory
 * 5. .mdc files under .cursor/rules/ directory
 *
 * @param rootDir - Root directory to scan
 * @returns List of discovered files
 */
export function findFiles(rootDir: string): FoundFile[] {
  const absRoot = resolve(rootDir)
  const found: FoundFile[] = []

  // 1. Known configs in root directory
  for (const name of KNOWN_CONFIG_FILES) {
    const p = join(absRoot, name)
    if (existsSync(p) && statSync(p).isFile()) {
      found.push({ path: p, name, type: 'config' })
    }
  }

  // 2. Files under .claude directory
  const claudeDir = join(absRoot, '.claude')
  if (existsSync(claudeDir) && statSync(claudeDir).isDirectory()) {
    for (const name of KNOWN_CONFIG_FILES) {
      const p = join(claudeDir, name)
      if (existsSync(p) && statSync(p).isFile()) {
        found.push({ path: p, name, type: 'config' })
      }
    }
  }

  // 3. SKILL.md under skills/ directory
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
      // Directory read error, ignore
    }
  }

  // 4. SKILL.md under .claude/skills/ directory
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

  // 5. .mdc files under .cursor/rules/ directory
  const cursorRulesDir = join(absRoot, '.cursor', 'rules')
  if (existsSync(cursorRulesDir) && statSync(cursorRulesDir).isDirectory()) {
    try {
      const entries = readdirSync(cursorRulesDir)
      for (const entry of entries) {
        if (entry.endsWith('.mdc')) {
          const mdcPath = join(cursorRulesDir, entry)
          if (statSync(mdcPath).isFile()) {
            found.push({ path: mdcPath, name: entry, type: 'config' })
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return found
}

/**
 * Generate a short relative path for report display.
 */
export function shortPath(filePath: string, rootDir: string): string {
  const absRoot = resolve(rootDir)
  if (filePath.startsWith(absRoot)) {
    const rel = filePath.slice(absRoot.length).replace(/^\//, '')
    // Skill files are displayed as skills/<name>/SKILL.md
    return rel || basename(filePath)
  }
  return basename(filePath)
}
