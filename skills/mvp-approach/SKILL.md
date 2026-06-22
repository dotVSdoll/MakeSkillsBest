---
name: mvp-approach
description: "最小可行性方案 — 基于已完成的全项目分析（repo-decompose + knowledge-graph + semantic-rag），设定最严格的最小边界条件，剪裁出刚好能跑的核心路径。"
argument-hint: "mvp approach for [project] | draw the boundary | what's the smallest runnable path"
dependencies:
  upstream:
    - repo-decompose   # 需求树
    - knowledge-graph  # 符号关系
    - semantic-rag     # 项目语义方向
  downstream: []
---

# MVP Approach — 最小可行性方案

## 概述

**本 skill 不从头分析项目。** 它在前置 skill 已经跑通全项目分析之后才介入。此时 agent 脑中已经拥有：

- `repo-decompose` 产出的**三层需求树**（架构需求 / 数据需求 / 逻辑需求）
- `knowledge-graph` 产出的**符号调用链 + 数据流 + 模块依赖图**
- `semantic-rag` 产出的**项目语义方向 + 多语言解释 + RAG 索引**

在这些完整信息的支撑下，`mvp-approach` 只做一件事：

> **设定最严格的最小边界条件，从需求树中剪裁出恰好能让项目跑起来的那条核心路径。**

核心原则：**不是"从零开始想怎么做"，而是"已经知道了全部，现在砍掉一切非必需的"。**

## PRECONDITIONS — 硬门控（不满足即拒绝执行）

**本 skill 是流水线终点。上游输出缺失时，必须拒绝执行并告知用户缺少什么。**

```
门控检查（按顺序，第一个失败即 STOP）:

[1] .repo-decompose-context.json 存在？
    NO → STOP. 输出: "❌ 缺少 repo-decompose 的输出。请先运行 /decompose <repo-url>"
    
[2] architecture.status == "done"？
    NO → STOP. 输出: "❌ 架构层分析未完成。请等待 repo-decompose Phase 1 完成"
    
[3] data.status == "done" && logic.status == "done"？
    NO → STOP. 输出: "❌ 数据层/逻辑层分析未完成。请等待 repo-decompose Phase 2 完成"

[4] merge == "done"？
    NO → STOP. 输出: "❌ 需求树未合并。repo-decompose Phase 3 仍在进行"
    
[5] supplements.knowledgeGraph != null？
    NO → STOP. 输出: "❌ 缺少 knowledge-graph 分析。请运行 /graph <repo-path>"
    
[6] supplements.semanticRAG != null？
    NO → STOP. 输出: "❌ 缺少 semantic-rag 分析。请运行 /explain <repo-path>"

所有 6 项通过 → 进入 Step 1
```

**决不允许的行为：**
- ❌ 门控失败后自行"估计"或用 WebSearch 凑数
- ❌ 跳过门控直接进入 Step 1
- ❌ 门控失败后建议用户"要不直接看代码吧"

## 工作流

### Step 1: 收束语义方向

基于 `semantic-rag` 的项目语义概览，回答一个问题：

> 这个项目的"唯一正确方向"是什么？

这不是开放式提问。是**从已有分析中提炼**，而不是重新猜测。

```
输入: semantic-rag 项目身份卡 + 语义概览
输出: 一句话方向声明

示例:
  身份卡: "Next.js 全栈 Web 应用, App Router, 提供代码仓库可视化分析"
  方向声明: "让开发者在浏览器中输入 GitHub URL，30 秒内获得项目架构全景图"
```

**反模式：**
- ❌ 把方向声明写成功能列表
- ❌ 方向声明中出现"和"/"以及"/"同时"
- ❌ 重新猜测项目方向（semantic-rag 已经分析过了——信任它的结论）

**自检：** 方向声明能不能用 15 个字以内说出来？不能 → 继续收束。

### Step 2: 标注需求树 — 核心 vs 非核心

把 `repo-decompose` 的需求树拿过来，逐项标注：

```
标注规则:
  🔴 核心路径 — 删掉它，方向声明中的动作就无法演示
  🟡 支撑路径 — 核心路径需要它，但它不直接可见
  ✂️ 可砍 — 删掉它，核心动作仍然能演示
```

标注过程不需要重新分析需求——需求树已经由 `repo-decompose` 的各层子 Agent 并行分析产出。本步骤只做**判定**。

```
示例 (基于 "GitHub URL → 架构全景图" 方向):

📦 repo-visualizer
├── 🏗️ 架构需求
│   ├── 🔴 REQ-A1: URL 解析模块
│   ├── 🟡 REQ-A2: Git 浅克隆模块
│   └── ✂️ REQ-A3: 多仓库对比功能
├── 🗄️ 数据需求
│   ├── 🔴 REQ-D1: 文件树数据结构
│   ├── ✂️ REQ-D2: 历史版本存储
│   └── ✂️ REQ-D3: 用户偏好持久化
└── 🧠 逻辑需求
    ├── 🔴 REQ-L1: 项目类型识别 (Node/Python/Go)
    ├── 🔴 REQ-L2: 架构图生成器
    ├── 🟡 REQ-L3: 依赖关系解析
    └── ✂️ REQ-L4: 代码质量评分
```

**判定辅助（来自前置数据）：**

| 判断依据 | 来源 skill | 用法 |
|---|---|---|
| 这个模块被核心路径调用了吗？ | knowledge-graph 调用链 | 不在调用链上 → ✂️ |
| 这个数据是核心动作的输入/输出吗？ | knowledge-graph 数据流 | 不在数据流上 → ✂️ |
| 这个模块在语义概览中被提及了吗？ | semantic-rag 语义概览 | 没提及 → 大概率 ✂️ |

**出口标准：** 所有 REQ 都被标注为 🔴 / 🟡 / ✂️，且 🔴 的数量 ≤ 🟡 + ✂️ 的数量（核心路径应该是最窄的）。

### Step 3: 设定最小边界条件

核心路径已标出。现在设定**硬边界**——超过即停止。

**边界不是拍脑袋的数字。** 根据 `semantic-rag` 识别的项目类型，按以下分层标准设定：

```
项目类型检测（来自 semantic-rag 项目身份卡）:

┌────────────────────┬──────────┬──────────┬──────────┬──────────────────────────┐
│ 项目类型            │ 代码上限  │ 文件上限  │ 依赖上限  │ 典型项目                  │
├────────────────────┼──────────┼──────────┼──────────┼──────────────────────────┤
│ 脚本/工具           │ ≤200 行  │ ≤3 文件  │ 0        │ 单文件 CLI、Shell 工具    │
│ Web API/服务        │ ≤500 行  │ ≤5 文件  │ ≤2       │ Express/FastAPI 端点      │
│ CLI/MCP 工具        │ ≤800 行  │ ≤8 文件  │ ≤3       │ MCP server、dev 工具链    │
│ 系统软件/DB/编译器   │ 1000-1500│ ≤12 文件 │ ≤5       │ SQLite store、LSP、编译器  │
│                    │ (骨架版) │          │          │                          │
└────────────────────┴──────────┴──────────┴──────────┴──────────────────────────┘

共同硬边界:
□ 配置项上限:    0 (全部硬编码)
□ 抽象层上限:    0 (无 interface / abstract class / factory)
□ 步骤数上限:    核心路径 🔴 数量 (每个 🔴 → 一个实现步骤)
```

**为什么不能一刀切 200 行：** 对 Web demo 或小脚本，200 行是合理的。但对 MCP server、SQLite store、LSP 这类系统软件，200 行很可能连骨架都搭不起来——agent 会为了满足边界而产出假的 MVP（跳过必要的初始化/错误处理/资源释放）。分层之后，每个类型有自己合理的"最小"定义。

**为什么边界要按项目类型分层：**
Agent 知道整个项目的全貌（来自前置 skill），也知道了项目类型（来自 semantic-rag 身份卡）。同样的"核心路径"在不同类型的项目里，实现代价完全不同——一个编译器的"核心路径"天然比一个脚本大 5-10 倍。分层边界确保 Agent 不会为了凑数字而省略骨架代码。

### Step 4: 生成最小实现路径（倒推）

从核心动作的终点**倒推**实现步骤。每步一个可验证产物：

```
格式:

Step N (最终): [核心动作的用户可见结果]
  → 验证: [用户看到什么]
  → 依赖: [需要 Step N-1 提供什么]

Step N-1: [让 Step N 能跑的最近依赖]
  → 验证: [用户/终端看到什么]

... (倒推到入口)

Step 1: [用户触发/输入]
  → 验证: [用户看到什么]
```

**倒推规则：**
1. 每一步只问："要让下一步跑起来，最少还需要什么？"
2. 假数据 > 真数据。硬编码 > 配置。单文件 > 多文件。
3. 如果 knowledge-graph 显示某依赖的调用链深度 > 3，考虑直接 mock 掉
4. 步骤数必须在 Step 3 设定的边界内

**出口：** 一份带验证点的倒推实现清单，步骤数不超过边界上限。

### Step 5: 输出最终方案

```
🎯 方向声明: [来自 Step 1]

📋 最小实现路径:
  Step 1: [动作] → 验证: [可见结果]
  Step 2: [动作] → 验证: [可见结果]
  ...

🔒 边界条件:
  文件数 ≤ N | 行数 ≤ M | 依赖数 ≤ D | 步骤数 ≤ S

✂️ 已剪裁:
  [需求ID] — [一句话理由]
  ...

📊 来源:
  需求树: repo-decompose
  符号关系: knowledge-graph
  语义方向: semantic-rag
```

---

### Step 6: 运行验证层（Execution-Proof）

**方案写完了不等于能跑。** 必须从构建文件中提取验证命令，并逐条执行：

```
验证层级（从弱到强）:

Level 1 — 能否 build?
  → 从构建文件自动提取编译命令:
    Makefile → make / make -f Makefile.cbm
    CMakeLists.txt → cmake --build build/
    package.json → npm run build / yarn build
    go.mod → go build ./...
  → 执行编译 → 必须 PASS

Level 2 — 能否 run --help?
  → 执行 ./binary --help 或 npm start --help
  → 必须输出非空帮助文本

Level 3 — 能否跑一个最小 CLI command?
  → 核心动作的最简形式
  → 示例: ./graph --query "main"
  → 必须返回 exit code 0 + 非空输出

Level 4 — 能否产生一个最小产物?
  → 如果项目产生文件输出 (graph.db, report.json, build/...)
  → 验证产物存在 + 文件大小 > 0

Level 5 — 能否验证产物内容?
  → 示例: sqlite3 graph.db "SELECT * FROM symbols LIMIT 1" → 返回一行
  → 示例: cat report.json | jq '.modules[0]' → 非 null
```

**提取验证命令的方法：**

```
1. 扫描构建文件:
   Makefile → 提取 test / test-*/ check / cbm 等 target
   package.json → 提取 scripts.test / scripts.verify
   CMakeLists.txt → 提取 add_test() 或 CTest 配置

2. 识别最小验证路径:
   取第一个不需要外部服务的 target
   示例: make test-foundation ✅  vs make test-integration (需要 Docker) ❌

3. 在最终方案中追加验证清单:
   ✅ L1 build: make -f Makefile.cbm → PASS
   ✅ L2 help: ./cbm --help → "Codebase Mapper v0.1"
   ✅ L3 command: ./cbm index ./src → "Indexed 142 symbols"
   ✅ L4 artifact: ls graph.db → 20480 bytes
   ✅ L5 verify: ./cbm search "main" → "src/main.c:15"
```

**如果验证失败：** 不降级交付。回到 Step 4，重新评估最小路径是否真的最小。

**最终方案中追加：**

```
🔬 运行验证:
  L1 build: [命令] → [结果]
  L2 help:  [命令] → [结果]
  L3 run:   [命令] → [结果]
  L4 artifact: [文件] → [大小]
  L5 verify: [命令] → [结果]
```

---

## 反合理化表

| # | Agent 借口 | 为什么在这个阶段不成立 |
|---|---|---|
| 1 | "knowledge-graph 显示这个模块被很多地方依赖，应该保留" | 被依赖 ≠ 核心路径需要。高扇入模块不在 🔴 路径上 → 仍砍 |
| 2 | "semantic-rag 提到这个模块是'重要的'" | "重要"是语义判断，不是核心路径判断。只认 🔴 |
| 3 | "这个 REQ 标注 🟡 但其实很容易一起做掉" | "容易"不是保留的理由。✂️ 就是 ✂️ |
| 4 | "边界条件太严格了，稍微放宽一点" | 边界是先算出来的，不是猜的。不谈判 |
| 5 | "repo-decompose 的架构层提到了这个，应该做" | 架构分析是全面分析，mvp 只取核心路径 |

## 红牌警告

- 🚩 Step 1 的方向声明超过 15 个字
- 🚩 Step 2 的 🔴 标注数量超过总 REQ 的 40%
- 🚩 Step 3 的边界条件有任何一项被"酌情放宽"
- 🚩 Step 4 的步骤中出现 knowledge-graph 未覆盖的新依赖
- 🚩 最终方案中没有引用前置 skill 的输出

## 验证要求

- [ ] 最终方案中每个 🔴 REQ 都能在 knowledge-graph 调用链上找到对应路径
- [ ] 最终方案的方向声明与 semantic-rag 的语义概览一致（不矛盾）
- [ ] 所有 ✂️ 标注都有明确的剪裁理由
- [ ] 边界条件中的每个数字都有推导来源（来自需求树 + 依赖图）
- [ ] 最终方案 ≤ 一页（以 80 列终端为准）
