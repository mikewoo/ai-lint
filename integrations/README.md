# Integrations — Install ai-lint into Your AI Coding Tool

One command per tool. The AI agent will automatically check, fix, and monitor its own config files during conversations.

---

## Quick Install

```bash
npm install -g @itdest/ai-lint
al install all     # install into every supported tool at once
```

Or pick your tool:

```bash
al install claude    # Claude Code
al install codex     # Codex CLI
al install opencode  # OpenCode
al install qoder     # Qoder
al install cursor    # Cursor
al install windsurf  # Windsurf
al install gemini    # Gemini CLI
al install copilot   # GitHub Copilot
al install all       # All of the above
```

For user-wide skill installation (Codex, Claude Code, OpenCode):

```bash
al install codex --global    # installs to ~/.codex/skills/ai-lint/
```

---

## What Gets Installed

| Tool | Type | Location | Content |
|------|------|---------|---------|
| Claude Code | Skill | `.claude/skills/ai-lint/SKILL.md` | Full skill with commands + triggers |
| Codex CLI | Skill | `.codex/skills/ai-lint/SKILL.md` | Full skill with commands + triggers |
| OpenCode | Skill | `.opencode/skills/ai-lint/SKILL.md` | Full skill with commands + triggers |
| Qoder | Rule | Appended to `AGENTS.md` | Config quality rule |
| Cursor | Rule | Appended to `.cursorrules` | Config quality rule |
| Windsurf | Rule | Appended to `.windsurfrules` | Config quality rule |
| Gemini CLI | Rule | Appended to `GEMINI.md` | Config quality rule |
| GitHub Copilot | Rule | Appended to `copilot-instructions.md` | Config quality rule |

---

## How It Works

1. Run `al install <tool>` once per project
2. The AI agent reads the installed skill or rule
3. Agent auto-checks config health after edits
4. Agent suggests fixes when issues are found

**Verify:** Ask your AI agent: "Check my config health"

---

## Skill vs Rule

**Skill** (Claude Code, Codex, OpenCode) — A standalone instruction file the agent loads on demand. Includes full command reference, trigger conditions, and post-run behavior.

**Rule** (Qoder, Cursor, Windsurf, Gemini, Copilot) — A directive appended to the tool's config file. The agent reads it as part of its system prompt and follows it during conversations.

---

## Per-Project vs Global

| Tool | Per-Project | Global |
|------|:--:|:--:|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` via `--global` |
| Codex CLI | `.codex/skills/` | `~/.codex/skills/` via `--global` |
| OpenCode | `.opencode/skills/` | `~/.opencode/skills/` via `--global` |
| All others | Project root only | N/A (config files are per-project) |

---

## Manual Installation

If you prefer manual setup, the raw skill and rule files are at:

```
integrations/
├── claude-code/SKILL.md
├── codex/SKILL.md
├── opencode/SKILL.md
├── cursor/.cursorrules
├── windsurf/.windsurfrules
├── gemini/GEMINI.md
└── copilot/copilot-instructions.md
```

But `al install` does the same thing in one command.
