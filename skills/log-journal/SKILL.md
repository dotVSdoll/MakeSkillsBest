---
name: log-journal
description: "循环日志管理 — 每个阶段产出结构化 markdown 日志，记录完整分析过程，可追溯、可检索。自动保存到 .loop-log/，支持按阶段/日期/关键词检索。"
argument-hint: "save loop log | show journal | what did we find in phase 3"
dependencies:
  upstream:
    - engineering-loop
  downstream: []
---

# Log Journal — 循环日志管理

## 概述

**Loop 的每一轮、每一阶段都有可追溯的完整记录。** 不只是 `.repo-loop-state.json` 的机器可读状态——这是给 Loop Agent 和开发者看的优化日志。

**核心原则:** 日志是**记录过程**的，不是**摘要**。详细分析文档（知识图谱、项目概览、架构文档）写入 `docs/loop-docs/`——日志写的是"这一阶段发生了什么、做了什么决定、为什么"。

---

## 日志文件结构

```
.loop-log/
└── {YYYY-MM-DD}_{repo-name}-{goal-slug}/
    ├── 00-detect.md              # Agent 检测 + 适配器选择
    ├── 01-env-ready.md           # 环境就绪检查 + 自动准备
    ├── 02-observe.md             # 风格画像 + 项目身份
    ├── 03-understand.md          # 语义理解 + 方向验证
    ├── 04-diagnose.md            # 安全审计 + 质量诊断
    ├── 05-plan.md                # 修复计划 + 任务 DAG
    ├── 06-bound.md               # 修改白名单 + 红区
    ├── 07-fix.md                 # 每次修复任务的详细记录
    ├── 08-verify.md              # 验证结果
    ├── 09-self-review.md         # 自审发现
    ├── 10-learn.md               # 经验教训
    └── INDEX.md                  # 快捷索引
```

**目录命名:** `{YYYY-MM-DD}_{repo-name}-{goal-slug}`

**v2.0 变化:**
- 移除 50 行硬上限 → 完整记录分析过程
- 移除"简化模式" → 不自动截断任何内容
- 新增 00-detect 和 01-env-ready 日志
- 日志引用 `docs/loop-docs/` 中的详细文档，不重复内容

---

## 日志与详细文档的分工

| 内容 | 位置 | 读者 |
|---|---|---|
| 完整知识图谱（调用链、数据流、模块依赖） | `docs/loop-docs/knowledge-graph.md` | Agent + 开发者 |
| 项目概览（模块详解、设计决策） | `docs/loop-docs/project-overview.md` | Agent + 开发者 |
| 架构文档（架构图、文件索引） | `docs/loop-docs/architecture.md` | Agent + 开发者 |
| 阶段日志（发生了什么、做了什么决定） | `.loop-log/` | 开发者追溯 |

**日志不重复详细文档的内容——日志引用文档，记录过程和决策。**

---

## 每条日志的标准格式

```
# [Phase名称]

⏱️ {ISO timestamp} | Loop #{n} | {repo} | 环境: {🟢🟡🟠🔴}

---

## 输入
- 从上一阶段接收到的状态和上下文
- 本阶段启动时 .repo-loop-state.json 的关键字段

## 执行过程
- [步骤1] — 做了什么
- [步骤2] — 工具调用: [工具名] → [结果摘要]
- ... (完整记录，不省略)

## 关键发现
- [发现 1] — [证据: file:line]
- [发现 2] — [证据: file:line]

## 决策
- [决策 1] — [理由为什么这样决定]
- [决策 2] — [替代方案考虑过但否决了，原因]

## 数据
| 指标 | 值 |
|---|---|
| [名称] | [数值] |

## 输出
- 写入 .repo-loop-state.json 的字段
- 生成的详细文档: docs/loop-docs/[文件名]
- 传递给下一阶段的数据

## 耗时
- 开始: HH:MM:SS
- 结束: HH:MM:SS
- 耗时: Ns / Nmin

## 下一阶段
[下一阶段名] — [预期做什么]
```

---

## 写入规则

### 规则 1: 完整记录，不截断

- **不再有 50 行硬上限。** 记录为完整所需的全部行数。
- 如果某条发现需要 4-5 行来解释"为什么这是个发现"——写 4-5 行。
- 如果某个决策需要解释"替代方案为什么被否决"——写清楚。

### 规则 2: 证据绑定（不可妥协）

- 每个"发现"必须有 `file:line` 或状态文件字段引用
- 不允许"可能""似乎""感觉"等无证据断言
- 代码引用: file:line，不粘贴代码块

### 规则 3: 禁止的写法

- ❌ 粘贴源代码（引用 file:line 即可）
- ❌ 重复 `docs/loop-docs/` 中已有的详细分析（引用文档路径即可）
- ❌ "我做了 X"（主语用 Loop，不是 Agent）
- ❌ 空条目（如果某个章节无内容，删除该章节而非写"暂无"）

### 规则 4: 日志之间保持连贯

- 每条日志的开头引用上一阶段的 INDEX.md 条目
- 每条日志的结尾引用本阶段产出的详细文档路径
- INDEX.md 在每阶段完成后即时更新

---

## 各阶段日志的特殊内容

### 00-detect.md
```
额外记录:
- 检测到的 Agent 工具和版本
- 读取的配置路径和内容摘要
- 选择的 Adapter 及其原因
- Adapter 能力矩阵 (subtaskModel, timeout, CLI, network)
```

### 01-env-ready.md
```
额外记录:
- 环境检测的原始结果 (每项: ✅/❌)
- 自动执行的操作和结果 (pip install, venv create, .env copy)
- 需要开发者手动完成的操作清单
- 最终 environmentTier 和降级原因 (如从 🟢 降到 🟡)
```

### 04-diagnose.md
```
额外记录:
- security-audit 的每条 finding (ID, severity, location, issue, evidence)
- quality-audit 的每条 finding (ID, dimension, severity, location, issue)
- 如果 environmentTier < 🟢，标注哪些检查因环境受限而置信度降低
- CLI 工具输出 (如 pip-audit 的原始输出摘要)
```

### 07-fix.md
```
额外记录 (每个修复任务一节):
- 任务 ID + 目标文件
- 修改前状态: 问题描述 + file:line
- 修改后状态: 新的 file:line + 为什么这样改
- 风格约束检查: 与 styleProfile 的对照
- 白名单/红区检查: 通过/未通过
- commit message
```

---

## INDEX.md 格式

```markdown
# Loop Index — {session_id}

| 阶段 | 状态 | 关键发现 | 文档引用 |
|---|---|---|---|
| 00-detect | ✅ | agent:claude-code, adapter: inline | meta.adapterConfig |
| 01-env-ready | ✅ | tier:🟡, auto:venv+deps | — |
| 02-observe | ✅ | style:snake_case, scale:L | docs/loop-docs/project-overview.md |
| 03-understand | ✅ | direction:code-quality | docs/loop-docs/knowledge-graph.md, architecture.md |
| 04-diagnose | ✅ | SEC:0C/0H/3M/1L, QUAL:0C/2H/3M/1L | .repo-loop-state.json:diagnose |
| 05-plan | ✅ | tasks:5, batches:2 | .repo-loop-state.json:plan |
| 06-bound | ✅ | allowed:4, forbidden:3 | .repo-loop-state.json:bound |
| 07-fix | ✅ | tasks:5/5, files:7 | git diff |
| 08-verify | ✅ | all files compile | — |
| 09-self-review | ✅ | 2 issues found + fixed | — |
| 10-learn | ✅ | next:refactor-analyzer-core | — |
```

**检索命令:** `grep "SEC-CRIT" .loop-log/*/INDEX.md` 或 `grep "QUAL-HIGH" .loop-log/*/INDEX.md`

---

## 文档规模约束

**下限（低于此值 = 敷衍，不可接受）:**

| 日志 | 下限 | 检查方式 |
|---|---|---|
| 每条阶段日志 | ≥ 5 个标准章节非空（输入/执行过程/关键发现/决策/输出） | 章节数 ≥ 5 |
| 执行过程 | ≥ 3 个步骤记录 | 步骤数 ≥ 3 |
| 关键发现 + 决策 | ≥ 1 条（即使"无发现"也要写"未发现异常"并附证据） | 条目数 ≥ 1 |
| 00-detect | agent + adapter + capabilities 三个字段 | 逐字段检查 |
| 01-env-ready | checks + tier + autoPrepared + manualNeeded | 4 个字段 |
| 07-fix | 每个任务有修改前后对照 | 任务数 = 记录数 |

**上限（超过此值 = 膨胀，需拆分）:**

| 日志 | 上限 | 超过时操作 |
|---|---|---|
| 单条阶段日志 | 200 行 | 拆分子文件 `{phase}-{part}.md`，主日志写摘要 + 引用 |
| INDEX.md | 30 行 | 已经足够——超过说明 loop 轮次过多或阶段过多 |
| 07-fix 日志 | 每任务 ≤ 40 行 | 拆分 `07-fix-{task}.md`，主 07-fix 写任务清单 + 引用 |

**规则：** 日志的"完整"指过程完整，不指字数多。每个步骤 1-3 行描述 = 完整。不需要 10 行描述一个 `git add`。

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这阶段没什么可记录的，跳过日志" | 每个阶段都有状态变化——至少有"输入"和"输出"。不存在"无内容"的阶段。 |
| 2 | "日志太长，我简化一下" | 日志的价值在完整性。省略的步骤 = 将来无法追溯的盲区。 |
| 3 | "把代码粘贴进去方便以后看" | 代码会过时。引用 file:line + docs/loop-docs/ 的详细文档。 |
| 4 | "INDEX 漏一行没关系" | INDEX 是唯一的检索入口。漏了 → 这个阶段在日志系统中不可发现。 |
| 5 | "50 行硬上限是为了简洁" | v2.0 移除上限。简洁不等于删内容。日志的"简洁"靠结构，不靠截断。 |

## 验证清单

- [ ] 每个已完成阶段有对应日志文件
- [ ] 每条发现绑定 file:line 或状态文件字段
- [ ] 日志中引用 docs/loop-docs/ 的详细文档而非重复内容
- [ ] INDEX.md 包含所有阶段的快捷链接和关键标签
- [ ] 无源代码粘贴块（引用 file:line）
- [ ] 每次 Fix 任务有修改前后对照
