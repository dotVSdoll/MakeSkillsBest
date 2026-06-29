---
name: quality-audit
description: "代码质量诊断 — 六维扫描（重复代码/高复杂度/死代码/测试薄弱区/过大模块/架构退化）。产出分级质量报告，与 security-audit 并列运行于 Diagnose 阶段。"
argument-hint: "audit code quality | find tech debt | scan for dead code"
dependencies:
  upstream:
    - knowledge-graph   # 调用链 + 扇入扇出
    - repo-decompose    # 架构层 + 证据矩阵
  downstream:
    - engineering-loop  # Diagnose 阶段消费质量报告
---

# Quality Audit — 代码质量诊断

## 概述

**安全审计告诉你"会不会出事"，质量审计告诉你"好不好维护"。** 本 skill 在 Diagnose 阶段与 `security-audit` 并行运行，扫描六维技术债。

## PRECONDITIONS

```
[1] knowledge-graph 可用？
    NO → STOP. "❌ 需要先运行 knowledge-graph"

[2] repo-decompose 可用？
    NO → STOP. "❌ 需要先运行 repo-decompose"
```

## 六维扫描

### D1: 重复代码

```
检测方法:
  1. 搜索同名函数但不同文件 → 候选重复
  2. 搜索结构相似的代码块 (> 10 行, 相似度 > 80%)
  3. 搜索复制粘贴的注释

严重度:
  HIGH: 3+ 处重复 + 每处 > 20 行
  MEDIUM: 2 处重复 + 每处 > 10 行
  LOW: 函数签名重复但实现不同 → 可能是 overload

输出:
  { "pattern": "validateEmail", "locations": ["src/auth.ts:45", "src/api/users.ts:120", "src/utils/form.ts:88"], "similarity": 0.92 }
```

### D2: 高复杂度函数

```
检测方法:
  1. 从 knowledge-graph L1 符号表取所有函数
  2. 计算复杂度指标:
     - 行数 > 50 → 候选
     - 嵌套深度 > 4 → 候选
     - 分支数 (if/switch/case) > 8 → 候选
     - 参数数量 > 5 → 候选

严重度:
  CRITICAL: 行数 > 200 OR 分支数 > 20
  HIGH: 行数 100-200 OR 分支数 12-20
  MEDIUM: 行数 50-100 OR 分支数 8-12
  LOW: 参数 > 5 但行数不大

输出:
  { "function": "processRequest", "file": "src/handler.ts:30-280", "lines": 251, "branches": 24, "nestedDepth": 6 }
```

### D3: 死代码

```
检测方法:
  1. knowledge-graph 中 扇入=0 且 exported=false → 死代码候选
  2. 搜索注释中的 "TODO" / "FIXME" / "DEPRECATED" / "HACK"
  3. 搜索被注释掉的代码块 (> 5 行)
  4. 搜索 package.json 中未使用的依赖

严重度:
  HIGH: 未使用导出 (exported=true, 扇入=0) → 但必须先排除 public API
  MEDIUM: 未使用内部函数 (exported=false, 扇入=0)
  LOW: TODO > 6 个月未处理 / 未使用依赖

删除保护（删除前必须逐条确认）:
  [1] 是否被动态 import / require() / 反射调用？
  [2] 是否是 public API（即使当前仓库内无调用，外部用户可能依赖）？
  [3] 是否被配置文件（JSON/YAML/TOML）引用？
  [4] 是否是 plugin / hook / export convention 约定导出？
  [5] 是否在测试中被引用（测试文件可能在别的目录）？
  → 5 条全部 NO → 可安全删除。任一条 YES → 标记为 "protected" 不删除。

输出:
  { "symbol": "oldParser", "file": "src/parser.ts:200-250", "type": "dead-code", "lastModified": "2024-01", "protected": false }
```

### D4: 测试薄弱区

```
检测方法:
  1. 从 repo-decompose 逻辑层取核心函数列表
  2. 对每个核心函数 → 检查是否有对应测试文件
  3. 检查测试覆盖率最低的文件 Top 10
  4. 检查是否有纯 mock 测试（只测 mock 不测真实逻辑）

严重度:
  CRITICAL: 核心入口函数无测试
  HIGH: 核心业务函数无测试
  MEDIUM: 有测试但无边界/异常用例
  LOW: 测试文件存在但全部 skip/标记 TODO

输出:
  { "function": "handlePayment", "file": "src/payment.ts:45", "testCoverage": "none", "risk": "核心支付逻辑无测试" }
```

### D5: 过大模块

```
检测方法:
  1. 文件行数 > 500 → 候选
  2. 目录文件数 > 20 → 候选
  3. 一个文件导出 > 15 个符号 → 候选
  4. 一个目录下所有文件缺乏明显边界 → 候选

严重度:
  CRITICAL: 单文件 > 1000 行
  HIGH: 单文件 500-1000 行 OR 目录 > 30 文件
  MEDIUM: 单文件 300-500 行 OR 导出 > 15 个符号
  LOW: 目录 > 20 文件但有清晰子目录

输出:
  { "file": "src/utils.ts", "lines": 847, "exports": 23, "risk": "工具函数黑洞——职责不清" }
```

### D6: 架构退化

```
检测方法:
  1. 循环依赖（从 knowledge-graph L4）
  2. 高扇出模块（依赖 > 7 个其他模块）
  3. 违反 README/设计文档中声明的架构模式
  4. 测试文件依赖生产代码的细节实现
  5. 存在明显不属于当前模块的代码（如 db 代码出现在 ui 目录）

严重度:
  CRITICAL: 循环依赖 + 生产路径
  HIGH: 高扇出 (> 10) + 核心模块
  MEDIUM: 架构模式偏离（如 MVC 项目的 controller 中有 SQL）
  LOW: 测试依赖实现细节（非公共 API）

输出:
  { "issue": "circular-dependency", "cycle": "src/auth → src/db → src/auth", "risk": "循环依赖导致无法独立测试" }
```

## 最终产物

写入 `.repo-loop-state.json` → `diagnose.qualityAudit`：

```json
{
  "qualityAudit": {
    "scannedAt": "ISO8601",
    "totalFindings": 12,
    "byDimension": { "D1-duplication": 2, "D2-complexity": 3, "D3-deadCode": 4, "D4-testGaps": 2, "D5-largeModules": 1, "D6-archDrift": 0 },
    "bySeverity": { "CRITICAL": 1, "HIGH": 4, "MEDIUM": 5, "LOW": 2 },
    "findings": [
      {
        "id": "QUAL-001",
        "dimension": "D2-complexity",
        "severity": "CRITICAL",
        "location": "src/handler.ts:30-280",
        "issue": "processRequest 函数 251 行, 24 个分支",
        "suggestion": "按请求类型拆分为 processGetRequest / processPostRequest / processDeleteRequest",
        "blocksDiagnose": true
      }
    ],
    "blocksDiagnose": false
  }
}
```

**`blocksDiagnose: true` → CRITICAL 项（如核心入口无测试、循环依赖在生产路径）阻塞 Diagnose。其余不阻塞但进入 Plan。**

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "死代码不影响运行，不急着删" | 死代码增加阅读成本。每个读这段代码的人都在浪费时间 |
| 2 | "这个函数虽然长但逻辑清晰" | >200 行函数默认进入拆分候选。但 Fix 前必须先写 characterization test，确认拆分后行为不变 |
| 3 | "测试薄弱区以后补" | 核心入口无测试 = 改动即风险。先补测试再优化 |
| 4 | "架构退化是历史遗留，这轮不动" | 至少标注为技术债并写入 learn。不标注 = 永远不修 |

## 验证清单

- [ ] 六维全部扫描（每维至少 1 个发现或确认"无问题"）
- [ ] 每个发现绑定 file:line
- [ ] CRITICAL 项标注 blocksDiagnose
- [ ] 写入 `.repo-loop-state.json` → `diagnose.qualityAudit`
