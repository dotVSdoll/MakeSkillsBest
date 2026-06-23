---
name: log-journal
description: "循环日志管理 — 每个阶段产出结构化 markdown 日志，格式统一、内容精简、可追溯。自动保存到 .loop-log/，支持按阶段/日期/关键词检索。"
argument-hint: "save loop log | show journal | simplify log | format log | what did we find in phase 3"
dependencies:
  upstream:
    - engineering-loop  # 每个 Phase 切换时调用
  downstream: []
---

# Log Journal — 循环日志管理

## 概述

**Loop 的每一轮、每一阶段都有可追溯的书面记录。** 不只是 `.repo-loop-state.json` 的机器可读状态——这是一份人类可读的优化日志。

**核心原则：** 日志是给开发者看的，不是给 agent 看的。任何人在任何时候打开日志，都能理解"发现了什么、做了什么决定、为什么"。

## 日志文件结构

```
.loop-log/
└── 2026-07-04_immer-optimize/
    ├── 00-session.yaml          # 会话元信息
    ├── 01-observe.md             # 风格画像 + 项目身份
    ├── 02-understand.md          # 语义理解 + 方向验证
    ├── 03-diagnose.md            # 安全审计 + 问题清单
    ├── 04-plan.md                # 修复计划 + 任务 DAG
    ├── 05-bound.md               # 修改白名单 + 红区
    ├── 06-fix.md                 # 每次 commit 的变更摘要
    ├── 07-verify.md              # 验证结果
    ├── 08-self-review.md         # 自审发现
    ├── 09-learn.md               # 经验教训
    └── INDEX.md                  # 快捷索引
```

**目录命名：** `{YYYY-MM-DD}_{repo-name}-{goal-slug}`

## PRECONDITIONS

```
[1] .repo-loop-state.json 存在？
    NO → STOP. "❌ 需要先初始化 engineering-loop"

[2] .loop-log/ 目录存在？
    NO → 自动创建
```

## 每条日志的标准格式

```
# Phase N: 阶段名

⏱️ {ISO timestamp} | Loop #{n} | {repo}

---

## 📋 关键发现

- [发现 1] — [证据: file:line]
- [发现 2] — [证据: file:line]

## ✅ 决策

- [决策 1] — [理由]
- [决策 2] — [理由]

## 📊 数据

| 指标 | 值 |
|---|---|
| [名称] | [数值] |

## ➡️ 下一阶段

[下一阶段名] — [预期进入原因]

## 📎 引用

- [相关文件:行号]
- [相关状态文件字段]
```

## 写入规则

### 规则 1: 长度约束

- 每条要点 ≤ 30 字
- 每个阶段日志 ≤ 50 行
- 索引文件 ≤ 20 行
- 超过 → 拆分到子文件

### 规则 2: 证据绑定

- 每个"发现"必须有 `file:line` 或状态文件字段引用
- 不允许"可能""似乎""感觉"等无证据断言

### 规则 3: 禁止的写法

- ❌ 粘贴源代码（超过 5 行的代码块）
- ❌ 重复上一阶段的日志内容（引用链接即可）
- ❌ "我做了 X"（主语永远是 Loop，不是 Agent）
- ❌ emoji 标题（正文中允许适量 emoji）
- ❌ 空条目（"暂无"→ 不写这个条目的标题）

### 规则 4: 简化模式

当日志超过 50 行时自动触发简化：

```
简化操作:
  1. 合并同类发现: "3 处 SQL 拼接" 替代逐条列出
  2. 删除无决策的讨论记录
  3. 删除已被后续阶段推翻的临时结论
  4. 将代码引用从 5 行压缩为 1 行 file:line
```

## 检索接口

通过 `INDEX.md` 快速定位：

```markdown
# Loop Index — 2026-07-04_immer-optimize

| 阶段 | 状态 | 关键标签 |
|---|---|---|
| 01-observe | ✅ | style:camelCase, scale:S |
| 02-understand | ✅ | direction:auth-refactor |
| 03-diagnose | ✅ | SEC-CRIT:2, SEC-HIGH:3 |
| 04-plan | ✅ | tasks:5, batches:3 |
| 05-bound | ✅ | allowed:3, forbidden:5 |
| 06-fix | ✅ | commits:3, lines:+120/-45 |
| 07-verify | ✅ | L1-L5: pass |
| 08-self-review | ✅ | issues:0 |
| 09-learn | ✅ | next:解耦中间件 |
```

**检索命令：** `grep "SEC-CRIT" .loop-log/*/INDEX.md` → 找到所有安全审计发现 CRITICAL 的会话。

## 与 engineering-loop 的集成

engineering-loop 在每次 Phase 切换时自动调用：

```
Phase → Done → engineering-loop 调用 log-journal → 写入日志 → 标记 INDEX.md → 进入下一 Phase
```

**写入时机：** Phase 标记为 `done` 后、进入下一 Phase 前。

**写入内容：** 从 `.repo-loop-state.json` 的对应字段提取。

```
日志来源映射:
  01-observe.md  ← meta + meta.styleProfile
  02-understand.md ← understand.* + understand.chosenDirection
  03-diagnose.md ← diagnose.securityAudit + diagnose.mvpFixValidation
  04-plan.md     ← plan.deliveryPlan + plan.taskGraph
  05-bound.md    ← bound.implementationMap
  06-fix.md      ← fix.completedTasks + fix.modifiedFiles
  07-verify.md   ← verify.results
  08-self-review.md ← selfReview.issues + selfReview.recommendation
  09-learn.md    ← learn.lessons + learn.nextRecommendations
```

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这阶段没什么可记录的，跳过日志" | 每个阶段都有状态变化——至少有"进入原因"和"出口状态" |
| 2 | "日志太长，我简化到 3 行" | 结构化的 30 行 > 随意的 3 行。遵守格式，不是压缩格式 |
| 3 | "把代码粘贴进去方便以后看" | 代码会过时。引用 file:line，不粘贴代码 |
| 4 | "INDEX.md 漏了一行，下阶段补" | INDEX 是实时索引。漏了 → 无法检索。补在当阶段 |

## 验证清单

- [ ] 每个已完成阶段有对应日志文件
- [ ] 每条发现绑定 file:line 或状态文件字段
- [ ] 每条日志 ≤ 50 行
- [ ] INDEX.md 包含所有阶段的快捷链接
- [ ] 无源代码粘贴块（> 5 行的代码块）
