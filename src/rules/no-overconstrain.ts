import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { LintIssue } from '../types.js'
import { parseRules } from '../parser/markdown.js'

/**
 * 技术关键词 → 对应的项目存在性检测文件
 *
 * 如果规则提到了某个技术栈关键词，但项目中找不到对应的配置文件，
 * 则这条规则可能是过度约束（对不适用场景的约束）。
 */
const TECH_INDICATORS: Array<{
  keywords: RegExp
  configFiles: string[]
  tech: string
}> = [
  {
    keywords: /\b(?:react|jsx|tsx|react\s+component|useState|useEffect)\b/gi,
    configFiles: ['package.json'],
    tech: 'React',
  },
  {
    keywords: /\b(?:vue|\.vue|vue\s+component|vuex|pinia)\b/gi,
    configFiles: ['package.json'],
    tech: 'Vue',
  },
  {
    keywords: /\b(?:angular|ngModule|@Component\b|@Injectable)\b/gi,
    configFiles: ['package.json', 'angular.json'],
    tech: 'Angular',
  },
  {
    keywords: /\b(?:next\.js|nextjs|getServerSideProps|getStaticProps|next\s+config)\b/gi,
    configFiles: ['package.json', 'next.config.js', 'next.config.ts', 'next.config.mjs'],
    tech: 'Next.js',
  },
  {
    keywords: /\b(?:python|\.py\b|pytest|mypy|django|flask)\b/gi,
    configFiles: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    tech: 'Python',
  },
  {
    keywords: /\b(?:css\s+module|\.module\.css|styled-component|tailwind|postcss)\b/gi,
    configFiles: ['package.json', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js'],
    tech: 'CSS-in-JS / Tailwind',
  },
  {
    keywords: /\b(?:graphql|gql\b|apollo|relay)\b/gi,
    configFiles: ['package.json', 'schema.graphql', 'codegen.yml'],
    tech: 'GraphQL',
  },
  {
    keywords: /\b(?:docker|dockerfile|docker-compose|container)\b/gi,
    configFiles: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
    tech: 'Docker',
  },
  {
    keywords: /\b(?:redux|zustand|mobx|recoil)\b/gi,
    configFiles: ['package.json'],
    tech: 'State Management',
  },
  {
    keywords: /\b(?:prisma|typeorm|sequelize|knex|drizzle)\b/gi,
    configFiles: ['package.json', 'prisma/schema.prisma', 'ormconfig.json'],
    tech: 'ORM',
  },
  {
    keywords: /\b(?:eslint|\.eslintrc|eslint\.config)\b/gi,
    configFiles: ['.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yaml', 'eslint.config.js', 'eslint.config.mjs'],
    tech: 'ESLint',
  },
  {
    keywords: /\b(?:prettier|\.prettierrc)\b/gi,
    configFiles: ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'],
    tech: 'Prettier',
  },
]

export const noOverconstrain = {
  id: 'no-overconstrain' as const,
  description: 'Detect rules that constrain contexts where they may not apply (tech stack mismatch)',
  files: ['CLAUDE.md', 'AGENTS.md', 'SKILL.md'],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []
    const baseDir = dirname(resolve(filePath))

    for (const rule of rules) {
      for (const { keywords, configFiles, tech } of TECH_INDICATORS) {
        keywords.lastIndex = 0
        if (!keywords.test(rule.text)) continue

        // 检查项目中是否存在该技术栈的证据
        const hasEvidence = configFiles.some((cf) => {
          // 对于 package.json，需要检查其内容是否包含相关依赖
          const fullPath = resolve(baseDir, cf)
          if (!existsSync(fullPath)) return false
          if (cf === 'package.json') {
            try {
              const pkg = JSON.parse(
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                require('node:fs').readFileSync(fullPath, 'utf-8'),
              )
              const deps = { ...pkg.dependencies, ...pkg.devDependencies }
              const techLower = tech.toLowerCase()
              return Object.keys(deps).some((d) => d.toLowerCase().includes(techLower))
            } catch {
              return false
            }
          }
          return true
        })

        if (!hasEvidence) {
          issues.push({
            ruleId: 'no-overconstrain',
            severity: 'warning',
            file: filePath,
            line: rule.line,
            message: `规则涉及 "${tech}" 但项目中未检测到相关配置 — 可能是过度约束`,
            fixable: false,
          })
          break // 每条规则只报告一次
        }
      }
    }

    return issues
  },
}
