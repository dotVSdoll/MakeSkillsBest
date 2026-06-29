---
name: semantic-rag
description: "语义分析与项目概览 — 三层降级深度跨语言分析，产出完整项目技术文档和零依赖 RAG 索引。每个模块有职责分析、设计决策、上下游关系。"
argument-hint: "explain [repo] | what does [project] do | project overview"
triggers:
  - "这个项目是做什么的"
  - "解释一下这个仓库"
  - "项目架构"
  - "认证逻辑在哪"
---

# Semantic RAG — 语义分析与项目概览

## 概述

**不是写摘要——是写完整的项目技术文档。** 两步产出：

1. **`docs/loop-docs/project-overview.md`** — 完整项目概览，每模块一个章节，包含"为什么这样设计"
2. **`.semantic-rag.json`** — 轻量 RAG 索引，用于快速问答（旧版功能的保留）

**零外部依赖。** 不需要向量数据库、embedding API。

---

## 核心原则

**旧版:** ≤25 字摘要 + ≤20 文件 + ≤80 行输出 = 敷衍。
**新版:** 每个模块详细分析 + 全部文件覆盖 + 设计决策解释 = 技术文档。

**输出目标:** 一个新人接手这个项目，读完 `project-overview.md` 就能理解项目全貌、架构设计、各模块职责和代码约定。

---

## 输出: `docs/loop-docs/project-overview.md`

这是主输出——给 Loop Agent 和开发者阅读的完整项目文档：

```markdown
# [项目名] 项目技术文档

> 自动生成于 semantic-rag 分析 | 分析时间: ISO8601 | 分析层级: 🔬 L1 精确

---

## 项目身份

| 属性 | 值 |
|---|---|
| 仓库 | owner/repo |
| 一句话定位 | 面向个人投资者的 A 股智能分析系统 |
| 主语言 | Python (75.7%) |
| 辅助语言 | TypeScript (18%), CSS (5%), Shell (1.3%) |
| 运行时 | Python 3.11+ |
| 框架 | FastAPI + litellm |
| 入口 | main.py (CLI), server.py (Web API), webui.py (Gradio) |
| 数据库 | SQLite (SQLAlchemy ORM) |
| 测试框架 | pytest (200+ 测试文件) |
| 分析层级 | 🔬 L1 精确分析 (tree-sitter AST) |

## 架构模式

**分层架构** (自上而下):

```
入口层    main.py / server.py / webui.py      ← 三种启动方式
  ↓
编排层    src/core/pipeline.py                ← 分析流水线总控
  ↓
分析层    src/analyzer.py + src/agent/        ← LLM 调用 + 多 Agent 决策
  ↓
服务层    src/services/ (38个)                ← 业务逻辑
  ↓
数据层    src/data_provider/ + src/repositories/ ← 数据获取 + 持久化
  ↓
推送层    src/notification_sender/ (14通道)    ← 多渠道推送
```

**核心数据流**: `CLI/Web 触发 → pipeline.run() → 数据获取 → LLM 分析 → 结果格式化 → 多渠道推送`

**设计决策**:
- 为什么用分层架构而非微服务: 个人投资者场景，单体部署足够。分层保证了模块边界清晰但避免了分布式复杂度。
- 为什么 litellm 统一 LLM 后端: 支持 Gemini/OpenAI/DeepSeek 多模型切换，通过配置文件即可更换，不需要改代码。
- 为什么 SQLite 而非 PostgreSQL: 个人用户数据量小（≤10万条），SQLite 零运维成本。SQLAlchemy ORM 保证了将来可无缝切换。

---

## 模块详解

### `src/core/` — 核心引擎

**职责**: 分析流水线的总控和调度——拿到股票列表 → 逐个拉数据 → 调 LLM 分析 → 推送结果。
**规模**: 11 个文件, ~3500 行

| 文件 | 行数 | 职责 | 关键设计 |
|---|---|---|---|
| `pipeline.py` | 450 | 主流水线 `StockAnalysisPipeline` | 使用 generator 模式逐个 yield 结果，支持断点续跑和进度回调 |
| `scheduler.py` | 320 | 定时任务调度 | 基于 `schedule` 库，不支持 cron 表达式——选择了简单性而非灵活性 |
| `market_review.py` | 480 | 大盘复盘分析 | 独立于个股分析——先跑大盘再跑个股，大盘结论注入个股 prompt |
| `trading_calendar.py` | 180 | A 股交易日历 | 使用 `exchange-calendars` 库，兼容上交所/深交所节假日 |
| `config_manager.py` | 350 | 配置分层管理 | 三层优先级: env > config.py > defaults。热加载通过 `@property` 实现 |

**对外接口**: `run_pipeline(config)`, `run_market_review()`, `get_trading_days()`

**依赖方向**: 依赖 `src/llm/`, `src/data_provider/`, `src/notification/`；被 `main.py`, `server.py` 依赖

**修改风险**: `pipeline.py:run()` 是主入口——签名变更影响所有启动路径。修改前需通过 `tests/test_pipeline*.py`。

### `src/analyzer.py` — LLM 分析层

**职责**: 封装 LLM 调用，把技术面+消息面数据组装成 prompt → 调 LLM → 解析 JSON 响应 → `AnalysisResult`。
**规模**: 2598 行（含辅助函数 1507 行在 `analyzer_helpers.py`）

**核心类**: `GeminiAnalyzer` (2280 行)
- `__init__()` — 初始化 litellm 客户端，注册 fallback 模型链
- `analyze()` — 主分析方法: 获取数据 → 构建 prompt → 调 LLM → 解析 → 完整性检查 → 兜底填充
- `_format_prompt()` — 450 行的 prompt 模板——包含技术面/消息面/市场阶段/决策指令
- `_parse_response()` — JSON 解析 + 修复 + 校验的三层防御
- `_call_litellm_impl()` — 多模型 fallback: 主模型 → fallback1 → fallback2 → 报错

**设计决策**:
- 为什么 `analyze()` 方法 270 行: 因为每一步都有错误处理和重试——不是"写得长"而是"防御深"。
- 为什么 litellm 自带 fallback 还要自己封装一层: litellm Router 的 fallback 不支持 per-model 的 `max_tokens` 差异化配置。
- 为什么 prompt 不使用外部模板文件: 模板内嵌在代码中——prompt 变更 = 代码变更 = 有 git 历史可追溯。

**辅助函数** (在 `analyzer_helpers.py`):
- `check_content_integrity()` — 检查 LLM 输出完整性（必填字段、数值范围）
- `apply_placeholder_fill()` — 对缺失的非关键字段填入占位值
- `stabilize_decision_with_structure()` — 用筹码结构数据修正 LLM 情绪化判断
- `normalize_chip_structure_availability()` — 处理数据源不提供筹码数据的降级

### `src/services/` — 业务服务层

**职责**: 38 个服务模块，每个负责一个独立业务能力。
**规模**: 38 个文件, ~12000 行

| 关键服务 | 职责 | 说明 |
|---|---|---|
| `analysis_service.py` | 分析请求调度 | 异步队列 + 并发控制 (Semaphore) |
| `alert_service.py` | 告警规则引擎 | 支持价格/均线/成交量/技术指标多条件组合 |
| `portfolio_service.py` | 持仓管理 | 成本计算、收益统计、仓位建议 |
| `decision_signal_service.py` | 决策信号提取 | 从 LLM 输出中结构化提取买卖信号 |
| `history_service.py` | 历史分析查询 | 支持按日期/股票/信号类型检索历史结果 |
| `report_renderer.py` | Jinja2 模板渲染 | 分离报告格式和数据——新增报告类型只需加模板 |
| `intelligence_service.py` | 舆情聚合 | 多数据源 (Tavily/SerpAPI) 并行搜索 + 去重 |
| `stock_service.py` | 股票信息查询 | 名称→代码解析、板块归属、基本面概况 |

### `src/data_provider/` — 数据获取层

**职责**: 13 个数据源适配器，按优先级 fallback。
**规模**: 14 个文件, ~4500 行

| 适配器 | 优先级 | 数据覆盖 | 备注 |
|---|---|---|---|
| efinance | P0 | A 股实时行情 | 东方财富接口，速度快但偶尔限流 |
| akshare | P1 | A 股全量数据 | 最全面的免费数据源，但稳定性不如商业 API |
| tushare | P2 | A 股专业数据 | 需要 token，数据质量高 |
| yfinance | P4 | 美股/港股 | 雅虎财经，海外市场主力 |
| longbridge | P5 | 美股/港股 | 长桥 OpenAPI，OAuth 认证 |
| baostock | P3 | A 股历史数据 | 适合回测场景 |

**设计决策**:
- 为什么 13 个数据源: 免费数据源没有 SLA——多源 fallback 是生产环境必须的。优先级按稳定性而非覆盖面排序。
- 为什么用 Adapter 模式而非统一接口: 各数据源的字段名、单位、精度都不同——强行统一会丢失信息。Adapter 保留源数据，上层再归一化。

### `src/notification_sender/` — 推送层

**职责**: 14 个推送通道的独立实现。
**规模**: 14 个文件，每个 80-200 行

**架构契约**: 每个 sender 是独立模块——新增通道只需加一个文件，不影响现有通道。

| 通道 | 适用场景 |
|---|---|
| 企业微信 | 中国大陆主流，支持 Markdown + 图片 |
| 飞书 | 支持 Stream 流式推送 |
| Telegram | 海外用户，支持 HTML/Markdown |
| Discord | 社区场景，Webhook |
| 邮件 (SMTP) | 日报推送，支持分组 |
| Pushover/Pushplus/ServerChan/Gotify/Ntfy/Slack... | 小众但完整的覆盖 |

### `src/llm/` — LLM 调用封装

**职责**: litellm 统一后端 + 用量追踪 + 错误恢复。
**规模**: 8 个文件, ~2000 行

**设计决策**:
- `litellm_backend.py` 封装了 litellm completion + stream 两种调用方式
- `generation_backend.py` 定义了抽象接口——如果要换掉 litellm，只需实现这个接口
- `usage.py` 追踪每次调用的 token 消耗，支持按模型/日期/用户维度统计
- `provider_cache.py` 实现 prompt caching hint——对重复的系统 prompt 部分节省 50% token

### `src/agent/` — 多 Agent 策略系统

**职责**: 6 个专业 Agent 并行分析 + 结果聚合。
**规模**: 18 个文件, ~5000 行

| Agent | 职责 | 输入 | 输出 |
|---|---|---|---|
| `decision_agent` | 综合决策 | 所有 Agent 输出 | 最终买卖建议 |
| `intel_agent` | 舆情分析 | 新闻/公告/研报 | 情绪评分 + 风险警报 |
| `portfolio_agent` | 持仓建议 | 当前持仓 + 分析结果 | 仓位调整建议 |
| `risk_agent` | 风险评估 | 波动率/VaR/最大回撤 | 风险等级 + 止损建议 |
| `technical_agent` | 技术分析 | K 线/均线/量能 | 趋势判断 + 形态识别 |

### `src/notification.py` — 通知调度

**职责**: 14 通道的统一调度入口（报告生成已拆到 `notification_reports.py`）。
**规模**: 1024 行（拆分后）

**设计决策**: 报告生成通过 Mixin 模式继承——`NotificationService(ReportGenerationMixin, WechatSender, ...)`。这样 14 个 sender 保持独立，报告格式变更不影响推送通道。

### `src/config.py` — 配置管理

**职责**: 全局配置中心。
**规模**: 3091 行（⚠️ 质量诊断已标记为过大模块）

**设计决策**: 
- 为什么 3000 行: 每个配置项有 docstring + 类型注解 + 默认值 + 环境变量映射 + 校验逻辑。是"文档化配置"而非"臃肿"。
- 三层优先级: 环境变量覆盖 → 配置文件 → 代码默认值。通过 `@property` 延迟解析实现热加载。
- 改进建议: 按域拆分为 config/models.py + config/env.py + config/defaults.py。

---

## 技术栈总览

| 层级 | 技术选型 | 为什么选它 |
|---|---|---|
| LLM 调用 | litellm | 统一 30+ LLM 提供商接口，支持 fallback |
| Web 框架 | FastAPI | 异步支持 + 自动 OpenAPI 文档 |
| 前端 | React + Vite | HMR 开发体验 + TypeScript |
| 桌面端 | Electron | 跨平台 + Web 技术栈复用 |
| ORM | SQLAlchemy | Python 生态最成熟的 ORM |
| 数据分析 | pandas + numpy | A 股数据天然是表格数据 |
| 模板引擎 | Jinja2 | 报告渲染——分离格式和数据 |
| Bot 框架 | discord.py + lark-oapi + dingtalk-stream | 每个平台的原生 SDK |

## 代码约定

**命名**: snake_case 全项目统一（变量/函数/文件）
**类型注解**: 所有公共函数有完整类型注解
**错误处理**: try/except + 自定义异常类，在 controller 层统一 catch
**测试**: pytest, 测试文件与源文件同级 `_test.py` 后缀
**注释**: docstring 覆盖所有公共模块/类/函数，内部逻辑用行注释
**提交**: conventional commits (feat/fix/docs/refactor/test/chore)

## 已知技术债

| 问题 | 位置 | 严重度 | 状态 |
|---|---|---|---|
| analyzer.py God class | src/analyzer.py | HIGH | 辅助函数已拆分，核心类待拆分 |
| config.py 过大 | src/config.py | MEDIUM | 待按域拆分 |
| 14 个 sender 无集成测试 | src/notification_sender/ | LOW | 每个至少需 1 个 mock 测试 |
| requirements.txt 无 lock 文件 | requirements.txt | MEDIUM | 已创建 requirements.lock |
| main.py 混合 CLI+初始化+调度 | main.py | MEDIUM | CLI 解析待抽取 |

---

## RAG 索引

零依赖轻量 RAG 索引已生成至 `.semantic-rag.json`。
Chunk 数: [N] | 索引大小: [M] KB
可通过关键词检索快速定位代码位置——"认证逻辑在哪" → 直接返回文件:行号。
```

---

## 跨语言策略：三层降级深度

| 层级 | 涵盖语言 | 分析粒度 | 可靠性 |
|---|---|---|---|
| **L1** | TS, JS, Python, Go, Rust, Java | 函数/类/方法级，读源码写分析 | 高 |
| **L2** | C, C++, C#, Kotlin, Swift, PHP, Ruby | 文件级，基于导出符号 + 注释 | 中 |
| **L3** | 其他所有语言 | 目录级，README + 结构 | 有限 |

输出中诚实标注: `🔬 L1 精确` / `📄 L2 文件级` / `📁 L3 目录级`

---

## README 降权规则（防营销文本污染）

事实层级（高→低）:
- L0 — 构建文件 → 确认真实模块列表
- L1 — 源码入口 → 确认架构边界
- L2 — README/文档 → 仅用于意图识别，不可作为模块存在性的单一证据

**降权规则:** README 声称的模块 → 必须在构建目标中找到 → 才能在文档中列出。否则标注 `⚠️ README 声称但未确认`。

---

## 文档规模约束

**下限（低于此值 = 敷衍，不可接受）:**

| 文档 | 下限 | 检查方式 |
|---|---|---|
| `project-overview.md` | 每个模块 ≥ 3 个小节（职责/规模、设计决策、依赖方向） | 模块数 × 3 ≤ 实际小节数 |
| 项目身份卡 | 全部 8 个字段非空 | 逐字段检查 |
| 技术栈总览 | ≥ 5 行（每个关键依赖一行 + 选型理由） | 行数 ≥ 5 |
| 代码约定 | ≥ 4 条（命名/类型/错误/测试） | 条目数 ≥ 4 |
| 已知技术债 | 从 quality-audit/diagnose 交叉引用 | 至少引用 quality-audit 的 HIGH 项 |

**上限（超过此值 = 膨胀，需拆分）:**

| 文档 | 上限 | 超过时操作 |
|---|---|---|
| 单个模块章节 | 60 行 | 拆分到 `project-overview-{module}.md`，主文档保留 ≤ 20 行摘要 + 引用 |
| `project-overview.md` 整体 | 500 行 | 最多保留前 8 个模块的完整章节，其余只写摘要 + 引用子文档 |
| `.semantic-rag.json` | 1 MB | chunk 数达到上限时，优先保留入口链上的模块 |

**规则：** 大模块（行数 > 1000 或文件数 > 5）自动触发子文档拆分。小模块（行数 < 200 且文件数 ≤ 2）合并为一个小节。

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "≤25 字摘要够用了" | 25 字说不清一个模块为什么这样设计。技术文档的价值在"为什么"。 |
| 2 | "只看 20 个关键文件就行" | 决定"关键"的标准是入口点依赖链——不在链上的文件可能是死代码，也可能是被遗漏的核心。全量覆盖。 |
| 3 | "L3 语言我完全不懂，跳过" | L3 降级到目录+README。README 总是人类语言。 |
| 4 | "技术文档写太详细了，future loop 用不上" | Fix 阶段需要知道"改了这段代码会影响哪些模块"——这些信息全在模块详解里。 |
| 5 | "架构图用文字描述就行" | 用 ASCII 树状图 + 表格——比图片更 grep 友好，Agent 和人都能直接读。 |
| 6 | "README 降权太严格了，README 通常是对的" | 很多开源项目的 README 是愿望清单而非事实。构建文件不说谎。 |

## 验证清单

- [ ] `docs/loop-docs/project-overview.md` 已生成
- [ ] 项目身份卡全字段填充，语言层级已标注
- [ ] 每个顶级模块都有详细分析章节（职责/规模/设计决策/依赖方向）
- [ ] 每个模块的设计决策都是"为什么"而非"做了什么"
- [ ] 架构图用 ASCII 树状图，表格化依赖关系
- [ ] README 声明的能力全部通过构建文件交叉验证
- [ ] 代码约定章节从 `style-profile` 交叉引用
- [ ] 已知技术债章节从 `quality-audit` 交叉引用
- [ ] `.semantic-rag.json` 已生成（供快速问答检索）
