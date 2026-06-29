# Little Gardener — 项目架构

> 以下架构图使用 Mermaid 语法，在 GitHub 上会自动渲染。

## 系统架构总览

```mermaid
graph TB
    subgraph User["👤 用户层"]
        A1[🧑‍🌾 用户输入命令]
        A2[🖼 查看花园窗口]
    end

    subgraph Agent["🤖 Agent 层"]
        B1[📜 SKILL.md]
        B2[🔄 Loop Engineering 生命周期]
        B2a["🔍 Observe→🩺 Diagnose→📋 Plan<br>→🔧 Act→✅ Verify→📝 Learn→🔁 Decide"]
    end

    subgraph Engine["⚙️ 引擎层 (Python)"]
        C1["🔍 scanner.py<br>上下文文件扫描器"]
        C2["🩺 analyser.py<br>D1-D5 问题分析"]
        C3["⚙ config.py<br>规则配置管理"]
        C4["💾 gardener_state.py<br>状态持久化"]
    end

    subgraph Garden["🌱 可视化层 (Pygame 1280×720)"]
        D1["garden_scene.py<br>主场景：天空+草地+路径"]
        D2["🧑‍🌾 园艺师角色<br>→ Loop 阶段动画映射"]
        D3["🌻 植物<br>→ 文件健康映射"]
        D4["📊 HUD<br>健康分+问题数"]
        D5["⚙ 设置面板<br>规则可视化编辑"]
    end

    subgraph Storage["💿 存储层"]
        E1["📄 CLAUDE.md<br>memory/*.md<br>rules/*"]
        E2[".gardener-state.json<br>运行状态"]
        E3[".gardener-memory.json<br>跨会话学习"]
        E4[".gardener-config.json<br>用户规则配置"]
        E5["📁 src/sprites/<br>像素风美术资源"]
    end

    User -->|"/gardener 检查花园"| Agent
    Agent -->|"python -m src.main scan"| C1
    C1 -->|"文件清单"| C2
    C2 -->|"问题+健康分"| C4
    C3 -->|"用户规则"| C2
    C4 -->|"状态数据"| B2
    B2 -->|"python -m src.main garden"| D1
    D1 --> D2
    D1 --> D3
    D1 --> D4
    D1 --> D5
    C1 ---|"读取"| E1
    C4 ---|"读写"| E2
    C4 ---|"读写"| E3
    D5 ---|"读写"| E4
    D3 ---|"读取"| E2
    Agent ---|"参考"| B1
    D2 ---|"加载"| E5
    User --> A2
    D1 -->|"1280×720 Pygame 窗口"| A2
```

## 用户全旅程

```mermaid
sequenceDiagram
    actor U as 👤 用户
    participant A as 🤖 Agent
    participant E as ⚙️ 引擎
    participant G as 🌱 花园窗口
    participant S as 💿 存储

    Note over U,S: --- 安装阶段 ---
    U->>A: git clone + 打开项目
    A->>A: session-start hook<br>自动检测 pip install pygame
    A-->>U: ✅ 准备就绪

    Note over U,S: --- 运行阶段 ---
    U->>A: /gardener "检查花园"
    A->>E: python -m src.main scan .
    E->>S: 扫描 CLAUDE.md .claude/memory/ .claude/rules/
    S-->>E: 文件指标
    E->>E: analyse() → D1-D5 检测
    E-->>A: 问题清单 + 健康分
    A->>S: 写入 .gardener-state.json

    Note over U,S: --- 可视化阶段 ---
    A->>G: python -m src.main garden .
    G->>S: 读取 .gardener-state.json
    G->>S: 加载 .gardener-config.json
    G-->>U: 🌱 花园窗口弹出！
    Note over G: 园艺师自动开始巡逻<br>Observe→巡视花园<br>Diagnose→检查植物<br>Act→修剪杂草<br>...

    Note over U,S: --- 互动阶段 ---
    U->>G: 按 S 打开设置面板
    U->>G: 修改 staleDays=45
    G->>S: 保存 .gardener-config.json
    U->>G: 按 SPACE → 待机模式
    Note over G: 园艺师坐下休息<br>窗口保持打开
```

## Loop 与动画映射

```mermaid
flowchart LR
    O["🔍 Observe<br>巡视花园"] --> D["🩺 Diagnose<br>蹲下检查"]
    D --> P["📋 Plan<br>站住思考"]
    P --> A["🔧 Act<br>修剪/浇水"]
    A --> V["✅ Verify<br>再看一圈"]
    V --> L["📝 Learn<br>坐下写笔记"]
    L --> DE["🔁 Decide<br>继续/待机"]
    DE -->|"continue"| O
    DE -->|"stop"| SB["⏸ 待机<br>园艺师休息"]
    SB -->|"SPACE/调度"| O
```

## 目录结构

```
little-gardener/
├── .claude/
│   ├── commands/gardener.toml     # /gardener 命令
│   └── hooks/
│       ├── session-start.sh       # 自动安装依赖
│       └── hooks.json             # 钩子注册
├── skills/context-gardener/
│   ├── SKILL.md                   # Loop Engineering 定义
├── src/                           # Python 源码
│   ├── main.py                    # 入口
│   ├── scanner.py                 # 文件扫描
│   ├── analyser.py                # 问题分析
│   ├── gardener_state.py          # 状态管理
│   ├── config.py                  # 规则配置
│   └── game/
│       ├── garden_scene.py        # Pygame 主场景
│       ├── character.py           # 园艺师角色
│       ├── plants.py              # 植物渲染
│       └── hud.py                 # HUD+设置面板
├── sprites/                       # 像素美术资源
│   ├── gardener/                  # 园艺师动画帧
│   ├── plants/                    # 植物精灵
│   └── tiles/                     # 场景图块
├── summary/                       # 上下文关键信息
├── docs/philosophy.md
├── CLAUDE.md                      # 项目开发指令
├── README.md                      # 项目叙事
└── pyproject.toml
```
