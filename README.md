# MakeSkillsBest

> **代码优化工程循环 — 不是帮你加功能，是帮你把现有代码变得更好。**

```
Observe → Understand → Diagnose → Plan → Bound → Fix → Verify → Self-Review → Learn → Decide
   ↑                                                                              │
   └────────────────────────── continue ──────────────────────────────────────────┘
```

## 解决了什么问题？

AI coding agent 最大的问题不是"写不出代码"，而是**不知道做到哪了、该不该继续、改得对不对**。

MakeSkillsBest 是**专门做代码优化的**工程循环——发现安全漏洞、统一代码风格、修复架构退化、消除技术债务。每条修改都有证据，每次修复都验证，每轮结束都自我审查。**它不是帮你加新功能，是帮你把已有的代码打磨到更好。**

## Code Optimization Loop 架构

```
┌──────────────────────────────────────────────────────────────────┐
│               engineering-loop (总控 — 10 阶段)                   │
│  读写 .repo-loop-state.json，调度 11 个子 skill，判定继续/停止     │
└────────────┬─────────────────────────────────────────────────────┘
             │
  ┌──────────┴──────────────────────────────────────────────┐
  │                                                          │
  ▼                                                          ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│style-profile │ │semantic-rag  │ │security-audit│ │verification  │
│ 代码风格画像  │ │ 语义+多语言   │ │ 4维安全扫描  │ │   -loop      │
└──────────────┘ └──────────────┘ └──────────────┘ │ 4套验证模板   │
                                                   └──────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│knowledge-graph│ │repo-decompose│ │mvp-approach  │ │delivery-plan │
│ 符号→调用→数据 │ │ 三层并行拆分  │ │ 方向+修复验证 │ │ 分阶段修复计划 │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│  task-graph  │ │implementation│
│  任务依赖DAG  │ │    -map      │
└──────────────┘ │ 白名单+红区   │
                 └──────────────┘
```

**11 个 skill。每个可独立使用，也可由 engineering-loop 自动调度。所有 skill 通过 `.repo-loop-state.json` 共享状态。**

## 快速开始（30 秒）

```bash
# Claude Code（推荐）
/plugin marketplace add dotVSdoll/MakeSkillsBest

# 只读模式 — 理解项目
/read-loop "理解这个仓库的架构和安全状况"

# 优化模式 — 发现问题并修复
/optimize-loop "修复安全漏洞并统一错误处理风格"
```

```bash
# Codex / Cursor / Gemini CLI / Windsurf / 50+ 工具
npx skills add dotVSdoll/MakeSkillsBest -g
```

## 11 个 Skill

| 阶段 | Skill | 一句话 |
|---|---|---|
| 🔍 Observe | `style-profile` | 检测命名约定、错误处理、组织结构、测试习惯 |
| 🧠 Understand | `semantic-rag` | 跨语言语义分析 + 零依赖轻量 RAG |
| | `knowledge-graph` | 符号表→调用链→数据流→模块依赖 |
| | `repo-decompose` | 三层并行拆分 + 证据矩阵 + 子 agent 调度 |
| | `mvp-approach` | 优化方向验证 + 修复方案最小可行性测试 |
| 🩺 Diagnose | `security-audit` | 依赖漏洞/认证缺陷/注入风险/敏感信息 四维扫描 |
| 📋 Plan | `delivery-plan` | 修复计划 + 安全项优先 + 按修复类型分组 |
| | `task-graph` | 拓扑排序 + 共享文件冲突检测 |
| 🔒 Bound | `implementation-map` | 白名单 + 红区 + 架构契约 + 爆炸半径 |
| 🔧 Fix | — | 受 `style-profile` 约束的小步修复（总控内置） |
| ✅ Verify | `verification-loop` | 4 套模板: CLI / Library / Skill Eval / Security Tool |
| 🔍 Self-Review | — | Loop 审查自己的修改：风格一致性 + 修复完整性 + 最小性（总控内置） |
| 🔁 Decide | `engineering-loop` | 6 条停止条件 + continue/stop/replan + 自审门控 |

[→ 完整 SKILL.md 目录](skills/)

## 为什么是代码优化 Loop？

| 普通 AI coding | MakeSkillsBest |
|---|---|
| 帮你加功能 | 帮你优化已有代码 |
| 改完就结束 | Self-Review 审查自己的修改 |
| 不管代码风格 | style-profile 确保修改匹配原风格 |
| 不检查安全 | security-audit 四维扫描，CRITICAL 阻塞修复 |
| 不知道做到哪了 | `.repo-loop-state.json` 记录每一轮状态 |
| 改错了继续改 | 2 次连续失败 → 强制重规划 |

## 安装到不同工具

| 工具 | 安装方式 | 详情 |
|---|---|---|
| **Claude Code** | `/plugin marketplace add` / `npx skills add -a claude-code` | [指南](docs/setup-guide.md#claude-code) |
| **Codex** | `npx skills add -g -a codex` | [指南](docs/setup-guide.md#codex) |
| **Cursor** | 复制 SKILL.md → `.cursor/rules/` | [指南](docs/setup-guide.md#cursor) |
| **Gemini CLI** | `gemini skills install` / `npx skills add -a gemini-cli` | [指南](docs/setup-guide.md#gemini-cli) |
| **Windsurf** | 复制 SKILL.md → Windsurf Rules | [指南](docs/setup-guide.md#windsurf) |
| **Copilot** | 复制 SKILL.md → `.github/copilot-instructions.md` | [指南](docs/setup-guide.md#github-copilot) |
| **手动** | `git clone` + 符号链接 | [指南](docs/setup-guide.md#manual) |

## 安装到不同工具

| 工具 | 安装方式 | 详情 |
|---|---|---|
| **Claude Code** | `/plugin marketplace add` / `npx skills add -a claude-code` | [指南](docs/setup-guide.md#claude-code) |
| **Codex** | `npx skills add -g -a codex` | [指南](docs/setup-guide.md#codex) |
| **Cursor** | 复制 SKILL.md → `.cursor/rules/` | [指南](docs/setup-guide.md#cursor) |
| **Gemini CLI** | `gemini skills install` / `npx skills add -a gemini-cli` | [指南](docs/setup-guide.md#gemini-cli) |
| **Windsurf** | 复制 SKILL.md → Windsurf Rules | [指南](docs/setup-guide.md#windsurf) |
| **Copilot** | 复制 SKILL.md → `.github/copilot-instructions.md` | [指南](docs/setup-guide.md#github-copilot) |
| **手动** | `git clone` + 符号链接 | [指南](docs/setup-guide.md#manual) |

## 设计原则

这些 skill 从三个顶级开源 skill 仓库提炼精华：

| 来源 | 借鉴 | 在本仓库的体现 |
|---|---|---|
| **mattpocock/skills** | 小而可组合、领域建模 | 每个 skill 独立可用，管道模式下信息共享 |
| **addyosmani/agent-skills** | 反合理化表、验证证据 | 每个 skill 都有反合理化表和量化自检 |
| **mvanhorn/last30days** | 铁律输出格式、反即兴发挥 | PRECONDITIONS 硬门控、"决不允许的行为" |

## 贡献

Skill 应该：具体（可执行的步骤，不是模糊的建议）、可验证（明确的出口标准和证据要求）、最小（只包含引导 agent 所需的内容）。

## License

MIT
