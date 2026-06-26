# MakeSkillsBest

> **Loop Engineering — 让 Agent 自动执行复杂工作流，持续迭代，减少人工干预。**

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-13-orange" alt="skills">
  <img src="https://img.shields.io/badge/phases-12-purple" alt="phases">
  <br>
  <a href="https://discord.gg/ESaTn66P4"><img src="https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/DVBbdipl"><img src="https://img.shields.io/badge/X-%23000000.svg?logo=X&logoColor=white" alt="X"></a>
</p>

---

### 为什么需要 Loop Engineering？

AI Agent 能写代码、能回答问题，但让它**自动完成一个完整的工作流**，情况就不一样了：

- Agent 改了一个 bug，顺手大改了三个模块
- 审查了一遍代码质量，下一轮对话全忘了
- 修完安全漏洞，没有人检查它有没有引入新问题
- 你想让它持续监控技术债，但它每次都要你重新说一遍指令

问题不在模型能力，在**工作流缺少结构**。Agent 单次输出很强，但跨步骤的**状态管理、边界控制、退出条件**这些工程化的东西，模型不会自己凭空想出来。

Loop Engineering 就是填补这个空白的：**把复杂工作流定义成可重复的循环，让 Agent 自己跑、自己验证、自己决定什么时候停。**

你只需要一次输入，剩下的交给 Loop。

---

## 目录

- [你遇到哪个问题](#你遇到哪个问题)
- [MakeSkillsBest 是什么](#makeskillsbest-是什么)
- [当前已实现](#当前已实现)
- [正在构建](#正在构建)
- [快速上手](#快速上手)
- [项目结构](#项目结构)
- [贡献](#贡献)
- [License](#license)

---

## 你遇到哪个问题

### 问题 A：改了代码，但改坏了

```
你让 Agent "修复这个安全漏洞"，它修了漏洞，但也：
- 重构了相邻函数的命名风格
- 删掉了一个看起来"没用"但其他模块在 import 的变量
- 没有跑测试，你上线前才发现
```

**Loop 怎么解决：** `Bound → Fix → Verify → SelfReview` 四阶段锁死边界。越界修改、遗漏验证都会在 SelfReview 阶段被拦下并回退。

### 问题 B：每次用 Agent 都要重新来一遍

```
你每周做一次代码质量审查。但每次打开新对话：
- Agent 不认识你的仓库
- 你不知道上次审查发现了什么
- 同样的误报筛了一次又一次
```

**Loop 怎么解决：** Loop 把状态写入 `.loop-log/`，下次运行自动读取。过去发现的 false positive、已修复的问题、遗留的决策，都可以被加载。

### 问题 C：工作流超出单次对话的范围

```
你想让 Agent 做的事情需要多轮、多阶段：
"先分析仓库 → 诊断问题 → 生成修复计划 → 改代码 → 验证 → 如果没改好再来一轮"
但 Agent 在一个 prompt 里处理不了这么长的链条，你会得到一堆似是而非的结果。
```

**Loop 怎么解决：** 12 阶段生命周期，每个阶段的输出是下一个阶段的输入。Decide 阶段决定是继续、停止还是重新规划。整个流程不需要你中途介入。

---

## MakeSkillsBest 是什么

MakeSkillsBest 是一套 **Loop Engineering 模式库**——把常见的 Agent 工作流封装成可复用的循环（Loop），让你开箱即用。

每个 Loop 包含：

| 要素 | 说明 |
|------|------|
| **Entry** | 什么条件触发这个循环？ |
| **Body** | 循环体包含哪些阶段？每个阶段的职责和产物是什么？ |
| **Exit** | 什么时候停止？（任务完成 / 收益递减 / 连续失败 / 用户中断） |
| **State** | 跨轮次的持久化状态怎么管理？ |
| **Safety** | 越界、回退、人工确认的机制是什么？ |

### 对比裸 Agent

```
裸 Agent：
  你给我一个 prompt → 我输出一次 → 完事
  └ 复杂任务？你得手把手分步引导

Loop：
  你给我一个目标 → 我自己反复执行、验证、调整
  └ 除非卡住，否则不用你管
```

---

## 当前已实现

### 代码优化循环（Engineering Loop）

**12 阶段，13 个 skill，覆盖"分析→诊断→修复→验证"全链路。**

适用于：接手大仓库、治理技术债、修复安全漏洞、降低代码复杂度。

```
Detect → EnvReady → Observe → Understand → Diagnose → Plan → Bound
    → Fix → Verify → SelfReview → Learn → Decide
     ↑___________________________________________↓
            Decide=continue 时回到 Fix 或 Observe
```

| 阶段 | 做什么 | 产物 |
|------|--------|------|
| 🔌 **Detect** | 检测 AI 工具 → 读取配置 → 选择适配器 | 能力矩阵 |
| ⚙️ **EnvReady** | 环境分级检测 → 自动准备 venv/依赖 | 可运行环境 |
| 🔍 **Observe** | 代码风格画像 | 风格约束文件 |
| 🧠 **Understand** | 语义分析 + 知识图谱 + 架构拆分 | 完整技术文档 |
| 🩺 **Diagnose** | 安全扫描 + 质量诊断（并行） | 分级问题清单 |
| 📋 **Plan** | 交付计划 + 任务依赖 DAG | 执行计划 |
| 🔒 **Bound** | 修改白名单 + 红区 | 安全边界 |
| 🔧 **Fix** | 受风格约束的小步修复 | 代码变更 |
| ✅ **Verify** | 按项目类型验证修复正确性 | 验证报告 |
| 🔍 **SelfReview** | 10 条 diff 检查 | 自审报告 |
| 📝 **Learn** | 沉淀教训 + 生成下一轮建议 | 经验记录 |
| 🔁 **Decide** | 停止条件判定 | continue/stop/replan |

真实案例：对一个 200+ 源文件的 Python 股票分析平台，完成安全修复 + 代码拆分，`analyzer.py` 4068→2598 行，`notification.py` 2609→1024 行，引入回归 bug 0 个。

### Skill 体系

13 个 skill 按使用场景分为四组，**每个 skill 可独立调用**：

| 分组 | Skill | 什么时候用 |
|------|-------|-----------|
| **分析** | `style-profile` | 接手陌生项目，先摸清代码风格 |
| | `semantic-rag` | 理解项目整体架构和模块职责 |
| | `knowledge-graph` | 追踪调用链、数据流、模块依赖 |
| | `repo-decompose` | 拆分需求、生成架构文档 |
| | `mvp-approach` | 有多个方向时，验证哪个最可行 |
| **诊断** | `security-audit` | 检查依赖漏洞、注入风险、敏感信息 |
| | `quality-audit` | 检查重复代码、高复杂度、死代码 |
| **执行** | `delivery-plan` | 按优先级生成分阶段修复计划 |
| | `task-graph` | 构建任务依赖 DAG |
| | `implementation-map` | 生成修改白名单 + 红区 |
| | `verification-loop` | 按项目类型验证修复正确性 |
| **基础设施** | `log-journal` | 每阶段写入结构化日志 |
| | `engineering-loop` | 总控调度器 |

---

## 正在构建

当前这个仓库正在从"一个代码优化循环"演进为"**多 Loop 模式库 + 各平台原生配置**"。

### Loop 模式（拓展方向）

| Loop | 状态 | 说明 |
|------|------|------|
| 代码优化循环 | ✅ 已实现 | 12 阶段代码分析→诊断→修复→验证 |
| 信息收集循环 | 🔄 规划中 | 自动搜索、聚合、去重、结构化输出 |
| 文档处理循环 | 🔄 规划中 | 批量分析、归类、摘要、格式标准化 |
| 多媒体审查循环 | 📋 待评估 | 图片/音频/视频的理解与质检 |

### 平台适配

同一个 Loop 在不同的 Agent 工具上通过其自身的插件/规则机制接入：

| 平台 | 接入方式 | 状态 |
|------|---------|------|
| **Claude Code** | `.claude-plugin/` + `hooks/` + `.claude/commands/` | 🔄 进行中 |
| **Cursor** | `.cursor/rules/` | 🔄 进行中 |
| **Codex CLI** | `.opencode/` 插件注册 | 📋 待构建 |
| **Windsurf** | `.windsurf/rules/` | 📋 待构建 |
| **Gemini CLI** | `.gemini/` 扩展配置 | 📋 待构建 |

---

## 快速上手

```bash
# Claude Code — 代码优化循环（已可用）
/optimize-loop "分析并优化这个仓库"

# 指定具体目标
/optimize-loop "修复安全漏洞并统一错误处理风格"
/optimize-loop "降低核心模块复杂度"
/optimize-loop "清理死代码并补充缺失的测试"

# 只分析不改
/optimize-loop "只分析这个仓库，生成架构文档和风险清单，不修改代码"
```

**前置条件：**

- 任何支持 `/skill` 或类似指令的 AI Coding Agent
- 目标代码仓库（本地路径）
- 建议：`git` + 对应语言的运行时（Loop 会自动检测和准备）

**安装：**

```bash
# Claude Code Marketplace
/plugin marketplace add dotVSdoll/MakeSkillsBest

# 或通过 npx skills（Codex / Cursor / Gemini CLI 等）
npx skills add dotVSdoll/MakeSkillsBest -g

# 或手动
git clone https://github.com/dotVSdoll/MakeSkillsBest.git
# 将 skills/*/SKILL.md 复制到你的 Agent 的 skill 目录
```

---

## 项目结构

```
MakeSkillsBest/
├── skills/              # Skill 定义（单文件 SKILL.md）
│   ├── engineering-loop/
│   ├── security-audit/
│   ├── quality-audit/
│   └── ...
├── loops/               # 🔄 规划中：可复用的 Loop 模式定义
│   └── code-optimization/
├── commands/            # 🔄 规划中：CLI 命令注册（.toml / .md）
├── hooks/               # 🔄 规划中：Session life-cycle hooks
├── scripts/             # 🔄 规划中：辅助脚本
├── docs/                # 文档
├── images/              # 资源
├── .claude-plugin/      # 🔄 规划中：Claude Code 插件
├── .claude/commands/    # 🔄 规划中：Claude Code 斜杠命令
├── .cursor/rules/       # 🔄 规划中：Cursor 规则
├── .opencode/           # 🔄 规划中：OpenCode 插件
├── .gemini/             # 🔄 规划中：Gemini CLI 配置
├── .windsurf/rules/     # 🔄 规划中：Windsurf 规则
├── AGENTS.md            # Agent 说明（工具无关）
├── CLAUDE.md            # Claude Code 项目级指令
└── plugin.json          # 插件元信息
```

---

## 贡献

欢迎提交 Issue 和 PR。

- 新增 skill：在 `skills/` 下创建目录，包含 `SKILL.md`
- 改进现有 skill：直接修改对应的 SKILL.md
- 新增 Loop 模式：在 `loops/` 下定义 Entry / Body / Exit / State / Safety
- 新增平台适配：在对应工具的配置目录下添加文件

---

## License

MIT © [dotVSdoll](https://github.com/dotVSdoll)
