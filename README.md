# MakeSkillsBest

> **让 AI coding agent 从一次性代码生成器，变成基于证据持续推进项目的工程循环执行者。**

```
Observe → Understand → Plan → Bound → Act → Verify → Learn → Decide
   ↑                                                          │
   └──────────────────── continue ────────────────────────────┘
```

## 解决了什么问题？

AI coding agent 最大的问题不是"写不出代码"，而是**不知道做到哪了、该不该继续、下一步该做什么**。每轮对话都从零开始，每次都说"让我看看这个仓库"，每次都改不该改的文件。

**MakeSkillsBest 用 9 个 skill 构建了一条有状态、有证据、有停止条件的工程循环——让 agent 像工程师一样推进项目，而不是像 chatbot 一样回答问题。**

## Engineering Loop 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    engineering-loop (总控)                       │
│  读写 .repo-loop-state.json，调度子 skill，判定继续/停止/回滚     │
└────────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴──────────────────────────────────────────┐
    │                                                    │
    ▼                                                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│semantic-rag  │  │knowledge-graph│  │repo-decompose│  │mvp-approach  │
│ 语义+多语言   │  │ 符号→调用→数据 │  │ 架构+数据+逻辑│  │ 核心路径剪裁  │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        Observe / Understand（已有 4 个）

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│delivery-plan │  │  task-graph  │  │implementation│  │verification  │
│ 分阶段交付    │  │  任务依赖DAG  │  │    -map      │  │   -loop      │
│              │  │              │  │ 白名单+红区   │  │  五级验证链   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        Plan + Bound（新增 4 个）              Verify（新增 1 个）
```

**每个 skill 可独立使用，也可由 engineering-loop 自动调度。所有 skill 通过 `.repo-loop-state.json` 共享状态。**

## 快速开始（30 秒）

```bash
# Claude Code（推荐）
/plugin marketplace add dotVSdoll/MakeSkillsBest

# 启动工程循环
/loop "为这个项目添加基于 JWT 的用户登录功能"
```

```bash
# Codex / Cursor / Gemini CLI / Windsurf / 50+ 工具
npx skills add dotVSdoll/MakeSkillsBest -g
```

## 九大 Skill

| 阶段 | Skill | 一句话 |
|---|---|---|
| 🔍 Observe | — | 目标识别、规模检测、约束记录（总控内置） |
| 🧠 Understand | `semantic-rag` | 跨语言语义分析 + 零依赖轻量 RAG |
| | `knowledge-graph` | 符号表→调用链→数据流→模块依赖 |
| | `repo-decompose` | 三层并行拆分 + 证据矩阵 + 子 agent 调度 |
| | `mvp-approach` | 需求树标注（🔴🟡✂️）+ 项目类型分层边界 |
| 📋 Plan | `delivery-plan` | 需求树 → 分阶段验收标准 + 垂直切片 |
| | `task-graph` | 拓扑排序 → 并行批次 + 关键路径 |
| 🔒 Bound | `implementation-map` | 白名单（可修改）+ 红区（禁止触碰）+ 爆炸半径 |
| ✅ Verify | `verification-loop` | L1 build → L2 --help → L3 command → L4 artifact → L5 content |
| 🔁 Decide | `engineering-loop` | 5 条停止条件 + continue/stop/replan 判定 |

[→ 完整 SKILL.md 目录](skills/)

## 为什么是 Loop 而不是 Workflow？

| Workflow | Engineering Loop |
|---|---|
| 跑完就结束 | 循环推进直到目标完成 |
| 无状态（每轮从零开始） | `.repo-loop-state.json` 记录"做到哪了" |
| 步骤顺序固定 | 根据 Decide 阶段动态跳转 |
| 改错了继续改 | 2 次连续验证失败 → 强制重新规划 |
| 不区分能不能改 | implementation-map 锁定红区 |

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
