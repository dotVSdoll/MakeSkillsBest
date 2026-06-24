# MakeSkillsBest

> **代码优化工程循环 — 不是帮你加功能，是帮你把现有代码打磨到更好。**

[English](README_EN.md)

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-13-orange" alt="skills">
  <img src="https://img.shields.io/badge/phases-12-purple" alt="phases">
  <br>
  <a href="https://discord.com/channels/1519320574562795601/1519320574562795604"><img src="https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/DVBbdipl"><img src="https://img.shields.io/badge/X-%23000000.svg?logo=X&logoColor=white" alt="X"></a>
</p>

---

### TL;DR

MakeSkillsBest 是给 AI Coding Agent 用的**代码优化工程循环**。它会先理解仓库，再诊断安全/质量问题，生成修复计划，锁定可修改文件，最后小步修复并自审。适合接手大仓库、治理技术债、修安全问题、降低复杂度。不适合从零生成新功能。

---

## 目录

- [是什么](#是什么)
- [三种使用方式](#三种使用方式)
- [快速开始](#快速开始)
- [安装](#安装)
- [安全承诺](#安全承诺)
- [核心流程](#核心流程)
- [输出目录](#输出目录)
- [完整案例](#完整案例)
- [产出示例](#产出示例)
- [Skill 体系](#skill-体系)
- [与其他方案的区别](#与其他方案的区别)
- [适合什么项目](#适合什么项目)
- [特殊能力](#特殊能力)
- [贡献](#贡献)
- [License](#license)

---

## 是什么

**MakeSkillsBest 是一个 12 阶段、13 个 skill 的代码优化生命周期。** 前 2 阶段（Detect + EnvReady）负责检测工具和准备环境，后 10 阶段由 `engineering-loop` 执行完整的**诊断→规划→锁定边界→小步修复→验证→自审**闭环。

它不帮你加新功能——它帮你发现代码中已有的问题，并安全、可追溯、风格一致地修复它们。

AI coding agent 改代码时经常犯的错：

- 修了一个 bug，引入了三个新问题
- 破坏了项目原有的代码风格
- "顺便"重构了不该碰的模块
- 改了代码但不知道是不是真的改对了

**跨 Agent 自适应：** 首次运行自动检测当前 AI Coding 工具，读取本地配置，适配子任务调度和 CLI 权限模型。检测内容包括：宿主工具类型、是否支持子任务并行、是否允许 shell 命令和写文件、是否在 git 工作区。无需手动配置。

**前置条件：**

- 任何接受 `/skill` 或类似指令的 AI Coding Agent
- 代码仓库（本地路径或 GitHub URL）
- 建议：`git` + 对应语言的运行时（Loop 会自动检测和准备）

---

## 三种使用方式

不需要区分"模式"——用自然语言表达意图即可：

### 1. 只想理解项目

```
/optimize-loop "只分析这个仓库，生成架构文档和风险清单，不修改代码"
```

Loop 走过全部分析阶段后，在 Plan 阶段发现无任务 → 自动结束，不留任何代码变更。

### 2. 想拿到优化计划

```
/optimize-loop "分析这个仓库，生成修复计划和修改边界，先不要执行"
```

走到 Bound 阶段后暂停——你会得到一份完整的修改计划 + 白名单/红区，确认后再继续。

### 3. 想让它小步修复并验证

```
/optimize-loop "降低核心模块复杂度，并在每批修复后运行验证"
```

完整走完 12 阶段——每批修复后自动验证，发现问题立即回退。

> 如果诊断后没有发现需要修复的问题，Loop 在 Plan 阶段后自动结束。有任务才进入 Fix——你不会被强制修改代码。

---

## 快速开始

```bash
# 最简单的用法——分析并优化当前仓库
/optimize-loop "分析并优化这个仓库"

# 指定目标
/optimize-loop "修复安全漏洞并统一错误处理风格"
/optimize-loop "降低核心模块复杂度"
/optimize-loop "清理死代码并补充缺失的测试"
```

**会发生什么：**

```
1. 检测你的 Agent 工具 → 加载对应适配器
2. 检测/准备运行环境（创建 venv、安装依赖、复制 .env）
3. 扫描代码风格、安全漏洞、质量问题
4. 生成完整技术文档（知识图谱、架构图、文件索引）
5. 制定修复计划 → 锁定修改边界 → 小步执行
6. 验证修复 → 自我审查 → 沉淀经验
7. 全部输出到 docs/loop-docs/ 和 .loop-log/
```

---

## 安装

**推荐 — Claude Code Marketplace：**

```bash
/plugin marketplace add dotVSdoll/MakeSkillsBest
```

**通用 — npx skills（Codex / Cursor / Gemini CLI 等 50+ 工具）：**

```bash
npx skills add dotVSdoll/MakeSkillsBest -g
```

**手动（适用于任何接受 SKILL.md 的 Agent）：**

```bash
git clone https://github.com/dotVSdoll/MakeSkillsBest.git
# 将 skills/*/SKILL.md 复制或链接到你的 Agent 的 skill 目录
```

> 详细安装指引见 [docs/setup-guide.md](docs/setup-guide.md)

---

## 安全承诺

MakeSkillsBest 遵守**最小权限原则**，任何时候你都可以信任它不会越界：

| 承诺 | 如何保证 |
|---|---|
| 不会在未锁定边界前修改代码 | 修改只在 Bound 阶段生成白名单后才执行 |
| 不会触碰红区文件 | `implementation-map` 从架构契约和依赖分析中自动识别禁止触碰的模块 |
| 不会伪造执行结果 | 环境准备失败时诚实降级为静态分析，不会假装跑通了 CLI 工具 |
| 所有修改可追溯 | 每步写入 `.loop-log/`，每次 commit 是原子任务 |
| 修改前检查风格一致性 | `style-profile` 确保修改匹配原有命名、错误处理、注释习惯 |
| 修改后自我审查 | Self-Review 逐条检查 10 项：越界、新增依赖、API 破坏、scope creep、契约违规…… |
| 连续失败自动停止 | 验证连续 2 次失败 → 回到规划；自审连续 2 次不通过 → 停止 |
| 收益递减自动止损 | 连续 2 轮仅发现 LOW 级别问题 → 自动停止，不浪费 tokens |

---

## 核心流程

```
Detect → EnvReady → Observe → Understand → Diagnose → Plan → Bound
    → Fix → Verify → SelfReview → Learn → Decide
     ↑___________________________________________↓
            Decide=continue 时回到 Fix 或 Observe
```

前 2 阶段是**一次性门控**（不参与后续循环），后 10 阶段由 `engineering-loop` 执行完整的优化闭环。

| 阶段 | 做什么 | 产物 |
|---|---|---|
| 🔌 **Detect** | 检测 AI 工具 → 读取配置 → 选择适配器 | 能力矩阵 |
| ⚙️ **EnvReady** | 环境分级检测 🟢🟡🟠🔴 → 自动准备 venv/依赖 | 可运行环境 |
| 🔍 **Observe** | 代码风格画像：命名、错误处理、组织、测试习惯 | 风格约束文件 |
| 🧠 **Understand** | 语义分析 + 知识图谱 + 架构拆分 + 方向验证 | 完整技术文档 |
| 🩺 **Diagnose** | 安全四维扫描 + 质量六维诊断（并行） | 分级问题清单 |
| 📋 **Plan** | 交付计划 + 任务依赖 DAG + 关键路径 | 执行计划 |
| 🔒 **Bound** | 修改白名单 + 红区 + 架构契约 + 爆炸半径 | 安全边界 |
| 🔧 **Fix** | 受风格约束的小步修复 | 代码变更 |
| ✅ **Verify** | 按项目类型验证（CLI/Library/Skill/Security） | 验证报告 |
| 🔍 **SelfReview** | 10 条 diff 检查：越界/依赖/API/范围/契约 | 自审报告 |
| 📝 **Learn** | 沉淀教训 + 生成下一轮建议 | 经验记录 |
| 🔁 **Decide** | 8 条停止条件判定 | continue/stop/replan |

---

## 输出目录

运行后会生成以下可复用资产——不是一次性聊天结果：

```
docs/loop-docs/
├── knowledge-graph.md         ← 四层图谱（符号表→调用链→数据流→模块依赖）
├── symbol-index.md            ← 按文件组织的符号索引
├── call-graph.md              ← 树状调用链（从入口点展开）
├── module-dependencies.md     ← 模块依赖矩阵 + 影响分析
├── project-overview.md        ← 完整项目技术文档（每模块详解）
├── architecture.md            ← 架构文档 + 数据流 + 决策点
└── file-index.md              ← 全文件索引（职责/依赖/修改注意事项）

.loop-log/
└── {YYYY-MM-DD}_{repo}-{goal}/
    ├── 00-detect.md           ← Agent 检测 + 适配器选择
    ├── 01-env-ready.md        ← 环境就绪检查 + 自动准备
    ├── 02-observe.md          ← 风格画像
    ├── 03-understand.md       ← 语义理解 + 方向验证
    ├── 04-diagnose.md         ← 安全审计 + 质量诊断
    ├── 05-plan.md             ← 修复计划 + 任务 DAG
    ├── 06-bound.md            ← 白名单 + 红区
    ├── 07-fix.md              ← 每次修复的详细记录
    ├── 08-verify.md           ← 验证结果
    ├── 09-self-review.md      ← 自审发现
    ├── 10-learn.md            ← 经验教训
    └── INDEX.md               ← 快捷索引（按关键词检索）
```

---

## 完整案例

以下是一次真实优化运行（[daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis)，Python 股票分析平台，约 200 源文件）。

> 这不是模拟数据——来自真实仓库的一次静态/执行混合优化测试。所有数字对应实际 diff 和编译输出。

### 输入

```
/optimize-loop "分析并优化 D:\daily_stock_analysis"
```

### 各阶段关键产出

| 阶段 | 发现 | 决策 |
|---|---|---|
| **Detect** | Claude Code, 支持 Task tool 并行 | 安全审计和质量诊断可并行执行 |
| **EnvReady** | Python 3.11, 虚拟环境已存在, 依赖已安装 | 🟢 Full — 可用全部 CLI 工具 |
| **Observe** | snake_case 命名, try/except 错误处理, pytest 测试 | 风格约束已锁定 |
| **Understand** | 生成 7 份技术文档, 含 12 个模块详解 + 证据矩阵 | 优化方向：代码组织 + 安全隐患消除 |
| **Diagnose** | 4 项安全问题 (0C/0H/3M/1L) + 6 项质量问题 (0C/2H/3M/1L) | CRITICAL 无, HIGH 项进入修复计划 |
| **Plan** | 5 个任务, 2 个并行批次 | 先安全修复 (Batch 1), 再代码拆分 (Batch 2) |
| **Bound** | 白名单 4 文件, 红区禁止触碰 pipeline/agent/sender | 锁定边界 |
| **Fix** | 5/5 任务完成 | analyzer.py 4068→2598行, notification.py 2609→1024行 |
| **Verify** | 全部文件编译通过, 向后兼容 | 通过 |
| **SelfReview** | 2 个问题 (Mixin未继承, regex错误) | 修复后通过 |

### 最终效果

| 指标 | 修复前 | 修复后 |
|---|---|---|
| `analyzer.py` 行数 | 4068 | 2598 (-36%) |
| `notification.py` 行数 | 2609 | 1024 (-61%) |
| 安全发现 | 4 (0C) | 已修复 |
| 生成技术文档 | 0 份 | 7 份 Markdown 文档 |
| 引入回归 bug | — | 0 |

---

## 产出示例

Understand 阶段生成的 `docs/loop-docs/project-overview.md` 节选：

```markdown
## src/analyzer.py — LLM 分析层

**职责**: 封装 LLM 调用，技术面+消息面→prompt→调 LLM→解析 JSON→AnalysisResult。
**规模**: 2598 行（含辅助函数 1507 行在 analyzer_helpers.py）

### 核心类: GeminiAnalyzer (2280 行)

| 方法 | 行号 | 职责 |
|---|---|---|
| analyze() | 2866 | 主分析流程——获取数据→构建prompt→调LLM→解析→完整性检查 |
| _format_prompt() | 3140 | 450行 prompt 模板——因为技术面+消息面+市场阶段+决策指令需覆盖全部场景 |
| _parse_response() | 3778 | 三层解析防御——JSON解析→json_repair修复→文本正则提取 |

### 设计决策

- **为什么 analyze() 270 行**: 每一步都有错误处理和重试——不是"写得长"而是"防御深"
- **为什么 litellm 自带 fallback 还要自己封装**: Router 不支持 per-model 的 max_tokens 差异化
- **为什么 prompt 不放在外部模板**: 代码内嵌——prompt 变更=代码变更=git 历史可追溯
```

生成的 `docs/loop-docs/call-graph.md` 节选：

```markdown
## 调用树: main() → 全链路

main() [main.py:42]
├── Config.load() [config.py:18]              ← L45: 启动时加载配置
│   ├── parseEnvFile() [config.py:30]
│   └── validateSchema() [config.py:55]
├── Database.connect() [db/index.ts:10]       ← L48: 数据库连接池
└── Server.listen() [external]                ← L60: 启动 HTTP
```

---

## Skill 体系

13 个 skill 按使用场景分为四组。**所有 skill 可独立调用——不需要完整走 Loop。**

### 什么时候用完整 Loop，什么时候单独用 Skill？

| 场景 | 推荐 |
|---|---|
| 接手陌生大仓库，想全面理解 + 优化 | 跑完整 `/optimize-loop` |
| 只想理解架构和模块职责 | 单独跑 `semantic-rag` + `knowledge-graph` |
| 只想检查安全问题 | 单独跑 `security-audit` |
| 准备改代码前怕越界 | 单独跑 `implementation-map` |
| 改完代码想证明没坏 | 单独跑 `verification-loop` |
| 只想生成项目技术文档 | 单独跑 `repo-decompose` |

### 分析类 — 理解项目

| Skill | 什么时候用 |
|---|---|
| `style-profile` | 接手陌生项目，先摸清代码风格 |
| `semantic-rag` | 理解项目整体架构和模块职责 |
| `knowledge-graph` | 追踪调用链、数据流、模块依赖 |
| `repo-decompose` | 拆分需求、生成架构文档和文件索引 |
| `mvp-approach` | 有多个优化方向时，验证哪个最可行 |

### 诊断类 — 发现问题

| Skill | 什么时候用 |
|---|---|
| `security-audit` | 检查依赖漏洞、认证缺陷、注入风险、敏感信息 |
| `quality-audit` | 检查重复代码、高复杂度、死代码、测试薄弱 |

### 执行类 — 规划并修复

| Skill | 做什么 |
|---|---|
| `delivery-plan` | 按优先级生成分阶段修复计划 |
| `task-graph` | 构建任务依赖 DAG + 关键路径 |
| `implementation-map` | 生成修改白名单 + 红区 + 爆炸半径 |
| `verification-loop` | 按项目类型验证修复正确性 |

### 基础设施

| Skill | 做什么 |
|---|---|
| `log-journal` | 每阶段写入结构化日志 |
| `engineering-loop` | 总控调度器——前 2 门控 + 10 阶段优化循环 |

---

## 与其他方案的区别

| 方案 | 常见失败模式 | MakeSkillsBest 怎么避免 |
|---|---|---|
| 直接让 Agent 改代码 | scope creep，顺手大改 | `implementation-map` 白名单 + 红区 + Self-Review |
| Lint / SonarQube | 只报规则，不知道怎么修 | `delivery-plan` + `task-graph` 生成可执行修复计划 |
| Dependabot / Renovate | 升级依赖但不判断 reachability | CVE × reachability × exposure × upgradeRisk 排序 |
| AI Code Review | 事后审查，问题已经 commit 了 | 修改前 Bound 锁定边界，修改后 Verify + SelfReview |
| **MakeSkillsBest** | **完整的分析→诊断→规划→边界→修复→验证→自审→沉淀闭环** | |

---

## 适合什么项目

**适合：**

- 中大型已有代码仓库
- 需要安全审计、质量治理、死代码清理、降低复杂度的项目
- 多人维护、担心 AI 改坏风格或越界的项目
- 想让 Agent 先规划、小步修复、再验证的工程化场景

**不适合：**

- 从零生成一个新 App 或新功能
- 一次性大重写（Loop 的设计哲学是小步迭代）
- 没有 git、也不允许安装依赖的环境
- 希望 Agent 不经确认直接大规模改代码的场景

---

## 特殊能力

- **跨 Agent 自适应** — 自动检测宿主工具（Claude Code / Codex / Cursor / Gemini CLI / Windsurf），读取本地配置，适配子任务调度和 CLI 权限模型
- **环境自动就绪** — 创建 venv → 安装依赖 → 复制 .env，无法自动的诚实告知并降级
- **自适应代码风格** — 修改的代码看不出是 AI 写的，自动匹配原有命名、错误处理、注释习惯
- **安全优先修复** — CVE 按 reachability × exposure × upgradeRisk 排序，不为不可达 dev 依赖引入 breaking change
- **死代码保护** — 删除前 5 项检查：动态 import？public API？配置文件引用？插件约定？测试引用？全部 NO 才删除
- **Self-Review 审查** — 10 条 diff 级检查：白名单/依赖/API/范围/契约/快照/错误范式/linter/过度实现
- **收益递减止损** — 连续 2 轮仅发现 LOW 级别问题 → 自动停止
- **完整技术文档** — 知识图谱、架构图、文件索引、调用链——分析后留下永久可读的 Markdown 文档

---

## 贡献

欢迎提交 Issue 和 PR。

- 新增 skill：在 `skills/` 下创建目录，包含 `SKILL.md`
- 改进现有 skill：直接修改对应的 SKILL.md
- 文档改进：`docs/` 目录下的所有文件

---

## License

MIT © [dotVSdoll](https://github.com/dotVSdoll)
