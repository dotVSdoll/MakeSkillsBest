---
name: semantic-rag
description: "语义分析与多语言解释 — 三层降级深度确保跨语言不翻车；AST 边界分块 + 结构化 JSON + 两阶段检索实现零依赖轻量 RAG。repo-decompose Phase 2 的语义卡来源，mvp-approach 的方向收束依据。"
argument-hint: "explain [repo] in Chinese | what does [project] do | ask [repo] where is auth logic"
triggers:
  - "这个项目是做什么的"
  - "解释一下这个仓库"
  - "用中文解释"
  - "项目架构"
  - "认证逻辑在哪"
---

# Semantic RAG — 语义分析与多语言解释

## 概述

两步走：
1. **摄入时** — 按 AST 边界将代码切块，为每块写 ≤25 字摘要，存为 JSON 索引
2. **查询时** — 关键词命中 → Agent 语义排序 → Top 5

**零外部依赖。** 不需要向量数据库、embedding API、Chroma/Pinecode。索引是 50–600KB 的纯 JSON 文件。

**集成方式：**
- `repo-decompose` Phase 2 空闲期调用 → 写入共享上下文 `supplements.semanticRAG`
- `mvp-approach` Step 1 用它收束方向
- 独立使用 → 索引写入 `.semantic-rag.json`

---

## PRECONDITIONS — 执行前必须检查

**本 skill 有两种运行模式，根据上下文自动选择：**

```
检查: .repo-decompose-context.json 是否存在？

  YES → PIPELINE 模式:
    - 读取 meta 中的 repo 路径、语言、框架
    - Phase 1 跳过（meta 已有语言信息）
    - 输出写入 supplements.semanticRAG 字段
    - 不需要询问用户任何问题
    
  NO → STANDALONE 模式:
    - 需要用户提供代码路径或 GitHub URL
    - 输出写入 .semantic-rag.json
    - 从 Phase 1 完整开始
```

**决不允许的行为：**
- ❌ 在 PIPELINE 模式下重新检测语言/框架（信任 meta）
- ❌ 在 PIPELINE 模式下输出到独立文件（必须写入共享上下文）
- ❌ 跳过 Phase 2-4

## 跨语言策略：三层降级深度

**诚实面对不同语言的理解不对称。**

| 层级 | 涵盖语言 | 工具 | 分析粒度 | 可靠性 |
|---|---|---|---|---|
| **L1** | TS, JS, Python, Go, Rust, Java | `get_symbols` (tree-sitter) | 函数/类/方法 | 高 |
| **L2** | C, C++, C#, Kotlin, Swift, PHP, Ruby | `search_content` + 语言约定正则 | 文件 | 中 |
| **L3** | 其他所有语言 | `read_file` + 注释/文档 | 目录 | 有限 |

**降级决策（Phase 1 自动执行）：**
- 检测到主要语言是 L1 → 函数级 chunk + 语义摘要
- L2 → 文件级 chunk，依赖导出符号 + 注释推断
- L3 → 目录级，只分析 README + 目录结构 + 关键文件内容

**输出中诚实标注：** `🔬 L1 精确` / `📄 L2 文件级` / `📁 L3 目录级`

---

## 轻量 RAG 算法

### 摄入：AST 边界分块

```
分块规则:
  L1: 每个函数/类/方法 = 1 chunk
  L2: 每个源文件 = 1 chunk
  L3: 每个目录 = 1 chunk

Chunk 结构:
{
  "id": "src/auth/login.ts:handleLogin",
  "type": "function",
  "name": "handleLogin",
  "module": "src/auth",
  "summary": "验证用户凭证并返回 JWT token",
  "keywords": ["auth", "login", "jwt", "token"],
  "source": "src/auth/login.ts:12-45",
  "langLevel": "L1"
}
```

**摘要规则：**
- 综合函数名 + 参数类型 + 返回值 + 注释 + 调用上下文
- ≤ 25 字，用户指定语言
- 2–5 个关键词

**索引大小：**

| 仓库 | 文件数 | Chunk 数 | JSON 大小 |
|---|---|---|---|
| S | <100 | ~200 | ~50 KB |
| M | 100–500 | ~800 | ~150 KB |
| L | 500–2000 | ~3000 | ~400 KB |
| XL | >2000 | ~5000 | ~600 KB |

### 检索：两阶段

```
用户: "认证逻辑在哪里？"

Pass 1 — 关键词命中:
  分词 → 匹配 name/summary/keywords → 800→12 候选

Pass 2 — Agent 语义排序:
  给 Agent 12 个候选的 {id, summary, keywords}
  Agent 对比用户问题排序 → Top 5

输出:
  🔍 "认证逻辑":
  1. src/auth/login.ts:handleLogin — 验证凭证返回 JWT
  2. src/auth/middleware.ts:authMiddleware — 拦截请求校验 token
  3. src/auth/session.ts:createSession — 创建会话写入 Redis
  4. src/auth/oauth.ts:oauthCallback — 处理 OAuth 回调
  5. src/middleware/cors.ts:validateOrigin — 校验请求来源

  追问 "展开第2个" → read_file src/auth/middleware.ts
```

**为什么不用 embedding：** 摘要是 Agent 自己写的——Agent 读自己写的摘要做排序不需要"翻译层"。

---

## 工作流

### Phase 1: 结构识别

**不询问用户，不依赖配置。** 自动检测：

| 识别项 | 方法 |
|---|---|
| 语言 | 文件扩展名分布 → 确定 L1/L2/L3 |
| 运行时 | `package.json` / `go.mod` / `Cargo.toml` |
| 框架 | 依赖列表匹配 (Next.js, Django, Gin, Actix...) |
| 入口 | `main` 字段 / `bin` 字段 / 约定入口 |
| 目录约定 | `src/` `lib/` `cmd/` `pkg/` `app/` |
| 测试框架 | jest/vitest/pytest/go test 检测 |
| 数据库 | 依赖名匹配 (pg, mysql, prisma, gorm...) |

**出口 — 项目身份卡：**
```
🆔 项目身份
仓库: owner/repo
语言: TypeScript (87%) + CSS (13%)
运行时: Node.js 20+
框架: Next.js 14 (App Router)
入口: src/app/layout.tsx, src/app/api/
数据库: PostgreSQL + Prisma
🔬 L1 精确分析
```

### Phase 2: 语义解析

**只分析关键文件。** 总量控制 ≤ 20 个。

| 优先级 | 文件类型 | 数量 | 原因 |
|---|---|---|---|
| P0 | README/CONTRIBUTING | ≤3 | 项目自述 |
| P0 | 主入口文件 | ≤2 | 启动路径起点 |
| P1 | 顶级配置 | ≤3 | 依赖和部署信息 |
| P1 | 核心业务目录入口 | ≤5 | 模块入口 |
| P2 | 路由/API 定义 | ≤5 | 对外接口 |
| P3 | 核心类型定义 | ≤3 | 数据模型 |

**每个关键文件回答三问：**
1. 做什么？（一句话，≤25 字）
2. 什么角色？（入口/编排/数据/工具/胶水）
3. 上下游？（谁调它，它调谁）

**出口 — 模块语义卡：**
```json
{
  "modules": [
    {
      "path": "src/auth",
      "responsibility": "用户认证和会话管理",
      "role": "核心业务",
      "upstream": ["src/middleware"],
      "downstream": ["src/db", "src/cache"]
    }
  ],
  "architecturePattern": "分层 (middleware → handler → service → db)",
  "dataFlow": "请求 → 认证 → 路由 → 业务 → ORM → PostgreSQL"
}
```

### Phase 3: 多语言输出

**结构固定：**

```
📖 [owner/repo] 概览

[一段话 — 是什么、解决什么、怎么解决。≤5 句。]

🏗️ 架构: [识别到的模式]
  src/auth/      — 用户认证和会话管理
  src/db/        — 数据库访问 (Prisma)
  src/api/       — REST API 路由
  src/ui/        — React 组件和页面

📊 数据: [核心模型], PostgreSQL + Redis

🔑 入口: src/app/layout.tsx, src/app/api/

🔬 L1 精确分析
```

**约束：** S 仓库 ≤30 行，M ≤50 行，L ≤80 行。不输出源代码片段。

### Phase 4: RAG 索引构建

执行摄入算法。独立使用时输出 `.semantic-rag.json`；被调用时写入共享上下文。

**自检：** 抽 5 个 chunk，每个摘要 ≤25 字且非程序员也能理解。

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "L2 语言用 search_content 凑合就行" | 降级≠不做。L2 仍需读关键文件写摘要，只是粒度从函数降到文件 |
| 2 | "RAG 索引太大，先不生成" | 索引是分析的自然产物——摘要写完索引就有了，不是额外工作 |
| 3 | "L3 语言我完全不懂，跳过" | L3 降级到目录+README。README 总是人类语言，没有语言障碍 |
| 4 | "摘要太长，复杂逻辑说不清" | ≤25 字是硬约束。说不清 → 标注 `⚠️ 职责复杂` 而不写长摘要 |
| 5 | "关键词不准，用 embedding 替代" | embedding 引入外部依赖。关键词不准 → 加更多同义词进 keywords 数组 |
| 6 | "先不做 RAG，等用户追问再说" | 追问时再做 = 每次追问都要重新扫全仓库。索引 = 一次扫描，N 次查询 |

## 验证清单

- [ ] 项目身份卡全字段填充，语言层级已标注
- [ ] 每个关键文件 ≤25 字摘要
- [ ] chunk 数在 [源文件数, 源文件数×5] 区间
- [ ] 至少能回答 3 个追问且 Top 1 包含正确答案
- [ ] 索引文件 < 1MB
