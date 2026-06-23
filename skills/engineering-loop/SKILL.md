---
name: engineering-loop
description: "工程循环总控 — 8 阶段调度器（Observe→Understand→Plan→Bound→Act→Verify→Learn→Decide），基于证据推进项目，每轮证明自己没有乱改。5 条硬停止条件。"
argument-hint: "start engineering loop | drive this repo | continue the loop | what's the next phase"
dependencies:
  orchestrates:
    - semantic-rag
    - knowledge-graph
    - repo-decompose
    - mvp-approach
    - delivery-plan
    - task-graph
    - implementation-map
    - verification-loop
---

# Engineering Loop — 工程循环总控

## 概述

**不是"跑一遍所有 skill"——是有状态、有证据、有停止条件的工程推进器。** 每个子 skill 是可替换的执行单元，engineering-loop 是唯一知道"该做什么、做到哪了、下一步是什么"的调度者。

**唯一真相源：** `.repo-loop-state.json`

## 核心循环

```
┌──────────────────────────────────────────────────────────┐
│                   Engineering Loop                        │
│                                                          │
│  ┌────────┐   ┌───────────┐   ┌──────┐   ┌───────┐      │
│  │Observe │──▶│Understand │──▶│ Plan │──▶│ Bound │      │
│  │ 识别目标│   │ semantic  │   │delivery│  │ impl  │      │
│  │ 仓库规模│   │ -rag      │   │-plan  │  │ -map  │      │
│  │ 约束   │   │ knowledge │   │task   │  │ 白名单 │      │
│  └────────┘   │ -graph    │   │-graph │  │ 红区  │      │
│               │ repo-     │   └──────┘  └───┬───┘      │
│               │ decompose │                │           │
│               │ mvp-      │                ▼           │
│               │ approach  │           ┌───────┐        │
│               └───────────┘           │  Act  │        │
│                                       │ 执行   │        │
│                                       │ task   │        │
│                                       └───┬───┘        │
│                                           │            │
│                     ┌─────────────────────┘            │
│                     ▼                                  │
│              ┌──────────┐    ┌───────┐    ┌────────┐  │
│              │ Verify   │───▶│ Learn │───▶│ Decide │  │
│              │ 五级验证  │    │ 记录   │    │继续/停止│  │
│              └──────────┘    │ 教训   │    │回滚/重划│  │
│                              └───────┘    └───┬────┘  │
│                                              │       │
│                    continue ─────────────────┘       │
│                    stop ─────▶ 输出最终报告           │
└──────────────────────────────────────────────────────┘
```

## PRECONDITIONS — 硬门控（第一个不满足即 STOP）

```
[1] 用户提供了目标 (goal.statement 非空)？
    NO → STOP. 输出: "❌ 请先告诉我你想在这个仓库里做什么。示例：为项目添加 JWT 登录功能"

[2] 仓库路径可访问？
    NO → STOP. 输出: "❌ 找不到仓库。请提供 GitHub URL 或本地路径"

[3] .repo-loop-state.json 不存在 OR 存在且格式有效？
    不存在 → 初始化空状态文件，从 Observe 阶段开始
    存在但格式无效 → STOP. 输出: "❌ 状态文件损坏，请删除 .repo-loop-state.json 后重新开始"
```

## 八阶段工作流

### Phase 1: Observe — 识别和初始化

**触发：** 状态文件不存在 OR `decide.nextPhase == "observe"`

```
动作:
  1. 初始化状态文件 meta 区块
  2. 检测仓库语言/框架/规模
  3. 记录 goal.statement, goal.constraints
  4. 写入 meta.currentPhase = "observe"

出口: meta 区块完整 → 自动进入 Understand
```

**不调用子 skill。** Observe 只是元信息收集。

### Phase 2: Understand — 深度理解

**触发：** `observe.status == "done"` OR `meta.currentPhase == "understand"`

```
动作（按依赖顺序，不可跳步）:
  1. 调用 semantic-rag → 写入 observe.outputs.semanticRAG
  2. 调用 knowledge-graph → 写入 observe.outputs.knowledgeGraph
  3. 调用 repo-decompose → 写入 observe.outputs.repoDecompose
     (repo-decompose 的 Phase 2 会自动拉取 #1 #2 的产物)
  4. 调用 mvp-approach → 写入 observe.outputs.mvpApproach
     (mvp-approach 的 6 项门控检查 #1-#3 的产物)

子 skill 间数据传递: 通过 .repo-loop-state.json 的 observe.outputs 字段
```

**出口：** `observe.outputs.*.status == "done"` 全部满足 → 自动进入 Plan

### Phase 3: Plan — 生成执行计划

**触发：** `observe.status == "done"` → `meta.currentPhase = "plan"`

```
动作:
  1. 调用 delivery-plan → 写入 plan.deliveryPlan
  2. 调用 task-graph → 写入 plan.taskGraph
```

**出口：** `plan.deliveryPlan` 和 `plan.taskGraph` 都非空 → 自动进入 Bound

### Phase 4: Bound — 锁定修改边界

**触发：** `plan.status == "done"` → `meta.currentPhase = "bound"`

```
动作:
  1. 调用 implementation-map → 写入 bound.implementationMap
  2. 检查 bound.summary.withinBounds:
     true → 自动进入 Act
     false → 回到 Plan 重新拆分
```

**出口：** `bound.implementationMap.summary.withinBounds == true` → 进入 Act

### Phase 5: Act — 执行变更

**触发：** `bound.status == "done"` → `meta.currentPhase = "act"`

```
动作:
  1. 从 plan.taskGraph.batches[0] 取下一个任务批次
  2. 对每批中的任务，逐个执行:
     a. 确认当前任务涉及的文件都在 implementation-map 白名单中
     b. 执行代码修改（小步提交，每任务一个 commit）
     c. 更新 act.completedTasks 和 act.modifiedFiles
     d. 标记 act.currentTask
  3. 当前批次完成 → 自动进入 Verify
```

**红区保护：** 修改前检查 `implementationMap.forbiddenZones`。任何修改触及红区 → 中止当前任务，标记 `act.status = "blocked"`，停止等待人工确认。

**大仓库局部推进：** 如果 repo scale ≥ L (500+ 文件)，Act 阶段只加载 `implementationMap.allowedFiles` 中的文件到上下文。不读全仓库。

### Phase 6: Verify — 验证

**触发：** `act.status == "done"` → `meta.currentPhase = "verify"`

```
动作:
  1. 调用 verification-loop → 写入 verify
  2. 检查 verify.failedCount:
     0 → 自动进入 Learn
     > 0 且 verify.consecutiveFailures < 2 → 回到 Act 修复失败项
     ≥ 2 → 强制进入 Decide (不再重试)
```

### Phase 7: Learn — 沉淀经验

**触发：** `verify.status == "done"` → `meta.currentPhase = "learn"`

```
动作:
  1. 汇总本轮:
     - 完成了哪些任务
     - 哪些验证通过/失败
     - 哪些文件被修改
     - 遇到了什么问题
  2. 提取教训:
     - 成功经验 → learn.lessons[].type = "success"
     - 阻塞问题 → learn.lessons[].type = "blocker"
     - 发现 → learn.lessons[].type = "insight"
  3. 生成下一轮建议 → learn.nextRecommendations[]
  4. 写入 learn.roundSummary
```

### Phase 8: Decide — 判定下一步

**触发：** `learn.status == "done"` → `meta.currentPhase = "decide"`

```
判定逻辑（按优先级）:

[停止条件 1] act.completedTasks 包含 plan.taskGraph 中所有节点？
  → decision = "stop", reason = "所有任务已完成"

[停止条件 2] verify.consecutiveFailures ≥ 2？
  → decision = "replan", reason = "连续验证失败，需重新规划"

[停止条件 3] goal.stopCondition 中定义的条件已满足？
  → decision = "stop", reason = "用户定义的停止条件已满足"

[停止条件 4] 本轮修改了 implementation-map 红区文件？
  → decision = "stop", reason = "触及禁止修改区域，需人工确认"

[停止条件 5] meta.loopCount ≥ 10？
  → decision = "stop", reason = "超过最大循环次数，建议人工审查"

[默认] 仍有未完成任务？
  → decision = "continue", nextPhase = "act", reason = "继续执行下个任务批次"
```

**输出：** `decide.decision` + `decide.reason` + `decide.nextPhase`

然后：`meta.loopCount += 1`。如果 `decision == "continue"`，回到对应阶段。

---

## 大仓库特殊规则

```
仓库规模 L/XL (≥500 文件):
  1. Observe 阶段必须确认规模级别
  2. Understand 阶段 repo-decompose 按规模分片（最多 13 子 agent）
  3. Bound 阶段 implementation-map 白名单文件数 ≤ 规模分片上限
  4. Act 阶段只加载白名单文件到上下文——不读全仓库
  5. 每个 task commit 后跑一次 L1 build（快速反馈）
```

---

## 输出格式

Loop 结束（decision = "stop"）时的最终输出：

```
✅ Engineering Loop 完成 — {loopCount} 轮

🎯 目标: {goal.statement}
📊 结果:
  已完成: {completedTasks.length} 个任务
  验证通过: {verify.passedCount}/{verify.results.length}
  修改文件: {act.modifiedFiles.length} 个
  ⚠️ 未解决问题: {learn.lessons[type=blocker].length} 个

📝 本轮总结:
  {learn.roundSummary}

🔮 下一轮建议:
  {learn.nextRecommendations[]}
```

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "Understand 太慢，跳过直接进 Plan" | 没有 Understand = 没有证据矩阵。Plan 没有事实基础 |
| 2 | "Bound 的白名单太保守，放两个文件进去" | 白名单扩张 → 回到 Plan 重新评估。不在 Act 阶段改边界 |
| 3 | "Verify L3 失败了但是肉眼看了没问题" | 肉眼不是验证。验证链必须全绿 |
| 4 | "连续两次失败可能是 flaky，再试一次" | 硬停止条件。两次失败 → replan，不反复重试 |
| 5 | "这次改动很小，不写 Learn 了" | Learn = 下一轮的上下文。跳过 → 下一轮从零开始 |
| 6 | "循环到第 10 轮了但快完了，别停" | 10 轮上限保护。超过 → 说明目标可能需要拆分 |

## 验证清单

- [ ] 状态文件每次阶段切换后已写入
- [ ] 子 skill 调用顺序未跳步
- [ ] Act 阶段未触碰红区文件
- [ ] 5 条停止条件全部有判定记录
- [ ] 最终输出包含 completedTasks / verification / lessons / nextRecommendations
