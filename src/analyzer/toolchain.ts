import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseRules } from '../parser/markdown.js'
import { estimateTokens } from '../utils.js'

/**
 * A rule already enforced by the project's toolchain that is redundantly
 * restated in an AI config file.
 */
export interface ToolchainRedundancy {
  /** The AI config rule text that is redundant. */
  ruleText: string
  /** 1-based line number in the AI config file. */
  line: number
  /** The tool that already enforces this (e.g. "ESLint", "Prettier"). */
  tool: string
  /** The specific tool setting that covers it (e.g. "no-var", "tabWidth: 2"). */
  setting: string
  /** Estimated tokens saved by removing the redundant rule. */
  tokensSaved: number
}

/**
 * A single enforced setting extracted from a toolchain config, paired with
 * the natural-language patterns that indicate an AI config is restating it.
 */
interface EnforcedSetting {
  tool: string
  setting: string
  /** Lowercased substrings; if any appears in a rule, it's considered covered. */
  patterns: string[]
}

/** Detect enforced settings from an ESLint config object. */
function eslintSettings(config: Record<string, unknown>): EnforcedSetting[] {
  const settings: EnforcedSetting[] = []
  const rules = extractEslintRules(config)

  // Map well-known ESLint rules to the natural-language phrasing they cover.
  const KNOWN: Record<string, string[]> = {
    'no-var': ['use const', 'use let', 'not var', 'avoid var', '不要用 var', '使用 const'],
    eqeqeq: ['=== ', 'strict equal', 'triple equal', '严格相等'],
    'no-console': ['no console', 'console.log', 'remove console', '禁止 console', '移除 console'],
    'no-unused-vars': ['unused variable', 'unused import', '未使用的变量'],
    semi: ['semicolon', 'use semi', '分号'],
    quotes: ['single quote', 'double quote', 'quote style', '引号'],
  }

  for (const [ruleName, enabled] of Object.entries(rules)) {
    if (!isEslintRuleEnabled(enabled)) continue
    const patterns = KNOWN[ruleName]
    if (patterns) settings.push({ tool: 'ESLint', setting: ruleName, patterns })
  }
  return settings
}

/** Extract the flat rules map from either legacy or flat ESLint config. */
function extractEslintRules(config: Record<string, unknown>): Record<string, unknown> {
  // Legacy: { rules: {...} }
  if (config.rules && typeof config.rules === 'object') {
    return config.rules as Record<string, unknown>
  }
  // Flat config exported as an array: [{ rules: {...} }, ...]
  if (Array.isArray(config)) {
    const merged: Record<string, unknown> = {}
    for (const block of config) {
      if (block && typeof block === 'object' && 'rules' in block) {
        Object.assign(merged, (block as { rules: Record<string, unknown> }).rules)
      }
    }
    return merged
  }
  return {}
}

/** ESLint rule is on if it's "error"/"warn"/1/2 or a tuple starting with those. */
function isEslintRuleEnabled(value: unknown): boolean {
  const level = Array.isArray(value) ? value[0] : value
  return level === 'error' || level === 'warn' || level === 1 || level === 2
}

/** Detect enforced settings from a Prettier config object. */
function prettierSettings(config: Record<string, unknown>): EnforcedSetting[] {
  const settings: EnforcedSetting[] = []

  if (typeof config.tabWidth === 'number') {
    settings.push({
      tool: 'Prettier',
      setting: `tabWidth: ${config.tabWidth}`,
      patterns: ['space indent', 'indentation', '空格缩进', '缩进'],
    })
  }
  if (config.semi === true || config.semi === false) {
    settings.push({
      tool: 'Prettier',
      setting: `semi: ${config.semi}`,
      patterns: ['semicolon', 'use semi', '分号'],
    })
  }
  if (config.singleQuote === true) {
    settings.push({
      tool: 'Prettier',
      setting: 'singleQuote: true',
      patterns: ['single quote', 'quote style', '单引号', '引号'],
    })
  }
  return settings
}

/** Safely parse a JSON config file, returning null on any failure. */
function readJsonConfig(path: string): Record<string, unknown> | null {
  try {
    if (!existsSync(path)) return null
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Read Prettier config from a dedicated file or the package.json field. */
function loadPrettierConfig(cwd: string): Record<string, unknown> | null {
  for (const name of ['.prettierrc', '.prettierrc.json']) {
    const cfg = readJsonConfig(join(cwd, name))
    if (cfg) return cfg
  }
  const pkg = readJsonConfig(join(cwd, 'package.json'))
  if (pkg?.prettier && typeof pkg.prettier === 'object') {
    return pkg.prettier as Record<string, unknown>
  }
  return null
}

/** Read ESLint config from a JSON-form config file or package.json field. */
function loadEslintConfig(cwd: string): Record<string, unknown> | null {
  for (const name of ['.eslintrc.json', '.eslintrc']) {
    const cfg = readJsonConfig(join(cwd, name))
    if (cfg) return cfg
  }
  const pkg = readJsonConfig(join(cwd, 'package.json'))
  if (pkg?.eslintConfig && typeof pkg.eslintConfig === 'object') {
    return pkg.eslintConfig as Record<string, unknown>
  }
  return null
}

/**
 * Detect AI config rules that are already enforced by the project's toolchain.
 *
 * Zero-false-positive by design: only triggers when the corresponding tool
 * config actually exists and a rule's text matches a known enforced setting.
 * JS-form ESLint/Prettier configs (`.eslintrc.js`, `eslint.config.js`) are not
 * parsed in v0.2 — only JSON forms and package.json fields.
 *
 * @param cwd - Project root to look for toolchain configs
 * @param aiConfigContent - Raw markdown of the AI config file (e.g. CLAUDE.md)
 * @returns List of redundancies found (empty if no toolchain config present)
 */
export function detectToolchainCoverage(
  cwd: string,
  aiConfigContent: string,
): ToolchainRedundancy[] {
  const enforced: EnforcedSetting[] = []

  const eslint = loadEslintConfig(cwd)
  if (eslint) enforced.push(...eslintSettings(eslint))

  const prettier = loadPrettierConfig(cwd)
  if (prettier) enforced.push(...prettierSettings(prettier))

  if (enforced.length === 0) return []

  const redundancies: ToolchainRedundancy[] = []
  const rules = parseRules(aiConfigContent)

  for (const rule of rules) {
    const lower = rule.text.toLowerCase()
    for (const setting of enforced) {
      if (setting.patterns.some((p) => lower.includes(p.toLowerCase()))) {
        redundancies.push({
          ruleText: rule.text,
          line: rule.line,
          tool: setting.tool,
          setting: setting.setting,
          tokensSaved: estimateTokens(rule.text),
        })
        break // one redundancy per rule is enough
      }
    }
  }

  return redundancies
}
