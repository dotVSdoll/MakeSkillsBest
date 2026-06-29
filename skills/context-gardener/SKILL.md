---
name: context-gardener
description: "上下文园艺师 — 定期巡检项目指令文件（CLAUDE.md、memory/*.md、rules/*），检测过期/矛盾/膨胀问题，生成可视化花园报告，可选自动修剪。内嵌完整 Loop Engineering 生命周期。"
argument-hint: "check the garden | audit context files | health check | prune stale rules"
loop-phases:
  - observe
  - diagnose
  - plan
  - act
  - verify
  - learn
  - decide
state-files:
  - .gardener-state.json
  - .gardener-memory.json
  - .gardener-config.json
garden-launch: "python -m src.main garden <project-path>"
---

# Context Gardener 🌱 — 上下文园艺师

## 定位

**项目的上下文文件（CLAUDE.md、memory 文件、rules 文件）是 Agent 理解项目的"土壤"。它们会随时间腐烂——过时的约定、互相矛盾的规则、无人敢删的大段指令。Gardener 定期巡视、诊断、修剪，让这片花园保持健康。**

本 skill 不是一次性清理工具。它内嵌完整的 Loop Engineering 生命周期：每次运行都是一个可重复、可验证、可自愈的循环。

---

## 核心循环（7 阶段）

```
🔍 Observe ──→ 🩺 Diagnose ──→ 📋 Plan ──→ 🔧 Act ──→ ✅ Verify ──→ 📝 Learn ──→ 🔁 Decide
                                                                                          │
                    ┌──────────────────────────────────────────────────────────────────────┘
                    │ Decide=continue → 回到 Observe 或 Act
                    │ Decide=stop     → 结束，输出报告
                    │ Decide=replan   → 回到 Plan
```

---

## PRECONDITIONS — 硬门控

```
[1] 目标仓库路径可访问？
    NO → STOP. "❌ 找不到目标仓库"

[2] 当前会话处于项目根目录？
    NO → STOP. "❌ Gardener 需要在项目根目录运行"

[3] 存在至少一个上下文文件（CLAUDE.md / .claude/memory/*.md / .claude/rules/*）？
    NO → STOP. "❌ 未找到任何上下文文件。Gardener 管理的是 .claude/ 下的指令和记忆文件"

[4] .gardener-state.json 已存在？
    YES → 加载历史状态，恢复上次运行上下文
    NO  → 初始化新状态文件，这是首次运行
```

---

## 🔍 阶段 1: Observe — 扫描花园

### 做什么

扫描目标仓库中所有的上下文文件，建立"花园清单"。不修改任何文件。

### 扫描范围

| 路径 | 说明 | 是否必需 |
|------|------|---------|
| `CLAUDE.md` / `CLAUDE_EN.md` | 项目级 Agent 指令 | 可选（不存在不报错） |
| `.claude/memory/*.md` | 持久化记忆文件 | 可选 |
| `.claude/rules/*.md` / `.cursor/rules/*.md` | 项目级规则 | 可选 |
| `.github/copilot-instructions.md` | Copilot 指令 | 可选 |
| 其他由用户指定的路径 | 扩展扫描 | 通过参数传入 |

### 每份文件的测量指标

```
- 路径 (相对项目根目录)
- 文件大小 (bytes)
- 行数
- 最后修改时间
- 段落数 (按 ## 或 --- 分割)
- frontmatter 是否存在（YAML 头部）
- 关键词密度（项目名称、技术栈、关键术语的出现频率）
- 文件年龄（距离最后修改的天数）
- .gardener-memory.json 中是否有此文件的过往记录
```

### 产出

`gardener-inventory.json`（写入 `.gardener-state.json` 的 `observe` 段）：

```json
{
  "files": [
    {
      "path": "CLAUDE.md",
      "size": 4520,
      "lines": 89,
      "sections": 6,
      "hasFrontmatter": true,
      "lastModified": "2026-06-20T14:30:00Z",
      "ageDays": 9,
      "keyTerms": ["MakeSkillsBest", "Gardener", "Loop Engineering"],
      "historyCount": 3
    }
  ],
  "summary": {
    "totalFiles": 8,
    "totalSize": 28400,
    "avgAgeDays": 32
  }
}
```

---

## 🩺 阶段 2: Diagnose — 诊断问题

### 做什么

基于 Observe 的清单，逐文件检查五种常见病症。

### 五种病症

#### D1: 枯萎（Stale）
文件长时间未更新，内容可能已过时。

- 阈值：超过 `staleDays` 天未修改（默认 30 天，可通过参数配置）
- 严重度：天数越高越严重
- 检测：`now - file.lastModified > staleDays`

#### D2: 缠绕（Contradiction）
两个或多个上下文文件包含互相矛盾的规则或约定。

- 检测方式：关键词匹配 + 规则冲突分析
  - 例如：文件 A 说 "use tabs for indentation"，文件 B 说 "use 2 spaces"
  - 例如：文件 A 说 "变量命名 camelCase"，文件 B 说 "变量命名 snake_case"
- 严重度：冲突数量越多越严重
- 注意：只检测明确矛盾的陈述，不做过度推断

#### D3: 杂草（Bloat）
文件过度膨胀，内容冗余，无人维护。

- 阈值：超过 `maxLines` 行（默认 200 行）或超过 `maxWords` 字（默认 1000 字）
- 子检测：是否存在超过 50 行的段落？是否存在连续 3 个以上未修改的区块？
- 严重度：超标比例越高越严重

#### D4: 病枝（Redundancy）
多个文件描述了同一件事，可以合并。

- 检测方式：检索 `.gardener-memory.json` 中是否有 "合并建议" 历史
- 检测方式：相似 frontmatter 字段、相似标题
- 严重度：每个冗余组计为一个问题

#### D5: 枯根（Orphan）
memory 文件引用了已不存在的代码、已废弃的决策、已删除的模块。

- 检测方式：提取文件名/关键词 → grep 项目源码 → 无匹配则标记
- 严重度：高（因为可能导致 Agent 产生错误的上下文理解）
- 注意：此检测需要项目源码可访问，且可能产生误报（间接引用）

### 严重度分级

| 级别 | 标签 | 定义 |
|------|------|------|
| P0 | 🔴 Critical | 矛盾规则 / 枯根引用 — 可能导致 Agent 做出错误决策 |
| P1 | 🟠 High | 严重枯萎（>90 天） / 严重膨胀（>500 行） |
| P2 | 🟡 Medium | 一般枯萎 / 一般膨胀 / 冗余 |
| P3 | 🟢 Low | 轻微问题，建议关注 |

### 产出

写入 `.gardener-state.json` 的 `diagnose` 段：

```json
{
  "issues": [
    {
      "id": "stale-001",
      "type": "stale",
      "severity": "P1",
      "file": "CLAUDE.md",
      "detail": "文件 45 天未更新（上次修改：2026-05-15）",
      "suggestion": "审查并更新项目约定"
    },
    {
      "id": "contra-001",
      "type": "contradiction",
      "severity": "P0",
      "files": ["CLAUDE.md", ".claude/memory/lint-style.md"],
      "detail": "CLAUDE.md 要求 'use tabs'，lint-style.md 要求 'use 2 spaces'",
      "suggestion": "统一缩进风格"
    }
  ],
  "summary": {
    "totalIssues": 5,
    "bySeverity": { "P0": 1, "P1": 1, "P2": 2, "P3": 1 },
    "gardenHealthScore": 62
  }
}
```

#### 健康分计算

```
基础分 = 100
- 每个 P0 问题 -25 分
- 每个 P1 问题 -10 分
- 每个 P2 问题 -5 分
- 每个 P3 问题 -2 分
健康分 = max(0, 基础分)

评级：
  90-100: 🌻 健康
  70-89:  🌿 良好
  50-69:  🥀 需要关注
  <50:    ⚠️ 危急
```

---

## 📋 阶段 3: Plan — 生成修剪计划

### 做什么

基于 Diagnose 的问题清单，为每个问题生成具体的处理方案。

### 计划类型

| 类型 | 适用问题 | 动作 |
|------|---------|------|
| **prune** | 枯萎（过时内容）、杂草（膨胀部分） | 移除指定段落或文件 |
| **merge** | 冗余、缠绕 | 合并多个文件为一个 |
| **flag** | 矛盾（无法自动判断方向） | 标记给用户手动处理 |
| **rewrite** | 枯根（引用已删除代码） | 更新引用或移除段落 |
| **ignore** | 误报或用户上次标记的 false positive | 添加到忽略列表 |

### 约束

- **Plan 不修改任何文件**。它只生成建议。
- 每个计划项必须包含：问题 ID、建议动作、预期影响（健康分变化预估）
- 可参考 `.gardener-memory.json` 中用户上次对同类问题的处理偏好

### 产出

写入 `.gardener-state.json` 的 `plan` 段：

```json
{
  "actions": [
    {
      "issueId": "stale-001",
      "action": "prune",
      "target": "CLAUDE.md",
      "detail": "移除 Section 3（过时的构建说明），Section 4 更新为当前版本",
      "expectedImpact": "+5 健康分",
      "requiresConfirmation": true
    }
  ],
  "summary": {
    "totalActions": 4,
    "autoApproved": 0,
    "needsConfirmation": 4,
    "estimatedHealthAfter": 82
  }
}
```

---

## 🔧 阶段 4: Act — 执行修剪

### 做什么

执行 Plan 中生成的动作。**默认不执行任何修改**，需要用户确认。

### 安全规则

```
[1] 用户必须显式确认
    通过命令行参数（--apply）或交互式确认
    未确认 → Act 阶段跳过，输出待执行计划

[2] 每次修改前创建备份
    修改的文件备份到 .gardener-backup/{timestamp}/
    可根据备份回滚

[3] 修改范围锁定
    只修改 Observe 阶段扫描到的上下文文件
    不改动 src/、test/、config/ 等非上下文文件

[4] 最小修改原则
    只改 Diagnose 标记的问题
    不顺手修改格式、风格、措辞
```

### 修改流程

```
for each action in plan.actions:
  if action.requiresConfirmation AND not userConfirmed:
    skip → 记录到 "待确认" 列表
    continue

  backup original file → .gardener-backup/{timestamp}/{path}
  apply change
  log change → .gardener-state.json.act.changes
```

### 产出

写入 `.gardener-state.json` 的 `act` 段：

```json
{
  "applied": [
    {
      "issueId": "stale-001",
      "action": "prune",
      "file": "CLAUDE.md",
      "change": "移除 Section 3，更新 Section 4",
      "backup": ".gardener-backup/20260629/CLAUDE.md"
    }
  ],
  "skipped": [
    {
      "issueId": "contra-001",
      "action": "flag",
      "reason": "需要用户决定使用 tabs 还是 spaces"
    }
  ]
}
```

---

## ✅ 阶段 5: Verify — 验证结果

### 做什么

重新执行 Observe 和 Diagnose，对比修剪前后的变化。

### 验证项

```
[1] 问题减少了吗？
    前: 5 issues → 后: 2 issues ✅

[2] 健康分提升了吗？
    前: 62 → 后: 78 ✅

[3] 有新的问题引入吗？
    检查新出现的 issues（如果有，是否来自本次修改？）✅

[4] 误删了什么吗？
    对比 backup，确认没有删除仍在被引用的内容 ✅

[5] 文件结构仍然完整吗？
    所有保留的段落 frontmatter 完整 ✅
```

### 产出

写入 `.gardener-state.json` 的 `verify` 段：

```json
{
  "preHealth": 62,
  "postHealth": 78,
  "improvement": +16,
  "issuesResolved": 3,
  "issuesRemaining": 2,
  "newIssuesIntroduced": 0,
  "verdict": "✅ 修剪有效。花园健康度提升，无回归问题"
}
```

---

## 📝 阶段 6: Learn — 学习与记忆

### 做什么

将本次循环的经验沉淀到 `.gardener-memory.json`，让下一次循环做得更好。

### 记忆内容

```json
{
  "sessions": [
    {
      "date": "2026-06-29T10:00:00Z",
      "duration": "3m 42s",
      "healthChange": "+16",
      "actionsTaken": ["prune", "flag"],
      "userFeedback": {
        "approvedPrune": true,
        "rejectedFlag": true,
        "userNote": "tabs 和 spaces 的问题我手动处理了"
      }
    }
  ],
  "patterns": {
    "commonIssues": ["stale", "contradiction"],
    "userPreferences": {
      "stalenessThreshold": 45,
      "autoPrune": false,
      "ignoredPaths": [".claude/rules/third-party/*"]
    }
  },
  "falsePositives": [
    {
      "type": "stale",
      "file": "CHANGELOG.md",
      "reason": "CHANGELOG 只在发版时更新，长时间不更新是正常的",
      "flaggedDate": "2026-06-20",
      "userConfirmed": true
    }
  ]
}
```

### 学习成果

每次运行后，总结几条对下次有价值的经验：

```
📝 这次学到的：
• CLAUDE.md 每 45 天需要审查一次（用户设置的阈值）
• CHANGELOG.md 的"枯萎"是误报——已加入忽略列表
• 用户倾向手动处理矛盾规则，不希望自动合并
```

---

## 🔁 阶段 7: Decide — 决定下一步

### 做什么

基于前 6 个阶段的产出，决定这个循环是否继续、停止、或改变方向。

### 判断条件

```
[1] 花园健康分 >= 90 且没有 P0/P1 问题？
    YES → ✅ STOP. "花园很健康！建议 {nextSchedule} 后再检查"
    NO  → ↓

[2] 本次迭代有实质改进（健康分提升 > 5）？
    YES → 🔄 CONTINUE. "还有 {remaining} 个问题，是否再跑一轮？"
    NO  → ↓

[3] 连续 3 次迭代改进 < 5？
    YES → ⏸ PAUSE. "连续三轮没有明显改进，建议人工介入检查"
    NO  → ↓

[4] 用户要求持续监控？
    YES → ⏱ WATCH. "将持续监控模式。下次检查：{nextSchedule}"
    NO  → ↓

[5] 默认 → ✅ STOP. 输出最终花园报告
```

### 产出

最终报告摘要（同时写入 `.gardener-state.json` 的 `decide` 段和花园 HTML）：

```
🌱 Context Gardener — 巡检报告
━━━━━━━━━━━━━━━━━━━━━━━
仓库: MakeSkillsBest
运行时间: 2026-06-29 10:00 UTC
耗时: 3m 42s

健康分: 62 → 78 (+16) 🟢
评级: 🌿 良好

处理: 3 修复 | 1 跳过 | 1 待确认
状态: ✅ 停止（建议 30 天后复查）
```

---

## 🖼 花园可视化

本 skill 附带一个 **Pygame 2D 花园窗口**，将 `.gardener-state.json` 的数据映射为可视化场景。

### 工作流

```
Agent 完成 Loop（或循环中）→ launch python -m src.main garden <项目路径>
                                        │
                                        └── Pygame 窗口打开
                                            │
                                            ├── 植物 = 上下文文件
                                            ├── 园艺师 = Loop 阶段动画
                                            ├── HUD = 健康分 + 问题数
                                            └── 右边栏 = 规则设置面板
```

### 映射关系

| Garden 元素 | 对应数据 |
|-------------|---------|
| 🌻 茂盛的植物 | 健康分 ≥80 的文件 |
| 🌿 正常植物 | 健康分 50-79 的文件 |
| 🥀 枯萎植物 | 健康分 <50 的文件 |
| 🧑‍🌾 园艺师 | 当前 Loop 阶段（Observe→巡视, Diagnose→检查, Act→修剪） |
| 右上角 HUD | 总体健康分 / 问题数 / 上次运行时间 |
| 右侧面板 ⚙ | `.gardener-config.json` 可视化编辑 |

### 启动方式

Gardener Loop 跑完（或在 Decide 阶段期间），Agent 启动花园窗口：

```bash
# 由 Agent 自动执行
python -m src.main garden <项目路径>
```

窗口属性：
- 分辨率：1280×720
- 背景：渐变色天空 + 草地
- 植物：自动根据文件数排列在花园中
- 园艺师：根据 Loop 阶段自动移动和改变动作
- 待机模式：按 SPACE 或 Loop 结束后进入待机（窗口不关闭）

### 规则设置面板

右侧面板（按 `S` 或点击 ⚙ 打开）提供完整的配置编辑：

```
⚙ 规则设置
├── ⏱ 调度        cron 表达式 / 启用开关
├── 📏 阈值        staleDays / maxLines / maxWords
├── 🔍 检测        枯萎 / 矛盾 / 膨胀 / 枯根 开关
├── ⚡ 策略        ask / auto / report-only
└── 🔄 Loop 流程   停止条件 / 跳过阶段 / 确认环节
```

所有修改实时保存到 `.gardener-config.json`。

---

## 状态文件

### `.gardener-state.json`

当前运行的状态。每次运行创建/更新。包含所有阶段的产物。

> 注意：此文件不提交到 git（在 `.gitignore` 中忽略）。

### `.gardener-memory.json`

跨会话的长期记忆。包含学习到的模式、用户偏好、历史 false positive 记录。

> 可选提交到 git（让团队共享 Gardener 的学习成果）。

---

## 安全与边界

| 规则 | 说明 |
|------|------|
| **Observe/Diagnose 只读** | 前两个阶段永远不修改任何文件 |
| **Act 默认跳过** | 必须用户显式确认（`--apply` 参数或交互确认）才执行修改 |
| **修改前备份** | 每次修改前创建 `.gardener-backup/{timestamp}/` |
| **仅限上下文文件** | 绝不修改 `src/`、`test/`、`config/` 等代码文件 |
| **Plan 不执行** | Plan 阶段只生成建议，不做修改 |
| **Decide 永不循环超过 5 次** | 同一会话最多 5 轮迭代，防止失控 |

---

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `staleDays` | 30 | 文件多少天未更新算"枯萎" |
| `maxLines` | 200 | 文件超过多少行算"膨胀" |
| `maxWords` | 1000 | 文件超过多少字算"膨胀" |
| `maxIterations` | 5 | 一次会话中最多循环次数 |
| `apply` | false | 是否自动应用修剪（设为 true 跳过 Act 确认） |
| `reportFormat` | html | 输出格式（html / json / terminal） |
| `includePaths` | [] | 额外的扫描路径 |
| `ignorePaths` | [] | 排除的扫描路径 |

使用方式：
```bash
/gardener "检查项目" --staleDays 45 --maxLines 150
```

---

## 跨平台使用

```bash
# Claude Code
/gardener "检查上下文文件健康度"
/gardener "修剪花园" --apply          # 含自动修剪

# Cursor
@gardener 检查上下文文件健康度

# Codex CLI
gardener run
gardener run --apply                  # 含自动修剪
```

---

## 命令行参考

```
/gardener [指令] [选项]

指令:
  "检查..."    触发完整 Gardener Loop（Observe → Diagnose → Plan → ...）
  "修剪..."    触发 Loop 并包含 Act 阶段（等价于 --apply）
  "只看..."    只运行 Observe + Diagnose，跳过 Plan/Act（只读模式）

选项:
  --staleDays N    设置"枯萎"阈值（默认 30 天）
  --maxLines N     设置"膨胀"阈值（默认 200 行）
  --apply          自动应用修剪计划，跳过用户确认
  --report html    输出格式（html / json / terminal）
```

---

## 验证安装

```bash
# 运行一次只读检查，验证 Gardener 正常工作
/gardener "只检查当前项目的上下文健康度，不修改任何文件"

# 预期输出：
# 🌱 Context Gardener — 巡检报告
# 仓库: xxx
# 健康分: xx
# ...
```
