# Loop State Schema — `.repo-loop-state.json`

**这是 Engineering Loop 的唯一真相源。** 每个子 skill 的输入/输出都通过此文件交换，engineering-loop 总控通过它决定下一阶段。

## Schema

```json
{
  "$schema": "https://github.com/dotVSdoll/MakeSkillsBest/loop-state-schema.json",

  "meta": {
    "repo": "owner/repo",
    "language": "TypeScript",
    "framework": "Next.js 14",
    "scale": "M",
    "loopVersion": "2.0",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "currentPhase": "detect",
    "loopCount": 0,

    "adapterConfig": {
      "agent": "claude-code | codex | cursor | unknown",
      "skillDir": "~/.claude/skills/",
      "subtaskModel": "run_skill+explore | Task tool | subagent | inline-only",
      "hasTimeout": false,
      "cliAllowed": true,
      "networkAllowed": "allowlist | ask | blocked"
    },

    "environmentTier": "🟢 full | 🟡 partial | 🟠 minimal | 🔴 sandbox-only",

    "deliveryMode": "DEPRECATED — v2.0 统一为任务驱动流程，此字段仅在 v1.x 状态文件中存在。v2.0 不再写入。"
  },

  "detect": {
    "status": "pending | running | done | failed",
    "agent": "claude-code",
    "configRead": true,
    "capabilities": {
      "subagent": true,
      "cliAllowed": true,
      "networkAllowed": "ask",
      "hasTimeout": false
    }
  },

  "envReady": {
    "status": "pending | running | done | failed",
    "tier": "🟢 full",
    "checks": {
      "venv": true,
      "deps": true,
      "env": false,
      "test": true
    },
    "autoPrepared": ["venv", "deps"],
    "manualNeeded": [".env 需要填入 API key"]
  },

  "goal": {
    "statement": "一句话目标，如：为项目添加基于 JWT 的用户登录功能",
    "type": "feature | fix | refactor | understand",
    "scope": "全项目 | 指定模块 | 单文件",
    "stopCondition": "核心测试全部通过 AND 用户可登录获取 token",
    "constraints": ["不修改现有数据库 schema", "兼容现有认证中间件"]
  },

  "observe": {
    "status": "pending | running | done | failed",
    "outputs": {
      "semanticRAG": { "status": "done", "summary": "..." },
      "knowledgeGraph": { "status": "done", "symbols": 142, "calls": 389 },
      "repoDecompose": { "status": "done", "reqCount": 6, "evidenceMatrix": true },
      "mvpApproach": { "status": "done", "coreREQs": 2, "boundary": "CLI/MCP ≤800行" }
    }
  },

  "plan": {
    "status": "pending | running | done | failed",
    "deliveryPlan": {
      "phases": [
        {
          "id": "phase-1",
          "goal": "搭建认证基础设施",
          "tasks": ["task-1", "task-2"],
          "acceptance": "POST /auth/login 返回 JWT token"
        }
      ]
    },
    "taskGraph": {
      "nodes": [
        { "id": "task-1", "title": "定义 User 模型和 JWT 工具函数", "deps": [], "parallelGroup": "auth-infra" },
        { "id": "task-2", "title": "实现 POST /auth/login 端点", "deps": ["task-1"], "parallelGroup": "auth-infra" },
        { "id": "task-3", "title": "实现 authMiddleware", "deps": ["task-1"], "parallelGroup": null }
      ],
      "criticalPath": ["task-1", "task-3"],
      "parallelBatches": [["task-2", "task-3"]]
    }
  },

  "bound": {
    "status": "pending | running | done | failed",
    "implementationMap": {
      "allowedFiles": [
        { "path": "src/auth/login.ts", "reason": "新增登录端点", "maxLines": 80 },
        { "path": "src/auth/jwt.ts", "reason": "JWT 签发和验证", "maxLines": 60 },
        { "path": "src/middleware/auth.ts", "reason": "authMiddleware 实现", "maxLines": 50 }
      ],
      "forbiddenZones": [
        { "path": "src/db/", "reason": "约束：不修改现有数据库 schema" },
        { "path": "src/core/engine.ts", "reason": "核心引擎 — 修改影响面大" },
        { "path": "src/types/types-external.ts", "reason": "公共 API 类型 — 不可破坏" }
      ],
      "blastRadiusWarnings": [
        { "change": "修改 src/middleware/index.ts", "affectedModules": ["src/api", "src/ui"], "risk": "中" }
      ]
    }
  },

  "act": {
    "status": "pending | running | done | partial",
    "currentTask": "task-2",
    "completedTasks": ["task-1"],
    "modifiedFiles": [
      { "path": "src/auth/jwt.ts", "linesAdded": 55, "linesRemoved": 0, "task": "task-1" }
    ],
    "activeBranch": "feature/jwt-login"
  },

  "verify": {
    "status": "pending | running | done | failed",
    "results": [
      { "level": "L1-build", "command": "npm run build", "exitCode": 0, "output": "compiled successfully", "passed": true },
      { "level": "L2-help", "command": "node dist/auth/jwt.js --help", "exitCode": 0, "output": "Usage: jwt <sign|verify>", "passed": true },
      { "level": "L3-command", "command": "curl -X POST localhost:3000/auth/login -d '{\"user\":\"test\"}'", "exitCode": 0, "output": "{\"token\":\"eyJ...\"}", "passed": true },
      { "level": "L4-artifact", "command": "npm test -- --testPathPattern=auth", "exitCode": 0, "passed": true },
      { "level": "L5-content", "command": "node -e \"require('./dist/auth/jwt').verify(token)\"", "exitCode": 0, "output": "{\"user\":\"test\"}", "passed": true }
    ],
    "failedCount": 0,
    "consecutiveFailures": 0
  },

  "learn": {
    "status": "pending | running | done",
    "roundSummary": "成功实现 JWT 登录核心路径。authMiddleware 因循环依赖需下轮重构。",
    "roundMaxSeverity": "HIGH",
    "lessons": [
      { "type": "success", "detail": "JWT 签发/验证用 HS256 即可满足 MVP" },
      { "type": "blocker", "detail": "authMiddleware 导入 core/engine 导致循环依赖，下轮需解耦" }
    ],
    "nextRecommendations": [
      { "action": "解耦 authMiddleware 和 core/engine", "priority": "P0" },
      { "action": "实现 refresh token 端点", "priority": "P1" },
      { "action": "添加登录限流", "priority": "P2" }
    ]
  },

  "decide": {
    "decision": "continue | stop | rollback | replan",
    "reason": "核心登录路径已跑通。存在一个循环依赖问题，但已标记为下轮修复。继续下一轮。",
    "matchedCondition": "[1]",
    "nextPhase": "observe",
    "nextGoal": "解耦 authMiddleware → 实现 refresh token"
  }
}
```

## 字段生存周期

```
detect    → Detect    → 写入 (adapterConfig, capabilities)
envReady  → EnvReady  → 写入 (environmentTier, checks, autoPrepared)
observe   → Observe   → 写入 (semantic-rag, knowledge-graph, repo-decompose, mvp-approach)
plan      → Plan      → 写入 (delivery-plan, task-graph)
bound     → Bound     → 写入 (implementation-map)
fix       → Fix       → 增量更新 (每完成一个 task 追加)
verify    → Verify    → 写入 (verification-loop 结果)
selfReview→ SelfReview→ 写入 (审查结果)
learn     → Learn     → 写入 (engineering-loop 总结 + roundMaxSeverity)
decide    → Decide    → 写入 (engineering-loop 判定)
meta      → 常驻     → 每阶段更新 currentPhase / loopCount / updatedAt
```

## 状态文件位置

默认写入项目根目录 `.repo-loop-state.json`。可通过 `LOOP_STATE_PATH` 环境变量覆盖。

## 状态持久化规则

- 每个阶段完成后 **立即写入**（不等到全 loop 结束）
- `meta.updatedAt` 每次写入时刷新
- `verify.consecutiveFailures` 跨轮累积，reset 仅在 `decide = replan` 时
- 旧轮状态：`decide` 写入后，上一轮数据保留在 `learn.roundSummary` 中，不归档到独立文件
