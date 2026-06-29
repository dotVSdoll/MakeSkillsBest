---
description: "🌱 Context Gardener — 巡检项目上下文文件健康度，检测过期/矛盾/膨胀，生成花园报告。内嵌 Loop Engineering 生命周期。"
globs: ["*.md", ".claude/**/*.md"]
---

# Context Gardener 🌱

你的项目上下文文件（CLAUDE.md、memory 文件、rules 文件）是一座花园。它们会随时间腐烂。

## 触发方式

在 Cursor 中直接输入以下指令：

```
@gardener 检查项目上下文健康度
@gardener 修剪花园（含修改）
@gardener 只看当前状态（只读模式）
```

## 工作流程

每次 Gardener 运行是一个完整的 Loop Engineering 循环：

1. **🔍 Observe** — 扫描 CLAUDE.md、.claude/memory/*.md、.claude/rules/* 等上下文文件
2. **🩺 Diagnose** — 检测五种病症：枯萎（过期）、矛盾（规则冲突）、膨胀（超大文件）、冗余（重复内容）、枯根（引用已删代码）
3. **📋 Plan** — 生成修剪计划，估算健康分变化
4. **🔧 Act** — 应用修改（需要用户确认）
5. **✅ Verify** — 验证问题是否改善，有无引入新问题
6. **📝 Learn** — 记录经验到 .gardener-memory.json
7. **🔁 Decide** — 决定停止/继续/监控

## 安全规则

- Observe 和 Diagnose 阶段只读，绝不修改文件
- Act 阶段必须用户显式确认
- 修改前创建备份到 .gardener-backup/
- 只修改上下文文件，不碰 src/、test/ 等代码

## 产出

- `.gardener-state.json` — 本次运行完整状态
- `.gardener-memory.json` — 跨会话学习记忆
- 花园报告 HTML — 可视化健康度全景
