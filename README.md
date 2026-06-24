# MakeSkillsBest

> **代码优化工程循环 — 不是帮你加功能，是帮你把现有代码打磨到更好。**

![MakeSkillsBest Architecture](images/loop-architecture.png)

## 解决什么问题？

AI coding agent 帮你改代码，但它不知道⸺

- 改得对不对？
- 有没有破坏原有风格？
- 有没有引入安全漏洞？
- 是不是顺便改了不该改的东西？

**MakeSkillsBest 是一个 10 阶段、13 个 skill 的代码优化循环。** 它不是帮你加新功能，而是帮你发现代码中已有的问题，并安全、可追溯、风格一致地修复它们。

## 怎么工作？

```
/optimize-loop "修复安全漏洞并统一错误处理风格"

  Observe  → 提取代码风格画像，识别项目类型
  Understand → 语义分析 + 符号图谱 + 需求拆分 + 方向验证
  Diagnose → 安全四维扫描 + 质量六维诊断（并行）
  Plan    → 生成修复计划 + 任务依赖图
  Bound   → 锁定可修改文件白名单 + 禁止触碰红区
  Fix     → 小步修复，所有修改自动匹配原有代码风格
  Verify  → 按项目类型选择验证模板（CLI/Library/Skill/Security）
  Self-Review → 逐条审查 git diff：是否越界、是否新增依赖、是否破坏公共 API
  Learn   → 沉淀本轮教训，生成下一轮建议
  Decide  → 继续 / 停止 / 重新规划
```

每一步都有结构化日志写入 `.loop-log/`，可随时追溯"发现了什么、做了什么决定、为什么"。

## 快速开始

```bash
# 只读模式 — 理解项目结构和安全状况
/read-loop "分析这个仓库"

# 优化模式 — 发现问题并修复
/optimize-loop "统一错误处理风格"
/optimize-loop "修复依赖漏洞"
/optimize-loop "降低核心模块复杂度"
```

## 安装

```bash
# Claude Code
/plugin marketplace add dotVSdoll/MakeSkillsBest

# Codex / Cursor / Gemini CLI / Windsurf / 50+ 工具
npx skills add dotVSdoll/MakeSkillsBest -g
```

| 工具 | 安装方式 |
|---|---|
| **Claude Code** | `/plugin marketplace add` 或 `npx skills add -a claude-code` |
| **Codex** | `npx skills add -g -a codex` |
| **Cursor** | 复制 SKILL.md → `.cursor/rules/` |
| **Gemini CLI** | `gemini skills install` 或 `npx skills add -a gemini-cli` |
| **Windsurf / Copilot** | 复制 SKILL.md 到对应 rules 目录 |
| **手动** | `git clone` + 符号链接 |

## 13 个 Skill（12 子 skill + 1 总控）

| 阶段 | Skill | 做什么 |
|---|---|---|
| 🔍 Observe | `style-profile` | 提取代码风格：命名、错误处理、组织结构、测试习惯 |
| 🧠 Understand | `semantic-rag` | 跨语言语义分析 + 零依赖轻量 RAG |
| | `knowledge-graph` | 符号→调用链→数据流→模块依赖 四层图谱 |
| | `repo-decompose` | 架构/数据/逻辑三层并行拆分 + 证据矩阵 |
| | `mvp-approach` | 优化方向可行性验证 + 修复方案最小边界推导 |
| 🩺 Diagnose | `security-audit` | 依赖漏洞(CVE×reachability)/认证缺陷/注入/敏感信息 |
| | `quality-audit` | 重复代码/高复杂度/死代码/测试薄弱/过大模块/架构退化 |
| 📋 Plan | `delivery-plan` | 按安全/质量优先级生成分阶段修复计划 |
| | `task-graph` | 任务依赖 DAG + 关键路径 + 共享文件冲突检测 |
| 🔒 Bound | `implementation-map` | 白名单 + 红区 + 架构契约 + 爆炸半径 |
| 🔧 Fix | *(内置)* | 受 style-profile 约束的小步修复 |
| ✅ Verify | `verification-loop` | CLI/Library/Skill Eval/Security Tool 四套验证模板 |
| 🔍 Self-Review | *(内置)* | 10 条 diff-level 检查：白名单/依赖/API/范围/契约 |
| 📝 Log | `log-journal` | 每阶段写入结构化日志 → `.loop-log/` + INDEX 检索 |
| 🔁 Decide | `engineering-loop` | 6 条停止条件 + continue/stop/replan + 自审门控 |

[→ 完整 SKILL.md 目录](skills/)

## 特殊能力

- **自适应代码风格** — 修改的代码看不出是 AI 写的。style-profile 自动匹配原有命名、错误处理、注释习惯
- **安全优先修复** — CVE 按 reachability × exposure × upgradeRisk 排序，不会为了修一个不可达 dev 依赖漏洞引入 breaking change
- **死代码保护** — 删除前检查动态 import、public API、配置文件引用、插件约定、测试引用
- **Self-Review 审查** — Loop 逐条审查自己的 git diff，发现 scope-creep 或契约违规立即回退

## License

MIT
