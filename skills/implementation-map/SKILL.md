---
name: implementation-map
description: "基于 knowledge-graph 模块依赖 + mvp-approach 边界条件 + task-graph 任务清单，生成可修改文件白名单和禁止触碰红区。防止 Agent 无意中修改核心模块。"
argument-hint: "lock the boundary | show what I can modify | implementation map"
dependencies:
  upstream:
    - mvp-approach      # 边界条件 + 项目类型
    - knowledge-graph   # 模块依赖 + 扇入/扇出 + 循环依赖
    - task-graph        # 哪些文件将被修改
  downstream:
    - verification-loop # 验证时检查是否有禁止区域被触碰
    - engineering-loop  # 总控在 Act 阶段遵循此映射
---

# Implementation Map — 实现边界映射

## 概述

**代码修改前最后一道门。** 在 Agent 动手写代码之前，本 skill 精确回答三个问题：

1. ✅ **可以改哪些文件？** — 白名单，逐文件标注原因和行数上限
2. ❌ **绝对不能碰哪些文件？** — 红区，逐文件标注禁止原因
3. ⚠️ **改了某个文件会影响什么？** — 爆炸半径（blast radius）

输出写入 `.repo-loop-state.json` 的 `bound.implementationMap` 字段。

## PRECONDITIONS

```
[1] .repo-loop-state.json 中 observe.outputs.knowledgeGraph 非空？
    NO → STOP. "❌ 需要先运行 knowledge-graph"

[2] .repo-loop-state.json 中 observe.outputs.mvpApproach 非空？
    NO → STOP. "❌ 需要先运行 mvp-approach"

[3] .repo-loop-state.json 中 plan.taskGraph 非空？
    NO → STOP. "❌ 需要先运行 task-graph"
```

## 工作流

### Step 1: 提取任务涉及的文件

从 task-graph 中汇总所有任务的目标文件：

```
遍历 plan.taskGraph.nodes[].title → 提取文件路径
去重 → 候选修改文件列表
```

### Step 2: 查 knowledge-graph 依赖风险

对每个候选文件，查它在 knowledge-graph 中的位置：

```
查询:
  - 所在模块的扇出 (fanOut) → 它依赖了多少模块
  - 所在模块的扇入 (fanIn) → 多少模块依赖它
  - 是否在循环依赖环上
  - 是否在核心调用链上 (mvp-approach 🔴 路径)

判定:
  fanIn ≥ 5 → ⚠️ 高风险（修改影响面大）
  fanOut ≥ 7 → ⚠️ 高风险（模块职责可能过重，改动易引入副作用）
  在循环依赖环上 → 🔴 禁止修改（除非本轮目标就是解环）
  不在 task-graph 的任何任务中 → 不列入白名单
```

### Step 3: 对照 mvp-approach 边界检查

```
边界检查:
  白名单文件数 ≤ mvp-approach 设定的文件数上限？
  白名单预估总行数 ≤ mvp-approach 设定的行数上限？
  超出 → 回到 mvp-approach 重新剪裁或拆分 Phase
```

### Step 4: 生成红区

以下文件/目录自动进入禁止触碰红区：

```
红区规则:
  1. 扇入 ≥ 5 且不在本次任务的依赖链上 → 红区（公共模块，改动影响面大）
  2. 扇出 ≥ 7 的模块 → 红区（除非本轮目标明确包含它）
  3. 核心类型/接口定义文件 → 红区（破坏公共 API）
  4. 构建配置文件 (Makefile/CMakeLists/package.json scripts) → 红区（除非本轮目标就是改构建）
  5. 测试基础设施 (jest.config/vitest.config) → 红区（除非本轮目标就是改测试配置）
```

### Step 5: 输出实现映射

写入 `.repo-loop-state.json` → `bound.implementationMap`：

```json
{
  "implementationMap": {
    "allowedFiles": [
      {
        "path": "src/auth/login.ts",
        "reason": "新增登录端点 — task T-1-3",
        "maxLines": 80,
        "taskId": "T-1-3",
        "module": "src/auth",
        "fanIn": 1,
        "fanOut": 2,
        "risk": "低"
      },
      {
        "path": "src/auth/jwt.ts",
        "reason": "JWT 签发/验证 — task T-1-2",
        "maxLines": 60,
        "taskId": "T-1-2",
        "module": "src/auth",
        "fanIn": 0,
        "fanOut": 0,
        "risk": "低"
      }
    ],
    "forbiddenZones": [
      { "path": "src/db/", "reason": "用户约束：不修改现有数据库 schema" },
      { "path": "src/core/engine.ts", "reason": "核心引擎 — fanIn=8，修改影响面大" },
      { "path": "src/types/types-external.ts", "reason": "公共 API 类型定义 — fanIn=12" },
      { "path": "vitest.config.ts", "reason": "测试基础设施 — 红区规则 #5" }
    ],
    "blastRadiusWarnings": [
      {
        "change": "修改 src/auth/login.ts 的 import",
        "affectedModules": ["src/api", "src/middleware"],
        "risk": "低",
        "reason": "login.ts 是新文件，import 变更只影响自身"
      },
      {
        "change": "修改 src/middleware/index.ts（挂载 authMiddleware）",
        "affectedModules": ["src/api (所有路由)", "src/ui (登录页面)"],
        "risk": "中",
        "reason": "middleware/index.ts 的 fanIn=5，是请求管道的必经节点"
      }
    ],
    "summary": {
      "allowedCount": 3,
      "forbiddenCount": 4,
      "warnings": 2,
      "withinBounds": true,
      "boundaryCheck": "3 文件 / 190 行 ≤ Web API 上限 (5 文件 / 500 行)"
    }
  }
}
```

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这个文件就在旁边，顺便改一下" | 不在白名单 → 不允许。'顺便改'是 scope creep 的 #1 入口 |
| 2 | "红区里的文件我只加一行注释" | 红区 = 零触碰。注释也是修改，git blame 会记录 |
| 3 | "blast radius 只是警告，不影响执行" | 警告意味着修改前需要额外验证。忽略 → 事故 |
| 4 | "白名单太少了，加两个文件无所谓" | 白名单扩张 → 边界超限。回 mvp-approach 重新剪裁 |

## 验证清单

- [ ] 每个白名单文件 <=> 一个 task-graph 中的 task
- [ ] 白名单文件数 + 预估行数 ≤ mvp-approach 边界
- [ ] knowledge-graph 中的循环依赖节点不在白名单中（除非本轮目标包含）
- [ ] 输出已写入 `.repo-loop-state.json` → `bound.implementationMap`
