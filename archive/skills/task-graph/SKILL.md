---
name: task-graph
description: "将 delivery-plan 的任务转为有向无环图 (DAG) — 拓扑排序确定执行顺序，识别并行组和关键路径。无循环依赖，无死锁。"
argument-hint: "build task graph | create task DAG | order the tasks"
dependencies:
  upstream:
    - delivery-plan   # 任务清单 + 依赖关系
  downstream:
    - implementation-map  # 任务图 → 确定实现顺序后锁定文件
    - engineering-loop    # 总控执行任务图
---

# Task Graph — 任务依赖图

## 概述

**不是列出任务——是计算执行顺序。** delivery-plan 已经拆出了任务和依赖，本 skill 做三件事：

1. **拓扑排序** — 保证依赖在前、被依赖在后
2. **识别并行组** — 同一批次内无相互依赖 → 可并行执行
3. **找关键路径** — 从入口到终点最长的依赖链，决定总工期

输出写入 `.repo-loop-state.json` 的 `plan.taskGraph` 字段。

## PRECONDITIONS

```
[1] .repo-loop-state.json 中 plan.deliveryPlan 非空？
    NO → STOP. "❌ 需要先运行 delivery-plan"
```

## 工作流

### Step 1: 提取任务节点

从 delivery-plan 中提取全部任务：

```
输入: plan.deliveryPlan.phases[].tasks[]
输出: 节点列表

每个节点:
  { id, title, phase, deps[], estimatedLines, verification }
```

### Step 2: 拓扑排序

按依赖关系排序。算法：

```
1. 所有无依赖的节点 → 入队
2. 出队 → 标记为已排序
3. 依赖该节点的后续节点 → 检查依赖是否全部满足
4. 满足 → 入队
5. 循环直到队列空
6. 如果有未排序节点 → 存在循环依赖 ❌
```

### Step 3: 识别并行批次

将无相互依赖的节点归入同一批次：

```
批次规则:
  Batch 1: 所有 deps=[] 的节点
  Batch 2: 所有 deps 全部在 Batch 1 中的节点
  Batch N: 所有 deps 全部在 Batch 1..N-1 中的节点
```

### Step 4: 计算关键路径

找到从入口到终点的最长依赖链：

```
关键路径算法:
  对每个节点计算 earliestFinish = max(所有依赖节点的 earliestFinish) + 自身耗时
  最长路径上的节点 = 关键路径
  
  耗时估算:
    S: ≤50 行 → 1 单位
    M: 50-200 行 → 2 单位
    L: >200 行 → 4 单位（建议拆分）
```

### Step 5: 输出任务图

写入 `.repo-loop-state.json` → `plan.taskGraph`：

```json
{
  "taskGraph": {
    "nodes": [
      { "id": "T-1-1", "title": "定义 User 模型", "deps": [], "batch": 1, "estimatedLines": 30, "criticalPath": true, "cost": 1 },
      { "id": "T-1-2", "title": "实现 JWT 工具函数", "deps": [], "batch": 1, "estimatedLines": 60, "criticalPath": true, "cost": 1 },
      { "id": "T-1-3", "title": "实现 POST /auth/login", "deps": ["T-1-1", "T-1-2"], "batch": 2, "estimatedLines": 80, "criticalPath": true, "cost": 2 },
      { "id": "T-2-1", "title": "实现 authMiddleware", "deps": ["T-1-2"], "batch": 2, "estimatedLines": 50, "criticalPath": false, "cost": 1 },
      { "id": "T-2-2", "title": "挂载中间件到路由", "deps": ["T-2-1", "T-1-3"], "batch": 3, "estimatedLines": 70, "criticalPath": true, "cost": 1 }
    ],
    "batches": [
      { "batch": 1, "parallel": ["T-1-1", "T-1-2"], "canParallelize": true },
      { "batch": 2, "parallel": ["T-1-3", "T-2-1"], "canParallelize": true },
      { "batch": 3, "parallel": ["T-2-2"], "canParallelize": false }
    ],
    "criticalPath": ["T-1-1", "T-1-2", "T-1-3", "T-2-2"],
    "totalBatches": 3,
    "totalCost": 5,
    "estimatedDuration": "~5 个原子提交",
    "hasCycle": false
  }
}
```

**图形表示：**
```
Batch 1:  [T-1-1] ──┐   [T-1-2] ──┐
                     │              │
Batch 2:         [T-1-3]       [T-2-1]
                     │              │
Batch 3:         [T-2-2] ◄─────────┘

关键路径: T-1-1 → T-1-3 → T-2-2 (最长链)
并行机会: Batch 1 两个任务可并行，Batch 2 两个任务可并行
```

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这几个任务看着没依赖，放一批就行" | 必须跑拓扑排序确认。视觉判断 → 遗漏隐式依赖（共享文件） |
| 2 | "关键路径算一下太费时间" | 5 个节点的手动拓扑 < 30 秒。不计算 → 无法评估工期 |
| 3 | "循环依赖？不可能，我拆的时候注意了" | 跑算法验证。不跑 → 运行时才发现死锁 |
| 4 | "并行批次太多，先串行做简单" | 并行批次 = 效率。串行化 → 把 3 批变成 5 批，工期翻倍 |

## 验证清单

- [ ] 图中无循环依赖（拓扑排序覆盖 100% 节点）
- [ ] 关键路径长度 ≥ 任意单条路径
- [ ] 每个 Batch 内节点无相互依赖
- [ ] 输出已写入 `.repo-loop-state.json` → `plan.taskGraph`
