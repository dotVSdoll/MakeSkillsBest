# MakeSkillsBest — 项目指令

## 项目身份

这是一个 **skills 仓库**。每个 skill 内嵌了 Loop Engineering 哲学。
当前唯一的 skill：**Context Gardener**（上下文园艺师）。

不是"Loop Engineering 平台"。仓库就是做 skill 的，Loop Engineering 是每个 skill 内部的工程骨架。

## 项目结构

```
skills/context-gardener/   # 唯一活跃的 skill
  SKILL.md                 # 核心 skill 定义
  engine/                  # 循环引擎代码
  ui/                      # 花园可视化
archive/skills/            # 历史 code-optimization skills（参考用）
docs/philosophy.md         # Loop Engineering 设计哲学
```

## Skill 定义规范

每个 skill 必须包含：

1. **YAML frontmatter**（`name`, `description`, `argument-hint`）
2. **Loop 结构**（Entry → Body → Exit → State → Safety）
3. **每个阶段的定义**（做什么 + 产出什么）
4. **验证方式**（如何确认这个 skill 正确执行）

## 关于 Loop Engineering

不是所有 skill 都需要 12 阶段。Gardener 的 Loop 是 7 阶段：
`Observe → Diagnose → Plan → Act → Verify → Learn → Decide`

核心原则：
- **Decide 阶段必须存在**，否则不是循环
- **Act 阶段默认只读**，只有用户确认后才做修改
- **State 持久化**，跨会话可恢复

## 命名约定

- skill 目录名：kebab-case（`context-gardener`）
- 状态文件：`.` 前缀 + kebab-case（`.gardener-state.json`）
- 内存文件：`.` 前缀 + kebab-case（`.gardener-memory.json`）
