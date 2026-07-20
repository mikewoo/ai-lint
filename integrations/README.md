# AI Lint Integrations

Make ai-lint available inside your AI coding agent — so the agent can check, fix, and monitor its own config files from within a conversation.

## Quick Setup

Choose your tool below. Each integration takes less than a minute.

### Claude Code

Copy the skill file into your project:

```bash
cp integrations/claude-code/SKILL.md .claude/skills/ai-lint/SKILL.md
```

Or let Claude Code create it: "Create a skill that runs npx al to check AI config health after edits."

### Codex CLI

```bash
cp integrations/claude-code/SKILL.md .codex/skills/ai-lint/SKILL.md
```

### OpenCode

```bash
cp integrations/claude-code/SKILL.md .opencode/skills/ai-lint/SKILL.md
```

### Cursor

Add this line to your `.cursorrules`:

```markdown
- After editing any config file (CLAUDE.md, AGENTS.md, .cursorrules), run `npx al .` to check for issues. Run `npx al fix --dry-run` before committing.
```

Or copy the example:

```bash
cat integrations/cursor/.cursorrules >> .cursorrules
```

### Windsurf

```bash
cat integrations/windsurf/.windsurfrules >> .windsurfrules
```

### Gemini CLI

```bash
cat integrations/gemini/GEMINI.md >> GEMINI.md
```

### GitHub Copilot

```bash
cat integrations/copilot/copilot-instructions.md >> copilot-instructions.md
```

### Qoder

Qoder reads AGENTS.md. The `al init agents` template already includes the config quality rule. Ensure your AGENTS.md has:

```markdown
## Config Quality
- After editing any config file, run `npx al .` to check for issues
- Run `npx al fix --dry-run` before committing config changes
```

### All Tools (Universal)

Add to every AI config file (`CLAUDE.md`, `AGENTS.md`, etc.):

```markdown
- After editing any config file, run `npx al .` to check for issues
```

This is the simplest method and works with every tool. The `al init` templates include it by default.

## How It Works

1. AI agent edits a config file (CLAUDE.md, rules, skills)
2. Skill/rule triggers the agent to run `npx al .`
3. Agent sees the health score and issues
4. Agent suggests `npx al fix` or `npx al fix --dry-run`
5. Config stays healthy automatically

## Supported Tools (8)

| Tool | Config File | Skill Support |
|------|------------|:--:|
| Claude Code | CLAUDE.md | ✅ |
| Codex CLI | AGENTS.md | ✅ |
| OpenCode | AGENTS.md / CLAUDE.md | ✅ |
| Qoder | AGENTS.md | — |
| Cursor | .cursorrules | — |
| Windsurf | .windsurfrules | — |
| Gemini CLI | GEMINI.md | — |
| GitHub Copilot | copilot-instructions.md | — |
