---
name: repo-decompose
description: "仓库架构分析 — 架构/数据/逻辑三层并行分析，产出完整架构文档（架构图+文件级分析+代码决策+模块影响矩阵）。下游 mvp-approach 的输入源。"
argument-hint: "decompose https://github.com/owner/repo | split [repo] requirements | architecture analysis"
dependencies:
  downstream:
    - knowledge-graph
    - semantic-rag
  upstream: []
---

# Repo Decompose — 仓库架构分析

## 概述

将 GitHub 仓库的系统级理解转化为**完整架构文档**。

**旧版输出:** 三层需求树 JSON (REQ-A1, REQ-D1...) — 太抽象，Loop 后续阶段无法使用。
**新版输出:** `docs/loop-docs/architecture.md` — 完整架构文档，每模块有架构图、文件分析、代码决策解释。

**输出目标:** 一个架构师接手这个项目，读完 `architecture.md` 就能画出完整的系统架构图。

---

## 输出文件

| 文件 | 内容 |
|---|---|
| `docs/loop-docs/architecture.md` | 主架构文档 — 分层架构图 + 模块详解 + 证据矩阵 |
| `docs/loop-docs/file-index.md` | 全文件索引 — 每个文件: 做什么、为什么这样写、和其他文件的联系 |

---

## 三阶段分析

### Phase 0: 仓库获取 + 元信息

```
1. 解析仓库路径 → 浅克隆 (--depth 1)
2. 统计文件数 → 确定规模级别 (S/M/L/XL)
3. 检测语言/框架/build 系统
4. 定位入口文件
```

| 级别 | 源文件数 | 分析策略 |
|---|---|---|
| S | < 100 | 全文件逐一分析 |
| M | 100 - 500 | 按目录分组，每组一个子任务 |
| L | 500 - 2000 | 架构层全量 + 数据/逻辑层按域拆分 |
| XL | > 2000 | 架构层全量，数据/逻辑层选核心路径 |

### Phase 1: 架构层分析

**目标:** 识别模块边界、依赖方向、关键抽象、入口点。

产出（写入 `architecture.md` 的架构层章节）:

```markdown
## 架构层

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        入口层                                │
│  main.py (CLI)    server.py (Web API)    webui.py (Gradio)  │
└─────────┬──────────────────┬──────────────────┬─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                       编排层                                 │
│              src/core/pipeline.py                            │
│    StockAnalysisPipeline.run() — 分析流水线总控              │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│ LLM  │ │数据源│ │Agent │ │服务层│ │ 通知推送  │
│ 分析 │ │获取  │ │决策  │ │38个  │ │ 14通道   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────────┘
```

### 模块边界

| 模块 | 路径 | 职责 | 文件数 | 行数 | 关键入口 |
|---|---|---|---|---|---|
| 核心引擎 | src/core/ | 分析流水线总控 | 11 | 3500 | pipeline.py:run() |
| LLM 分析 | src/analyzer.py | LLM 调用 + 解析 | 2 | 4100 | GeminiAnalyzer.analyze() |
| 多 Agent | src/agent/ | 6 Agent 并行决策 | 18 | 5000 | orchestrator.py |
| 业务服务 | src/services/ | 38 个独立服务 | 38 | 12000 | analysis_service.py |
| 数据获取 | src/data_provider/ | 13 数据源适配器 | 14 | 4500 | base.py |
| 数据持久化 | src/repositories/ | SQLAlchemy ORM 层 | 8 | 1500 | base repository |
| 通知调度 | src/notification.py | 14 通道统一入口 | 2 | 2651 | NotificationService.send() |
| 通知通道 | src/notification_sender/ | 14 个独立 sender | 14 | 2000 | 各自的 send() |
| LLM 封装 | src/llm/ | litellm 统一后端 | 8 | 2000 | litellm_backend.py |
| 配置 | src/config.py | 全局配置中心 | 1 | 3091 | Config 类 |
| Web API | api/ | FastAPI 路由 | 20 | 4000 | app.py |
| Bot | bot/ | 多平台 Bot 适配 | 10 | 2000 | dispatcher.py |

### 依赖方向

```
main.py
  ├── src/core/pipeline.py
  │     ├── src/data_provider/     ← 数据获取
  │     ├── src/analyzer.py        ← LLM 分析
  │     │     └── src/llm/         ← LLM 后端
  │     ├── src/agent/             ← 多 Agent
  │     └── src/notification.py    ← 通知调度
  │           └── src/notification_sender/  ← 14 通道
  └── src/config.py                ← 全局配置

依赖规则:
- 上层依赖下层，下层不依赖上层 ✅
- notification_sender 各通道互相独立 ✅
- 无循环依赖 ✅
```

### 证据矩阵

**每个模块的"存在证据"——不只是代码，还有构建文件和配置:**

| 模块 | 证据文件 | 证据类型 | 入口函数 | 被依赖方 | 核心路径 |
|---|---|---|---|---|---|
| analyzer | src/analyzer.py:1746 | 源码 | GeminiAnalyzer.__init__() | pipeline | ✅ 是 |
| pipeline | src/core/pipeline.py:1 | 源码 | StockAnalysisPipeline | main.py, server.py | ✅ 是 |
| notification | src/notification.py:170 | 源码 | NotificationService.__init__() | pipeline | ✅ 是 |
| data_provider | src/data_provider/base.py | 源码 + requirements.txt | DataFetcher | pipeline | ✅ 是 |
| llm | src/llm/litellm_backend.py | 源码 + requirements.txt (litellm>=1.80) | LiteLLMGenerationBackend | analyzer | ✅ 是 |
| webui_frontend | src/webui_frontend.py | 源码 | Gradio UI | main.py --webui | 🟡 支撑 |
| feishu_doc | src/feishu_doc.py | 源码 | 飞书文档导出 | main.py --export | ✂️ 可砍 |
| md2img | src/md2img.py | 源码 | Markdown→图片 | notification (微信) | 🟡 支撑 |
```

---

### Phase 2: 数据层 + 逻辑层分析

数据层产出（写入 `architecture.md`）:

```markdown
## 数据层

### 核心数据模型

#### AnalysisResult — 分析结果（28 字段）
**定义**: `src/analyzer.py:1557`
**生命周期**: LLM 生成 → 完整性校验 → 占位填充 → 决策稳定化 → 格式化输出
**消费者**: pipeline, notification, history_service, decision_signal_extractor

**字段分类**:
| 类别 | 字段 | 来源 |
|---|---|---|
| 基础信息 | code, name, success, error_message | 必填，pipeline 传入 |
| 核心指标 | sentiment_score, operation_advice, trend_prediction | LLM 输出 |
| 决策仪表盘 | dashboard (core_conclusion, battle_plan, intelligence, data_perspective) | LLM 输出 → parsed JSON |
| 详细分析 | technical_analysis, fundamental_analysis, news_summary | LLM 输出 |
| 市场快照 | market_snapshot | 数据源实时数据 |
| 审计 | model_used, llm_usage, provider_trace | LLM 调用元数据 |

#### MarketSnapshot — 实时行情
**定义**: `src/data_provider/realtime_types.py`
**用途**: 在分析时注入 prompt，在报告中展示

### 数据流转

```
数据源 (13 个 adapter)
  ↓ 优先级 fallback: efinance → akshare → tushare → ...
data_provider (统一接口)
  ↓ dict/Dataclass
pipeline (组装 context)
  ↓ context dict
analyzer (构建 prompt)
  ↓ prompt string
LLM (生成分析)
  ↓ JSON response
analyzer._parse_response() (解析 + 校验)
  ↓ AnalysisResult
pipeline (后处理)
  ↓
├─→ notification (格式化 → 推送)
├─→ repositories (持久化到 SQLite)
└─→ decision_signal_extractor (提取交易信号)
```

### 存储策略

| 数据类型 | 存储位置 | ORM 模型 | 索引 | 清理策略 |
|---|---|---|---|---|
| 分析结果 | SQLite → analysis_results | AnalysisRecord | (code, created_at) | 保留 90 天 |
| 决策信号 | SQLite → decision_signals | DecisionSignal | (code, created_at) | 保留 180 天 |
| 告警记录 | SQLite → alerts | AlertRecord | (code, triggered_at) | 保留 30 天 |
| 股票信息 | 内存 + stock_index.json | — | code lookup | 启动时加载 |
| LLM 用量 | SQLite → llm_usage | LLMUsageRecord | (model, date) | 保留 365 天 |
```

---

## 逻辑层

### 主业务流程

```
1. 触发 (CLI / Web / Scheduler)
2. pipeline.run(config)
   2.1 加载配置 + 初始化日志
   2.2 获取股票列表 (从自选股或参数)
   2.3 大盘分析 (market_review — 可选)
   2.4 对每只股票:
       a. 获取技术面数据 (data_provider)
       b. 获取消息面数据 (search_service)
       c. 构建分析上下文 (analysis_context_builder)
       d. 调用 LLM 分析 (analyzer.analyze)
       e. 后处理 (decision_stability, phase_guardrail)
       f. 持久化 (repositories)
       g. 推送 (notification.send)
3. 输出汇总报告
```

### 关键决策点

| 决策点 | 位置 | 条件 | 处理 |
|---|---|---|---|
| 数据源选择 | data_provider/base.py | 按优先级尝试 | 失败 → 下一个 adapter |
| LLM 模型选择 | analyzer.py:_init_litellm | 配置 → 环境变量 | 主模型 → fallback1 → fallback2 |
| 是否推送 | notification.py:send_with_results | 渠道配置 + 推送时间 | 工作时间推送, 非工作时间静默 |
| 告警触发 | services/alert_service.py | 条件表达式求值 | 满足 → 推送到配置渠道 |
| 噪声抑制 | notification_noise.py | 同股票 5 分钟内重复推送 | 冷却期内跳过 |

### 错误处理策略

```
层次化错误处理:

L1 — 数据获取失败:
  efinance 超时 → akshare fallback → tushare fallback → N/A 标记

L2 — LLM 调用失败:
  主模型 429 → 等待 retry → fallback 模型 → 所有模型失败 → 跳过该股 (不阻塞整批)

L3 — 解析失败:
  JSON 不合法 → json_repair 修复 → 仍失败 → 文本正则提取 → 仍失败 → 兜底填充

L4 — 推送失败:
  单通道失败 → 记录日志 → 不影响其他通道 → 不影响分析结果持久化

所有异常在 pipeline 层有统一 catch——单只股票失败不影响批处理继续。
```

## 文件索引

`docs/loop-docs/file-index.md` — 按目录组织的完整文件索引:

```markdown
# 文件索引

## src/analyzer.py (2598 行)
**职责**: LLM 分析主模块
**入口类**: GeminiAnalyzer (2280 行)
**关键方法**:
- `analyze()` (L2866-3138): 主分析流程 — 获取数据→构建 prompt→调 LLM→解析→完整性检查
- `_format_prompt()` (L3140-3590): 450行 prompt 模板——为什么长: 技术面+消息面+市场阶段+决策指令 需覆盖全部场景
- `_parse_response()` (L3778-3891): 三层解析防御——JSON 解析→修复→文本正则提取
- `_call_litellm_impl()` (L2603-2828): 多模型 fallback 封装
**依赖**: src/llm/, src/config/, src/report_language/, src/schemas/
**被依赖**: src/core/pipeline.py, src/services/analysis_service.py
**修改注意事项**: analyze() 签名变更影响 pipeline; _format_prompt() 变更影响所有股票分析质量
**历史**: 辅助函数已拆分到 analyzer_helpers.py (1507 行)，核心类待拆分

## src/core/pipeline.py (450 行)
[同样的格式...]

... (所有源文件)
```
```

---

## 文档规模约束

**下限（低于此值 = 敷衍，不可接受）:**

| 文档 | 下限 | 检查方式 |
|---|---|---|
| `architecture.md` | 架构图 + 证据矩阵 + 数据流 + 决策点 + 错误处理 | 5 个必须章节全部非空 |
| 架构图 | ASCII 图覆盖全部顶级模块 | 模块数 = 图中节点数 |
| 证据矩阵 | 每个模块一行（证据文件/入口/被依赖方/核心路径） | 矩阵行数 = 模块数 |
| 数据流图 | 从数据源到最终输出的完整路径 | ≥ 3 层转换 |
| 关键决策点 | ≥ 3 个运行时决策（if/switch 分支） | 条目数 ≥ 3 |
| `file-index.md` | 每个源文件 ≥ 5 行（职责/关键方法/依赖/被依赖/修改注意事项） | 行数 / 文件数 ≥ 5 |

**上限（超过此值 = 膨胀，需拆分）:**

| 文档 | 上限 | 超过时操作 |
|---|---|---|
| `architecture.md` 整体 | 600 行 | 拆分到 `architecture-layer-{n}.md`，主文档只保留架构图 + 模块总表 + 引用 |
| `file-index.md` 整体 | 1000 行 | 按目录拆分 `file-index-{dir}.md`，主文档保留目录级索引 |
| 单个文件分析 | 15 行 | 超过说明在写论文而非分析——压缩到 15 行以内 |

**规则：** 文件分析控制在 5-15 行。5 行是下限（必须覆盖 5 个字段），15 行是上限（不要在 50 行的文件上写 30 行分析）。

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "架构图用文字描述一下就行" | ASCII 架构图是给 Agent 和人都能直接读的——比图片更 grep 友好。文字描述替代不了可视化的模块关系。 |
| 2 | "证据矩阵写太详细了，列出模块名就够了" | 模块名不证明它真的存在。构建文件+源码入口+被依赖方三重验证——否则 README 愿望清单混入事实。 |
| 3 | "文件太多了，只分析关键文件" | "关键文件"的判断依赖入口点依赖链——不在链上的文件可能是遗漏的核心，也可能是死代码。全量覆盖才能区分。 |
| 4 | "代码决策解释是可选的分析" | 代码决策解释是 Fix 阶段最重要的输入——知道"为什么这样写"才能判断"能不能改"。 |
| 5 | "数据流图用列表就行" | ASCII 流程图比列表更能展示数据在模块间的流转方向和转换节点。 |

## 验证清单

- [ ] `docs/loop-docs/architecture.md` 已生成
- [ ] 架构图使用 ASCII 树状图，模块边界清晰
- [ ] 证据矩阵覆盖每个模块（证据文件 + 入口函数 + 被依赖方）
- [ ] README 声称的能力全部通过构建文件交叉验证
- [ ] 数据流图包含从数据源到最终输出的完整路径
- [ ] 关键决策点表格覆盖所有运行时分支
- [ ] 错误处理策略分 L1-L4 层次
- [ ] `docs/loop-docs/file-index.md` 覆盖全部源文件
- [ ] 每个文件分析包含: 职责/关键方法/依赖/被依赖/修改注意事项
- [ ] 交叉引用 knowledge-graph 和 semantic-rag 的结论
