# Contributing to ai-lint

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/mikewoo/ai-lint.git
cd ai-lint
npm install
npm run build
npm test
```

## Project Structure

```
src/
├── cli.ts              # Commander CLI entry point
├── engine.ts           # Core pipeline (lint, fix, cross-files)
├── types.ts            # Shared TypeScript types
├── utils.ts            # Shared utilities
├── parser/             # Markdown & YAML frontmatter parsing
├── rules/              # 12 detection rules
├── fixer/              # Auto-fix logic (dedup, simplify)
├── cross-files/        # Cross-file detection (conflicts, skill overlap)
├── discovery/          # File system discovery
└── report/             # Terminal & JSON rendering

test/
├── fixtures/           # Test fixture files
├── parser.test.ts
├── rules.test.ts
├── fixer.test.ts
├── cross-files.test.ts
├── integration.test.ts
├── performance.test.ts
└── cli.test.ts
```

## Adding a New Rule

1. Create `src/rules/no-<name>.ts` implementing the `Rule` interface:

```ts
export const myRule = {
  id: 'no-<name>' as const,
  description: 'What this rule detects',
  files: ['CLAUDE.md', 'AGENTS.md', ...],
  check(content: string, filePath: string): LintIssue[] { ... },
  fix?(content: string, issue: LintIssue): string { ... }, // optional
}
```

2. Register it in `src/rules/registry.ts`

3. Add tests in `test/rules.test.ts`

4. Add it to the rules table in `README.md`

## Code Quality

- TypeScript strict mode
- All code and comments in English
- Tests must pass: `npm test`
- Build must succeed: `npm run build`

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `refactor:` code improvement
- `docs:` documentation
- `test:` test changes
- `ci:` CI configuration

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
