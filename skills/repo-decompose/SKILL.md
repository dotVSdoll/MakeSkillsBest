---
name: repo-decompose
description: "GitHub 仓库需求拆分 — 两阶段调度（架构先跑 → 数据+逻辑并行），按仓库规模自适应分片，所有子 agent 通过共享上下文同步信息，主 agent 空闲期拉取 knowledge-graph 和 semantic-rag。"
argument-hint: "decompose https://github.com/owner/repo | split [repo] requirements"
dependencies:
  downstream:
    - knowledge-graph  # 主 agent Phase 2 空闲期调用
    - semantic-rag     # 主 agent Phase 2 空闲期调用
  upstream: []
---

# Repo Decompose — 仓库需求拆分

## 概述

将 GitHub 仓库的系统级理解转化为**三层需求树**（架构 → 数据 → 逻辑）。

**核心设计：**
- **两阶段调度** — Phase 1 架构层先跑（30s），Phase 2 数据层+逻辑层并行
- **按仓库规模自适应分片** — 小仓库不拆，大仓库按目录水平拆分
- **共享上下文** — 所有子 agent 读写同一份结构化中间文件，信息完全透明
- **主 agent 不空转** — Phase 2 等待期间调用 `knowledge-graph` 和 `semantic-rag` 拉符号表和语义卡

**下游消费：** 需求树直接输入 `mvp-approach`，由其剪裁出核心路径。

## PRECONDITIONS — 流水线门控（执行前必须检查）

**本 skill 是流水线入口点，无上游依赖。** 但必须检查是否存在残留的共享上下文：

```
检查: .repo-decompose-context.json 是否存在？

  NO → 正常启动，从 Phase 0 开始
  YES → 检查 merge 字段:
    merge == "done" → 需求树已生成，直接输出结果（不重新分析）
    merge != "done" → 断点续跑（从第一个 status != "done" 的阶段继续）
```

**下游 skill 强制依赖：** 本 skill 完成后，`mvp-approach` 可以触发。`knowledge-graph` 和 `semantic-rag` 可以被主 agent 在 Phase 2 空闲期自动调用——无需用户手动触发。

## 触发条件

- 接手陌生开源项目，需要快速理解架构全貌
- 为仓库写需求文档或重构计划
- 评估改动范围和工作量
- 作为 `mvp-approach` 的前置步骤

---

## 共享上下文架构

**这是本 skill 最重要的设计约束——不共享信息，并行毫无意义。**

所有子 agent 通过一份**共享上下文文件（Shared Context）** 交换信息，不直接互调。

```
共享上下文: .repo-decompose-context.json (主 agent 创建，所有子 agent 读写)

         ┌──────────────────────────────────┐
         │         Shared Context            │
         │                                  │
         │  ┌ meta ───────────────────────┐ │
         │  │ owner/repo, language, framework│
         │  └──────────────────────────────┘ │
         │                                  │
         │  ┌ architecture (Phase 1 写入) ─┐│
         │  │ 模块边界、入口、依赖方向       ││
         │  └──────────┬───────────────────┘│
         │             │ 架构结果写入后       │
         │             │ Data/Logic 立即可读  │
         │             ▼                    │
         │  ┌ data (Phase 2 写入) ─────────┐│
         │  │ 数据模型、流转路径、存储层     ││
         │  └──────────────────────────────┘ │
         │                                  │
         │  ┌ logic (Phase 2 写入) ────────┐│
         │  │ 核心函数、控制流、错误处理     ││
         │  └──────────────────────────────┘ │
         │                                  │
         │  ┌ supplements ────────────────┐ │
         │  │ knowledge-graph 符号表        ││
         │  │ semantic-rag 语义卡           ││
         │  └──────────────────────────────┘ │
         └──────────────────────────────────┘
```

**共享规则：**
1. **主 agent 创建并初始化** `meta` 区块（仓库名、语言、框架、入口文件）
2. **架构子 agent** 写入 `architecture` 区块，完成后标记 `architecture: done`
3. **数据子 agent** 启动时等待 `architecture: done`，从共享上下文读取模块边界，写入 `data` 区块
4. **逻辑子 agent** 启动时等待 `architecture: done`，从共享上下文读取模块边界，写入 `logic` 区块
5. **数据层和逻辑层不互读** — 它们分析不同维度，不需要彼此的结果
6. **主 agent** 在 Phase 2 等待期写入 `supplements` 区块（knowledge-graph + semantic-rag）

**为什么这样设计：**
- 不直接互调 → 避免子 agent 间耦合，任何一个挂了不影响其他
- 架构先写入 → 数据层和逻辑层不需要自己扫描目录结构
- 共享上下文是单文件 → 合并阶段主 agent 只需要读一个文件

---

## 工作流

### Phase 0: 仓库获取 + 元信息初始化（主 Agent）

```
⏱ 预估耗时: 10-30s（取决于仓库大小和网络）

Step 0.1: 解析 GitHub URL → owner/repo
Step 0.2: 浅克隆仓库（--depth 1 --single-branch）
Step 0.3: 统计文件数，确定仓库规模级别
Step 0.4: 扫描 package.json / go.mod / Cargo.toml 等 → 确定语言/框架
Step 0.5: 定位入口文件（main 字段、bin 字段、约定入口）
Step 0.6: 写入共享上下文 meta 区块
```

**仓库规模分级（决定 Phase 1/2 的水平分片数）：**

| 级别 | 源文件数 | 架构层分片 | 数据层分片 | 逻辑层分片 | 总子 agent 上限 |
|---|---|---|---|---|---|
| S | < 100 | 1 (不分) | 1 (不分) | 1 (不分) | 3 |
| M | 100 - 500 | 1-2 | 1-2 | 1-2 | 7 |
| L | 500 - 2000 | 2-3 | 2-3 | 2-3 | 13 |
| XL | > 2000 | 3 | 3 | 3 | 13 (硬上限) |

**硬上限 13 的原因：** 超过 13 个子 agent 后，合并矛盾的时间超过并行节省的时间。XL 级别仓库不增加子 agent，而是每个子 agent 分配更多文件。

**出口：** 共享上下文 `meta` 已写入。仓库文件总数、语言、入口已确认。

---

### Phase 1: 架构层分析（1 个或多个子 Agent，取决于规模）

```
⏱ 预估耗时: 30-60s
依赖: 共享上下文 meta 区块
写入: 共享上下文 architecture 区块
```

**分析任务：**

| 分析项 | 产出 | 写入 shared context 的字段 |
|---|---|---|
| 模块边界 | 每个顶级目录/包的职责一句话 | `architecture.modules[]` |
| 入口与出口 | 对外暴露的 API/CLI/界面入口 | `architecture.entries[]` |
| 依赖方向 | 模块间依赖关系 + 循环依赖标注 | `architecture.depGraph` |
| 关键抽象 | 接口/基类/核心类型定义的位置 | `architecture.abstractions[]` |

**S 级别（不分片）：** 1 个子 agent 扫全部文件。

**M/L/XL 级别（水平分片）：** 按顶级目录拆分，每个子 agent 负责 1-2 个目录。

```
示例 (M 级别, 分 2 片):
  子 Agent A1: 负责 src/core/, src/utils/
  子 Agent A2: 负责 src/api/, src/ui/

  各自写入 architecture.modules[].responsibility
  都完成后主 agent 拼接为完整架构图
```

**完成后写入共享上下文并标记：**
```json
{
  "architecture": {
    "status": "done",
    "modules": [...],
    "entries": [...],
    "depGraph": {...},
    "abstractions": [...]
  }
}
```

**验证：** 架构层覆盖了所有源文件目录，依赖图中没有孤立的模块。

---

### Phase 1.5: 证据矩阵生成（主 Agent — Phase 1 完成后立即执行）

**架构层分析只说了"有什么模块"。证据矩阵回答"你怎么知道"。** 在子 agent 进入数据层和逻辑层分析之前，主 agent 必须先为每个模块绑定具体证据：

```
证据矩阵格式:
| 模块 | 证据文件 | 入口函数 | 依赖方向 | 是否核心路径 |
```

| 字段 | 含义 | 提取方法 |
|---|---|---|
| 模块 | 架构层识别的模块名 | `architecture.modules[]` |
| 证据文件 | 该模块存在的最强证据 | 构建文件中的编译目标 / 源码中的导出点 |
| 入口函数 | 该模块的入口（CLI command / API handler / main） | `search_content` 搜 `main(` / `register_tool(` / `route(` |
| 依赖方向 | 它依赖谁 → 被谁依赖 | `architecture.depGraph` 对应行 |
| 是否核心路径 | 删掉它，核心动作还能演示吗？ | 主 agent 判定 |

**证据优先级（同 semantic-rag 的 README 降权规则）：**
1. **构建文件** — 被编译/链接 = 最高置信度
2. **源码入口函数** — 有明确的 `main`/`handler`/`command` 定义
3. **注释/文档** — 最低置信度，仅作辅助

**示例（基于 C 项目的 MCP server）：**

```
| 模块 | 证据文件 | 入口函数 | 依赖方向 | 核心路径 |
|------|---------|---------|---------|---------|
| mcp | mcp.c:142 tool_table[] | mcp_register_tools() | dep→pipeline, store | ✅ 是 |
| pipeline | pipeline.c:89 pass注释 | pipeline_run() | dep→extraction, LSP | ✅ 是 |
| store | store.c:33 sqlite3_open | store_init() | dep→none | ✅ 是 |
| extraction | extraction.c:12 extract_symbols() | extract_from_buffer() | dep→tree-sitter | 🟡 支撑 |
| LSP | lsp.c:200 lsp_initialize() | lsp_start_server() | dep→tree-sitter | 🟡 支撑 |
| watcher | watcher.c:55 inotify_init | watcher_start() | dep→store | ✂️ 可砍 |
| UI | ui.c:80 ncurse_init() | ui_render() | dep→pipeline | ✂️ 可砍 |
```

**出口标准：** 每个架构层模块都有一行证据矩阵，且"证据文件"字段指向具体的 `文件:行号`。

**为什么必须在 Phase 2 之前做：** 数据层和逻辑层子 agent 启动时需要知道"哪些模块的入口函数值得深挖"。没有证据矩阵，子 agent 会平均用力——把 watcher 和 mcp 分析得一样深。有了证据矩阵，"核心路径"标记直接告诉子 agent 优先追踪哪些入口的调用链。

---

### Phase 2: 数据层 + 逻辑层并行分析

```
⏱ 预估耗时: 60-120s（并行，等于慢的那个）
依赖: 共享上下文 architecture.status == "done"
写入: 共享上下文 data 区块 + logic 区块

同时: 主 agent 在等待期间 → 调用 knowledge-graph + semantic-rag
       写入共享上下文 supplements 区块
```

#### 数据层子 Agent

**启动条件：** 读取共享上下文 `architecture.modules[]` 获取模块边界。

| 分析项 | 产出 | 写入字段 |
|---|---|---|
| 核心数据模型 | 主要 struct/class/type 及字段 | `data.models[]` |
| 数据流转 | 数据从入口 → 各层 → 存储的路径 | `data.flows[]` |
| 存储层 | 数据库/文件/缓存方案及位置 | `data.storage` |
| 状态管理 | 全局状态、上下文传递方式 | `data.stateManagement` |

**水平分片策略（区别于架构层）：** 按**数据域**拆分，不按目录拆分。

```
示例 (M 级别, 分 2 片):
  子 Agent D1: 追踪 User/Account/Auth 相关数据
  子 Agent D2: 追踪 业务实体 (Order/Product/...) 相关数据

  各自追踪自己的数据域从创建到销毁的完整生命周期
```

#### 逻辑层子 Agent

**启动条件：** 读取共享上下文 `architecture.modules[]` 获取模块边界。

| 分析项 | 产出 | 写入字段 |
|---|---|---|
| 核心函数 | 项目中最关键的函数/方法及签名 | `logic.coreFunctions[]` |
| 控制流 | 主业务路径的分支和循环 | `logic.controlFlows[]` |
| 错误处理 | 错误定义、传播和恢复方式 | `logic.errorHandling` |
| 关键决策点 | 开关/配置/策略模式位置 | `logic.decisionPoints[]` |

**水平分片策略（区别于数据层）：** 按**关注面**拆分。

```
示例 (M 级别, 分 2 片):
  子 Agent L1: 分析 happy path（正常业务路径）
  子 Agent L2: 分析 error path（异常处理、边界条件、回退逻辑）

  各自产出调用链，主 agent 合并为完整控制流
```

#### 主 Agent 在 Phase 2 期间（不空转）

数据层和逻辑层子 agent 并行运行时，主 agent 同步执行：

| 动作 | 产物 | 写入共享上下文 |
|---|---|---|
| 调用 `knowledge-graph` | 符号表 + 调用链 + 数据流 + 模块依赖 | `supplements.knowledgeGraph` |
| 调用 `semantic-rag` | 项目身份卡 + 语义概览 + RAG 索引 | `supplements.semanticRAG` |

**为什么这个时机最优：**
- knowledge-graph 的符号表能帮主 agent 后续验证子 agent 的调用链是否完整
- semantic-rag 的语义卡能帮主 agent 判断子 agent 的模块职责描述是否准确
- 不额外增加总耗时——子 agent 跑多久，主 agent 就拉多久

**完成后标记：**
```json
{
  "supplements": {
    "status": "done",
    "knowledgeGraph": {...},
    "semanticRAG": {...}
  }
}
```

---

### Phase 3: 需求树合并（主 Agent）

```
⏱ 预估耗时: 30-60s
输入: 共享上下文 architecture + data + logic + supplements
输出: 三层需求树
```

**合并规则：**

1. **架构需求** — 从 `architecture.depGraph` 中提取循环依赖、高扇入模块、缺少边界的模块
2. **数据需求** — 从 `data.flows[]` 中提取数据流断点、类型不一致、缺少验证的入口
3. **逻辑需求** — 从 `logic.coreFunctions[]` 和 `logic.errorHandling` 中提取职责过重函数、缺失的错误处理

**交叉验证（利用 supplements）：**
- 子 agent 写的调用链 vs `knowledge-graph` 的符号调用链 → 不一致处标记为 `⚠️ 需人工确认`
- 子 agent 写的模块职责 vs `semantic-rag` 的语义概览 → 矛盾处标记为 `⚠️ 需人工确认`

**输出格式：**
```
📦 [owner/repo]
├── 🏗️ 架构需求
│   ├── REQ-A1: [摘要] P0/M/size
│   │   来源: architecture.depGraph.cycles[0]
│   │   依赖: 无
│   │   验证: [如何确认完成]
│   └── ...
├── 🗄️ 数据需求
│   └── ...
├── 🧠 逻辑需求
│   └── ...
└── ⚠️ 需人工确认 (如有)
    └── ...
```

**每个 REQ 的固定字段：**
- 优先级: P0 (阻塞核心路径) / P1 (核心路径内) / P2 (改善)
- 复杂度: S (< 50 行) / M (50-200 行) / L (> 200 行，建议再拆)
- 来源: 追溯到共享上下文的具体字段
- 依赖: 前置 REQ ID
- 验证: 一句话可验证标准

**出口：** 完整需求树写入共享上下文，标记 `merge: done`。

**新增：taskGraphHints — 为下游 task-graph 提供依赖提示。** 在需求树输出中追加：

```json
"taskGraphHints": {
  "suggestedBatches": [
    {
      "batch": 1,
      "reqs": ["REQ-A1", "REQ-L1"],
      "reason": "这两个 REQ 无相互依赖，可并行",
      "parallelizable": true
    }
  ],
  "suggestedCriticalPath": ["REQ-A1", "REQ-D1", "REQ-L2"],
  "crossLayerDependencies": [
    { "from": "REQ-A1 (架构)", "to": "REQ-D1 (数据)", "reason": "模块边界确定后才能追踪数据流" }
  ]
}
```

这些提示帮助 `task-graph` 更准确地建立任务 DAG。删除共享上下文文件（下游 skill 通过 `.repo-loop-state.json` 读取）。

---

## 关键设计决策（FAQ）

| 问题 | 答案 |
|---|---|
| 为什么架构层必须先跑？ | 数据层和逻辑层都需要模块边界才能工作。架构层不跑完，Phase 2 没法启动 |
| 数据层和逻辑层能互读吗？ | 不需要。它们分析不同维度。需要交叉验证时由主 agent 在 Phase 3 做 |
| 子 agent 之间能直接通信吗？ | 不允许。全部通过共享上下文。直接通信 = 耦合 = 一个挂了全挂 |
| 超过 13 个子 agent 怎么办？ | XL 级别硬上限 13。不增加 agent，增加每个 agent 的文件配额 |
| 共享上下文文件多大？ | S 级约 10-50 KB，XL 级约 200-500 KB。主 agent 读入内存合并，不用 grep |

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "仓库很小，不用分三层，我直接看" | 三层不是增加工作，是取代单线程阅读。小的仓库 Phase 1+2 合计 < 3 分钟 |
| 2 | "架构层和数据层合并成一个 agent 就行" | 混在一起 = 分析结果没有边界。等 mvp-approach 来剪裁时无法按层标注 🔴/✂️ |
| 3 | "主 agent 等 Phase 2 的时候可以闲着，节省 token" | 闲着才是浪费——knowledge-graph 和 semantic-rag 本来就要跑，趁这个时间跑 = 零额外耗时 |
| 4 | "共享上下文太复杂，子 agent 口头汇报就行" | 口头汇报 = 信息损失。主 agent 合并时必然遗漏细节。共享上下文是结构化单文件，干净且可追溯 |
| 5 | "水平分片太细了会冲突" | 架构层按目录分、数据层按数据域分、逻辑层按关注面分——三者的拆维不同，天然避免冲突 |

## 验证清单

- [ ] 共享上下文中 `architecture.status`, `data.status`, `logic.status` 都是 `done`
- [ ] `supplements` 中 knowledge-graph 和 semantic-rag 结果非空
- [ ] 需求树每个 REQ 的 `来源` 字段可追溯到共享上下文的具体路径
- [ ] 交叉验证未出现无来源的矛盾（⚠️ 标记均已说明）
- [ ] 子 agent 总数 ≤ 13
