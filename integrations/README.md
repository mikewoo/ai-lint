# Integrations — Install ai-lint into Your AI Coding Tool

Once ai-lint is [installed](../README.md#installation), pick your tool below and follow the steps. Each integration takes under a minute and enables the AI agent to check, fix, and monitor its own config files during conversations.

---

## Prerequisites

```bash
npm install -g ai-lint   # or: npx ai-lint
```

---

## Claude Code

Claude Code uses **Skills** — a standard way to teach Claude new capabilities.

**Install:**
```bash
# From the ai-lint repo
cp integrations/claude-code/SKILL.md .claude/skills/ai-lint/SKILL.md

# Or create it manually
mkdir -p .claude/skills/ai-lint
```

Then paste the content of [`integrations/claude-code/SKILL.md`](./claude-code/SKILL.md) into `.claude/skills/ai-lint/SKILL.md`.

**Verify:** Ask Claude in a conversation: "Check my config health." Claude will run `npx al .` and report the results.

**When it triggers:**
- After editing CLAUDE.md, AGENTS.md, or any SKILL.md
- When you ask "check my config" or "is my CLAUDE.md healthy"
- Before committing AI config changes

---

## Codex CLI

Codex CLI supports **Agent Skills** via `~/.codex/skills/` (user-wide) or `.codex/skills/` (per-project).

**Install (per-project):**
```bash
mkdir -p .codex/skills/ai-lint
cp integrations/codex/SKILL.md .codex/skills/ai-lint/SKILL.md
```

**Install (user-wide, applies to all projects):**
```bash
mkdir -p ~/.codex/skills/ai-lint
cp integrations/codex/SKILL.md ~/.codex/skills/ai-lint/SKILL.md
```

**Verify:** Ask Codex: "Run ai-lint to check the config health." It will execute `npx al .`.

---

## OpenCode

OpenCode reads skills from `.opencode/skills/`.

**Install:**
```bash
mkdir -p .opencode/skills/ai-lint
cp integrations/opencode/SKILL.md .opencode/skills/ai-lint/SKILL.md
```

**Verify:** Ask OpenCode: "Check my AI config health with ai-lint."

---

## Qoder

Qoder reads `AGENTS.md`. Add the config quality rule directly.

**Install:**
```bash
echo '' >> AGENTS.md
echo '## Config Quality' >> AGENTS.md
echo '- After editing any config file, run `npx al .` to check for issues' >> AGENTS.md
echo '- Run `npx al fix --dry-run` before committing config changes' >> AGENTS.md
```

Or generate a fresh AGENTS.md with the rule already included:
```bash
npx al init agents
```

**Verify:** Ask Qoder to edit AGENTS.md — it will run `npx al .` afterward.

---

## Cursor

Cursor reads `.cursorrules` for project-wide instructions.

**Install:**
```bash
cat integrations/cursor/.cursorrules >> .cursorrules
```

Or manually add these lines to `.cursorrules`:
```markdown
- After editing any config file (CLAUDE.md, AGENTS.md, .cursorrules, SKILL.md),
  run `npx al .` to check for issues
- Run `npx al fix --dry-run` before committing config changes
- Run `npx al --cross-files` if you add or modify skills
```

**Verify:** Ask Cursor to modify `.cursorrules` — it will check with ai-lint after.

---

## Windsurf

Windsurf reads `.windsurfrules`.

**Install:**
```bash
cat integrations/windsurf/.windsurfrules >> .windsurfrules
```

Or manually add:
```markdown
After editing any config file, run `npx al .` to check for issues.
Run `npx al fix --dry-run` before committing config changes.
```

---

## Gemini CLI

**Install:**
```bash
cat integrations/gemini/GEMINI.md >> GEMINI.md
```

---

## GitHub Copilot

**Install:**
```bash
cat integrations/copilot/copilot-instructions.md >> copilot-instructions.md
```

---

## Universal Method (Works With Every Tool)

Add this to **any** AI config file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, etc.):

```markdown
- After editing any config file, run `npx al .` to check for issues
```

The `al init` templates already include this rule by default.
Run `npx al init` to generate a new config file with it.

---

## Tool Coverage Summary

| Tool | Method | File | ai-lint Checks |
|------|--------|------|:--:|
| Claude Code | Skill | `.claude/skills/ai-lint/SKILL.md` | All 12 rules |
| Codex CLI | Skill | `.codex/skills/ai-lint/SKILL.md` | All 12 rules |
| OpenCode | Skill | `.opencode/skills/ai-lint/SKILL.md` | All 12 rules |
| Qoder | AGENTS.md rule | `AGENTS.md` → Config Quality section | All 12 rules |
| Cursor | .cursorrules rule | `.cursorrules` | All 12 rules |
| Windsurf | .windsurfrules rule | `.windsurfrules` | All 12 rules |
| Gemini CLI | GEMINI.md rule | `GEMINI.md` | All 12 rules |
| GitHub Copilot | instructions rule | `copilot-instructions.md` | All 12 rules |
