# MakeSkillsBest

**生产级 AI Coding Agent 技能包 — 四个紧密协作的 skill，将任何 GitHub 仓库从"陌生代码"变成"可执行的最小方案"。**

```
语义理解 → 关系图谱 → 需求拆分 → 最小方案
semantic-rag → knowledge-graph → repo-decompose → mvp-approach
```

## 为什么是这四个 Skill？

大多数 AI coding skill 是孤立的——帮你写测试、帮你做 CR。这四个 skill 构成一条**完整流水线**，模仿资深工程师接手陌生项目时的思维过程：

| 阶段 | Skill | 回答的问题 |
|---|---|---|
| 1️⃣ 理解 | `semantic-rag` | "这个项目是做什么的？" |
| 2️⃣ 映射 | `knowledge-graph` | "谁调了谁？数据怎么流？" |
| 3️⃣ 拆分 | `repo-decompose` | "如果要改，从哪里下手？" |
| 4️⃣ 执行 | `mvp-approach` | "最快能交付的最小版本是什么？" |

**关键设计：** 每个 skill 可以独立使用，但管道模式下信息通过共享上下文自动传递，不会跳过步骤。

## 快速开始（30 秒）

```bash
# Claude Code（推荐，支持自动更新）
/plugin marketplace add dotVSdoll/MakeSkillsBest
/plugin install MakeSkillsBest@make-skills-best

# Codex / Cursor / Gemini CLI / Windsurf / 50+ 工具
npx skills add dotVSdoll/MakeSkillsBest -g
```

## 四个 Skill 详解

### 🔬 `semantic-rag` — 语义分析 + 轻量 RAG

> 用你喜欢的自然语言解释任何仓库。

- 跨语言三层降级：L1 (TS/Py/Go/Rust — 函数级) / L2 (C#/Kotlin — 文件级) / L3 (其他 — 目录级)
- 零依赖 RAG：AST 边界分块 → 结构化 JSON → 两阶段检索
- 追问示例："认证逻辑在哪？""数据库怎么连的？"

[→ 完整 SKILL.md](skills/semantic-rag/SKILL.md)

### 🕸️ `knowledge-graph` — 代码知识图谱

> 符号表 → 调用链 → 数据流 → 模块依赖，四层递进。

- 按仓库规模自适应深度（quick/standard/deep）
- 自动检测循环依赖、高扇入/扇出模块、死代码
- 输出结构化 JSON，为需求拆分提供符号级上下文

[→ 完整 SKILL.md](skills/knowledge-graph/SKILL.md)

### 🔧 `repo-decompose` — 仓库需求拆分

> 架构层 + 数据层 + 逻辑层，主 Agent 调度子 Agent 并行分析。

- 两阶段调度：架构先跑 → 数据+逻辑并行
- 按仓库规模自适应分片（S/M/L/XL，最多 13 个子 Agent）
- 共享上下文保证信息透明，子 Agent 不直接互调
- 主 Agent 空闲期自动拉取 knowledge-graph + semantic-rag

[→ 完整 SKILL.md](skills/repo-decompose/SKILL.md)

### 🎯 `mvp-approach` — 最小可行性方案

> 基于全项目分析，设定最严格的最小边界条件，剪裁核心路径。

- 6 项硬门控：前置分析缺失时拒绝执行
- 需求树标注（🔴核心/🟡支撑/✂️可砍）→ 边界条件推导 → 最小实现路径
- 边界不谈判：文件数 ≤ 3、行数 ≤ 200、依赖数 = 0

[→ 完整 SKILL.md](skills/mvp-approach/SKILL.md)

## 管道模式 vs 独立模式

```
管道模式（全自动）:
  /decompose https://github.com/immerjs/immer
  → repo-decompose Phase 0-3（自动调用 knowledge-graph + semantic-rag）
  → 共享上下文写入 .repo-decompose-context.json
  → /mvp → 读取共享上下文 → 6 项门控检查 → 输出最小方案

独立模式（按需使用）:
  /explain https://github.com/immerjs/immer    ← 只看语义
  /graph src/                                  ← 只建图谱
  /decompose https://github.com/immerjs/immer  ← 只拆需求
  /mvp                                         ← 需要上游产物
```

**管道模式的门控机制确保 agent 不能跳过步骤：** `mvp-approach` 会检查共享上下文中的 6 个字段，任何一个缺失即拒绝执行并告知用户缺少什么。

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
