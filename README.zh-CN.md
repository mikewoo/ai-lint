# ai-lint

> 像 ESLint 检查 JavaScript 一样，检查你的 AI 编程配置是否健康。

<p align="center">
  <img alt="npm" src="https://img.shields.io/npm/v/ai-lint?color=34D058&label=npm">
  <img alt="license" src="https://img.shields.io/npm/l/ai-lint?color=34D058">
  <img alt="node" src="https://img.shields.io/node/v/ai-lint?color=34D058">
</p>

```bash
npx ai-lint
```

---

## 检测范围

| 配置文件 | 检测内容 |
|---------|---------|
| `CLAUDE.md` / `AGENTS.md` | 重复规则、冲突指令、过度约束、冗余措辞 |
| `SKILL.md` | Skill 体积膨胀、YAML frontmatter 缺失、跨 Skill 重叠 |
| `.cursorrules` / `.windsurfrules` | 重复、冲突 |
| `GEMINI.md` / `copilot-instructions.md` | 重复、冲突 |

## 效果演示

```bash
❯ npx ai-lint

  CLAUDE.md        健康度: 62/100 ⚠️

  ❌ no-duplicate       "TypeScript 严格模式" 出现 2 次 (行 2, 行 4) — 浪费 ~1,200 tokens/天
  ❌ no-verbose         "请务必确保一定在提交前运行所有测试" (行 14) — 可节省 76%
  ⚠️  max-length         总长度 412 tokens (阈值 300) — AI 遵守率风险

  💡 运行 `ai-lint fix` 自动修复 2 个问题
```

```bash
❯ npx ai-lint fix

  ✅ 合并重复的 "TypeScript 严格模式"
  ✅ 简化冗余措辞: 25 → 6 tokens

  CLAUDE.md 健康度: 94/100 ✅
```

## 命令

```bash
ai-lint                          # 扫描当前目录所有 AI 配置文件
ai-lint fix                      # 自动修复（仅修复可修复项）
ai-lint fix --dry-run            # 预览修复，不写入磁盘
ai-lint --cross-files            # 跨文件检测（Skill 重叠、跨文件冲突）
ai-lint explain <rule-id>        # 查看某条规则的详细说明
ai-lint --ci                     # CI 模式（发现任何问题则 exit 1）
ai-lint --json                   # JSON 格式输出，供工具链消费
```

## 检测规则

| 规则 | 说明 | 自动修复 |
|------|------|:---:|
| `no-duplicate` | 字面重复规则 — 完全相同的文本出现多次 | ✅ |
| `no-semantic-duplicate` | 语义重复规则 — 不同措辞，表达同一含义 | - |
| `no-conflict` | 相互矛盾的指令（文件内或跨文件） | - |
| `no-overconstrain` | 对不适用场景的约束（白白占用上下文） | - |
| `no-verbose` | 冗余表述 — 能用 6 个字说清的事写了 25 个字 | ✅ |
| `no-global-path-rule` | path-scoped 规则误写为全局规则 | - |
| `no-stale-reference` | 引用了不存在的文件或路径 | - |
| `no-null-effect` | 无实际行为效果的约束 | - |
| `no-skill-bloat` | Skill 文件超过合理体积阈值 | - |
| `max-length` | 配置文件总 token 数超限（默认 300） | - |
| `no-overlap-skills` | 两个 Skill 触发域高度重叠 | - |
| `no-missing-frontmatter` | SKILL.md 缺少必需的 YAML frontmatter | ✅ |

## 为什么做 ai-lint

截至 2026 年 7 月，市面上有 **57 个 AI 编程环境工具**，**0 个**在做配置质量检测。

数据说明一切：

| 数据 | 数值 |
|------|------|
| 热门配置含「配置气味」的比例 | **91%** |
| CLAUDE.md 从 50 行膨胀到 400 行，AI 遵守率 | **94% → 71%** |
| 配置质量检测赛道的直接竞品 | **0 / 57** |

所有人都在做配置**管理**，没人在做配置**诊断**——直到现在。

**ai-lint = AI 配置的 ESLint。** 静态分析 → 健康评分 → 一键修复。

## 设计哲学

- **默认只读。** `ai-lint` 只扫描报告；`ai-lint fix` 只改你让它改的。
- **零配置起步。** `npx ai-lint` 直接跑，无需任何设置。
- **快。** 常规项目亚秒级扫描。
- **如果你用过 ESLint，你已经会用 ai-lint。** 心智模型完全一致。

## 相关项目

| 项目 | 定位 | Stars |
|---------|-------|------:|
| [1rgs/claude-code-proxy](https://github.com/1rgs/claude-code-proxy) | API 路由中继 | 3.6K |
| [ccusage](https://github.com/anthropics/ccusage) | Token 用量分析 | 16K |
| [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) | 配置模板 | 28.3K |
| **ai-lint** | **配置健康检测** | ⭐ 你在这里 |

## 致谢

本项目灵感来源于社区公开研究和讨论，特别致谢：
- **ccusage** 社区对 Token 透明化的推动
- **ZCF** 社区对配置标准化的探索
- 学术界对「配置气味」量化的研究工作

---

## License

[MIT](LICENSE)

> English docs: [README.md](./README.md)
