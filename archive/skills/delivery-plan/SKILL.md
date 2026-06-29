---
name: delivery-plan
description: "将 repo-decompose 需求树 + mvp-approach 核心路径转化为分阶段可执行的交付计划。每个 Phase 有明确目标、任务清单、验收标准和依赖关系。"
argument-hint: "create delivery plan | plan the next steps | generate delivery phases"
dependencies:
  upstream:
    - repo-decompose   # 需求树
    - mvp-approach     # 核心路径 (🔴) + 边界条件
  downstream:
    - task-graph       # 将任务转为 DAG
---

# Delivery Plan — 交付计划

## 概述

**不做需求分析——需求树已经有了。** 本 skill 把 repo-decompose 的需求树和 mvp-approach 的核心路径标注转化为**可执行的交付计划**。

输入: 需求树 (全部 REQ) + 核心路径标注 (🔴/🟡/✂️)
输出: 分阶段交付计划，写入 `.repo-loop-state.json` 的 `plan.deliveryPlan` 字段

## PRECONDITIONS

```
[1] .repo-loop-state.json 中 observe.outputs.repoDecompose.status == "done"？
    NO → STOP. "❌ 需要先运行 repo-decompose"

[2] .repo-loop-state.json 中 observe.outputs.mvpApproach.status == "done"？
    NO → STOP. "❌ 需要先运行 mvp-approach"
```

## 工作流

### Step 1: 按优先级分组

将需求树中的 REQ 按 mvp-approach 标注和优先级分组：

| 组 | 包含 | 含义 |
|---|---|---|
| 🔴 Phase 1 | P0 + 🔴 标注 | 核心路径——不做就无法演示 |
| 🟡 Phase 2 | P1 + 🟡 标注 | 支撑路径——核心路径依赖但不可见 |
| ✂️ Later | P2 + ✂️ 标注 | 可砍——按需排期 |

### Step 2: 每 Phase 定义验收标准

每个 Phase 必须有**一个可演示的验收标准**：

```
Phase 1 验收标准格式:
  Given [前置条件]
  When  [操作]
  Then  [可见结果]

示例:
  Phase 1: 认证核心
  Given 数据库为空
  When  POST /auth/login {"user":"test","pass":"123"}
  Then  返回 {"token":"eyJ..."} 且 HTTP 200
```

### Step 3: 拆分任务（垂直切片）

每个 Phase 拆成 2-5 个任务。每个任务 = 一个**可独立验证的代码变更**：

```
任务格式:
  T-{phase}-{n}: [一句话标题]
    涉及文件: [文件:预计行数]
    验证: [一句话如何确认完成]
    依赖: [前置任务 ID，无则写"无"]

示例:
  T-1-1: 定义 User 模型
    涉及文件: src/auth/models.ts:30
    验证: tsc --noEmit 通过 + User 类型可 import
    依赖: 无

  T-1-2: 实现 JWT sign/verify 工具
    涉及文件: src/auth/jwt.ts:60
    验证: node -e "jwt.sign({user:'test'})" 输出有效 token
    依赖: 无

  T-1-3: 实现 POST /auth/login
    涉及文件: src/auth/login.ts:80
    验证: curl -X POST localhost:3000/auth/login → 200 + token
    依赖: T-1-1, T-1-2
```

### Step 4: 输出交付计划

写入 `.repo-loop-state.json` → `plan.deliveryPlan`：

```json
{
  "deliveryPlan": {
    "phases": [
      {
        "id": "phase-1",
        "goal": "认证核心——用户可通过用户名/密码获取 JWT",
        "acceptance": "POST /auth/login 返回有效 JWT token",
        "tasks": ["T-1-1", "T-1-2", "T-1-3"],
        "estimatedLines": 170,
        "estimatedFiles": 3
      },
      {
        "id": "phase-2",
        "goal": "认证中间件——保护已有 API 端点",
        "acceptance": "未带 token 的请求返回 401",
        "tasks": ["T-2-1", "T-2-2"],
        "estimatedLines": 120,
        "estimatedFiles": 2
      }
    ],
    "totalPhases": 2,
    "totalTasks": 5,
    "totalEstimatedLines": 290,
    "totalEstimatedFiles": 5,
    "boundaryCheck": {
      "projectType": "Web API",
      "limit": "≤500行, ≤5文件",
      "withinLimit": true
    }
  }
}
```

**边界检查：** 交付计划的总预估行数和文件数必须在 mvp-approach 设定的项目类型边界内。超出 → 回到 mvp-approach 重新剪裁。

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "Phase 1 再加一个任务，反正很小" | 小任务累积 → 边界超限。先把已有的做完再评估 |
| 2 | "验收标准太简单，加个 edge case" | 验收标准只写 happy path。edge case 在 verification-loop 中覆盖 |
| 3 | "这个 Phase 只有一个任务" | 单任务 Phase 可能是过度拆分 → 合并到相邻 Phase |

## 验证清单

- [ ] 每个 REQ (🔴/🟡) 都在至少一个 Phase 的任务中
- [ ] 每个 Phase 有且仅有一个验收标准（一句话）
- [ ] 总预估行数 ≤ 项目类型边界上限
- [ ] 输出已写入 `.repo-loop-state.json` → `plan.deliveryPlan`
