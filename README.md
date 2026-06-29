# MakeSkillsBest

> **Skills that think in loops. First skill: Context Gardener 🌱**

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-1-orange" alt="skills">
  <br>
</p>

---

### 这不是又一个 prompt 集合

AI Agent 能写代码、能回答问题。但让它**自动维护一个需要长期关注的东西**——比如项目里的 instructions、rules、memory 文件——情况就不一样了：

- 写好的 CLAUDE.md 三个月没人碰，约定已经过时了
- 三个 memory 文件描述同一个决策，但说法互相矛盾
- .claude/ 下的指令越来越多，没人敢删，也没人读
- 每次开新会话，Agent 不认识仓库里的约定，你要重新说一遍

问题不在模型能力，在**维护工作缺少结构**。

Loop Engineering 填补这个空白：**把维护任务定义成可重复的循环，让 Agent 自己跑、自己验证、自己决定什么时候停。**

---

## 哲学

MakeSkillsBest 是一个 **skills 仓库**。每个 skill 内嵌了 [**Loop Engineering**](docs/philosophy.md) 的工程思想——不是跑一次就结束的工具，而是能自我循环、定期维护的智能体工作流。

每个 skill 的骨架：

```
Entry → Observe → Diagnose → Plan → Act → Verify → Learn → Decide
                              ↑________________________________↓
                     Decide=continue 时回到 Observe 或 Act
```

这个结构对三类场景尤其重要：

| 场景 | 为什么需要 Loop |
|------|----------------|
| **需要持续维护** | 指令文件会腐烂。一次性的清理没意义，需要定期巡检 |
| **需要多轮迭代** | 一次改不好。改完验证、发现问题、再改下一轮 |
| **需要长期监控** | 不主动管就会退化。Loop 可以定时跑，你只需要看结果 |

---

## Featured Skill: Context Gardener 🌱

你的项目上下文文件（`CLAUDE.md`、`.claude/memory/*.md`、`.claude/rules/*`）就是一座花园。
它们会随时间腐烂——过时的约定、互相矛盾的规则、无人维护的大段指令。

**Gardener 定期巡视，修剪枯枝，拔除杂草，让你的"上下文花园"始终保持健康。**

```bash
# Claude Code
/gardener "检查项目指令健康度"

# Cursor
@gardener 检查项目指令健康度

# Codex CLI
gardener run
```

### 它做什么

每次运行是一个完整的 Loop：

```
🔍 Observe     → 扫描所有上下文文件，记录大小、修改时间、结构
🩺 Diagnose    → 检测：过期文件 / 矛盾规则 / 过度膨胀 / 冗余内容
📋 Plan        → 生成修剪计划（哪些该删、哪些该合并、哪些该标记）
🔧 Act         → 应用变更（需要你的确认）
✅ Verify      → 重新检查：问题改善了吗？有没有误删？
📝 Learn       → 记录这次学到了什么，存到记忆里
🔁 Decide      → 花园健康了？停。还有问题？安排下次巡检
```

### 可视化报告

每次运行后生成一座"花园"全景图——每个文件是一棵植物，状态一目了然：

```
🌻 CLAUDE.md  — 健康（最近更新 3 天前）
🌿 memory/    — 良好（1 条建议）
🥀 rules/     — 需要关注（过期 45 天，检测到矛盾）
```

> Post-MVP：常驻 Web 服务，实时交互花园界面 + 调度配置面板。

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/dotVSdoll/MakeSkillsBest.git

# 安装 Gardener skill
# Claude Code:
ln -s $(pwd)/skills/context-gardener ~/.claude/skills/context-gardener

# 运行
/gardener "检查当前项目的上下文文件健康度"
```

详细安装方式见各平台文档（即将推出）。

---

## 项目结构

```
MakeSkillsBest/
├── skills/
│   └── context-gardener/     # Gardener skill（Loop Engineering 嵌入）
│       ├── SKILL.md           # Skill 定义
│       ├── engine/            # 核心引擎
│       └── ui/                # 花园可视化
├── archive/
│   └── skills/                # 历史 skill 存档（参考用）
├── docs/
│   └── philosophy.md          # Loop Engineering 设计哲学
├── CLAUDE.md                  # 项目级指令
└── README.md
```

---

## Roadmap

| 阶段 | 内容 |
|------|------|
| **MVP** | Context Gardener skill + 静态 HTML 报告 |
| **V2** | 常驻 Web 服务 + 交互花园界面 + 调度配置 |
| **V3** | 更多 Loop Engineering skill（方向待定） |

---

## License

MIT © [dotVSdoll](https://github.com/dotVSdoll)
