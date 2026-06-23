---
name: security-audit
description: "安全审计 — Diagnose 阶段运行，扫描依赖漏洞、认证缺陷、注入风险、敏感信息泄露、不安全的反序列化。产出分级安全报告，P0 项阻塞 Fix 阶段。"
argument-hint: "audit security | scan for vulnerabilities | check dependencies"
dependencies:
  upstream:
    - knowledge-graph   # 调用链 + 入口点
    - repo-decompose    # 架构 + 数据层
  downstream:
    - engineering-loop  # Diagnose 阶段消费安全报告
---

# Security Audit — 安全审计

## 概述

**在代码被修改之前，先找到已经存在的安全问题。** 本 skill 在 Diagnose 阶段运行，扫描四个维度：

```
D1: 依赖漏洞    → 已知 CVE / 过期版本 / 未维护的依赖
D2: 认证缺陷    → 弱密码 / 缺失中间件 / token 泄露
D3: 注入风险    → SQL/XSS/命令注入 / 未转义输入
D4: 敏感信息    → API key 硬编码 / .env 泄露 / 日志中的敏感数据
```

**P0 发现 → Diagnose 阶段阻塞，Fix 阶段必须优先处理。**

## PRECONDITIONS

```
[1] knowledge-graph 调用链可用？
    NO → STOP. "❌ 需要先运行 knowledge-graph"

[2] repo-decompose 架构+数据层可用？
    NO → STOP. "❌ 需要先运行 repo-decompose"
```

## 四维扫描

### D1: 依赖漏洞

```
检测方法:
  1. 读取依赖清单 (package.json / go.mod / Cargo.toml / pyproject.toml)
  2. 对每个直接依赖 → 检查版本号是否包含已知 CVE
     (使用 npm audit / pip audit / cargo audit / govulncheck 的输出)
  3. 检查是否有 git 依赖 (不稳定)
  4. 检查最后发布时间 > 2 年的依赖 (可能未维护)

严重度:
  CRITICAL: 已知 CVE，CVSS ≥ 7.0
  HIGH: 已知 CVE，CVSS 4.0-6.9
  MEDIUM: 过期版本但无公开 CVE
  LOW: git 依赖 / 超过 2 年未更新

输出:
  { "package": "lodash", "version": "4.17.15", "cve": "CVE-2021-23337", "severity": "CRITICAL" }
```

### D2: 认证缺陷

```
检测方法:
  1. 从 knowledge-graph 入口点反向追踪 → 哪些端点需要认证
  2. 检查 auth 中间件是否覆盖所有需要保护的端点
  3. 搜索硬编码密码 (password / secret / token = "xxx")
  4. 搜索 JWT 无过期时间 / 弱签名算法 (none / HS256 without secret)
  5. 检查是否有 rate limiting

严重度:
  CRITICAL: 无认证保护 + 修改数据的端点
  HIGH: 硬编码密码 / JWT 无过期
  MEDIUM: 缺少 rate limiting / 弱签名算法
  LOW: 认证日志不完整

输出:
  {
    "endpoint": "POST /api/users/delete",
    "issue": "无认证保护",
    "severity": "CRITICAL",
    "evidence": "src/routes/users.ts:42 — 无 auth 中间件"
  }
```

### D3: 注入风险

```
检测方法:
  1. 搜索 SQL 拼接 (字符串拼接 + sql/query/execute)
  2. 搜索命令执行 (child_process / exec / os.system / subprocess)
  3. 搜索未转义的用户输入插入 HTML (innerHTML / dangerouslySetInnerHTML)
  4. 搜索 eval / new Function / 动态 import
  5. 搜索反序列化 (json.loads with custom decoder / pickle)

严重度:
  CRITICAL: 用户输入直接拼接 SQL / 命令
  HIGH: eval 用户输入 / 未转义 HTML
  MEDIUM: 动态 import 用户路径
  LOW: 有参数化但未验证输入类型

输出:
  {
    "location": "src/db/queries.ts:55",
    "issue": "SQL 拼接 — query('SELECT * FROM users WHERE id = ' + userId)",
    "severity": "CRITICAL",
    "fix": "使用参数化查询: query('SELECT * FROM users WHERE id = ?', [userId])"
  }
```

### D4: 敏感信息泄露

```
检测方法:
  1. 搜索 API key / token / password = "xxx" (硬编码)
  2. 搜索 .env 文件是否在 .gitignore 中
  3. 搜索 console.log / print 中包含 password/token/secret
  4. 搜索 error message 是否暴露内部路径 / stack trace
  5. 搜索 .git/config / .npmrc 中的凭证

严重度:
  CRITICAL: 硬编码生产密钥
  HIGH: .env 未 gitignore / 日志输出密码
  MEDIUM: 生产环境 stack trace 暴露
  LOW: 注释中的测试密码
```

## 最终产物

写入 `.repo-loop-state.json` → `diagnose.securityAudit`：

```json
{
  "securityAudit": {
    "scannedAt": "ISO8601",
    "totalFindings": 8,
    "bySeverity": { "CRITICAL": 2, "HIGH": 3, "MEDIUM": 2, "LOW": 1 },
    "findings": [
      {
        "id": "SEC-001",
        "dimension": "D3-injection",
        "severity": "CRITICAL",
        "location": "src/db/queries.ts:55",
        "issue": "SQL 拼接",
        "evidence": "query('SELECT * FROM users WHERE id = ' + userId)",
        "fix": "使用参数化查询",
        "blocksDiagnose": true
      }
    ],
    "blocksDiagnose": true
  }
}
```

**`blocksDiagnose: true` → Diagnose 阶段阻塞。** engineering-loop 在进入 Fix 前必须确保所有 CRITICAL 项已纳入交付计划。

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这个依赖的 CVE 只在特定条件下触发，先跳过" | CVE 不挑条件。依赖漏洞优先修复 |
| 2 | "SQL 拼接这里只是内部工具，没有外部输入" | 内部工具今天没输入，明天可能有。按安全规范修复 |
| 3 | "这个 API key 是测试用的" | 测试用的 key 放在 .env.test。不在代码中硬编码 |
| 4 | "安全问题修复太大，这轮不做" | CRITICAL 阻塞 Diagnose。不能跳过 |

## 验证清单

- [ ] 依赖清单已扫描（npm audit / pip audit / cargo audit 至少一条可用）
- [ ] 所有入口点已检查认证覆盖
- [ ] SQL/命令/HTML 注入模式已搜索
- [ ] 敏感信息关键词已搜索
- [ ] CRITICAL 项全部标记 `blocksDiagnose: true`
- [ ] 写入 `.repo-loop-state.json` → `diagnose.securityAudit`
