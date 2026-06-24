---
name: engineering-loop
description: "代码优化循环总控 — 12 阶段生命周期（2 前置门控 Detect+EnvReady，10 阶段优化闭环 Observe→Understand→Diagnose→Plan→Bound→Fix→Verify→SelfReview→Learn→Decide）。跨 Agent 自适应，环境自动就绪，任务驱动单流程。"
argument-hint: "optimize this repo | audit and fix | analyze and improve"
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

## 运行模式

**本 skill 必须以 `inline` 模式运行**，由父 Agent 直接执行编排逻辑。子阶段任务 dispatch 为独立 subagent 调用，父进程做超时控制和结果收割。

> 本 skill 以 inline 模式运行。在不同 Agent 工具中，确保总控由父进程直接执行编排。

---

## 核心循环（12 阶段）

```
Detect → EnvReady → Observe → Understand → Diagnose → Plan → Bound
    → Fix → Verify → SelfReview → Learn → Decide
     ↑___________________________________________↓
            Decide=continue 时回到 Fix 或 Observe
```

**Detect 和 EnvReady 是 Loop 启动时的两个前置门控，不参与后续循环。**

---

## PRECONDITIONS — 硬门控

```
[1] 仓库路径可访问？
    NO → STOP. "❌ 找不到仓库"

[2] 用户意图已表达？
    goal.statement 已通过用户输入或上下文获得
    NO → STOP. "❌ 请告诉我你想做什么。示例: '分析这个仓库' / '修复安全漏洞'"

[3] .repo-loop-state.json 格式有效？
    不存在 → 在 Phase 0 完成检测后初始化
    存在 → 跑 schema 校验
    失败 → STOP
```

### State Schema 校验（每次 Phase 切换前执行）

```
必检字段:
  meta:  { repo, language, scale, loopCount, repoType, adapterConfig, environmentTier, styleProfile }
  goal:  { statement, type, stopCondition }
  detect / envReady / observe / understand / diagnose / plan / bound / fix / verify / selfReview / learn / decide

status 合法值: "pending" | "running" | "done" | "failed" | "blocked" | "skipped"
decision 合法值: "continue" | "stop" | "rollback" | "replan"
```

---

## Phase 0: Tool Detection — 检测 Agent 工具并适配

**目标：** 确定当前运行在哪个 AI Coding Agent 上，读取其本地配置，确定能力边界。

**这是 Loop 的入口门控——不完成此阶段不进 Phase 0.5。**

### Step 0.1: 检测 Agent 工具

按以下优先级检测，命中即停止：

```
检测顺序:
  1. 检查环境变量:
     各 Agent 工具的 HOME/CONFIG 环境变量 → 确定当前工具

  2. 检查配置目录:
     ~/.claude/   存在? → Claude Code
     ~/.codex/    存在? → Codex
     .cursor/     存在? → Cursor
     其他工具的约定目录 → 对应工具

  3. 检查已知的工具特征文件:
     项目根有 .claude/ 目录 → Claude Code
     项目根有 .codex/ 目录 → Codex
     项目根有 .cursor/rules/ → Cursor

  4. 以上全不命中 → "unknown"（使用 Fallback 适配）
```

### Step 0.2: 加载 Agent Adapter

根据检测结果，按对应适配器的指令集执行：

#### Claude Code Adapter

```
检测特征: ~/.claude/ 或 CLAUDE_CODE_CONFIG 环境变量

配置读取:
  - 读 ~/.claude.json → 获取已安装 plugin、skill 目录
  - 读 .claude/ 项目目录 → 获取项目 skill

能力判定:
  子任务调度:
    可用方式: Task tool 或 /skill 命令
    子 agent 有内置超时
    子 agent 可调用其他 skill

  CLI 命令执行:
    Bash tool 可执行任意命令
    网络命令需 allowlist

适配到状态文件:
  写入 meta.adapterConfig = {
    "agent": "claude-code",
    "skillDir": "~/.claude/skills/",
    "subtaskModel": "Task tool",
    "hasTimeout": true,
    "cliAllowed": true,
    "networkAllowed": "allowlist"
  }
```

#### Codex Adapter

```
检测特征: ~/.codex/ 或 CODEX_HOME

配置读取:
  - npx skills 管理的全局 skill 目录
  - Codex 原生 subagent 配置

能力判定:
  子任务调度: subagent tool
  超时: 内置
  CLI: Bash tool

适配到状态文件:
  写入 meta.adapterConfig = {
    "agent": "codex",
    "subtaskModel": "subagent",
    "hasTimeout": true
  }
```

#### Fallback Adapter（通用模式）

```
检测特征: 以上全不命中

能力判定:
  子任务调度: 无法 spawn 子 agent → 全部内联执行
  超时: 无 → 需用户手动中断
  CLI: 尝试 run_command（取决于 Agent 是否支持）

适配到状态文件:
  写入 meta.adapterConfig = {
    "agent": "unknown",
    "subtaskModel": "inline-only",
    "hasTimeout": false,
    "cliAllowed": "unknown"
  }

⚠️ Fallback 模式下，Diagnose 阶段的 security-audit 和 quality-audit
  无法并行运行——只能串行内联执行。Loop 整体耗时可能显著增加。
```

---

## Phase 0.5: Environment Readiness Gate — 确保项目可运行

**目标：** 在进入 Diagnose 之前，确保项目有可运行的验证环境。不是一个"全新安装"阶段——只做缺失的必要准备。

**这是 Diagnose 的前置门控。**

### Step 0.5.1: 环境分级检测

```
检测流程（按项目类型自动选择）:

Python 项目 (pyproject.toml / requirements.txt / setup.py):
  [1] python --version → 记录版本
  [2] venv 是否存在? (.venv/ 或 venv/)
      NO → 标记 NEEDS_VENV
  [3] 依赖是否安装? (pip check 或 import 关键包)
      NO → 标记 NEEDS_DEPS
  [4] .env 是否存在?
      NO 且 .env.example 存在 → 标记 NEEDS_ENV
  [5] 测试框架可用? (pytest --version)
      NO → 标记 NEEDS_TEST

Node.js 项目 (package.json):
  [1] node --version
  [2] node_modules/ 存在?
      NO → 标记 NEEDS_DEPS
  [3] npm test 可运行?
      NO → 标记 NEEDS_TEST

Go 项目 (go.mod):
  [1] go version
  [2] go build ./... 可运行?
  [3] go test ./... 可运行?

Rust 项目 (Cargo.toml):
  [1] cargo --version
  [2] cargo build / cargo test

未知项目:
  跳过自动检测 → 标记 environmentTier = "unknown"
```

### Step 0.5.2: 环境就绪等级

```
🟢 Full — 全部就绪:
  venv + 全部依赖 + 测试框架可用 + .env 配置完成
  → 安全/质量审计可用真实 CLI 数据

🟡 Partial — 部分就绪:
  venv + 依赖安装，但无测试数据或缺少 .env
  → CLI 审计可用，测试受限

🟠 Minimal — 最小可用:
  仅有运行时（python/node），无项目依赖
  → 只能做静态分析，不能做运行时验证

🔴 Sandbox-only — 沙箱隔离:
  无项目运行时，无法安装依赖
  → 仅代码阅读 + 静态分析 + 文件拆分
```

### Step 0.5.3: 自动环境准备

```
根据 adapterConfig 和检测结果，自动执行（权限内）:

NEEDS_VENV:
  python -m venv .venv
  → 成功: 标记 venv ready
  → 失败: 告知原因，降级 environmentTier

NEEDS_DEPS:
  .venv/Scripts/pip install -r requirements.txt  (Windows)
  .venv/bin/pip install -r requirements.txt      (Unix)
  npm install                                     (Node)
  → 成功: 标记 deps ready
  → 失败: 列出缺失的包，降级 environmentTier

NEEDS_ENV:
  cp .env.example .env
  → 成功: 标记 env ready，提示用户填入实际值
  → 失败: 告知原因

NEEDS_TEST:
  pip install pytest  (如果缺失)
  npm install --include=dev  (如果缺失)
  → 成功: 标记 test ready
  → 失败: 降级 environmentTier

超出权限的操作:
  需要数据库服务 → 提示开发者手动启动
  需要 Docker → 提示开发者
  需要外部 API key → 提示开发者在 .env 中填入
```

### Step 0.5.4: 写入状态

```
写入 .repo-loop-state.json:
  meta.environmentTier = "🟢 full" | "🟡 partial" | "🟠 minimal" | "🔴 sandbox-only"
  envReady.status = "done"
  envReady.checks = { venv: true, deps: true, env: true, test: true }
  envReady.autoPrepared = ["venv", "deps"]  // 本次自动完成的准备
  envReady.manualNeeded = ["数据库服务需要手动启动"]  // 需要开发者的
```

**出口：** `envReady.status == "done"` → Observe

---

## Phase 1: Observe — 识别与画像

**调用：`style-profile`** — 检测代码风格、命名约定、错误处理模式。

```
动作:
  1. 调用 style-profile → 写入 meta.styleProfile
  2. 检测语言/框架/规模
  3. 判定 repoType（主导类型 + 次级能力）
  4. 检测 releaseChannel / testProfiles
  5. 写入 meta.currentPhase = "observe"

style-profile 产出: naming / errorHandling / codeOrganization / testing / comments 五个维度

注意: 不再判定 deliveryMode。流程由后续阶段的 taskGraph 节点数驱动。
```

**出口：** meta 完整 + styleProfile 已写入 → Understand

---

## Phase 2: Understand — 深度理解 + 方向验证

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

---

## Phase 3: Diagnose — 诊断问题

**并行调用：`security-audit` + `quality-audit`** — 安全 + 质量双维扫描。

```
动作:
  1. security-audit → 写入 diagnose.securityAudit
     根据 environmentTier 选择执行方式:
       🟢🟡: 使用真实 CLI 工具 (pip-audit / npm audit / cargo audit)
       🟠🔴: 使用静态扫描 (读依赖文件 + 搜索代码模式)
     四个维度扫描:
       D1 依赖漏洞 / D2 认证缺陷 / D3 注入风险 / D4 敏感信息

  2. quality-audit → 写入 diagnose.qualityAudit (并行)
     根据 environmentTier 选择执行方式:
       🟢: pytest --cov / coverage + 真实测试数据
       🟡🟠🔴: 静态分析 (AST 复杂度 / 文件行数 / 搜索重复模式)
     六个维度扫描:
       D1 重复代码 / D2 高复杂度 / D3 死代码 / D4 测试薄弱区 / D5 过大模块 / D6 架构退化

  3. mvp-approach (修复验证) → 写入 diagnose.mvpFixValidation
     "针对已发现的安全 + 质量问题，最小修复方案是什么？"

阻塞规则:
  securityAudit.blocksDiagnose == true OR qualityAudit.blocksDiagnose == true
    → Diagnose 阻塞，CRITICAL 项自动进入 Plan Fix 的 Phase 1

⚠️ environmentTier 影响诊断置信度:
  🟢 Full → 高置信度（真实数据）
  🟡 Partial → 中置信度（混合）
  🟠 Minimal → 低置信度（仅静态分析）
  🔴 Sandbox-only → 最低置信度（仅代码阅读）
  诊断结果中标注 confidenceLevel 和 environmentTier。
```

**出口：** `diagnose.status == "done"` → Plan Fix

---

## Phase 4: Plan Fix — 制定修复计划

```
动作:
  1. delivery-plan → 写入 plan.deliveryPlan
     任务类型: bugfix / security-fix / style-fix / refactor-safe / test-hardening
  2. task-graph → 写入 plan.taskGraph
     包含共享文件冲突检测（同一文件被两个任务修改 → 不可并行）

统一流程判断:
  plan.taskGraph.nodes.length == 0 ?
    YES → 无修复任务。跳过 Fix/Verify/SelfReview，直接进入 Learn → Decide(stop)
    NO  → 进入 Bound → Fix
```

**出口：** `plan.*` 非空 → Bound Fix（如有任务）或 Learn（如无任务）

---

## Phase 5: Bound Fix — 锁定修改边界

```
动作:
  1. implementation-map → 写入 bound.implementationMap
     architectureContracts 从 README/CONTRIBUTING/docs 抽取
  2. 边界检查通过 → Fix
```

**出口：** `bound.summary.withinBounds == true` → Fix

---

## Phase 6: Fix — 执行修复（受风格约束）

```
动作:
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

---

## Phase 7: Verify — 验证修复

```
动作:
  1. verification-loop (按 verificationMode 选模板) → 写入 verify
     根据 environmentTier:
       🟢 Full: 完整五级验证链 (build → test → run)
       🟡 Partial: build + 编译检查
       🟠🟡: 语法编译检查
       🔴 Sandbox-only: py_compile / tsc --noEmit 静态检查

  2. verify.failedCount == 0 → SelfReview
     > 0 且 consecutiveFailures < 2 → 回到 Fix
     ≥ 2 → 强制 Decide
```

**出口：** `verify.status == "done"` → SelfReview

---

## Phase 8: Self-Review — Loop 自我审查

**Loop 审查自己本轮的所有修改。**

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
    "issues": [...],
    "recommendation": "pass | fix-and-reverify | abort-and-replan"
  }
}
```

**Diff-Level 检查清单（必须逐条执行）：**

```
[1] 所有 modified files 是否在 implementation-map allowedFiles 中？
[2] 是否新增了非必要的 import/依赖？
[3] 是否修改了 public API（导出函数/类型签名）？
[4] 是否修改了与任务无关的函数/代码块？
[5] 是否新增了 TODO / FIXME / HACK 注释？
[6] 是否修改了测试快照（.snap 文件）？
[7] 是否触碰了 architectureContracts 红区？
[8] 是否改变了错误处理范式（如 try/catch → Result 类型）？
[9] 是否引入了新的 linter warning？
[10] 本次修改是否可以通过更少的代码行完成？
```

**selfReview.passed == false → 回到 Fix（修复自审问题）。连续 2 次不通过 → 进入 Decide 重规划。**

**出口：** `selfReview.status == "done"` + `selfReview.passed == true` → Learn

---

## Phase 9: Learn — 沉淀经验

```
动作:
  1. 汇总: 完成的任务 / 验证结果 / 修改文件 / 发现的安全/质量问题
  2. 提取教训: success / blocker / insight
  3. 记录本轮诊断的最高严重度 → learn.roundMaxSeverity
  4. 生成下一轮建议
```

---

## Phase 10: Decide — 判定

```
停止条件 (按优先级，命中即停止):

  [1] plan.taskGraph 初始为空（无可修复任务）→ stop
     输出: "✅ 未发现需要修复的问题。"

  [2] 所有任务已完成 → stop
     输出: "✅ 本轮所有 [N] 个任务已全部完成。"

  [3] verify.consecutiveFailures ≥ 2 → replan
     输出: "⚠️ 连续 2 次验证失败，当前方案可能不可行。重新规划。"

  [4] selfReview 连续 2 次不通过 → replan
     输出: "⚠️ 连续 2 次自审不通过——修改质量存在问题。重新规划。"

  [5] goal.stopCondition 已满足 → stop
     输出: "✅ 已达成目标: [goal.stopCondition]"

  [6] 触及红区 → stop (人工确认)
     输出: "🛑 修改触及禁止区域 [forbiddenZone]。需要人工确认。"

  [7] 收益递减 — 最近 2 轮的 maxSeverity ≤ LOW → stop
     输出: "⏸️ 连续 2 轮最高严重度仅为 LOW，收益已递减。停止优化。"

  [8] loopCount ≥ 10 → stop
     输出: "⏸️ 已达最大循环次数 (10)。停止。"

默认: continue → 回到 Fix (下一批次) 或 Observe (新目标)
```

**新条件 [7] 的设计理由：** 如果 Loop 连续两轮只能发现 LOW 级别问题（如格式不一致、注释缺失），继续运行就是浪费 tokens。收益递减时应该停止，把决策权还给开发者。

---

## 子任务调度策略

**总控必须以 inline 模式运行。** 子阶段任务通过当前 Agent 的原生子任务机制 dispatch：

### 通用调度伪代码

```
run_phase(phase_name):
  log-journal.write(phase_name, "running")

  for subtask in phase.tasks:
    if adapter.has_subagent:
      result = dispatch_subagent(subtask, budget=subtask.budget)
    else:
      result = execute_inline(subtask)

    if result.timed_out:
      record_timeout(subtask)
      continue  // 跳过该子任务

    write_to_state(result)

  log-journal.write(phase_name, "done")
```

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这轮只做安全修复，跳过 style-profile" | 安全修复也必须有风格约束——否则修了漏洞引入了风格债务 |
| 2 | "自审不通过但我肉眼看了没问题" | 自审是机器对机器的检查。人工意见不能覆盖自审失败 |
| 3 | "顺手把旁边的函数也重构了" | scope-creep。Fix 阶段只修改白名单文件 |
| 4 | "安全审计扫出的 MEDIUM 项不重要" | CRITICAL 阻塞 Diagnose，HIGH 进入 Plan。不忽略 |
| 5 | "环境没准备好，跳过诊断工具的 CLI 检查" | 环境准备是 Phase 0.5 的责任。如果没准备好就标 🔴 并诚实降级，不能假装检查了 |
| 6 | "子任务超时了，我自己大致分析一下代替" | 超时要记录原因并降级。手动"大致分析" = 无证据猜测，破坏整个 Loop 的可追溯性 |
| 7 | "Fallback 模式下连续 LOW 修复也值得做" | 停止条件 [7] 不分模式——LOW 级别修复做 2 轮就够了，后面的收益不抵 token 成本 |

## 验证清单

- [ ] Phase 0 检测到 Agent 工具，adapterConfig 写入 meta
- [ ] Phase 0.5 environmentTier 非空，envReady.autoPrepared 记录自动完成的操作
- [ ] 所有阶段按顺序执行，未跳过（除非 taskGraph 为空）
- [ ] 每个子任务有超时预算和结果记录
- [ ] Decide 的 8 条停止条件全部可命中
- [ ] .loop-log/ 中每个 Phase 有对应日志
