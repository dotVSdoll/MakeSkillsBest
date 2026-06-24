---
name: knowledge-graph
description: "代码知识图谱 — 四层递进分析（符号表→调用链→数据流→模块依赖），产出完整结构化 Markdown 技术文档供 Loop Agent 和开发者阅读。每个文件有详细分析、每段关键代码有决策解释、模块间有影响矩阵。"
argument-hint: "graph [path] | map [repo] relationships | trace [function] call chain"
triggers:
  - "谁调用了"
  - "调用链"
  - "数据流"
  - "模块依赖"
  - "循环依赖"
  - "扇入"
  - "扇出"
---

# Knowledge Graph — 代码知识图谱

## 概述

**不是读代码，是建一张可查询的关系网，并写成完整的技术文档。** 四层递进：

```
符号表 (有什么) → 调用链 (谁调谁) → 数据流 (数据去哪) → 模块依赖 (模块怎么连)
```

每一层是下一层的基础。上一层没跑完，不进下一层。

## 核心原则：产出完整技术文档，不是 JSON 摘要

**旧版输出：** 几百字节的 JSON → 塞进 state 文件 → 没人看、不能用。
**新版输出：** 完整的 Markdown 文档 → 写入 `docs/loop-docs/` → Loop Agent 和开发者都能直接阅读。

**输出目标：** 即使没有 AI Agent，一个人类开发者打开 `docs/loop-docs/knowledge-graph.md` 就能完整理解这个项目的代码结构和调用关系。

---

## 输出文件清单

所有文件写入项目根目录的 `docs/loop-docs/`：

| 文件 | 内容 | 何时生成 |
|---|---|---|
| `knowledge-graph.md` | 四层完整分析 + 架构总览 | 始终 |
| `symbol-index.md` | 按字母排序的符号索引表 | L1 完成后 |
| `call-graph.md` | 树状调用链（从入口点展开） | L2 完成后 |
| `module-dependencies.md` | 模块依赖矩阵 + 影响分析 | L4 完成后 |

---

## 深度分级（按仓库规模自适应）

| 深度 | 文件数 | 跑哪些层 | 核心产出 |
|---|---|---|---|
| `quick` | < 100 | L1 符号表 + L4 模块依赖 | 模块依赖图 + 完整符号清单 |
| `standard` | 100 - 500 | L1 + L2 + L4 | + 完整树状调用链 + 每个文件的调用关系 |
| `deep` | > 500 | L1 + L2 + L3 + L4 | + 核心数据流追踪 + 代码决策分析 |

---

## L1: 符号表 — 项目里有什么

**目标：** 建立所有可引用符号的完整清单，**每个符号附带它所在文件的上下文分析**。

### 工具策略（按语言）

| 语言 | 首选工具 | 后备 |
|---|---|---|
| TypeScript / JavaScript | `get_symbols` (tree-sitter AST) | `search_content "export (function\|class\|const\|type\|interface)"` |
| Python | `get_symbols` (tree-sitter AST) | `search_content "^def \|^class "` |
| Go | `get_symbols` (tree-sitter AST) | `search_content "^func \|^type "` |
| Rust | `get_symbols` (tree-sitter AST) | `search_content "^pub (fn\|struct\|enum\|trait)"` |
| Java | `get_symbols` (tree-sitter AST) | `search_content "public (class\|interface\|enum)"` |
| 其他 | `search_content` 按语言约定匹配 | — |

### 提取流程

```
1. glob 列出所有源文件（按语言扩展名过滤）
2. 对每个文件调用 get_symbols，收集所有 definition 类符号
3. 过滤：保留 exported 符号 + 非导出但被同文件外引用的符号
4. 去重：同一符号名在不同文件 → 按文件路径区分
5. 对每个文件：read_file 读关键段落 → 写文件级分析
```

### 输出：`docs/loop-docs/symbol-index.md`

每个文件作为一节，包含：

```markdown
## src/auth/login.ts (127 行)
**职责**: 用户登录端点，验证凭证并返回 JWT token
**入口**: `POST /auth/login` → `handleLogin(req, res)`
**关键符号**:

| 符号 | 类型 | 行号 | 可见性 | 说明 |
|---|---|---|---|---|
| `handleLogin` | async function | 15 | exported | 主处理函数——验证用户名/密码 → 签发 JWT |
| `validateCredentials` | function | 48 | private | 查询数据库验证密码哈希 |
| `signToken` | function | 82 | private | 用 HS256 签发 24h 过期 token |
| `LoginRequest` | interface | 8 | exported | 请求体 { username, password } |
| `LoginResponse` | interface | 12 | exported | 响应体 { token, expiresAt } |

**关键代码段**:
- L15-24: `handleLogin` 首先检查 rate-limit，使用 `checkRateLimit()` 防暴力破解。选择 rate-limit 在前而非在后是因为如果凭证无效仍需消耗限流配额来防止字典攻击。
- L48-62: `validateCredentials` 使用 bcrypt.compare 而非直接比较——密码从不以明文存储或比较。
- L82-95: `signToken` 的过期时间硬编码为 24h——如果改为配置项会影响所有客户端的刷新逻辑。

**依赖关系**:
- 上游调用者: `src/api/router.ts:33` (路由注册)
- 下游被调用: `src/auth/ratelimit.ts`, `src/db/users.ts`, `src/auth/jwt.ts`
```

### 自检
- 每个源文件都有至少一节分析
- 每个 exported 符号都有"说明"列（不是照抄函数名）
- "关键代码段"包含**为什么这样写**而不只是**写了什么**

---

## L2: 调用链 — 谁调了谁

**前提：** L1 符号表已完成。

**目标：** 从每个入口点出发，追踪完整的调用树，**一直追到叶子节点**。

### 追踪方法

```
1. 对每个入口点函数，用 find_in_code 在该文件内找它调用了什么 (kind: call)
2. 对每个被调用的符号，search_content 跨文件搜它的定义位置
3. 递归追踪，直到:
   - 到达第三方库调用 (标记 [external])
   - 到达无更多调用的叶子函数
   - 到达已追踪过的函数 (标记 [recursive] 避免死循环)
4. 只记录同项目内的调用——第三方库标记 external 但不继续追踪
5. 每个调用边上标注调用行号和上下文（为什么在这里调用）
```

### handler 追踪规则（声明型注册表）

**工具注册表 / 路由表 / 命令表只能证明"有哪些工具"，不能证明"工具的实现质量"。**

发现以下模式后必须继续追踪 handler 函数：
- `tool_table[]` / `tool_registry[]` / `route_table[]`
- `register_tool()` / `add_command()` / `app.get()` / `router.post()`
- 任何数组-of-structs 含函数指针或 handler 字段

### 输出：`docs/loop-docs/call-graph.md`

以树状结构从每个入口点展开：

```markdown
## 调用树: main() → 全链路

### 入口: `main()` @ `src/main.ts:42`
```
main() [src/main.ts:42]
├── Config.load() [src/config.ts:18]          ← L45: 启动时加载配置
│   ├── parseEnvFile() [src/config.ts:30]      ← 读取 .env
│   │   └── fs.readFileSync() [external]       ← Node 标准库
│   └── validateSchema() [src/config.ts:55]    ← 校验配置格式
│       └── Ajv.validate() [external]
├── Database.connect() [src/db/index.ts:10]    ← L48: 数据库连接池初始化
│   ├── Pool.create() [src/db/pool.ts:5]
│   │   └── pg.Pool() [external]
│   └── runMigrations() [src/db/migrate.ts:22]
│       ├── readMigrationFiles() [src/db/migrate.ts:8]
│       └── executeSQL() [src/db/migrate.ts:35]
├── Router.register() [src/api/router.ts:15]   ← L52: 注册所有 API 路由
│   ├── app.post("/auth/login", auth.handleLogin)
│   ├── app.get("/stocks/:code", stocks.getStock)
│   └── app.use(authMiddleware)                ← 全局认证中间件
└── Server.listen() [external]                 ← L60: 启动 HTTP 监听
```

### 调用统计

| 函数 | 文件 | 被调次数 | 调用数 | 深度 | 说明 |
|---|---|---|---|---|---|
| `Config.load` | src/config.ts:18 | 8 | 3 | 2 | 🟡 被 8 处调用——配置加载是基础设施 |
| `handleLogin` | src/auth/login.ts:15 | 1 | 4 | 4 | 仅路由调用，内部链路深 |
| `_formatPercent` | src/utils/format.ts:88 | 12 | 0 | 0 | 🟡 被 12 处调用——工具函数，需保持签名稳定 |

### 入口点清单

| 入口 | 文件 | 触发方式 | 调用深度 |
|---|---|---|---|
| `main()` | src/main.ts:42 | 进程启动 | 6 层 |
| `handleLogin()` | src/auth/login.ts:15 | POST /auth/login | 4 层 |
| `cronJob()` | src/scheduler.ts:10 | 定时任务 | 3 层 |

### 候选死代码

| 符号 | 文件 | 原因 | 删除保护检查 |
|---|---|---|---|
| `oldParser()` | src/parser.ts:200 | 扇入=0, 非导出 | 需检查: 动态 import? 测试引用? |
| `legacyHelper()` | src/utils/legacy.ts:45 | 扇入=0, 非导出 | 未发现引用, 可安全删除 |
```

### 自检
- `entryPoints` 至少有一个
- `callGraph` 中的 caller 全部在 L1 符号表中
- handler 追踪：注册表中的每个 handler 都有 ≥1 条向下的调用边
- 调用树不截断——追到叶子或 external

---

## L3: 数据流 — 数据从哪来、到哪去

**前提：** L1 + L2 已完成。仅 `deep` 模式运行。

**目标：** 追踪核心数据结构的完整生命周期，**解释每个阶段的设计决策**。

### 什么是"核心数据结构"
- ≥ 3 个字段的 struct/class/type
- 被 ≥ 3 个函数引用
- 或者在入口点的参数/返回值中出现

### 输出（合并在 `knowledge-graph.md` 的数据流章节）

```markdown
## 数据流分析

### `User` 类型 — 用户认证数据流
**定义**: `src/models/user.ts:5` — 7 个字段（id, username, passwordHash, email, role, createdAt, lastLoginAt）

**设计决策**:
- `passwordHash` 而非 `password`: 从不存储明文——bcrypt 哈希在 `validateCredentials` 中验证。
- `role` 是 enum 而非 string: 防止 SQL 注入利用角色字段提权，只有预定义的 3 种角色。
- `createdAt` 和 `lastLoginAt` 分离: 支持审计追踪（账户创建时间 vs 最近活跃时间）。

**完整生命周期**:

```
[创建] handler.parseUser() @ src/handler.ts:30
  输入: JSON body { username, password, email }
  处理: 校验 username 格式 → 检查 email 唯一性 → bcrypt 哈希密码
  输出: User 对象（无 id——数据库自增）
       ↓
[校验] validator.check() @ src/validator.ts:12
  输入: 未验证的 User 对象
  处理: email 正则校验 → username 长度 ≥3 → password 强度 ≥8 位
  输出: ValidationResult { valid: bool, errors: [] }
       ↓
[持久化] db.insertUser() @ src/db/users.ts:55
  输入: 已验证的 User 对象
  处理: INSERT INTO users ... RETURNING id
  输出: User 对象（带数据库生成的 id）
       ↓
[缓存] cache.setUser() @ src/cache/users.ts:20
  输入: id + User 对象
  处理: Redis SETEX user:{id} 3600 {json}
  决策: 1 小时 TTL——平衡了性能和用户信息变更的实时性
       ↓
[读取] api.getUser() @ src/api/users.ts:22
  输入: userId (URL param)
  处理: 先查 Redis → miss 则查 PostgreSQL → 回填缓存
  决策: Cache-aside 模式——避免缓存不一致
       ↓
[序列化] json.Marshal() @ src/api/users.ts:25
  输入: User 对象
  处理: 排除 passwordHash 字段 (json:"-")
  决策: 结构体 tag 控制序列化——比手动构建 JSON 更安全，不会遗漏新字段
```

### 数据流总览

| 数据结构 | 字段数 | 引用次数 | 生命周期步骤 | 跨模块 |
|---|---|---|---|---|
| User | 7 | 15 | 5 (创建→校验→存储→读取→序列化) | ✅ 4 模块 |
| Order | 12 | 23 | 6 (创建→校验→风控→存储→通知→归档) | ✅ 6 模块 |
| AnalysisResult | 28 | 45 | 3 (生成→格式化→推送) | ✅ 3 模块 |
```

### 自检
- ≥60% 的核心数据结构有完整 lifecycle 记录
- 每个 lifecycle 步骤标注了"为什么这样设计"

---

## L4: 模块依赖 — 模块怎么连

**前提：** L1 符号表已完成。所有深度都运行。

**目标：** 汇总模块间依赖关系，**生成影响矩阵和风险分析**。

### 输出：`docs/loop-docs/module-dependencies.md`

```markdown
## 模块依赖图

```
src/api/ ──→ src/auth/ ──→ src/db/
  │            │
  │            └──→ src/cache/
  │
  └──→ src/services/ ──→ src/db/
         │
         └──→ src/notification/ ──→ src/templates/
```

## 模块职责 + 影响力分析

### `src/core/` — 核心引擎
**职责**: 任务调度、分析流水线、生命周期管理
**文件**: pipeline.py (450行), scheduler.py (320行), lifecycle.py (180行)
**入口**: `pipeline.py:StockAnalysisPipeline.run()`
**对外接口**: `run_pipeline(config)`, `get_pipeline_status()`

**依赖方向**:
- 依赖: `src/llm/`, `src/data_provider/`, `src/notification/`
- 被依赖: `main.py`, `src/services/scheduler.py`

**影响力**: 🔴 核心节点——被 6 个模块依赖
**修改此模块的风险**:
- `pipeline.py:run()` 是主入口——任何签名变更影响 main.py 和 scheduler
- `scheduler.py` 的 cron 表达式变更影响所有定时任务
- 修改前必须通过 `tests/test_pipeline*.py` 全部 12 个测试

### `src/notification/` — 通知层
**职责**: 多渠道消息推送（14 个通道）
**文件**: notification.py (1024行), notification_reports.py (1627行)
**入口**: `NotificationService.send()`
**对外接口**: `send_daily_report()`, `get_notification_service()`

**依赖方向**:
- 依赖: `src/notification_sender/` (14个sender), `src/config/`
- 被依赖: `src/core/pipeline.py`, `main.py`

**影响力**: 🟡 中等——被 3 个模块依赖
**修改此模块的风险**:
- 新增推送通道只需加 sender 实现——不影响现有通道
- `generate_*_report()` 方法签名变更影响所有调用者
- 14 个 sender 各自独立——单个修改爆炸半径小

## 模块依赖矩阵

| | api | core | auth | db | services | notification | llm | data_provider |
|---|---|---|---|---|---|---|---|---|
| **api** | - | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **core** | ❌ | - | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **auth** | ❌ | ❌ | - | ✅ | ❌ | ❌ | ❌ | ❌ |
| **db** | ❌ | ❌ | ❌ | - | ❌ | ❌ | ❌ | ❌ |
| **services** | ❌ | ❌ | ❌ | ✅ | - | ❌ | ❌ | ❌ |
| **notification** | ❌ | ❌ | ❌ | ❌ | ❌ | - | ❌ | ❌ |
| **llm** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - | ❌ |
| **data_provider** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - |

✅ = 行模块依赖列模块

## 风险结构

### 🔴 循环依赖
无

### 🟡 高扇入（≥5 个模块依赖它）
| 模块 | 扇入 | 依赖它的模块 |
|---|---|---|
| src/types/ | 8 | api, core, services, notification, db, llm, agent, data_provider |
| src/config/ | 7 | api, core, services, notification, llm, agent, bot |

### 🟡 高扇出（≥7 个模块被它依赖）
| 模块 | 扇出 | 它依赖的模块 |
|---|---|---|
| main.py | 9 | core, config, llm, services, notification, agent, db, api, bot |

### ⚪ 孤岛模块（扇入=0 且扇出=0）
无
```

### 警告阈值
- 🔴 循环依赖：任何长度的环
- 🟡 高扇入：≥ 5 个模块依赖它 → 改动影响面大
- 🟡 高扇出：≥ 7 个模块被它依赖 → 模块可能职责过重
- ⚪ 孤岛：扇入=0 且扇出=0 → 可能是死模块

---

## 主输出：`docs/loop-docs/knowledge-graph.md`

这是合并四层分析的主文档，供 Loop Agent 和开发者阅读：

```
# [项目名] 代码知识图谱

## 元信息
- 仓库: owner/repo
- 语言: TypeScript (87%) + CSS (13%)
- 规模: M (187 源文件)
- 深度: standard
- 分析时间: 2026-07-12 14:30:00 UTC

## 架构总览
[从 L4 模块依赖图摘取的一段文字描述 + ASCII 依赖图]

## 入口点
[从 L2 入口点清单摘取]

## 符号统计
[从 L1 汇总: 总符号数 / 导出符号 / 类 / 函数 / 类型]

## 调用链
[从 call-graph.md 摘取关键路径，复杂调用链引用详细文件]

## 数据流（deep 模式）
[从 L3 摘取核心数据结构的生命周期]

## 模块依赖
[从 module-dependencies.md 摘取关键发现]

## 风险清单
[汇总: 循环依赖 / 高扇入 / 高扇出 / 孤岛 / 候选死代码]

## 文件清单
[所有源文件列表，每文件一行，含行数和职责一句话]
```

---

## 文档规模约束

**下限（低于此值 = 敷衍，不可接受）:**

| 文档 | 下限 | 检查方式 |
|---|---|---|
| `symbol-index.md` | 每个源文件 ≥ 3 行（符号名/类型/一行说明） | 行数 / 文件数 ≥ 3 |
| `call-graph.md` | 每个入口点有完整调用树（追到叶子或 external） | 调用边数 ≥ 符号数 × 0.5 |
| `module-dependencies.md` | 依赖矩阵 + 所有警告 + 每个模块一行影响分析 | 矩阵行列 = 模块数 |
| `knowledge-graph.md` | 四层摘要 + 入口点清单 + 风险清单 + 文件清单 | 主文档行数 ≥ 60 |

**上限（超过此值 = 膨胀，需拆分）:**

| 文档 | 上限 | 超过时操作 |
|---|---|---|
| `symbol-index.md` | 500 行 | 按目录拆分为 `symbol-index-{dir}.md`，主文档只保留索引 |
| `call-graph.md` | 800 行 | 按入口点拆分为 `call-graph-{entry}.md`，主文档只保留入口点清单 + 调用统计 |
| `module-dependencies.md` | 300 行 | 不拆分——模块数通常有限，超过说明分析过于啰嗦 |
| `knowledge-graph.md` | 500 行 | 将各层详细内容推到子文档（已在设计中），主文档只保留总览 + 引用链接 |

**规则：** 超过上限时，将详细内容 push 到对应子文档，主文档保留 ≤ 上限的摘要 + 指向子文档的引用。

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这个文件没有 export，跳过符号提取" | 没有 export 的文件可能是 CLI 入口或测试辅助，跳过导致调用链断裂 |
| 2 | "调用链只看前 3 层就够了" | 第 4-5 层的 bug 是最难排查的。不追踪到叶子节点 = 没做 |
| 3 | "数据流可以等需要时再追踪" | 数据流追踪耗时最长，等需要时再来追 → 整个流程被阻塞 |
| 4 | "模块依赖用肉眼看一下就行" | 肉眼看不出循环依赖的完整链路，也数不清扇入扇出 |
| 5 | "文件分析写个摘要就行了，不用解释为什么" | 技术文档的价值在"为什么"。只写"做了什么" = API 文档，不是技术文档 |
| 6 | "符号索引写太详细了，一个文件 5 行够了" | 5 行不够解释一段代码为什么那样写。Loop 的 Fix 阶段需要这些上下文来决定怎么改 |
| 7 | "调用树太深了，截断到 3 层" | 截断的调用树 = 残缺的地图。追到叶子或 external，不要截断 |

## 验证清单

- [ ] `docs/loop-docs/knowledge-graph.md` 已生成，包含完整的四层分析
- [ ] `docs/loop-docs/symbol-index.md` 每个源文件都有至少一节分析
- [ ] `docs/loop-docs/call-graph.md` 每个入口点都有完整调用树（追到叶子）
- [ ] `docs/loop-docs/module-dependencies.md` 包含依赖矩阵 + 影响分析
- [ ] L1 符号总数在 [源文件数×1.5, 源文件数×10] 区间
- [ ] L2 调用边数 ≥ 符号数 × 0.5
- [ ] L3 (deep) 覆盖 ≥ 60% 的核心数据结构
- [ ] 每个"关键代码段"都包含**为什么这样写**
- [ ] 没有"可能"、"似乎"等无证据断言——全部绑定 `file:line`
