# ai-lint 改进路线图

> **版本**: v1.0 | **日期**: 2026-07-21 | **状态**: 规划中
>
> 基于对 sdad-agentpm (v18.0.0) 初始化项目 pmAgent 的深度分析，以及对 AI 编程配置生态的持续研究。

---

## 0. 决策背景

### 0.1 分析来源

| 来源 | 内容 | 洞察 |
|------|------|------|
| sdad-agentpm 深度调研 | 102 个代理、20 个源文档、25 条声明验证 | npm 包是空壳（7 文件/26.5KB），价值在方法论体系和 Hook 强制执行 |
| pmAgent 项目解剖 | 722 文件、8 层架构逐文件分析 | Hook 质量门禁 + 知识库分层 + Skill 流程定义是核心设计资产 |
| ai-lint 实测 pmAgent | 22 文件扫描，21 errors / 41 warnings | 暴露引用断裂、内容膨胀、跨文件漂移等真实问题 |
| 57 竞品调研 | 6 个赛道全覆盖 | Token 分析 + 配置质量检测是空白市场 |

### 0.2 产品定位演进

```
v0.1.x（当前）：AI 配置文件静态检查工具
v0.2+   （目标）：AI 配置体系的健康诊断 + 优化引擎
```

核心转变：从「检查单个文件写得好不好」升级为「帮助用户用更少的 token 配额让 AI 更准确地理解意图」。

### 0.3 判断框架

每个功能用三个标准判定：

| 标准 | 问题 |
|------|------|
| 普遍性 | 是不是每个 AI 配置用户都会遇到？ |
| 壁垒 | 除了 ai-lint，有没有其他工具能解决？ |
| 可操作性 | 用户看到结果后能不能立刻采取行动？ |

3/3 → P0，2/3 → P1，1/3 → P2，0/3 → 不做。

---

## 1. 版本规划总览

| 版本 | 名称 | 目标 | 预计周期 |
|------|------|------|---------|
| **v0.2** | Token 纪元 | Token 分析引擎 + 规则冲突检测 | 1-2 周 |
| **v0.3** | 生态集成 | PR 可见性 + 规则稀释检测 + auto-fix pre-commit | 1-2 周 |
| **v0.4** | 深度诊断 | 引用完整性 + 跨文件漂移 + 腐化检测 + 方法论覆盖度 | 1-2 周 |
| **v1.0** | 正式版 | 架构收敛、性能优化、文档完善、rule marketplace 基础 | 1 周 |

---

## 2. v0.2 — Token 纪元（P0）

### 2.1 目标

让用户能回答三个问题：
1. 我的 AI 配置消耗了多少 token？
2. 哪些文件/段落是 token 大户？
3. 哪些内容可以精简，具体能省多少？

### 2.2 Token 分析引擎

#### 2.2.1 架构设计

```
输入文件
  │
  ├── parseMarkdown() → 语义分段
  │     ├── 元信息（frontmatter、标题、版本号）
  │     ├── 方法论/原理说明
  │     ├── 触发词表/查表
  │     ├── 执行规则
  │     ├── 示例代码
  │     └── 装饰性内容（分隔线、emoji、ASCII art）
  │
  ├── 分类标注 → TokenEstimator
  │     └── 按分类汇总 token 消耗
  │
  └── 报告生成
        ├── TokenBudgetReport（整体）
        ├── TokenPerFile（文件级）
        └── OptimizationSuggestion（优化建议）
```

#### 2.2.2 实现要点

**Token 估算**：使用已有的 token 估计算法（CJK 0.67× 系数），扩充为分类估算。

**分段策略**：
- 识别 `##` 标题边界 → 大段
- 识别列表块、代码块、引用块 → 子段
- 识别装饰性内容（分隔线 `---` / `━━━`、emoji）→ 标记为非必要

**分类规则**（最初版，后续可扩展）：

| 分类 | 识别特征 | 操作建议 |
|------|---------|---------|
| `meta` | frontmatter、版本号行 | 保留 |
| `methodology` | 包含「支柱」「方法论」「理念」「哲学」等关键词的段落 | 可精简 |
| `trigger-table` | 表格 + 包含「触发」「关键词」等列头 | 保留但建议压缩 |
| `rule` | 编号列表项 + 动词开头 | 核心，保留 |
| `example` | 代码块 | 保留适量 |
| `decoration` | 分隔线、emoji、ASCII art | 建议移除 |
| `redundant` | 已被 `no-duplicate` / `no-semantic-duplicate` 标记的内容 | 建议合并 |

**冗余度分析**（Token 分析引擎的子能力）：

引擎识别「消耗 token 但不增加信息量」的内容。采用两个互补的检测维度：

**维度一：工具链覆盖检测（🟢 高可靠）**

不猜测「AI 知道什么」，而是检测「项目的工具链已经强制了什么」。工具链已经拦截的规则，在 AI 配置中重复声明是浪费 token——AI 写出的违规代码会在 pre-commit/CI 中被自动纠正。

| 工具链 | 检测方式 | 示例 | 版本 |
|--------|---------|------|:--:|
| ESLint | 解析 `.eslintrc.*`（含 flat config `eslint.config.js`）→ 提取规则 → 对比 CLAUDE.md 规则 | ESLint 有 `no-var`，CLAUDE.md 写「使用 const 而非 var」→ 冗余 | v0.2 |
| Prettier | 解析 `.prettierrc.*` → 对比格式化规则 | Prettier 有 `tabWidth: 2`，CLAUDE.md 写「使用 2 空格缩进」→ 冗余 | v0.2 |
| TypeScript | 解析 `tsconfig.json`（含 extends 链）→ 对比类型规则 | `strict: true`，CLAUDE.md 写「避免隐式 any」→ 冗余 | v0.3 |
| Biome | 解析 `biome.json` → 提取规则 → 对比 | Biome 有 `noConsoleLog`，CLAUDE.md 写「禁止 console.log」→ 冗余 | v0.3 |
| ai-lint 自身 | 解析 `.ai-lintrc.json` → 对比重复豁免 | ignore 了某路径，hook 文件也豁免了同一路径 → 双重豁免 | v0.3 |

> **分版本原因**：ESLint 和 Prettier 合计覆盖了大多数前端项目的 lint/format 需求，且两者都有成熟的配置解析库。TypeScript 的 extends 链解析和 Biome 的配置格式相对复杂，且受益面较窄，放到 v0.3。

```
💡 工具链覆盖检测:
ESLint (no-var) 已强制「使用 const 而非 var」
  → CLAUDE.md 第 67 行的「使用 const 而非 var」可安全删除
  → 节省 ~15 tokens，ESLint 会在 pre-commit 拦截 var 声明

Prettier (tabWidth: 2) 已强制缩进风格
  → CLAUDE.md 第 82 行的「使用 2 空格缩进」可安全删除
  → 节省 ~12 tokens

共发现 5 处工具链已覆盖的规则，可节省 ~120 tokens
```

> 注意：工具链覆盖检测**仅当对应工具配置确实存在时才触发**。如果项目没有 ESLint，则不检查 ESLint 覆盖。这是一个零误报的设计——它只报告「工具链已确定强制」的冗余，不做推测。

**维度二：被覆盖的泛规则（🟡 建议性）**

| 冗余类型 | 识别特征 | 示例 | 检测方式 |
|---------|---------|------|---------|
| 被覆盖的泛规则 | 已被更具体规则覆盖的笼统表述 | 「确保代码质量」（被具体 lint 规则覆盖）、「遵循最佳实践」（无具体指向） | 泛规则模式匹配 + `no-null-effect` 联动 |

检测逻辑：存在无具体指向的泛规则（如「确保代码质量」「遵循最佳实践」），**且**存在覆盖同一领域的 3 条以上具体规则 → 泛规则是冗余的。

> **已明确排除**：「通用编程常识」（如「使用 const 而非 var」）和「框架基础用法」（如「使用 Vue 3 Composition API」）不通过猜测 AI 知识边界来检测——因为不同模型知识水平差异巨大，且这些规则的目的往往不是教 AI 基础语法，而是建立项目基线。取而代之的是**工具链覆盖检测**——它回答了同一个问题（「这条规则是否必要」），但基于可验证的事实而非推测。

**压缩建议引擎**：

基于分类和冗余分析，自动生成优化建议。**压缩策略按安全等级分为两类**：

```
🟢 安全 auto-fix（ai-lint fix 自动处理）:
├── 去装饰化: 移除不影响 AI 理解的视觉元素
│   例: "━━━━━━━━━━" → 空行（节省 ~12 tokens/条）
│   保证: 纯视觉元素，不影响语义
│
└── 示例精简: 保留 1 个代表性示例，删除冗余示例
    例: 3 个相同模式的代码示例 → 保留 1 个 + 注释说明
    保证: 保留的示例与删除的示例逻辑等价

🟡 仅建议（ai-lint fix 不自动处理，需用户手动决定）:
├── 合并同类项: 多条语义相似的规则 → 合并为一条精炼规则
│   例: "禁止 console.log" + "调试日志必须在提交前清除" + "不留 TODO"
│        → "提交前清除所有调试输出（console.log, TODO）"
│   风险: 合并可能改变强调程度，原有多条重复在 AI 看来可能是强化信号
│
├── 措辞简化: 冗长表述 → 精炼表述
│   例: "在任何情况下，都不应该直接修改配置文件来消除代码报错"
│        → "禁止修改配置来消除报错"
│   风险: 自然语言没有 AST 等价性保证，简化可能丢失微妙语义（「在任何情况下」「直接」）
│
└── 方法论压缩: 长段落说明 → 单句引用
    例: 200 字的方法论说明段 → "遵循 SDAD 七支柱方法论（详见 docs/sdad.md）"
    风险: 需要用户确认替代文本是否准确表达了原意
```

> **设计原则**：代码 auto-fix 的等价性由 AST 保证；自然语言没有这个保证。因此 auto-fix 只处理**确定性安全**的变更（去装饰、删冗余示例），涉及语义变更的操作仅作为信息性建议展示，由用户手动执行。

**触发词表优化**（安全 auto-fix，特殊场景）：

触发词表的措辞可以安全地 auto-fix，因为触发词匹配是关键词匹配而非语义理解：

```
🟢 触发词表去冗余:
   "创建页面、生成页面、实现功能、开发功能、做功能"
   → "创建|生成|实现|开发|做功能"（合并共享后缀）
   节省 ~15 tokens，不影响匹配
```

#### 2.2.3 输出格式

**默认输出（ai-lint 末尾追加）**：

```
Token Budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE.md                            3,200 tokens (34%)
  ├── 执行规则       1,200 (37%) ████████░░ 核心
  ├── 触发词表         800 (25%) █████░░░░░ 必要
  ├── 方法论说明       700 (22%) █████░░░░░ ⚠️ 可精简
  ├── 装饰/分隔        300 (9%)  ██░░░░░░░░ 💡 可节省 ~250
  └── 示例代码         200 (6%)  █░░░░░░░░░ 合理

page-generator/SKILL.md              2,800 tokens (29%)
req-doc/SKILL.md                     2,100 tokens (22%)
rules/ (5 files)                     1,400 tokens (15%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 9,500 tokens (context window 的 4.8%)

💡 优化建议:
  1. CLAUDE.md 分隔线/emoji 装饰 → 节省 ~250 tokens
  2. 方法论段落可压缩为单句引用 → 节省 ~400 tokens
  3. 优化后预估: 8,850 tokens (节省 7%)
```

**详细模式（`ai-lint stats --tokens`）**：显示完整分类明细。

#### 2.2.4 命令行接口

```
ai-lint                      # 默认扫描，末尾追加 token 摘要（总览）
ai-lint --tokens             # 仅输出 token 分析报告（跳过 lint）
ai-lint stats --tokens       # 详细 token 报告，按文件/分类展开，含优化建议
```

**`--tokens` 与 `stats --tokens` 的区别**：

| 命令 | 输出粒度 | 包含 lint | 适用场景 |
|------|---------|:--:|------|
| `ai-lint`（默认） | 聚合摘要（3-5 行） | ✅ | 日常使用，快速了解整体 |
| `ai-lint --tokens` | 文件级报告 | ❌ | 只想看 token 分布，不关心 lint |
| `ai-lint stats --tokens` | 文件 + 段落 + 分类三级明细 | ❌ | 深度优化：哪段、哪类消耗最多 |

#### 2.2.5 新增源文件

```
src/
├── analyzer/
│   ├── token.ts            # TokenEstimator 核心算法
│   ├── segment.ts          # 语义分段器
│   └── classify.ts         # 内容分类器
└── report/
    └── token-budget.ts     # Token 报告渲染
```

#### 2.2.6 测试

```
test/
└── token.test.ts           # 覆盖：
                            #   - 单文件 token 估算准确性
                            #   - 分段分类正确性
                            #   - 多文件汇总
                            #   - 边界情况：空文件、纯 frontmatter、纯代码块
```

### 2.3 规则冲突检测

#### 2.3.1 设计原则

只做**可确定性检测**的冲突类型：

| 类型 | 定义 | 置信度 |
|------|------|:------:|
| 硬冲突 | 两条规则直接矛盾 | 100% |
| 软冲突 | 一条规则使另一条无效 | 90%+ |
| 触发词冲突 | 两个 skill 抢同一个触发词 | 100% |

**不做**模糊的「这条规则可能降低 AI 遵守率」——没有实验数据。

#### 2.3.2 硬冲突检测

跨文件扫描，基于关键词对匹配：

```
检测模式:
├── "使用中文" ↔ "Use English"           → 语言方向冲突
├── "禁止修改 X 配置" ↔ "修改 X 配置"     → 操作冲突
├── "严格遵守 A" ↔ "遵循 B 即可"          → 优先级冲突（新规则需精确匹配）
└── "始终使用 X" ↔ "避免使用 X"           → 选择冲突
```

实现方式：扩展 `no-conflict` 的 `CONFLICT_PAIRS` 字典，增加跨文件扫描能力。

#### 2.3.3 软冲突检测

一条规则在逻辑上使另一条无效：

```
场景:
├── CLAUDE.md: "所有修改必须经过 code-reviewer"
│   config.json: codeReview.mode = "off"
│   → 审查门禁已关闭，以上规则无效
│
├── CLAUDE.md: "所有面向用户的输出使用中文"
│   .windsurfrules: 未包含此规则
│   → 使用 Windsurf 时此规则不生效
│
└── design-advisor.md: "必须先读 knowledge/conventions/coding.md"
    .claude/agentpm-knowledge/conventions/coding.md: 文件不存在
    → 强制前置步骤无法执行
```

#### 2.3.4 触发词冲突检测

扫描 CLAUDE.md 触发词表，检测跨 skill 的触发词重叠：

```
⚠️ 触发词冲突:
"创建页面" → page-generator 和 brainstorming 都匹配
"添加功能" → brainstorming 和 page-generator 都匹配
"生成页面" → page-generator 和 annotation 都匹配

→ AI 可能在 skill 之间选择错误，导致非预期行为
```

实现方式：对 CLAUDE.md 技能触发词表做倒排索引，检测每个触发词被几个 skill 引用。

#### 2.3.5 新增/修改源文件

```
src/
├── rules/
│   ├── no-conflict.ts       # 扩展：跨文件冲突检测 + 软冲突
│   └── no-trigger-conflict.ts  # 新增：触发词冲突检测
└── cross-files/
    └── conflict.ts          # 扩展：跨文件硬/软冲突
```

### 2.4 v0.2 里程碑

| 项目 | 交付物 | 验收标准 |
|------|--------|---------|
| Token 分析引擎 | `src/analyzer/token.ts` + 报告渲染 | 对 pmAgent 项目给出分类报告，Token 估算误差 <10%，语义分段 macro-F1 ≥ 0.85 |
| 硬冲突检测 | 跨文件冲突扫描 | 检测出 pmAgent 中至少 1 个真实冲突 |
| 触发词冲突检测 | `no-trigger-conflict` 规则 | 检测出 pmAgent 中触发词重叠 |
| 测试 | 新增 ~20 个测试 | 全部通过，覆盖 Token + 冲突检查 |
| 文档 | README 更新 + 新 CLI flag 文档 | npx ai-lint --help 可看到新选项 |

---

## 3. v0.3 — 生态集成（P1）

### 3.1 目标

1. 让 ai-lint 融入开发工作流（不打扰用户）
2. 帮助用户识别规则稀释问题

### 3.2 PR 可见性集成

#### 3.2.1 设计理念

不做 pre-commit 强阻断（建议性规则不适合强行打断提交），做 **PR diff 报告**：

- 不阻断 = 不给开发者添麻烦
- 提供可见性 = 给 reviewer 提供信息
- 对标 bundle-size bot 模式，成熟且可接受

#### 3.2.2 功能规格

**`ai-lint --diff`**：只报告本次变更引入的新问题。

```
工作流:
git diff --name-only origin/main...HEAD   → 取变更文件列表
  ├── 只包含 AI 配置文件
  └── ai-lint 逐个扫描
       ├── 与当前已提交版本对比（git show HEAD:path）
       └── 只报告新增的问题

输出:
📊 AI Config Diff (3 files changed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE.md: +400 tokens (now 3,200)
  + 新增 3 条规则
  ⚠️ 规则总数达 29 条，接近稀释阈值 (30)

page-generator/SKILL.md: +1,200 tokens (now 4,500)
  ❌ 新增重复规则: line 267 duplicates line 189

No regressions detected.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 3.2.3 GitHub Actions 集成

在 `integrations/github-actions/` 下新增 workflow 模板：

```yaml
name: AI Config Review

on:
  pull_request:
    paths:
      - 'CLAUDE.md'
      - 'AGENTS.md'
      - '.claude/**'
      - '.cursor/**'
      - 'SKILL.md'
      - '**/SKILL.md'
      - '.windsurfrules'
      - 'GEMINI.md'
      - 'DESIGN.md'

jobs:
  ai-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npx @itdest/ai-lint --diff
        # --diff: 始终 exit 0，纯信息性报告，不阻断 PR
        # 报告内容通过 PR comment 展示，供 reviewer 参考
```

#### 3.2.4 `ai-lint install` 扩展

已有的 `ai-lint install` 命令增加 `--ci` 选项：

```
npx ai-lint install --ci github-actions    # 生成 .github/workflows/ai-lint.yml
npx ai-lint install --ci husky             # 生成 .husky/pre-commit（仅 --fix --staged）
```

### 3.3 规则稀释检测

#### 3.3.1 问题定义

当同级规则超过一定数量时，LLM 对列表后段条目的注意率可能显著下降（参见 Liu et al. 2023 关于 LLM 在长上下文中对中间位置信息检索效率下降的研究。该研究针对文档检索任务，此处类比应用于规则列表场景，相关性尚未经独立验证）。

#### 3.3.2 检测逻辑

```
阈值:
├── 绿色区: ≤15 条同级规则   → 安全
├── 黄色区: 16-25 条          → 警告，建议分优先级
└── 红色区: >25 条            → 错误，强烈建议拆分

检测范围:
├── CLAUDE.md 中## 执行规则 下的编号列表
├── 任何 SKILL.md 中的步骤列表
└── .cursorrules / .windsurfrules 中的规则列表
```

#### 3.3.3 输出格式

```
⚠️ 规则稀释警告: CLAUDE.md 第 45-128 行
同级规则 33 条，超过 25 条阈值（红色区）
LLM 对列表后段条目的注意率可能下降（参见 Liu et al. 2023，注意：该研究针对文档检索，类比适用于规则列表但相关性尚未独立验证）

受影响的规则（位置 22-33）:
  第 118 行: "Agent 编排规则"         ← 重要规则排在末尾
  第 125 行: "code-reviewer 调用标准"  ← 核心质量门禁，可能被忽略

建议:
  → 将 33 条规则分为两级:
     CRITICAL (8条) — 必须遵守
     STANDARD (25条) — 遵守最佳实践
  → 或按场景拆分到 .claude/rules/ 子文件（推荐，自动加载）
  → 或使用 no-null-effect 规则识别可删除的低信息量规则
```

#### 3.3.4 实现位置

```
src/
└── rules/
    └── no-dilution.ts       # 新增规则
```

### 3.4 auto-fix pre-commit 集成

#### 3.4.1 设计

**只做 auto-fix，不做阻断。** 这与 ESLint 的 `--fix` 模式一致：静默修复确定性问题（去重、简化措辞），建议性问题保持警告但不阻止提交。

```
# .husky/pre-commit 内容
npx @itdest/ai-lint --staged --fix
# 注意：不用 --fail-on-error，不阻断提交
# 如果 ai-lint 修改了文件，重新暂存
git add -u
```

- `--staged`：只检查 `git diff --staged --name-only` 中的 AI 配置文件
- `--fix`：自动修复可修复的问题（去重、简化冗余措辞、补充 frontmatter）
- **不阻断**：修复后 exit 0，即使有未修复的 warning
- hash 比对：只有文件被实际修改才提示用户 review 变更

**为什么不做 `--max-warnings 0`？**

ESLint 的 `--max-warnings 0` 在 CI 中有意义——JS 代码的 warning（如 `no-unused-vars`）通常意味着真实问题。但 ai-lint 的 warning 是建议性的（skill 太长、规则太多），用户可能有充分理由超过阈值。强制阻断只会让用户卸载 hook。

#### 3.4.2 CLI 变更

```
ai-lint --staged            # 只检查暂存区文件
ai-lint --staged --fix      # auto-fix 暂存区文件
ai-lint --staged --json     # JSON 输出（CI 使用）
```

### 3.5 配置机制（`.ai-lintrc.json`）

#### 3.5.1 设计原则

v0.2-v0.3 新增大量规则，每个都有阈值。为避免硬编码导致用户无法适配，在 v0.3 引入配置文件：

- 所有阈值都有默认值，配置文件**完全可选**
- 零配置即可获得完整功能，配置文件只用于自定义
- 配置优先级：`.ai-lintrc.json` > 默认值
- 支持 glob pattern 的 `ignore` 列表

#### 3.5.2 配置结构

```json
{
  "rules": {
    "no-dilution": {
      "warnThreshold": 15,
      "errorThreshold": 25
    },
    "no-skill-bloat": {
      "maxLines": 200,
      "maxInstructions": 30
    },
    "no-stale-tool-config": {
      "warnDays": 14,
      "errorDays": 60
    }
  },
  "tokenBudget": {
    "warnPercent": 5,
    "fileWarnPercent": 15
  },
  "ignore": [
    "skills/gpt-image-generator/**",
    ".claude/agentpm-knowledge/**"
  ],
  "deep": {
    "checkRefs": true,
    "checkDrift": false,
    "checkRot": true
  }
}
```

**`deep` 节的作用**：允许用户细粒度控制深度检查项。比如项目只有 Claude Code 单工具，则关闭 `checkDrift` 避免无意义的跨目录 hash 对比。CLI flag 也可以覆盖此配置：`ai-lint --deep --no-check-drift`。

#### 3.5.3 配置文件发现

与 ESLint 的级联配置不同，ai-lint 只查找**项目根目录**的 `.ai-lintrc.json`（与 `.claude/` 同级），不做级联合并。原因：AI 配置的上下文是项目级的，不存在子目录独立配置的场景。

#### 3.5.4 实现位置

```
src/
└── config/
    ├── loader.ts            # 配置文件加载 + 默认值合并
    ├── schema.ts            # JSON Schema 定义（用于 IDE 自动补全）
    └── validator.ts         # 配置合法性校验
```

### 3.6 v0.3 里程碑

| 项目 | 交付物 | 验收标准 |
|------|--------|---------|
| `ai-lint --diff` | diff 模式完整功能 | 对 pmAgent 提交场景产生有意义的 diff 报告 |
| GitHub Actions 模板 | `integrations/github-actions/` | 在测试 repo 上正常运行 |
| `ai-lint install --ci` | CLI 扩展 | 一键生成 CI 配置文件 |
| `.ai-lintrc.json` 配置 | `src/config/` 加载 + 校验 + schema | 自定义阈值生效，ignore 列表生效 |
| 规则稀释检测 | `no-dilution` 规则 | 检测出 pmAgent CLAUDE.md 的 33 条稀释问题 |
| `--staged` flag | CLI 扩展 | 只检查暂存区文件 |
| 测试 | 新增 ~20 个测试 | 覆盖 diff/staged/dilution/config |

---

## 4. v0.4 — 深度诊断（P2）

### 4.1 目标

面向复杂 AI 配置体系（多工具、多 skill、长期维护）的深度健康检查。默认不启用，通过 `--deep` 激活。

### 4.2 引用完整性检查

#### 4.2.1 检测规则

| 规则 ID | 检测内容 | 用户价值 |
|---------|---------|---------|
| `no-dead-skill-ref` | CLAUDE.md 触发词表引用的 skill 文件名是否存在 | 写了触发词但 file 丢了 |
| `no-dead-agent-ref` | Skill/规则中 `subagent_type: "xxx"` 引用的 agent 文件是否存在 | 编排流程中断 |
| `no-dead-knowledge-ref` | Agent 定义中 `Read(".../knowledge/xxx.md")` 路径是否有效 | 子代理读不到规范 |
| `no-orphan-skill` | `skills/` 下存在但未被任何触发词表引用的 skill | 死代码，占 token |
| `no-orphan-agent` | `agents/` 下存在但未被任何 skill/规则引用的 agent | 同上 |

#### 4.2.2 实现要点

- 解析 CLAUDE.md 触发词表 → 提取所有 skill 名称 → 检查文件系统
- 解析 `subagent_type: "xxx"` 引用 → 检查 agent 文件存在性
- 解析 `Read("path")` 引用 → 检查路径有效性
- 构建引用图 → 检测孤立文件（反向引用检查）

#### 4.2.3 输出格式

```
❌ no-dead-skill-ref: CLAUDE.md 第 90 行
"backend-generator" skill 被引用但文件不存在:
  期望位置: .claude/skills/backend-generator/SKILL.md
  影响: 触发词 "实现后端" 匹配后 AI 找不到 skill 定义

❌ no-dead-knowledge-ref: agents/page-spec-loader.md 第 16 行
Read("phase2-design/ui-libs/ant-design-vue/components") 引用的文件不存在
  影响: page-spec-loader agent 加载规范失败

⚠️ no-orphan-skill: .claude/skills/deprecated-helper/SKILL.md
此 skill 未被任何触发词表引用，永远不会被触发
  影响: 占用 ~1,200 tokens 磁盘空间
  建议: 删除或添加到 CLAUDE.md 触发词表
```

### 4.3 跨文件漂移检测

#### 4.3.1 检测规则

| 规则 ID | 检测内容 |
|---------|---------|
| `no-config-drift` | 同一 skill/agent 在不同工具目录下内容不一致 |
| `no-stale-tool-config` | 某个工具配置目录的最后修改时间远早于主配置 |
| `no-missing-tool-config` | 项目专用的 skill 未在所有工具配置中体现 |
| `no-missing-rule` | CLAUDE.md 中的核心执行规则是否在所有工具配置中都体现 |

#### 4.3.2 检测逻辑

```
no-config-drift:
├── 遍历 .claude/skills/ 中所有 SKILL.md
├── 按 skill 名对应查找其他工具目录（.cursor/ .kiro/ .trae/）
├── 对比文件 hash
└── hash 不同 → 报告时间差、行数差

no-stale-tool-config:
├── 取 CLAUDE.md 最后修改时间 T_main
├── 取各工具配置目录最后修改时间 T_tool
├── 如果 T_tool 比 T_main 早 > 7 天 → 警告
└── 如果早 > 30 天 → 错误
```

#### 4.3.3 输出格式

```
⚠️ no-config-drift: diagram-generator/SKILL.md
  .claude/skills/    版本 hash: a3f2b1c (365行, 2026-07-19 更新)
  .cursor/skills/    版本 hash: d8e4a9f (342行, 2026-07-15 更新)
  .kiro/skills/      版本 hash: a3f2b1c (365行, 2026-07-19 更新)
  → Cursor 版本落后 4 天，内容差异 23 行，缺少 2 个步骤

❌ no-stale-tool-config: .codex/
  AGENTS.md 最后修改于 2026-03-15 (128 天前)
  CLAUDE.md 在此之后有 14 次更新
  → Codex 配置可能严重过时，建议删除或重新同步
```

### 4.4 腐化检测

#### 4.4.1 检测规则

| 规则 ID | 检测内容 |
|---------|---------|
| `no-stale-file-ref` | 规则中引用的文件路径已不存在 |
| `no-deprecated-pattern` | 使用已知废弃的模式（如旧版 Claude Code settings.json 格式） |
| `no-unmaintained-config` | 配置文件超过 N 天未更新 |

### 4.5 方法论覆盖度评分

#### 4.5.1 定位

作为 `ai-lint --audit` 审计模式，提供**导航价值**而非说教价值。

面向场景：
- 新用户刚搭 AI 编程环境，不知道该配什么
- 团队负责人审计多个项目的 AI 防护水平

#### 4.5.2 检测维度

| 维度 | 检测依据 | 权重 |
|------|---------|:----:|
| 规格先行 (Spec-First) | 是否有 req-doc skill 或 SRS 模板 | 15% |
| 代理编排 (Agent-Orchestrated) | 是否有 agents/ 目录 + 编排规则 | 15% |
| 知识注入 (Knowledge-Injected) | 是否有 rules/ + knowledge/ 目录 | 15% |
| 测试优先 (Test-First) | 是否有 TDD skill 或测试规则 | 10% |
| 审查门禁 (Review-Gated) | 是否配置了 code-reviewer agent | 20% |
| 验证先行 (Verify-Before-Claim) | 是否有 verification-before-completion skill | 10% |
| 决策记录 (Decision-First) | 是否有 ADR 模板或决策流程 | 5% |
| 提示词防御 (Prompt-Defense) | 是否有安全基线（密钥保护、提示注入防御） | 10% |

#### 4.5.3 输出格式

```
Methodology Audit: pmAgent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Spec-First            ✅  15/15  req-doc skill + SRS templates
Agent-Orchestrated    ✅  15/15  21 agents + orchestration rules
Knowledge-Injected    ✅  15/15  hooks + 46 knowledge docs
Test-First            ✅  10/10  TDD skill present
Review-Gated          ✅  20/20  code-reviewer + stop-quality-gate
Verify-Before-Claim   ✅  10/10  verification skill present
Decision-First        ⚠️   0/5   未发现 ADR 模板
Prompt-Defense        ⚠️   5/10  有提示词防御基线，但缺少注入防护
                                  规则
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总分: 90/100 (A)

建议:
  → 添加 ADR 决策流程模板以覆盖 Decision-First
  → 补充提示词注入防护规则提升 Prompt-Defense 到满分
```

### 4.6 v0.4 命令行接口

深度检查提供细粒度控制，同时保留 `--deep` 快捷方式：

```
ai-lint --check-refs              # 仅引用完整性检查
ai-lint --check-drift             # 仅跨文件漂移检查
ai-lint --check-rot               # 仅腐化检测
ai-lint --deep                    # 全部深度检查（快捷方式，等同于以上三者）
ai-lint --audit                   # 方法论审计模式
ai-lint --deep --audit            # 全量检查

# --no- 前缀覆盖配置文件中的 deep 设置
ai-lint --deep --no-check-drift   # 全部深度检查，但不做漂移检测
```

> 细粒度 flag 的设计原因见 §3.5 `.ai-lintrc.json` 的 `deep` 配置节。用户可以在配置文件中永久关闭不需要的检查项，也可以通过 CLI flag 临时覆盖。

### 4.7 v0.4 里程碑

| 项目 | 交付物 | 验收标准 |
|------|--------|---------|
| `--deep` 模式 | 引用 + 漂移 + 腐化检测 | 对 pmAgent 检测到至少 3 个实际问题 |
| `--audit` 模式 | 方法论覆盖度评分 | 对 pmAgent + 空项目分别给出差异化结果 |
| 测试 | 新增 ~25 个测试 | 覆盖深度检查各规则 |
| 文档 | `docs/06-improvement-roadmap.md` 更新 | 标注 v0.4 已实现条目 |

---

## 5. v1.0 — 正式版

### 5.1 目标

架构收敛、性能优化、文档完善。

### 5.2 内容

| 项目 | 说明 |
|------|------|
| 规则注册表重构 | 统一 Registry 模式，支持规则元信息查询和索引 |
| 性能优化 | 大型项目（500+ 文件）扫描时间 < 500ms |
| --deep 性能 | 深度检查缓存机制，避免重复文件读取 |
| 错误信息国际化 | 中文/英文错误信息切换（`--locale zh/en`） |
| 文档完善 | 每个规则的单独文档页面 + 示例 |
| 版本语义 | 严格遵守 semver 规范 |
| Rule marketplace 基础 | 社区贡献规则的标准接口和文档模板 |

### 5.3 里程碑

| 项目 | 验收标准 |
|------|---------|
| 架构收敛 | 规则注册表统一，不再有 ad-hoc 的规则加载 |
| 性能 | 500 文件扫描 < 500ms |
| 文档 | 12+ 规则各有独立文档页 |
| 测试 | ≥ 200 个测试，覆盖率达 90%+ |

---

## 6. 不做清单（明确排除）

| 方向 | 排除理由 | 重新评估条件 |
|------|---------|------------|
| 方法论覆盖度作为默认检查 | 说教式输出，用户反感 | — 已转为 `--audit` 模式 |
| pre-commit 强阻断（`--max-warnings 0`） | 建议性规则不适合强行打断提交 | — 已转为 auto-fix 集成 |
| Skill 质量主观评价（缺错误处理、缺成功标准） | 太主观，skill 作者群体极小，标准难以统一 | — 已转为结构性检查 |
| LLM 遵守率有效性预估 | 需要实验数据支撑，现在做是伪科学 | 积累足够用户反馈数据后 |
| VS Code 扩展 | 市场和用户群不够大，先建立 CLI 用户基础 | v1.0 后根据用户量评估 |
| Rule marketplace | 社区规模不够，先聚焦核心功能 | v1.0 建立基础接口 |

---

## 7. 累积时间线

```
Week 1-2    v0.2 Token 纪元
            ├── Token 分析引擎
            ├── 规则冲突检测（硬/软/触发词）
            └── pmAgent + zcf 项目验证

Week 3-4    v0.3 生态集成
            ├── PR 可见性（--diff + GitHub Actions）
            ├── 规则稀释检测
            ├── auto-fix pre-commit（--staged --fix）
            └── 内部 dogfooding

Week 5-6    v0.4 深度诊断
            ├── 引用完整性检查（--deep）
            ├── 跨文件漂移检测
            ├── 腐化检测
            ├── 方法论审计（--audit）
            └── 多项目对比验证

Week 7      v1.0 正式版
            ├── 架构收敛
            ├── 性能优化
            ├── 文档完善
            └── npm publish v1.0.0
```

---

## 8. 成功度量

每个版本除功能验收外，追踪以下指标判断是否达到预期：

| 版本 | 核心指标 | 目标值 | 测量方式 |
|------|---------|:----:|------|
| v0.2 | npm 周下载量 | > 100 | npm registry API |
| v0.2 | Token 分析报告被用户在社交媒体引用 | ≥ 3 次 | 手动追踪 |
| v0.3 | GitHub Actions 模板被非自维护仓库使用 | ≥ 5 个 | GitHub search |
| v0.4 | `--audit` 模式产生社区博客/教程 | ≥ 1 篇 | 手动追踪 |
| v1.0 | npm 总下载量 | > 1,000 | npm registry API |
| v1.0 | GitHub stars | > 100 | GitHub API |
| v1.0 | 社区反馈 issue（非自提交） | ≥ 10 个 | GitHub Issues |

> 这些指标不用于「考核」，用于**判断方向是否需要调整**。如果 v0.2 发布两周后周下载量 < 50，说明要么价值主张没传达到，要么目标用户群找错了——此时应优先做推广/内容营销，而非继续堆功能。

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Token 估算偏差过大 | 用户信任度下降 | 使用已知 tokenizer（tiktoken）作为参照基准，标注误差范围 |
| 冲突检测误报率高 | 用户疲劳 | 只做确定性检测（硬冲突 100%、软冲突 90%+），模糊的不报 |
| 深度检查性能差 | --deep 不可用 | 文件读取缓存 + 增量检查 + 并行化 |
| 用户增长慢 | 功能验证缺乏反馈 | 优先在 pmAgent、zcf 等已知项目上 dogfooding |
| AI 配置标准碎片化 | 规则需要频繁适配不同格式 | 统一内部 IR（中间表示），格式差异在解析层处理 |

---

## 10. 附录：当前架构参考

### 10.1 现有规则（v0.1.2，12 条）

```
no-duplicate            error    auto-fix   ✅
no-semantic-duplicate   warning  auto-fix   ✅
no-conflict             error    -          ✅
no-overconstrain        warning  -          ✅
no-verbose              warning  auto-fix   ✅
no-global-path-rule     warning  -          ✅
no-stale-reference      warning  -          ✅
no-null-effect          warning  -          ✅
no-skill-bloat          warning  -          ✅
max-length              warning  -          ✅
no-overlap-skills       warning  -          ✅ (cross-file)
no-missing-frontmatter  error    auto-fix   ✅
```

### 10.2 现有 CLI 命令（v0.1.2，8 个）

```
ai-lint [path]              # 默认扫描
ai-lint fix [path]          # 自动修复
ai-lint stats [path]        # 健康总览
ai-lint init [path]         # 模板生成
ai-lint explain <rule-id>   # 规则详情
ai-lint install <tool>      # 工具集成
--ci                        # CI 模式: exit 1 if errors（仅阻断 errors，不阻断 warnings）
--json                      # JSON 输出
```

**`--ci` 与 `--diff` 的语义区分**：

| Flag | 行为 | 适用场景 |
|------|------|---------|
| `--diff` | exit 0 always，仅输出本次变更引入的新增问题 | PR 评论机器人（纯信息，不阻断 merge） |
| `--ci` | exit 1 if errors found（errors = no-duplicate, no-conflict, no-missing-frontmatter；warnings 不触发 exit 1） | 严格 CI 流水线（阻断确定性问题，放行建议性警告） |

### 10.3 新增/变更（v0.2 → v1.0）

```
新增规则:
  no-trigger-conflict     error    v0.2  触发词冲突检测
  no-dilution             warning  v0.3  规则稀释检测
  no-dead-skill-ref       error    v0.4  死 skill 引用
  no-dead-agent-ref       error    v0.4  死 agent 引用
  no-dead-knowledge-ref   error    v0.4  死知识库引用
  no-orphan-skill         warning  v0.4  孤立 skill
  no-orphan-agent         warning  v0.4  孤立 agent
  no-config-drift         warning  v0.4  跨工具内容漂移
  no-stale-tool-config    warning  v0.4  过时工具配置
  no-missing-tool-config  warning  v0.4  缺失工具配置
  no-missing-rule         warning  v0.4  规则未在所有工具配置体现
  no-stale-file-ref       warning  v0.4  过期文件引用
  no-deprecated-pattern    warning  v0.4  废弃模式检测
  no-unmaintained-config   warning  v0.4  长期未更新配置

扩展规则:
  no-conflict             扩展跨文件硬/软冲突    v0.2
  no-skill-bloat          增加 token-cost 维度   v0.2

新增功能:
  Token 分析引擎          内置 (ai-lint)          v0.2
  --tokens flag           详细 token 报告         v0.2
  --diff flag             PR diff 模式             v0.3
  --staged flag           暂存区扫描               v0.3
  .ai-lintrc.json         项目级配置文件           v0.3
  --check-refs flag       引用完整性检查           v0.4
  --check-drift flag      跨文件漂移检查           v0.4
  --check-rot flag        腐化检测                 v0.4
  --deep flag             全部深度检查（快捷方式） v0.4
  --audit flag            方法论审计               v0.4

新增集成:
  GitHub Actions          PR comment bot          v0.3
  Husky pre-commit        auto-fix 集成            v0.3
```

---

> **维护者注**：本路线图基于 2026-07-21 的生态快照。AI 编程工具生态变化极快（AGENTS.md 标准、新工具出现、协议变化），每个版本开发前应重新评估优先级。欢迎通过 GitHub Issues 提交反馈。
