import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseRules } from '../parser/markdown.js'
import type { LintIssue } from '../types.js'

/**
 * Tech stack keywords → corresponding project presence detection files.
 *
 * If a rule mentions a tech stack keyword but the corresponding config file
 * is not found in the project, the rule may be over-constraining
 * (constraining a context where it does not apply).
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
    configFiles: [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yaml',
      'eslint.config.js',
      'eslint.config.mjs',
    ],
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
  description:
    'Detect rules that constrain contexts where they may not apply (tech stack mismatch)',
  files: [
    'CLAUDE.md',
    'AGENTS.md',
    '.cursorrules',
    '.windsurfrules',
    'GEMINI.md',
    'copilot-instructions.md',
  ],

  check(content: string, filePath: string): LintIssue[] {
    const rules = parseRules(content)
    const issues: LintIssue[] = []
    const baseDir = dirname(resolve(filePath))

    for (const rule of rules) {
      for (const { keywords, configFiles, tech } of TECH_INDICATORS) {
        keywords.lastIndex = 0
        if (!keywords.test(rule.text)) continue

        // Check whether evidence of this tech stack exists in the project
        const hasEvidence = configFiles.some((cf) => {
          // For package.json, verify its content contains relevant dependencies
          const fullPath = resolve(baseDir, cf)
          if (!existsSync(fullPath)) return false
          if (cf === 'package.json') {
            try {
              const pkg = JSON.parse(readFileSync(fullPath, 'utf-8'))
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
            message: `Rule mentions "${tech}" but no related config detected in the project — possible over-constraint`,
            fixable: false,
          })
          break // Report each rule only once
        }
      }
    }

    return issues
  },
}
