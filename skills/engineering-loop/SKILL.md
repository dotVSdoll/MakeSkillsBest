---
name: engineering-loop
description: "代码优化循环总控 — 10 阶段调度器（Observe→Understand→Diagnose→Plan→Bound→Fix→Verify→SelfReview→Learn→Decide）。核心目标：优化现有代码，非构建新功能。内置安全审计、风格画像、自我审查。"
argument-hint: "optimize this repo | audit and fix | /read-loop | /optimize-loop"
dependencies:
  orchestrates:
    - style-profile      # Observe: 提取代码风格
    - semantic-rag       # Understand: 语义分析
    - knowledge-graph    # Understand: 符号关系
    - repo-decompose     # Understand: 需求树 + 证据矩阵
    - mvp-approach       # Understand: 方向验证 | Diagnose: 修复验证
    - security-audit     # Diagnose: 安全扫描
    - quality-audit      # Diagnose: 代码质量诊断
    - delivery-plan      # Plan: 交付计划
    - task-graph         # Plan: 任务 DAG
    - implementation-map # Bound: 白名单 + 红区
    - verification-loop  # Verify: 验证链
    - log-journal        # 每 Phase 切换: 写入结构化日志
---

# Engineering Loop — 代码优化循环总控

## 定位

**本 Loop 的目标是优化现有代码，不是构建新功能。** 它不帮你加登录、加 API、加 UI——它帮你发现代码中的问题、安全漏洞、风格不一致、架构退化，并小步修复。

## 核心循环

```
┌──────────────────────────────────────────────────────────────────────┐
│               Code Optimization Loop (10 phases)                     │
│                                                                      │
│  Observe        Understand         Diagnose          Plan Fix        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │style     │  │semantic-rag  │  │security-audit│  │delivery-plan │ │
│  │-profile  │→ │knowledge     │→ │(D1-D4 扫描)  │→ │task-graph    │ │
│  │repoType  │  │-graph        │  │mvp-approach  │  │              │ │
│  │releasePol│  │repo-decompose│  │(修复验证)     │  │              │ │
│  └──────────┘  │mvp-approach  │  └──────────────┘  └──────┬───────┘ │
│                │(方向验证)     │                           │        │
│                └──────────────┘                           ▼        │
│                                                    ┌──────────────┐ │
│                                                    │ Bound Fix    │ │
│                                                    │implementation│ │
│                                                    │-map          │ │
│       ┌─────────────────────────────────────────────┴──┬───────────┘ │
│       │                                                │             │
│       ▼                                                ▼             │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Fix    │  │   Verify     │  │ Self-Review  │  │    Learn     │  │
│  │执行修复  │→ │ 验证修复正确  │→ │ Loop审查自己  │→ │  沉淀经验    │  │
│  │(style   │  │              │  │ 的修改       │  │              │  │
│  │ profile)│  │              │  │              │  │              │  │
│  └─────────┘  └──────────────┘  └──────────────┘  └──────┬───────┘  │
│                                                          │         │
│                                                          ▼         │
│                                                    ┌──────────────┐ │
│                                                    │   Decide     │ │
│                                                    │继续/停止/重划 │ │
│                                                    └──────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## PRECONDITIONS — 硬门控

```
[1] 仓库路径可访问？
    NO → STOP. 输出: "❌ 找不到仓库"

[2] 用户意图已表达？
    /optimize-loop: 需要 goal.statement (如 "修复安全漏洞" / "统一错误处理风格")
    /read-loop:     goal.statement 可为 "理解此仓库"
    NO → STOP. 输出: "❌ 请告诉我你想优化什么。示例: '修复安全漏洞' / '统一错误处理'"

[3] .repo-loop-state.json format valid？
    不存在 → 初始化
    存在 → 跑 schema 校验
    失败 → STOP
```

### State Schema 校验（每次 Phase 切换前执行）

```
必检字段:
  meta:  { repo, language, scale, loopCount, repoType, deliveryMode, styleProfile }
  goal:  { statement, type, stopCondition }
  observe / understand / diagnose / plan / bound / fix / verify / selfReview / learn / decide

status 合法值: "pending" | "running" | "done" | "failed" | "blocked"
decision 合法值: "continue" | "stop" | "rollback" | "replan"
```

## 十阶段工作流

**全局规则：每个 Phase 标记为 `done` 后，立即调用 `log-journal` 写入 `.loop-log/` 中的对应日志文件，然后更新 `INDEX.md`。**

### Phase 1: Observe — 识别与画像

**新 skill 调用：`style-profile`** — 检测代码风格、命名约定、错误处理模式。

```
动作:
  1. 调用 style-profile → 写入 meta.styleProfile
  2. 检测语言/框架/规模
  3. 判定 repoType（主导类型 + 次级能力）— 同上版本规则
  4. 判定 deliveryMode（/read-loop vs /optimize-loop）
  5. 检测 releaseChannel / testProfiles
  6. 写入 meta.currentPhase = "observe"

style-profile 产出: naming / errorHandling / codeOrganization / testing / comments 五个维度
```

**出口：** meta 完整 + styleProfile 已写入 → Understand

### Phase 2: Understand — 深度理解 + 方向验证

```
动作（按依赖顺序，不可跳步）:
  1. semantic-rag → 写入 understand.semanticRAG
  2. knowledge-graph → 写入 understand.knowledgeGraph
  3. repo-decompose → 写入 understand.repoDecompose（自动拉取 #1 #2）
  4. mvp-approach (方向验证) → 写入 understand.mvpDirectionTest

mvp-approach 方向验证：
  如果 Understand 阶段识别出 2+ 个可行优化方向:
    → 对每个方向调用 mvp-approach 做最小可行性验证
    → "这个方向走下去，最小能交付什么？边界是多少？"
    → 选出最可行的方向 → 写入 understand.chosenDirection
  如果只有 1 个方向:
    → mvp-approach 验证该方向是否可行
    → 不可行 → STOP. 输出: "❌ 该优化方向在最小可行性测试中不可行: [原因]"
```

**出口：** `understand.*.status == "done"` + `understand.chosenDirection` 非空 → Diagnose

### Phase 3: Diagnose — 诊断问题

**并行调用：`security-audit` + `quality-audit`** — 安全 + 质量双维扫描。

```
动作:
  1. security-audit → 写入 diagnose.securityAudit
     D1 依赖漏洞 / D2 认证缺陷 / D3 注入风险 / D4 敏感信息
  2. quality-audit → 写入 diagnose.qualityAudit (并行)
     D1 重复代码 / D2 高复杂度 / D3 死代码 / D4 测试薄弱区 / D5 过大模块 / D6 架构退化
  3. mvp-approach (修复验证) → 写入 diagnose.mvpFixValidation
     "针对已发现的安全 + 质量问题，最小修复方案是什么？"

阻塞规则:
  securityAudit.blocksDiagnose == true OR qualityAudit.blocksDiagnose == true
    → Diagnose 阻塞，CRITICAL 项自动进入 Plan Fix 的 Phase 1
  releasePolicy.requiresUserConfirmationForProductionFix == true
    且用户目标是修复生产 bug → STOP
```

**出口：** `diagnose.status == "done"` → Plan Fix

### Phase 4: Plan Fix — 制定修复计划

```
动作:
  1. delivery-plan → 写入 plan.deliveryPlan
     任务类型: bugfix / security-fix / style-fix / refactor-safe / test-hardening
  2. task-graph → 写入 plan.taskGraph
     包含共享文件冲突检测（同一文件被两个任务修改 → 不可并行）
```

**出口：** `plan.*` 非空 → Bound Fix

### Phase 5: Bound Fix — 锁定修改边界

```
动作:
  1. implementation-map → 写入 bound.implementationMap
     architectureContracts 从 README/CONTRIBUTING/docs 抽取
  2. 边界检查通过 → Fix
```

**出口：** `bound.summary.withinBounds == true` → Fix

### Phase 6: Fix — 执行修复（受风格约束）

```
read-only 模式: 跳过 Fix/Verify/SelfReview，直接进入 Learn

delivery 模式:
  1. 加载 meta.styleProfile → 所有代码修改必须匹配检测到的风格
  2. 从 plan.taskGraph.batches[0] 取下一个任务批次
  3. 每任务:
     a. 白名单检查 (implementation-map)
     b. 红区检查
     c. 小步修改 (每任务一个 commit，commit message 匹配 styleProfile.commitStyle)
     d. 更新 fix.completedTasks / fix.modifiedFiles
  4. 当前批次完成 → Verify

风格约束示例:
  检测到 camelCase → 新增变量用 camelCase
  检测到 try/catch → 不引入 Result 类型
  检测到 JSDoc → 新增函数写 JSDoc
```

**出口：** `fix.status == "done"` → Verify

### Phase 7: Verify — 验证修复

```
动作:
  1. verification-loop (按 verificationMode 选模板) → 写入 verify
  2. verify.failedCount == 0 → SelfReview
     > 0 且 consecutiveFailures < 2 → 回到 Fix
     ≥ 2 → 强制 Decide
```

**出口：** `verify.status == "done"` → SelfReview

### Phase 8: Self-Review — Loop 自我审查

**新增阶段。Loop 审查自己本轮的所有修改。**

```
审查维度:

D1 — 风格一致性:
  fix.modifiedFiles[] 的代码是否与 meta.styleProfile 一致？
  不一致 → 标记 "style-variance"，写入 selfReview.issues[]

D2 — 修复完整性:
  是否修复了本轮目标中的所有问题？
  是否引入了新的问题？
  修复是否触及了 diagnose.securityAudit 的 CRITICAL 项？

D3 — 最小性:
  修改的代码行数是否在 implementation-map 的边界内？
  是否夹带了"顺便改"的非目标修改？→ 有 → 标记 "scope-creep"

D4 — 回归风险:
  修改的文件是否在 architectureContracts 红区中？
  verify 中是否有 skipped 的级别？

输出:
{
  "selfReview": {
    "passed": true|false,
    "issues": [
      { "dimension": "style-variance", "file": "src/auth.ts:30", "detail": "使用了 snake_case 但项目约定 camelCase" }
    ],
    "recommendation": "pass | fix-and-reverify | abort-and-replan"
  }
}
```

**selfReview.passed == false → 回到 Fix（修复自审问题）。连续 2 次不通过 → 进入 Decide 重规划。**

**出口：** `selfReview.status == "done"` + `selfReview.passed == true` → Learn

### Phase 9: Learn — 沉淀经验

```
动作:
  1. 汇总: 完成的任务 / 验证结果 / 修改文件 / 发现的安全问题
  2. 提取教训: success / blocker / insight
  3. 生成下一轮建议
```

### Phase 10: Decide — 判定

```
停止条件 (按优先级):
  [0] deliveryMode == "read-only" → stop
  [1] 所有任务已完成 → stop
  [2] verify.consecutiveFailures ≥ 2 → replan
  [3] selfReview 连续 2 次不通过 → replan
  [4] goal.stopCondition 已满足 → stop
  [5] 触及红区 → stop (人工确认)
  [6] loopCount ≥ 10 → stop

默认: continue → 回到 Fix (下一批次) 或 Observe (新目标)
```

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这轮只做安全修复，跳过 style-profile" | 安全修复也必须有风格约束——否则修了漏洞引入了风格债务 |
| 2 | "自审不通过但我肉眼看了没问题" | 自审是机器对机器的检查。人工意见不能覆盖自审失败 |
| 3 | "顺手把旁边的函数也重构了" | scope-creep。Fix 阶段只修改白名单文件 |
| 4 | "安全审计扫出的 MEDIUM 项不重要" | CRITICAL 阻塞 Diagnose，HIGH 进入 Plan。不忽略 |
