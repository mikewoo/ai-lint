# ai-lint Research Report Summary

> **Date**: 2026-07-20 | **6 Parallel Research Streams**

---

## Stream A: Competitive Landscape Census

**57 competitors** across 6 segments. **Config quality detection segment: 0 competitors.**

| Segment | Count | Leading Projects | Stars |
|---------|-------|------------------|-------|
| Config Management | 7+ | davila7/claude-code-templates | 28.3K |
| Token Analysis | 13+ | ccusage | 16K |
| Routing / Proxy | 10+ | 1rgs/claude-code-proxy | 3.6K |
| Compression / Optimization | 9 | squeez | 167 |
| Dashboard | 10+ | Agentglass | — |
| IDE Built-in | 7+ | Cursor / Windsurf (closed source) | — |

**Key gap**: No one is doing config quality detection — redundancy, conflicts, token-waste pattern analysis.

---

## Stream B: Real Demand Signals

22 signals identified. Top 5:

| Rank | Pain Point | Intensity |
|:--:|------|:---:|
| 1 | Opaque token consumption — $200 plan drained in 70 minutes | ★★★★★ |
| **2** | **CLAUDE.md bloat — 50→400 lines drops AI compliance from 94% to 71%** | ★★★★★ |
| 3 | Context compression loss | ★★★★★ |
| 4 | Multi-environment profile isolation — 8+ independent community tools emerged | ★★★★★ |
| 5 | Cross-project Skills / MCP reuse | ★★★★★ |

**Key observation**: Across the demand signals analyzed, config semantic health (duplication, conflict, bloat) appeared as a more frequent concern than config format (JSON vs TOML vs YAML).

---

## Stream C: Technical Feasibility

| Tool | Config Format | Local Token Logs | Adapter Value |
|------|---------|:---:|:---:|
| Claude Code | JSON / Markdown | JSONL ✅ | High |
| Codex CLI | TOML / Markdown | JSONL ✅ | High |
| Gemini CLI | JSON / Markdown | JSON ✅ | High |
| Qoder | JSON / Markdown | TBD | ⚠️ Commercial product |
| Cursor | JSON / Markdown | ❌ Cloud-only | Low |
| Windsurf | JSON / Markdown | ❌ Cloud-only | Low |

**Impact on ai-lint**: All target files are Markdown, format is uniform, parsing layer is minimal.

---

## Stream D: Market Sizing

- AI CLI tools TAM: 15–20M users
- CAGR: 26–38%
- ccusage penetration reference: 4% (326K / 8.2M)
- ai-lint conservative estimate: 10K monthly downloads (0.05% penetration)

---

## Stream E: Sustainability Risks

Two most critical risks:

1. **Single-person burnout** (#1 risk)
2. **Frequent config format breaking changes** (6+ per year)

**Impact on ai-lint**:
- Burnout risk reduced (2-week MVP)
- Format change impact reduced (read-only, Markdown format is stable)
- Config management tools (e.g., zach tools) are not a threat — they manage configs, ai-lint diagnoses them

---

## Stream F: Falsification

ai-lint diagnostic tool: **0 out of 7 falsification questions passed** → direction is valid for now.

| Q | Question | Result |
|---|------|-----------|
| Q1 | Is the demand real? | Not falsified (demand is real — Stream B) |
| Q2 | Is the moat thin? | Not falsified (rule knowledge requires accumulated experience) |
| Q3 | Is substitutability high? | Not falsified (0 competitors in this space) |
| Q4 | Are there better alternatives? | Not falsified (no alternatives exist) |
| Q5 | Is it worth doing? | Retained |
| Q6 | Format change risk? | Reduced (read-only Markdown) |
| Q7 | Day 1 competitors? | Not falsified (0 direct competitors) |

---

## Final Conclusion

**The config health detection direction shows initial support** across 6 research streams: demand signals from developer communities, competitive landscape analysis finding no direct competitors (0/57), and user feedback on config quality issues. Caveats: the falsification exercise was conducted internally; an independent review would strengthen confidence. Competitive landscape is a point-in-time snapshot (July 2026) and may shift.
