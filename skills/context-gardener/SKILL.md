---
name: context-gardener
description: "上下文园艺师 — 先读项目，再读 CLAUDE.md，逐层审计四层架构（CLAUDE.md → skills/ → hooks/ → memory/）。不做代码修改，只做审查、总结、归纳。生成建议报告，可视化花园输出。"
argument-hint: "check the garden | audit context health | review project rules"
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

**Gardener 不做代码修改。Gardener 做三件事：审查、总结、归纳。**

它的职责是保证项目的四层架构健康有序：

```
CLAUDE.md     ← 源头。关键规则。应该精简。
  ├── skills/   ← 工作流实现。准确、轻量、不冗余。
  ├── hooks/    ← 自动化钩子。按需配置、运行有效。
  └── memory/   ← 持久化记忆。有序、无孤儿、可追溯。
```

**你的项目是什么，CLAUD.md 就该写什么。** Gardener 先读懂项目，再看 CLAUDE.md 有没有准确反映项目。

---

## 核心原则

| 原则 | 含义 |
|------|------|
| ❌ 不做代码修改 | 不碰 src/、不碰 test/、不碰 config/ |
| ✅ 只做审查、总结、归纳 | 发现问题、分类整理、提出建议 |
| 🧭 先读项目，再读 CLAUDE.md | 不带偏见，以项目真实面貌为准 |
| 🧩 四层各司其职 | CLAUDE.md 不是垃圾桶，不该放的东西移到下层 |
| ⚖️ 轻量调用 | 不扫描整个仓库的代码，只关注上下文相关文件 |
| 📝 产出建议报告 | 所有发现写入 `.gardener-advice.md`，供用户参考 |

---

## 核心循环（7 阶段）

```
🔍 Observe ──→ 🩺 Diagnose ──→ 📋 Plan ──→ 🔧 Act(建议) ──→ ✅ Verify ──→ 📝 Learn ──→ 🔁 Decide
                                                                                           │
                    ┌───────────────────────────────────────────────────────────────────────┘
                    │ Decide=continue → 回到 Observe
                    │ Decide=stop     → 结束，输出建议报告
                    │ Decide=replan   → 回到 Plan
```

---

## PRECONDITIONS — 硬门控

```
[1] 项目根目录存在 .git？
    NO → STOP. "❌ 不是 Git 仓库，Gardener 需要 Git 仓库来理解项目历史"

[2] 项目根目录存在 CLAUDE.md 或其他上下文文件？
    NO → STOP. "❌ 没有 CLAUDE.md，无上下文可审计"

[3] 项目有可识别的项目类型（package.json / pyproject.toml / Cargo.toml / go.mod）？
    NO → ⚠️ 弱警告。继续运行但标记"项目类型未知，部分分析受限"
```

---

## 🔍 阶段 1: Observe — 先读项目，再读 CLAUDE.md

### Step 1: 读项目（了解项目真实面貌）

放下 CLAUDE.md，先看项目到底是什么。

#### 1a. 项目类型检测

检测以下信号，确定项目属性：

| 信号文件 | 推断 |
|----------|------|
| `pyproject.toml` / `setup.py` | Python 项目 |
| `package.json` | Node.js 项目 |
| `Cargo.toml` | Rust 项目 |
| `go.mod` | Go 项目 |
| `Gemfile` | Ruby 项目 |
| `*.csproj` | C# 项目 |
| `CMakeLists.txt` | C/C++ 项目 |
| 以上多个同时存在 | 多语言项目（注意！） |

同时提取：
- 项目名称、版本
- 框架（FastAPI / Next.js / React / Actix）
- 测试工具（pytest / vitest / go test）
- 包管理器（pip / npm / yarn / cargo）

#### 1b. 项目结构分析（参考 repo-decompose 思路）

扫描目录，构建结构画像：

```
📁 项目根目录
├── 哪些是一级目录？
│   └── src/？packages/？app/？
├── 入口点
│   └── main.py？index.ts？main.rs？
├── 关键配置
│   └── tsconfig.json / pytest.ini / .env.example
├── 测试位置
│   └── tests/ 内联在 src/ 旁？统一 test/？
└── mock/test fixtures
    └── mock/？fixtures/？
```

**不需要遍历所有文件**——只看顶层结构 + 关键配置 + 测试目录。

#### 1c. 代码风格提取（参考 style-profile 思路）

检查少量代表性源文件（每个目录 1-2 个），提取：

```
命名规范      →  camelCase / snake_case / PascalCase
缩进          →  2 spaces / 4 spaces / tabs
字符串引号    →  单引号 / 双引号
分号          →  有 / 无
注释风格      →  docstring / JSDoc / 行注释 / 无注释
错误处理      →  try-catch / Result type / error return
```

#### 1d. 边界条件扫描

识别项目中"该关注什么"和"不该碰什么"：

```
✅ 核心路径（项目推进的关键区域）
   ├── src/、app/、lib/ 等源代码目录
   ├── tests/、specs/ 等测试代码
   └── 关键配置文件

❌ 不应触碰的区域
   ├── node_modules/、.venv/、vendor/（第三方依赖）
   ├── dist/、build/、target/（构建产物）
   ├── *.generated.*（自动生成代码）
   ├── .env（环境变量）
   └── .git/（Git 内部数据）

🔄 需要小心对待的区域
   ├── 大型重构中的代码
   ├── 他人正在修改的模块
   └── 核心基础设施模块
```

#### 1e. 可复用规则提取

从项目中识别出可以在 CLAUDE.md 中保留的"可持续复用规则"：

```
✅ 可推进项目的规则
   ├── 架构原则（"业务逻辑与基础设施分离"）
   ├── 功能约定（"API 响应格式统一"）
   └── 安全要求（"敏感信息必须环境变量"）

✅ 可持续复用的规则
   ├── 命名约定（"变量用 snake_case"）
   ├── 测试要求（"新功能必须有测试"）
   ├── Review 流程（"至少一人审批"）
   └── Commit 规范（"feat/fix/docs 前缀"）
```

---

### Step 2: 读 CLAUDE.md

再回头读 CLAUDE.md。逐段解析，为每条规则/约定打标签。

```
解析方式：
  - 按 ## 段落分割
  - 每个段落 → 一条"线索"

标签系统：
  ┌─────────────────────────────────────────────────────────┐
  │ 🟢 可推进项目     │ 与项目核心功能相关的规则              │
  │ 🟢 可持续复用     │ 工程实践类规则，长期有效              │
  │ 🟡 边界条件       │ 定义"能碰/不能碰"的规则              │
  │ 🟠 错位           │ 本应在 skills/hooks/memory 的内容    │
  │ 🔴 矛盾           │ 与项目实际做法冲突                    │
  │ ⚪ 噪音           │ 一次性指令/作废决策/个人偏好          │
  │ ⬜ 过时           │ 引用的技术/流程已不在项目中            │
  └─────────────────────────────────────────────────────────┘
```

---

### Step 3: 对照（项目 vs CLAUDE.md）

将 Step 1 得到的"项目真实面貌"与 Step 2 的"CLAUDE.md 线索"逐条对照。

| 结果 | 含义 | 动作 |
|------|------|------|
| ✅ **一致** | 规则和项目实践匹配 | 保持 |
| ⚠️ **Rule Drift** | 规则写了，项目没遵守 | 判断：规则过时了还是项目走偏了？ |
| 🔴 **矛盾** | 规则和项目实践冲突 | 标记高优先级，建议二选一 |
| 🟠 **错位** | 内容本不应在 CLAUDE.md | 建议移到 skills/hooks/memory |
| ⚪ **噪音** | 一次性/作废/个人偏好 | 建议移除 |
| ⬜ **缺失** | 项目有良好实践但 CLAUDE.md 没写 | 建议补充 |

#### 对照示例

```
项目检测: 代码使用 snake_case + 4 spaces + 无分号
CLAUDE.md: "变量用 camelCase（第 3 节）"

对照结果: 🔴 矛盾
  项目实际用 snake_case，CLAUDE.md 要求 camelCase。
  分析:
    - 项目代码一致使用 snake_case，无明显偏好偏移
    - 结论: CLAUDE.md 规则过时了
  建议: 更新 CLAUDE.md 为 "变量用 snake_case"
```

---

### 产出

写入 `.garder-state.json` 的 `observe` 段：

```json
{
  "projectProfile": {
    "type": "python",
    "framework": "FastAPI",
    "testTool": "pytest",
    "namingConvention": "snake_case",
    "indentSize": 4,
    "indentStyle": "spaces"
  },
  "claims": [
    { "section": 3, "text": "变量用 camelCase", "tag": "contradiction", "detail": "项目实际用 snake_case" },
    { "section": 5, "text": "每次提交前运行测试", "tag": "drift", "detail": "CLAUDE.md 写了但 hooks/ 无对应实现" },
    { "section": 7, "text": "2025-12 的一次 bug 排查记录", "tag": "noise", "detail": "一次性内容，建议移除" }
  ],
  "boundaries": {
    "corePaths": ["src/", "tests/"],
    "restrictedPaths": ["node_modules/", "dist/", ".env"]
  }
}
```

---

## 🩺 第二阶段: Diagnose — 四层审计

基于 Observe 的对照结果，逐层诊断。

### Layer 1: CLAUDE.md 健康度（权重 40%）

**核心问题：CLAUDE.md 是否准确地反映了项目应该知道的事情？**

| 检测项 | 条件 | 扣分 | 严重度 |
|--------|------|------|--------|
| 膨胀 | 段落数 > 8 或行数 > 150 | -15 | P2 |
| 错位 | 每条属于 skills/hooks/memory 的内容还在 CLAUDE.md | -10/条 | P2 |
| 矛盾 | 与项目实际做法冲突 | -25/条 | P0 |
| 过时 | 引用的技术/流程已不存在 | -10/条 | P1 |
| 噪音 | 一次性指令/作废决策 | -5/条 | P3 |
| 冗余 | 同一条意思出现两次以上 | -5/条 | P3 |
| 规则漂移 | 规则写了但项目未遵守 | -10/条 | P1 |

### Layer 2: skills/ 健康度（权重 25%）

**核心问题：skills/ 下的定义是否准确、轻量、有用？**

| 检测项 | 条件 | 扣分 |
|--------|------|------|
| 幽灵 skill | 存在但未被任何地方引用 | -15 |
| 缺失 skill | CLAUDE.md 提到的工作流无对应实现 | -15 |
| 膨胀 skill | SKILL.md 描述 > 50 行或职责不单一 | -5 |
| 调用过重 | skill 的分析范围超过实际需要 | -5 |

### Layer 3: hooks/ 健康度（权重 20%）

**核心问题：hooks/ 是否正确配置、是否按预期运行？**

| 检测项 | 条件 | 扣分 |
|--------|------|------|
| 缺失自动化 | CLAUDE.md 声明了但 hooks/ 无实现 | -10 |
| 失效 hook | hook 文件存在但报错或非预期 | -20 |
| 过重 hook | hook 执行 > 30 秒或有副作用 | -5 |
| 优化机会 | 可以利用 hook 做但没做的自动化 | -3 |

### Layer 4: memory/ 健康度（权重 15%）

**核心问题：memory 是否有序、可追溯、无孤儿？**

| 检测项 | 条件 | 扣分 |
|--------|------|------|
| 孤儿 | 引用了已不存在的代码或决策 | -15 |
| 重复 | 多个文件描述同一件事 | -5 |
| 过时 | 记录的决定已被推翻 | -5 |
| 膨胀 | 超过 5 个文件或单个文件 > 200 行 | -5 |

### 健康分计算

```
基础分 100

总分 = 100 - (Layer1扣分 × 40%) - (Layer2扣分 × 25%) - (Layer3扣分 × 20%) - (Layer4扣分 × 15%)

评级:
  90-100: 🌻 健康
  70-89:  🌿 良好
  50-69:  🥀 需要关注
  <50:    ⚠️ 危急
```

---

## 📋 阶段 3: Plan — 生成重组建议

基于 Diagnose 的问题清单，为每个问题生成建议。

### 建议类型

| 动作 | 适用场景 | 例子 |
|------|---------|------|
| **remove** | 噪音、过时内容 | 删除 CLAUDE.md 第 7 节（一次性的 bug 排查记录） |
| **extract** | 错位内容 | 将 "代码审查流程" 从 CLAUDE.md 移到 skills/code-review/SKILL.md |
| **update** | 规则漂移、矛盾 | 更新 "变量用 camelCase" → "变量用 snake_case" |
| **add** | 缺失规则 | 在 CLAUDE.md 补充 "新功能必须有测试" |
| **create** | 缺失 skill/hook | 创建 hooks/pre-commit 实现自动测试 |
| **archive** | 幽灵 skill | 归档未使用的 skill |
| **merge** | 冗余/重复 memory | 合并两个描述同一架构决策的 memory 文件 |

### 建议格式

```
每一条建议包含：
  • 问题 ID（对应 Diagnose 的问题）
  • 动作（remove / extract / update / add / create / archive / merge）
  • 目标位置（CLAUDE.md / skills/xxx / hooks/xxx / memory/xxx）
  • 具体操作描述
  • 预期影响（健康分变化）
  • 是否需要人工确认
```

### 产出

写入 `.gardener-state.json` 的 `plan` 段，同时生成 **`.gardeneer-advice.md`**（人类可读的建议报告）：

```markdown
# 🌱 Gardener 建议报告

## 仓库: my-project  日期: 2026-06-29

## 总览

健康分: 72/100 🌿 — 良好，但有改进空间

| 层级 | 分数 | 状态 |
|------|------|------|
| 📄 CLAUDE.md | 55/100 | 🥀 需要关注 |
| 📦 skills/ | 85/100 | 🌿 良好 |
| ⚙️ hooks/ | 90/100 | 🌻 健康 |
| 📝 memory/ | 70/100 | 🌿 良好 |

## 建议

### 🔴 高优先级

1. [矛盾] CLAUDE.md 第 3 节 "变量用 camelCase" 与项目实际使用的 snake_case 冲突
   建议: update → 改为 "变量用 snake_case"
   → 预估 +15 健康分

### 🟡 中优先级

2. [错位] CLAUDE.md 第 5 节 "代码审查流程" 应移到 skills/code-review/
   建议: extract → 创建 skills/code-review/SKILL.md，CLAUDE.md 只保留引用
   → 预估 +10 健康分

### 🟢 低优先级

3. [噪音] CLAUDE.md 第 7 节 "2025-12-15 bug 排查记录" 是一次性内容
   建议: remove → 删除
   → 预估 +5 健康分
```

---

## 🔧 阶段 4: Act — 建议输出（不执行修改）

**Gardener 不做代码修改。** 此阶段的职责是完善和输出建议报告。

### 做什么

1. 将 Plan 阶段的建议整理为 `.gardener-advice.md`
2. 确保建议清晰、可执行、分优先级
3. 输出到项目根目录，供用户查阅

### 不做什么

- ❌ 不修改 CLAUDE.md
- ❌ 不创建/删除 skills/
- ❌ 不创建/修改 hooks/
- ❌ 不修改 memory 文件

### 产出

`.gardener-advice.md` — 一份完整的审计建议报告。

---

## ✅ 阶段 5: Verify — 重检查

从 Observe 开始重新运行一次，比较前后差异。

```
[1] 问题数量变化？
    前: 8 issues → 后（用户手动处理后）: 3 issues ✅

[2] 健康分变化？
    前: 72 → 后: 88 ✅

[3] 是否有新问题？
    检查是否引入了新的矛盾、膨胀 ✅
```

> **注意：** 如果用户尚未手动修改任何内容，Verify 分数应与上一次相同。Gardener 如实报告——"建议已生成，等待用户处理"。

---

## 📝 阶段 6: Learn — 记录经验

### 记录内容

```json
{
  "sessions": [
    {
      "date": "2026-06-29",
      "projectType": "python",
      "healthChange": 0,
      "adviceGenerated": 3,
      "adviceAccepted": 0,
      "userFeedback": null
    }
  ],
  "patterns": {
    "commonIssues": ["contradiction", "noise"],
    "userPreferences": {
      "ignoredPaths": ["CHANGELOG.md"],
      "preferredStyle": "report-only"
    }
  },
  "falsePositives": [
    {
      "type": "noise",
      "file": "CLAUDE.md",
      "reason": "用户认为 "200 行不算膨胀"",
      "flaggedDate": "2026-06-20"
    }
  ]
}
```

---

## 🔁 阶段 7: Decide — 决定下一步

```
[1] 健康分 ≥85 且无 P0/P1 问题？
    YES → ✅ STOP. "花园状态良好。建议 {nextSchedule} 后复查"
    NO  → ↓

[2] 有未处理的建议？
    YES → ⏸ STANDBY. "有 {N} 条建议待处理。用户可查看 .gardener-advice.md"
    NO  → ↓

[3] 连续 3 次运行无变化？
    YES → ⏸ PAUSE. "连续多次无变化，建议人工介入"
    NO  → ↓

[4] 默认 → ✅ STOP. 输出建议报告
```

---

## 🖼 花园可视化

Pygame 窗口将四层架构映射为花园的四个区域：

```
┌────────────────────────────────────────────────────┐
│  🌱 Little Gardener — project-name       [⚙]     │
│  健康度: 72/100 ████████████░░░░░░░               │
│                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ 📄 土壤区   │  │ 📦 工具区   │  │ ⚙️ 齿轮区  │   │
│  │ CLAUDE.md  │  │ skills/    │  │ hooks/     │   │
│  │  55/100    │  │  85/100    │  │  90/100    │   │
│  └────────────┘  └────────────┘  └────────────┘   │
│                                 ┌────────────┐     │
│                                 │ 📝 种子区   │     │
│                                 │ memory/    │     │
│                                 │  70/100    │     │
│                                 └────────────┘     │
│                                                    │
│  🧑‍🌾 园艺师在土壤区检查                               │
│                                                    │
│  🔴 1 条矛盾规则                                     │
│  🟠 2 条错位内容                                     │
│  🟡 1 条噪音                                         │
│                                                    │
│  [按 S 打开规则面板]  [按 SPACE 待机]                │
└────────────────────────────────────────────────────┘
```

---

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `staleDays` | 30 | 文件多少天未更新算"过期" |
| `maxSections` | 8 | CLAUDE.md 超过多少段落算"膨胀" |
| `maxLines` | 150 | CLAUDE.md 超过多少行算"膨胀" |
| `thorough` | false | 是否进行深层分析（遍历更多文件） |
| `reportFormat` | md | 建议报告格式（md / json / both） |

---

## 跨平台使用

```bash
# Claude Code
/gardener "检查项目上下文健康度"

# Cursor
@gardener 检查项目上下文健康度

# Codex CLI
gardener run
```

---

## 与旧版 archive skills 的关系

Gardener 在 Observe 阶段参考了以下旧版 skill 的思路：

| 参考来源 | 在 Gardener 中的体现 |
|----------|-------------------|
| `style-profile` | 代码风格提取（Step 1c） |
| `repo-decompose` | 项目结构分析（Step 1b） |
| `semantic-rag` | 项目类型检测和概览（Step 1a） |
| `knowledge-graph` | 模块依赖/边界分析（Step 1d） |
| `mvp-approach` | 边界条件识别（Step 1e） |

这些 skill 的完整定义保留在 `archive/skills/` 中供参考。
