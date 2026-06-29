# 系统架构

## 四层架构

```
┌─────────────────────────────────────────────────────┐
│  👤 用户层                                           │
│  ├── /gardener "检查花园" → 触发 Agent               │
│  └── 看到 Pygame 窗口 → 理解花园状态                 │
├─────────────────────────────────────────────────────┤
│  🤖 Agent 层                                         │
│  ├── 读取 SKILL.md → 理解要执行的 Loop               │
│  ├── 调用 python -m src.main scan 获取数据           │
│  └── 调用 python -m src.main garden 启动可视化       │
├─────────────────────────────────────────────────────┤
│  ⚙️ 引擎层 (Python)                                   │
│  ├── scanner.py → 遍历上下文文件，收集指标            │
│  ├── analyser.py → D1-D5 检测，计算健康分             │
│  ├── config.py → 读写 .gardener-config.json           │
│  └── gardener_state.py → 状态管理                     │
├─────────────────────────────────────────────────────┤
│  🌱 可视化层 (Pygame 1280×720)                        │
│  ├── garden_scene.py → 主场景渲染                    │
│  ├── 园艺师角色 → Loop 阶段动画映射                   │
│  ├── 植物 → 文件健康度映射                            │
│  ├── HUD → 健康分 + 问题数                            │
│  └── 设置面板 → 规则可视化编辑                        │
└─────────────────────────────────────────────────────┘
```

## 数据流

```
用户 → /gardener
  → Agent 读 SKILL.md
    → python -m src.main scan .
      → scanner.py（读 CLAUDE.md、memory/*、rules/*）
      → analyser.py（产生问题和健康分）
      → .gardener-state.json（持久化）
    → python -m src.main garden .
      → garden_scene.py（读 state + config）
      → Pygame 窗口弹出
```

## 关键技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| 可视化 | Pygame 2.6+ | Python 原生 2D，零外部依赖，跨平台 |
| 引擎 | Python 3.11+ | 统一栈，JSON 原生支持 |
| 美术 | Gemini → PNG | 像素风，无需画师资源 |
| 依赖管理 | Claude Code hook | 零手动安装，自动检测 |
