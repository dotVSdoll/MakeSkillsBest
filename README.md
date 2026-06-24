# MakeSkillsBest

> **代码优化工程循环 — 不是帮你加功能，是帮你把现有代码打磨到更好。**

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-13-orange" alt="skills">
  <img src="https://img.shields.io/badge/phases-12-purple" alt="phases">
</p>

![MakeSkillsBest Architecture](images/loop-architecture.png)

---

## 目录

- [是什么](#是什么)
- [快速开始](#快速开始)
- [安装](#安装)
- [核心流程](#核心流程)
- [完整案例](#完整案例)
- [Skill 体系](#skill-体系)
- [产出示例](#产出示例)
- [与其他方案的区别](#与其他方案的区别)
- [特殊能力](#特殊能力)
- [贡献](#贡献)
- [License](#license)

---

## 是什么

**MakeSkillsBest 是一个 12 阶段、13 个 skill 的代码优化工程循环。** 它不帮你加新功能——它帮你发现代码中已有的问题，并安全、可追溯、风格一致地修复它们。

AI coding agent 改代码时经常犯的错：

- 修了一个 bug，引入了三个新问题
- 破坏了项目原有的代码风格
- "顺便"重构了不该碰的模块
- 改了代码但不知道是不是真的改对了

MakeSkillsBest 用工程化的**诊断→规划→锁定边界→小步修复→验证→自审**循环来解决这些问题。

**跨 Agent 自适应：** 首次运行自动检测当前 AI Coding 工具（Claude Code / Codex / Cursor 等），读取本地配置，适配子任务调度和 CLI 权限模型。无需手动配置。

**前置条件：**
- 任何接受 `/skill` 或类似指令的 AI Coding Agent
- 代码仓库（本地路径或 GitHub URL）
- 建议：`git` + 对应语言的运行时（Loop 会自动检测和准备）

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

**推荐方式 — Claude Code Marketplace：**

```bash
/plugin marketplace add dotVSdoll/MakeSkillsBest
```

**通用方式 — npx skills（Codex / Cursor / Gemini CLI 等 50+ 工具）：**

```bash
npx skills add dotVSdoll/MakeSkillsBest -g
```

**手动方式（适用于任何接受 SKILL.md 的 Agent）：**

```bash
git clone https://github.com/dotVSdoll/MakeSkillsBest.git
# 将 skills/*/SKILL.md 复制或链接到你的 Agent 的 skill 目录
```

> 详细安装指引见 [docs/setup-guide.md](docs/setup-guide.md)

---

## 核心流程

```
Detect → EnvReady → Observe → Understand → Diagnose → Plan → Bound
    → Fix → Verify → SelfReview → Learn → Decide
     ↑___________________________________________↓
            Decide=continue 时回到 Fix 或 Observe
```

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

**统一流程：** 不再区分 read-only 和 optimize 模式。如果没有发现需要修复的问题，Loop 在 Plan 阶段后自动结束。有任务则进入 Fix。

**环境自动就绪：** 自动创建 venv → 安装依赖 → 复制 .env.example。无法完成的操作列出清单并诚实降级到静态分析模式。

---

## 完整案例

以下是一个真实项目的优化过程（[daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis)，Python 股票分析平台，约 200 源文件）：

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
| **Understand** | 生成 4 份技术文档, 含 12 个模块详解 + 证据矩阵 | 优化方向：代码组织 + 安全隐患消除 |
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

## Skill 体系

13 个 skill 按使用场景分为四组：

### 分析类 — 理解项目

| Skill | 什么时候用 | 独立调用 |
|---|---|---|
| `style-profile` | 接手陌生项目，先摸清代码风格 | `/skill style-profile` |
| `semantic-rag` | 理解项目整体架构和模块职责 | `/skill semantic-rag` |
| `knowledge-graph` | 追踪调用链、数据流、模块依赖 | `/skill knowledge-graph` |
| `repo-decompose` | 拆分需求、生成架构文档和文件索引 | `/skill repo-decompose` |
| `mvp-approach` | 有多个优化方向时，验证哪个最可行 | `/skill mvp-approach` |

### 诊断类 — 发现问题

| Skill | 什么时候用 | 独立调用 |
|---|---|---|
| `security-audit` | 检查依赖漏洞、认证缺陷、注入风险、敏感信息 | `/skill security-audit` |
| `quality-audit` | 检查重复代码、高复杂度、死代码、测试薄弱 | `/skill quality-audit` |

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
| `engineering-loop` | 12 阶段总控调度器 |

所有 skill 可以**独立调用**——不需要完整走 Loop。例如单独跑一次安全审计：

```
/skill security-audit  # 扫描当前仓库的安全问题 → 写入 docs/loop-docs/
```

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
| _format_prompt() | 3140 | 450行 prompt 模板——因为技术面+消息面+市场阶段+决策指令 需覆盖全部场景 |
| _parse_response() | 3778 | 三层解析防御——JSON解析→json_repair修复→文本正则提取 |
| _call_litellm_impl() | 2603 | 多模型 fallback: 主模型→fallback1→fallback2→报错 |

### 设计决策

- **为什么 analyze() 270 行**: 每一步都有错误处理和重试——不是"写得长"而是"防御深"
- **为什么 litellm 自带 fallback 还要自己封装**: Router 不支持 per-model 的 max_tokens 差异化配置
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
├── Router.register() [api/router.ts:15]      ← L52: 注册所有路由
└── Server.listen() [external]                ← L60: 启动 HTTP
```

---

## 与其他方案的区别

| 方案 | 做什么 | 和 MakeSkillsBest 的区别 |
|---|---|---|
| 直接让 Agent 改代码 | "帮我修这个 bug" | 无边界约束、无风格检查、无自审——Agent 可能顺便改坏其他东西 |
| Lint / SonarQube | 静态规则检查 | 只发现问题，不修复、不验证、不写技术文档 |
| Dependabot / Renovate | 依赖更新 | 只管依赖版本，不管代码质量、安全注入、架构退化 |
| AI Code Review | PR 级别的 diff 审查 | 事后审查，发现问题时代码已经写完了 |
| **MakeSkillsBest** | **全流程工程循环** | **分析→诊断→规划→边界→修复→验证→自审→沉淀**——一个完整闭环 |

---

## 特殊能力

- **跨 Agent 自适应** — 自动检测 Claude Code / Codex / Cursor 等工具，适配调度和权限模型
- **环境自动就绪** — 创建 venv → 安装依赖 → 复制 .env，无法自动的诚实告知并降级
- **自适应代码风格** — 修改的代码看不出是 AI 写的，自动匹配原有命名、错误处理、注释习惯
- **安全优先修复** — CVE 按 reachability×exposure×upgradeRisk 排序，不为不可达 dev 依赖引入 breaking change
- **死代码保护** — 删除前检查动态 import、public API、配置文件引用、插件约定、测试引用——5 项全部 NO 才删除
- **Self-Review 审查** — 10 条 diff 级检查：白名单/依赖/API/范围/契约/快照/错误范式/linter/过度实现
- **收益递减止损** — 连续 2 轮仅发现 LOW 级别问题 → 自动停止，不浪费 tokens
- **完整技术文档** — 知识图谱、架构图、文件索引、调用链——分析后留下永久可读的 Markdown 文档

---

## 贡献

欢迎提交 Issue 和 PR。

- 新增 skill：在 `skills/` 下创建目录，包含 `SKILL.md`
- 改进现有 skill：直接修改对应的 SKILL.md
- 文档改进：`docs/` 目录下的所有文件

详见 [CONTRIBUTING.md](CONTRIBUTING.md)（如有）。

---

## License

MIT © [dotVSdoll](https://github.com/dotVSdoll)
