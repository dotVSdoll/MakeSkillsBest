# Little Gardener — 项目开发指令

## 项目身份

这是一个 **Loop Engineering 嵌入式 skill 仓库**。当前唯一的 skill：**Context Gardener**（上下文园艺师）。

## 当前工作方向（2026-06-30）

### 可视化管理重构：Pygame → Web Canvas

将可视化从 Pygame 迁移到 **Vite + React + TypeScript + Canvas 2D API**，Python 后端保持不变。

### 架构

```
Python 后端 (src/)              Web 前端 (web/)
  scanner.py                     ├── App.tsx (外壳)
  analyser.py                    ├── components/
  gardener_state.py              │   ├── GardenCanvas.tsx (Canvas 容器)
  config.py                      │   ├── HUD.tsx (健康度)
  .gardener-config.json          │   └── SettingsPanel.tsx (设置面板)
  .gardener-state.json    → JSON →   ├── engine/
                                 │   │   ├── gameLoop.ts (rAF 循环)
                                 │   │   ├── renderer.ts (渲染管线)
                                 │   │   ├── tiles.ts (地块)
                                 │   │   ├── plants.ts (植物)
                                 │   │   ├── gardener.ts (角色)
                                 │   │   └── scenery.ts (天空/装饰)
                                 │   ├── hooks/
                                 │   ├── sprites/images.ts (精灵加载器)
                                 │   └── constants.ts
                                 └── public/sprites/ (精灵图)
```

### 精灵资源策略

- **角色**: 使用 cute farmer sprites（itch.io，6 帧 16×32，不作为 spritesheet 切割，代码切帧）
- **地块**: 使用 Farm RPG 16×16 tileset（保持整图，代码按坐标切）
- **植物**: 使用 Farm RPG Spring Crops spritesheet（保持整图，代码切帧）
- **装饰**: bench/tree/fence 单图
- **加载方式**: 模仿 pixel-agent，保持原始 PNG 不动，通过 frame config 运行时切片

### 动画策略 (MVP)

角色头顶显示 UI 文字标签（🔍 巡视 / 🩺 诊断 / 📋 计划 / 🔧 修剪 / ✅ 验证 / 📝 学习 / 🔁 决策），不做复杂动作动画。角色只做 idle/walk 基本帧循环。

### 部署方式

用户本地构建后通过 `cd web && npm run dev` 启动本地服务，浏览器打开查看。类似 pixel-agent 的 standalone 模式，不做桌面打包。

## 核心叙事

- 用户通过 Agent 命令（`/gardener`）启动一个完整的 Loop Engineering 生命周期
- Loop 自动扫描项目上下文文件 → 分析问题 →（可选）修剪 → 验证 → 学习 → 决定下一步
- Loop 跑完后自动弹出 **花园可视化窗口**，将状态可视化
- 右边栏有完整的规则设置面板（健康阈值、检测开关、动作策略、Loop 流程、调度定时）
- 窗口进入待机模式后不关闭，园艺师坐下休息

## 项目结构

```
src/                           # Python 源码（后端）
├── main.py                    # 入口：scan / garden 两种模式
├── scanner.py                 # 上下文文件扫描器
├── analyser.py                # D1-D5 问题分析器
├── gardener_state.py          # 状态持久化（.gardener-state.json）
├── config.py                  # 规则配置管理（.gardener-config.json）
├── game/
│   └── garden_scene.py        # Pygame 花园主场景（旧版，即将废弃）
web/                           # Web 前端（新）
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx               # React 入口
│   ├── App.tsx                # 外壳
│   ├── components/            # React UI 组件
│   ├── engine/                # Canvas 渲染引擎
│   ├── hooks/                 # 状态管理
│   ├── sprites/images.ts      # 精灵加载器（pixel-agent 风格）
│   ├── constants.ts           # 常量
│   └── types.ts               # 类型定义
├── public/
│   └── sprites/               # 精灵资源
│       ├── character/         # 角色动画帧
│       ├── tiles/             # 地块 tileset
│       ├── plants/            # 植物 spritesheet
│       └── decor/             # 装饰物
skills/context-gardener/
  SKILL.md                     # Skill 定义 - Loop 的"源代码"
summary/                       # 上下文关键信息（不提交 git）
docs/
├── scene-concept.png          # 概念图
└── architecture.md            # 架构图
```

## 关键技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 可视化引擎 | Canvas 2D API (Web) | pixel-agent 验证的路径，交互面板可用 React |
| 前端框架 | Vite + React + TypeScript | 构建快，生态好，类型安全 |
| 美术资源 | itch.io 像素风素材包 | 原生 16×16，无需缩放，质量高于 Gemini 生成 |
| 精灵加载 | 整图加载 + 运行时切片 | pixel-agent 风格，不预切割 |
| 配置格式 | JSON | Python 原生支持，Agent 也容易读写 |
| 数据流 | Python scan → JSON → Web fetch | 后端不动，渐进式替换 |
| 部署方式 | `npm run dev` 本地服务 | 最简单，无需桌面打包 |

## 状态文件约定

- `.gardener-state.json` — 每次运行的状态快照。**不提交 git**
- `.gardener-memory.json` — 跨会话学习记忆。**可选提交**（团队共享经验）
- `.gardener-config.json` — 用户规则配置。**不提交 git**（每人配置不同）
- `.gardener-backup/` — Act 阶段修改前的文件备份。**不提交 git**

## 开发命令

```bash
# 安装 Python 依赖
pip install pygame

# 扫描模式（headless，生成 JSON 报告）
python -m src.main scan [项目路径]
python -m src.main scan . --stale-days 45 --output report.json

# Web 前端开发
cd web
npm install
npm run dev             # 启动开发服务器 → http://localhost:5173
npm run build           # 生产构建

# 测试扫描+分析是否正常
python -m src.main scan .
```

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
- ❌ 不加没要求的功能——比如用户没让你加音效，别加
- ❌ 游戏逻辑和引擎逻辑不互相 import（game/ 只能 import scanner 的输出数据，不能 import scanner 本身）

## 项目文档索引

- `docs/architecture.md` — 架构图（Mermaid）
- `docs/philosophy.md` — Loop Engineering 设计哲学
- `summary/` — 项目上下文关键信息（不提交 git）
- `skills/context-gardener/SKILL.md` — Skill 定义（产品核心）
