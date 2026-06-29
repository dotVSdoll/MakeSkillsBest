# MakeSkillsBest — 项目指令

## 项目身份

这是一个 **skills 仓库**。每个 skill 内嵌了 Loop Engineering 哲学。
当前唯一的 skill：**Context Gardener**（上下文园艺师）。

## 项目结构

```
src/                             # Python 源码（Pygame 花园 + 引擎）
├── main.py                      # 入口：python -m src.main scan / garden
├── scanner.py                   # 上下文文件扫描器
├── analyser.py                  # 问题分析器（D1-D5 检测）
├── gardener_state.py            # 状态持久化管理
└── game/                        # Pygame 游戏模块
    ├── garden_scene.py          # 花园场景渲染
    ├── character.py             # 园艺师角色动画
    ├── plants.py                # 植物状态与渲染
    └── hud.py                   # HUD 覆盖层
sprites/                         # 像素风精灵资源
├── gardener/                    # 园艺师动画帧
├── plants/                      # 植物状态帧
└── tiles/                       # 场景图块
skills/
└── context-gardener/
    └── SKILL.md                 # Skill 定义（工具无关）
archive/skills/                  # 历史 skills（参考用）
docs/philosophy.md               # Loop Engineering 设计哲学
```

## Skill 定义规范

每个 skill 必须包含：

1. **YAML frontmatter**（`name`, `description`, `loop-phases`）
2. **Loop 结构**（Entry → Body → Exit → State → Safety）
3. **每个阶段的定义**（做什么 + 产出什么）
4. **验证方式**（如何确认这个 skill 正确执行）

## 关于 Loop Engineering

Gardener 的 Loop 是 7 阶段：
`Observe → Diagnose → Plan → Act → Verify → Learn → Decide`

核心原则：
- **Decide 阶段必须存在**，否则不是循环
- **Act 阶段默认只读**，只有用户确认后才做修改
- **State 持久化**，跨会话可恢复

## Python 开发

```bash
# 安装依赖
pip install pygame

# 扫描模式（headless）
python -m src.main scan [项目路径]

# 花园模式（Pygame 窗口）
python -m src.main garden [项目路径]
```
