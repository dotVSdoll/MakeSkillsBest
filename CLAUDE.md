# Little Gardener — 项目开发指令

## 项目身份

这是一个 **Loop Engineering 嵌入式 skill 仓库**。当前唯一的 skill：**Context Gardener**（上下文园艺师）。

**不是**一个 "Loop Engineering 平台"。仓库是专门做这个 Gardener skill 的，Loop Engineering 是 skill 内部的工程骨架。

## 核心叙事

- 用户通过 Agent 命令（`/gardener`）启动一个完整的 Loop Engineering 生命周期
- Loop 自动扫描项目上下文文件 → 分析问题 →（可选）修剪 → 验证 → 学习 → 决定下一步
- Loop 跑完后自动弹出 **Pygame 2D 沉浸式花园窗口**，将状态可视化
- 右边栏有完整的规则设置面板（健康阈值、检测开关、动作策略、Loop 流程、调度定时）
- 窗口进入待机模式后不关闭，园艺师坐下休息

## 项目结构

```
src/                           # Python 源码
├── main.py                    # 入口：scan / garden 两种模式
├── scanner.py                 # 上下文文件扫描器
├── analyser.py                # D1-D5 问题分析器
├── gardener_state.py          # 状态持久化（.gardener-state.json）
├── config.py                  # 规则配置管理（.gardener-config.json）
└── game/
    ├── garden_scene.py        # Pygame 花园主场景（1280×720）
    └── (待拆分) character.py, plants.py, hud.py
sprites/                       # Gemin 生成的像素风美术资源
├── gardener/                  # 园艺师动画帧（修剪/浇水/行走/待机）
├── plants/                    # 植物精灵（健康/枯萎/死亡）
└── tiles/                     # 场景图块（草地/路径/围栏）
skills/context-gardener/
  SKILL.md                     # Skill 定义 - Loop 的"源代码"
summary/                       # 上下文关键信息
docs/philosophy.md             # Loop Engineering 设计哲学
```

## 关键技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 可视化引擎 | Pygame | Python 最成熟的 2D 游戏框架，社区大，资源多 |
| 美术资源 | Gemini 生成像素风 + 人工挑选 | 无需画师，快速迭代风格 |
| 配置格式 | JSON | Python 原生支持，Agent 也容易读写 |
| 钩子系统 | Claude Code session-start hook | 自动检测依赖完整性，零手动安装 |
| 项目类型 | 纯 Python 项目 | `pip install pygame` 一条命令全搞定 |

## 状态文件约定

- `.gardener-state.json` — 每次运行的状态快照。**不提交 git**
- `.gardener-memory.json` — 跨会话学习记忆。**可选提交**（团队共享经验）
- `.gardener-config.json` — 用户规则配置。**不提交 git**（每人配置不同）
- `.gardener-backup/` — Act 阶段修改前的文件备份。**不提交 git**

## 开发命令

```bash
# 安装依赖
pip install pygame

# 扫描模式（headless，生成 JSON 报告）
python -m src.main scan [项目路径]
python -m src.main scan . --stale-days 45 --output report.json

# 花园模式（启动 Pygame 窗口）
python -m src.main garden [项目路径]

# 测试扫描+分析是否正常
python -m src.main scan .

# 测试花园是否正常启动
python -m src.main garden .
```

## Sprite 资源规范

使用 Gemini 生成像素风 sprites：

```
格式: PNG
风格: 16-bit pixel art, top-down (俯视)
尺寸: 64×64 像素/帧
调色板: 暖绿色系为主
```

新增 sprite 时的步骤：
1. Gemini 生成 → 下载 PNG
2. 放入 `sprites/<category>/` 目录
3. 在 `garden_scene.py` 中用 `load_sprite("category/name.png")` 加载

## Python 编码规范

- 类型注解：所有函数参数/返回值标注类型
- 文档字符串：所有模块和 public 函数三引号 docstring
- 命名：`snake_case` for 函数/变量, `PascalCase` for 类
- 行宽：100 字符
- 标准库优先：能用 `pathlib` 不用 `os.path`，能用 `json` 不用第三方
- 游戏模块：引擎逻辑（scanner/analyser）与游戏渲染（game/）严格分离

## Git 规范

- feat: 新功能
- refactor: 重构
- fix: 修 bug
- docs: 文档
- chore: 杂项（.gitignore、配置等）
- sprite: 新增美术资源

## 不要做的事

- ❌ 不加没人要的"灵活性"——不做投机性抽象
- ❌ 不"顺手修改"无关代码
- ❌ 不重构没坏的东西
- ❌ 不加没要求的功能—— 比如用户没让你加音效，别加
- ❌ 游戏逻辑和引擎逻辑不互相 import（game/ 只能 import scanner 的输出数据，不能 import scanner 本身）

## 项目文档索引

- `docs/architecture.md` — 架构图（Mermaid）
- `docs/philosophy.md` — Loop Engineering 设计哲学
- `summary/` — 项目上下文关键信息
- `skills/context-gardener/SKILL.md` — Skill 定义（产品核心）
