# ai-lint

> AI 编程配置的检查与优化工具。像 ESLint 之于 JavaScript，ai-lint 之于 AI 配置。

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.2-34D058">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-34D058">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-34D058">
</p>

```bash
npx @itdest/ai-lint
```

---

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [集成 — AI 工具](#集成--ai-工具)
- [检测范围](#检测范围)
- [命令参考](#命令参考)
  - [`ai-lint` — 扫描](#ai-lint--扫描)
  - [`ai-lint fix` — 自动修复](#ai-lint-fix--自动修复)
  - [`ai-lint stats` — 健康总览](#ai-lint-stats--健康总览)
  - [`ai-lint init` — 生成模板](#ai-lint-init--生成模板)
  - [`ai-lint explain` — 规则详情](#ai-lint-explain--规则详情)
  - [`ai-lint install` — 工具集成](#ai-lint-install--工具集成)
  - [CI 模式](#ci-模式)
  - [编程调用](#编程调用)
- [检测规则](#检测规则)
- [支持的配置文件](#支持的配置文件)
- [为什么做 ai-lint](#为什么做-ai-lint)
- [路线图](#路线图)
- [设计哲学](#设计哲学)
- [致谢](#致谢)
- [License](#license)

---

## 安装

### 免安装运行（推荐）

```bash
npx @itdest/ai-lint
# 或使用缩写：
npx @itdest/ai-lint
```

### 全局安装

```bash
npm install -g @itdest/ai-lint
# 之后随处可用：
ai-lint
al           # 短别名
```

### 本地安装

```bash
npm install --save-dev @itdest/ai-lint
# 添加到 package.json scripts：
#   "lint:ai": "ai-lint --ci"
```

---

## 快速开始

```bash
# 1. 扫描当前目录
npx @itdest/ai-lint

# 2. 查看 AI 配置有哪些问题
#    （输出显示每个文件的健康分和问题列表）

# 3. 自动修复可修复的问题
npx @itdest/ai-lint fix

# 4. 预览修复效果（不写入磁盘）
npx @itdest/ai-lint fix --dry-run

# 5. 查看整体健康总览
npx @itdest/ai-lint stats
```

### 输出示例

```bash
❯ npx @itdest/ai-lint

  CLAUDE.md  health: 62/100 ⚠️

  ❌ no-duplicate:5  "Use TypeScript strict mode" 出现 2 次 (行 4, 5)
  ❌ no-conflict:11  缩进方式冲突 (tabs vs spaces) — (行 10) vs (行 11)
  ⚠️ no-verbose:6  "please be absolutely sure to" → "please" — 可节省 ~75%

  AGENTS.md  health: 100/100 ✅
    No issues found

  image-gen/SKILL.md  health: 85/100 ⚠️
  ❌ no-missing-frontmatter:1  SKILL.md 缺少 YAML frontmatter

  ■ 3 个文件，3 个错误，1 个警告，4 个可修复

  💡 运行 ai-lint fix 自动修复 4 个问题
```

---

## 集成 — AI 工具

将 ai-lint 安装到 AI 编程工具中，让 AI 在对话中检查自己的配置文件。完整指南：[`integrations/README.md`](integrations/README.md)

**工作原理**：每个集成会添加一个 skill 或 rule 文件，AI 在对话中读取它，从而获得检查配置健康度的能力——可以按需触发（问它"检查我的配置健康度"），也可以在编辑配置文件后自动检查。无需 API key、无网络调用，检查通过本地 ai-lint CLI 完成。

| 工具 | 安装 | 方式 |
|------|------|------|
| **Claude Code** | `al install claude` | 安装 ai-lint skill 到 `.claude/skills/ai-lint/` |
| **Codex CLI** | `al install codex` | 安装 ai-lint skill 到 `.codex/skills/ai-lint/` |
| **OpenCode** | `al install opencode` | 安装 ai-lint skill 到 `.opencode/skills/ai-lint/` |
| **Qoder** | `al install qoder` | 追加配置健康规则到 `AGENTS.md` |
| **Cursor** | `al install cursor` | 追加配置健康规则到 `.cursorrules` |
| **Windsurf** | `al install windsurf` | 追加配置健康规则到 `.windsurfrules` |
| **Gemini CLI** | `al install gemini` | 追加配置健康规则到 `GEMINI.md` |
| **GitHub Copilot** | `al install copilot` | 追加配置健康规则到 `copilot-instructions.md` |

一次安装全部：`al install all`。需要全局安装（`npm i -g @itdest/ai-lint`）。无全局安装的手动安装方式见 [`integrations/README.md`](integrations/README.md)。

---

## 检测范围

| 配置文件 | 检测内容 |
|---------|---------|
| `CLAUDE.md` / `AGENTS.md` | 重复规则、冲突指令、过度约束、冗余措辞、空洞表述、死引用、作用域泄露、Token 膨胀 |
| `SKILL.md` | 缺少 YAML frontmatter、Skill 体积膨胀、跨 Skill 重叠 |
| `.cursorrules` / `.windsurfrules` | 重复、冲突、过度约束、冗余措辞、死引用 |
| `GEMINI.md` / `copilot-instructions.md` | 重复、冲突、过度约束、冗余措辞 |
| `.cursor/rules/*.mdc` | 重复、冲突、过度约束（按目录规则） |

---

## 命令参考

### `ai-lint` — 扫描

扫描 AI 配置文件，查找问题。最常用的命令。

```bash
# 扫描当前目录
ai-lint
al

# 扫描指定目录
ai-lint /path/to/project

# 扫描单个文件
ai-lint ./CLAUDE.md

# JSON 输出（供工具链消费）
ai-lint --json

# 只检查特定规则
ai-lint --rules=no-duplicate,no-verbose

# 跨文件检测（Skill 重叠、跨文件冲突）
ai-lint --cross-files

# 仅输出 Token 预算报告（跳过 lint）
ai-lint --tokens

# CI 模式（发现问题则 exit 1）
ai-lint --ci

# 禁用颜色（CI 日志用）
ai-lint --no-color
```

**使用场景：**
- 提交 AI 配置变更前的日常健康检查
- Pre-commit hook 防止坏配置提交
- CI 流水线质量门禁
- JSON 输出供监控面板消费

当项目存在 ESLint 或 Prettier 配置时，扫描还会报告**工具链覆盖**——你的 AI 配置里那些工具链已经强制执行的规则（比如 ESLint 开了 `no-var`，配置里又写"用 const 不用 var"），可以删掉省 token。只在对应工具配置确实存在时才提示。

### Token 预算

看清 AI 配置的 token 花在哪。每个配置文件被切分成若干类别（规则、触发词表、方法论说明、示例、装饰、元信息）并分别计数。

```bash
# 紧凑的 Token 预算报告
ai-lint --tokens

# 按文件和类别的详细分解
ai-lint stats --tokens

# 机器可读输出
ai-lint --tokens --json
```

输出示例：

```
  Token Budget
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLAUDE.md                          3,200 tokens (34%)
    ├── Rules              1,200 (37%) ████░░░░░░ core
    ├── Trigger table        800 (25%) ███░░░░░░░ keep
    ├── Methodology          700 (22%) ██░░░░░░░░ ⚠️ trimmable
    └── Decoration           300  (9%) █░░░░░░░░░ 💡 removable
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total: 3,200 tokens (1.6% of a 200K context window)
```

> Token 数是基于字符的启发式估算（中日韩字符权重更高），用于相对比较和发现膨胀，不是精确计费。真实 BPE tokenizer 因模型而异。

### `ai-lint fix` — 自动修复

自动修复可修复的检测问题。

```bash
# 修复所有可自动修复的问题
ai-lint fix
al fix

# 预览修复（不写入，可放心运行）
ai-lint fix --dry-run

# 只修复单个文件
ai-lint fix ./CLAUDE.md

# 只修复特定规则类型
ai-lint fix --rules=no-duplicate,no-verbose
```

**可自动修复的问题：**
| 问题 | 修复方式 |
|------|---------|
| 重复规则 | 保留最完整版本，删除较短副本 |
| 冗余措辞 | 替换为简洁等效表述（自然语言的语义等价无法保证，建议检查修改结果） |
| 缺少 YAML frontmatter | 添加最小 `name` + `description` 模板 |
| 语义重复 | 删除后出现的重复条目 |

**不可自动修复（需人工判断）：**
- 冲突指令（tabs vs spaces — 你来决定）
- 过度约束（确认技术栈是否真的使用）
- 空洞表述（用具体指导重写）
- 死引用（更新或删除路径）
- Skill 膨胀 / 规则超限（手动拆分或精简）

> **提示：** 先运行 `ai-lint fix --dry-run` 预览变更，再决定是否实际修复。

### `ai-lint stats` — 健康总览

以表格形式展示所有配置文件的健康分。

```bash
ai-lint stats
al stats
```

```
  Health Score Summary

  ┌──────────────────────────────┬────────┬────────┐
  │ File                         │ Score  │ Status │
  ├──────────────────────────────┼────────┼────────┤
  │ CLAUDE.md                    │ 95/100 │ ✅ OK  │
  │ AGENTS.md                    │ 100/100│ ✅ OK  │
  │ brandkit/SKILL.md            │ 75/100 │ ⚠️ warn│
  └──────────────────────────────┴────────┴────────┘

  3 files  |  Average health: 90/100  |  Overall: healthy
```

**使用场景：**
- 快速了解项目健康快照
- 追踪健康分变化趋势（修改前后对比）
- CI 汇总输出

### `ai-lint init` — 生成模板

为新项目生成健康的 AI 配置模板。

```bash
# 在当前目录生成 CLAUDE.md
ai-lint init
al init claude

# 生成 AGENTS.md
al init agents

# 生成 SKILL.md（在 skill 子目录中）
al init /path/to/skills/my-skill -t skill

# 简写形式（在当前目录创建）
al init skill
al init design

# 在指定目录生成
al init /path/to/project -t agents
```

**可用模板：**
| 类型 | 文件 | 内容 |
|------|------|------|
| `claude`（默认） | `CLAUDE.md` | 语言规范、代码风格、测试、提交、依赖 |
| `agents` | `AGENTS.md` | Agent 行为、输出格式、约束条件 |
| `skill` | `SKILL.md` | YAML frontmatter、指令、约束 |
| `design` | `DESIGN.md` | 颜色、排版、间距、组件 |

**使用场景：**
- 新项目从第一天就有健康的 AI 配置
- 团队成员使用统一模板
- 生成带正确 frontmatter 的 SKILL.md 基线

### `ai-lint explain` — 规则详情

查看特定检测规则的详细信息。

```bash
ai-lint explain no-duplicate
```

```
  no-duplicate
  Detect literal duplicate rules — identical text appearing more than once
  Files: CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, ...
```

**使用场景：**
- 理解为什么某条规则标记了问题
- 了解规则适用哪些文件类型
- 帮助新贡献者了解规则集

### `ai-lint install` — 工具集成

将 ai-lint 安装到 AI 编程工具中，让 AI 在对话中自动检查配置。

```bash
al install claude     # Claude Code（Skill）
al install codex      # Codex CLI（Skill）
al install opencode   # OpenCode（Skill）
al install qoder      # Qoder（写入 AGENTS.md）
al install cursor     # Cursor（写入 .cursorrules）
al install windsurf   # Windsurf（写入 .windsurfrules）
al install gemini     # Gemini CLI（写入 GEMINI.md）
al install copilot    # GitHub Copilot（写入 copilot-instructions.md）
al install all        # 全部 8 个工具
al install codex --global  # 全局安装
```

**验证：** 对 AI 说 "Check my config health" — 它会自动运行 `npx @itdest/ai-lint .`。

完整指南：[`integrations/README.md`](integrations/README.md)

---

### CI 模式

为自动化流水线设计。可与其他参数组合使用。

```bash
# 基础 CI 门禁：有问题即失败
ai-lint --ci

# CI 门禁 + JSON（供日志解析）
ai-lint --ci --json

# CI + 跨文件检测
ai-lint --ci --cross-files

# CI 流水线示例（GitHub Actions）
- run: npx @itdest/ai-lint --ci --no-color
```

**退出码：**
| 码 | 含义 |
|:--:|------|
| 0 | 未发现问题，或未找到 AI 配置文件 |
| 1 | 发现一个或多个问题（错误或警告） |

### 编程调用

```js
import { runLint, runFix, runCrossFiles } from 'ai-lint'

// 扫描目录
const result = runLint({ cwd: '/path/to/project' })
console.log(result.errors, result.warnings)

// 修复目录
const report = runFix({ cwd: '/path/to/project', dryRun: true })
console.log(report.fixed, '个问题已修复')

// 跨文件检测
const cross = runCrossFiles({ cwd: '/path/to/project' })
console.log(cross.files[0].issues)

// 扫描单个文件 + 规则过滤
const single = runLint({
  cwd: '/path/to/project',
  targetFile: 'CLAUDE.md',
  rulesFilter: 'no-duplicate,no-verbose',
})
```

---

## 检测规则

| 规则 | 级别 | 自动修复 | 说明 |
|------|:--:|:--:|------|
| `no-duplicate` | 错误 | ✅ | 完全相同的规则文本出现多次 |
| `no-semantic-duplicate` | 警告 | ✅ | 不同措辞表达相同含义 |
| `no-conflict` | 错误 | — | 矛盾指令（如 tabs vs spaces） |
| `no-overconstrain` | 警告 | — | 约束了项目中不存在的技术栈 |
| `no-verbose` | 警告 | ✅ | 冗余表述浪费 Token |
| `no-global-path-rule` | 警告 | — | 作用于特定路径但写成全局规则 |
| `no-stale-reference` | 警告 | — | 引用了不存在的文件或路径 |
| `no-null-effect` | 警告 | — | 空洞无效的约束（如「写出好代码」） |
| `no-skill-bloat` | 警告 | — | Skill 文件超过合理体积阈值 |
| `max-length` | 警告 | — | 配置文件规则数过多 |
| `no-overlap-skills` | 警告 | — | 两个 Skill 触发域高度重叠 |
| `no-missing-frontmatter` | 错误 | ✅ | SKILL.md 缺少必需的 YAML frontmatter |

---

## 支持的配置文件

| 文件 | 适用工具 | 检测范围 |
|------|---------|---------|
| `CLAUDE.md` | Claude Code | 全部 12 条规则 |
| `AGENTS.md` | Codex / Qoder / Cline | 全部规则 |
| `SKILL.md` | Claude Code / Codex / Cursor | 全部规则 + 跨 Skill |
| `.cursorrules` | Cursor | 重复、冲突、冗余等 |
| `.cursor/rules/*.mdc` | Cursor（按目录） | 重复、冲突、冗余等 |
| `.windsurfrules` | Windsurf | 重复、冲突、冗余等 |
| `GEMINI.md` | Gemini CLI | 重复、冲突、冗余等 |
| `copilot-instructions.md` | Copilot CLI | 重复、冲突、冗余等 |

**发现位置：**
- 根目录
- `.claude/` 目录
- `skills/*/` 目录
- `.claude/skills/*/` 目录
- `.cursor/rules/` 目录（`.mdc` 文件）

---

## 为什么做 ai-lint

AI 配置文件随时间累积问题：重复规则、互相矛盾的指令、浪费 context window 的冗余措辞、指向不存在文件的过时引用。手动检查跟不上配置在多工具、多团队成员间的增长。

2026 年 7 月对 AI 编程生态 57 款工具的调查显示，配置质量检测是一个服务不足的类别。大多数工具聚焦于管理或分享配置，没有一款提供配置文件自身的自动诊断。

| 观察 | 来源 |
|------|------|
| 57 款 AI 编程工具中做配置质量检测的 | 0 款（竞品调研） |
| CLAUDE.md 从 50 行增长到 400 行，AI 指令遵守率下降 | 社区反馈（详见 docs/05-research-report.md） |
| 常见配置问题：重复、冲突、冗长措辞、过时引用 | 用户反馈 + pmAgent 实测 |

ai-lint 扫描你的 AI 配置文件，给出健康评分，并自动修复可修复的问题。

---

## 设计哲学

- **默认只读。** `ai-lint` 只扫描报告；`ai-lint fix` 只改你让它改的。
- **零配置起步。** `npx @itdest/ai-lint` 直接跑，无需任何设置。
- **快。** 约 20 个 AI 配置文件以内的项目亚秒级扫描。
- **零网络。** 100% 本地运行，无遥测，无 API 调用。
- **ESLint 兼容的心智模型。** 如果你用过 ESLint，ai-lint 的规则 ID、严重级别和 auto-fix 机制会很熟悉。

---

## 路线图

**ai-lint 正在从单文件检查工具进化为体系级诊断引擎。** 路线图采用"验证优先"：v0.2 先发一个聚焦的 MVP，之后设验证关卡决定是否继续——功能发一个、验一个，而非一次性全部承诺。

| 版本 | 主题 | 核心功能 |
|------|------|---------|
| **v0.2** | 护城河 MVP | Token 分析引擎、工具链覆盖检测 |
| **🚦 关卡** | 验证 | 观察真实采用数据后再决定是否继续 |
| **v0.3** | 生态集成 | PR diff 机器人、auto-fix pre-commit、`.ai-lintrc.json`、规则冲突/稀释检测 |
| **v0.4** | 深度诊断 | 引用完整性、跨文件漂移、腐化检测、方法论审计 |
| **v1.0** | 正式版 | 架构收敛、国际化、规则市场基础 |

👉 [完整路线图 →](./docs/06-improvement-roadmap.md)

---

## 致谢

本项目灵感来源于社区公开研究和讨论，特别致谢：
- **ccusage** 社区对 Token 透明化的推动
- **ZCF** 社区对配置标准化的探索
- 学术界对「配置气味」量化的研究工作

---

## License

[MIT](LICENSE)

> English docs: [README.md](./README.md)
