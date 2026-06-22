---
name: knowledge-graph
description: "代码知识图谱 — 四层递进分析（符号表→调用链→数据流→模块依赖），产出结构化 JSON 供 repo-decompose 交叉验证和 mvp-approach 边界推导。可独立使用，也可被 repo-decompose 主 agent 在 Phase 2 空闲期调用。"
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

**不是读代码，是建一张可查询的关系网。** 四层递进：

```
符号表 (有什么) → 调用链 (谁调谁) → 数据流 (数据去哪) → 模块依赖 (模块怎么连)
```

每一层是下一层的基础。上一层没跑完，不进下一层。

**集成方式：**
- `repo-decompose` 主 agent 在 Phase 2 空闲期调用 → 产物写入共享上下文 `supplements.knowledgeGraph`
- 独立使用 → 产物写入 `.knowledge-graph.json`
- `mvp-approach` 用它验证核心路径的调用链是否存在

---

## PRECONDITIONS — 执行前必须检查

**本 skill 有两种运行模式，根据上下文自动选择：**

```
检查: .repo-decompose-context.json 是否存在？

  YES → PIPELINE 模式:
    - 读取 meta 中的 repo 路径和文件数
    - 输出写入 supplements.knowledgeGraph 字段
    - 深度按文件数自动选 (quick/standard/deep)
    - 不需要询问用户任何问题
    
  NO → STANDALONE 模式:
    - 需要用户提供代码路径或 GitHub URL
    - 输出写入 .knowledge-graph.json
    - 文件数由用户确认或自动检测
```

**决不允许的行为：**
- ❌ 在 PIPELINE 模式下要求用户重新提供路径
- ❌ 在 PIPELINE 模式下输出到独立文件（必须写入共享上下文）
- ❌ 跳过文件数检测直接选深度

## 深度分级（按仓库规模自适应）

不是所有仓库都需要四层全跑。按 `repo-decompose` Phase 0 的文件统计，自动选择深度：

| 深度 | 文件数 | 跑哪些层 | 产物 |
|---|---|---|---|
| `quick` | < 100 | L1 符号表 + L4 模块依赖 | 模块依赖图 + 导出符号清单 |
| `standard` | 100 - 500 | L1 + L2 + L4 | + 完整调用链 |
| `deep` | > 500 | L1 + L2 + L3 + L4 | + 核心数据流追踪 |

**规则：** 不要问用户选哪个深度——根据文件数自动决定。`deep` 模式下每超 500 文件追加 60s 超时预算。

---

## 四层工作流

### L1: 符号表 — 项目里有什么

**目标：** 建立所有可引用符号的完整清单。

**工具策略（按语言）：**

| 语言 | 首选工具 | 后备 |
|---|---|---|
| TypeScript / JavaScript | `get_symbols` (tree-sitter AST) | `search_content "export (function\|class\|const\|type\|interface)"` |
| Python | `get_symbols` (tree-sitter AST) | `search_content "^def \|^class "` |
| Go | `get_symbols` (tree-sitter AST) | `search_content "^func \|^type "` |
| Rust | `get_symbols` (tree-sitter AST) | `search_content "^pub (fn\|struct\|enum\|trait)"` |
| Java | `get_symbols` (tree-sitter AST) | `search_content "public (class\|interface\|enum)"` |
| 其他 | `search_content` 按语言约定匹配 | — |

**提取流程：**
1. 用 `glob` 列出所有源文件（按语言扩展名过滤）
2. 对每个文件调用 `get_symbols`，收集所有 `definition` 类符号
3. 过滤：保留 `exported` 的符号 + 非导出但被同文件外引用的符号
4. 去重：同一符号名在不同文件 → 按文件路径区分

**L1 产物结构：**
```json
{
  "symbols": [
    {
      "name": "App",
      "kind": "class",
      "file": "src/app.ts",
      "line": 12,
      "exported": true,
      "parent": null
    },
    {
      "name": "start",
      "kind": "method",
      "file": "src/app.ts",
      "line": 24,
      "exported": false,
      "parent": "App"
    }
  ]
}
```

**自检：** 源文件数 × 1.5 ≤ 符号总数 ≤ 源文件数 × 10。低于 1.5 → 大量文件未被解析，检查 `glob` 过滤是否过窄。高于 10 → 可能未过滤局部变量。

---

### L2: 调用链 — 谁调了谁

**前提：** L1 符号表已完成。

**目标：** 对 L1 中每个函数/方法，找到它调用了谁 + 被谁调用。

**工具策略：**
1. 对每个函数，用 `find_in_code` 在该文件内找它调用（`kind: call`）了什么
2. 对每个被调用的符号，用 `search_content` 跨文件搜它的定义位置
3. 只记录同项目内的调用——第三方库标记 `external` 但不继续追踪

**调用链产物结构：**
```json
{
  "callGraph": [
    {
      "caller": { "name": "App.start", "file": "src/app.ts", "line": 24 },
      "callee": { "name": "Config.load", "file": "src/config.ts", "line": 18 },
      "site": "src/app.ts:42"
    },
    {
      "caller": { "name": "App.start", "file": "src/app.ts", "line": 24 },
      "callee": { "name": "Router.register", "file": "src/router.ts", "line": 55 },
      "site": "src/app.ts:45"
    }
  ],
  "entryPoints": ["App.start", "main", "handleRequest"],
  "deadCode": ["unusedHelper", "oldParser"]
}
```

**入口点识别：** 被调用次数 = 0 且 exported = true → 候选入口点。
**死代码识别：** 被调用次数 = 0 且 exported = false → 候选死代码。

**自检：**
- `entryPoints` 至少有一个（否则项目没有入口）
- `callGraph` 中的 caller 全部在 L1 符号表中

---

### L3: 数据流 — 数据从哪来、到哪去

**前提：** L1 符号表 + L2 调用链已完成。仅 `deep` 模式运行。

**目标：** 追踪核心数据结构的完整生命周期。

**什么叫"核心数据结构"：**
- ≥ 3 个字段的 struct/class/type
- 被 ≥ 3 个函数引用
- 或者在入口点的参数/返回值中出现

**追踪方法：**
1. 从 L1 中筛出符合条件的类型
2. 对每个类型，`search_content` 搜它的引用位置
3. 对引用位置按调用链排序 → 还原创建→校验→存储→读取→销毁的顺序

**数据流产物结构：**
```json
{
  "dataFlows": [
    {
      "type": "User",
      "definition": "src/models.ts:5",
      "lifecycle": [
        { "stage": "create", "location": "handler.parseUser()", "site": "src/handler.ts:30" },
        { "stage": "validate", "location": "validator.check()", "site": "src/validator.ts:12" },
        { "stage": "store", "location": "db.insertUser()", "site": "src/db.ts:55" },
        { "stage": "read", "location": "api.getUser()", "site": "src/api.ts:22" },
        { "stage": "serialize", "location": "json.Marshal()", "site": "src/api.ts:25" }
      ]
    }
  ]
}
```

**自检：** 至少追踪到核心数据结构的 60%（≥3 字段的 struct/class 至少 60% 有 `lifecycle` 记录）。

---

### L4: 模块依赖 — 模块怎么连

**前提：** L1 符号表已完成。所有深度都运行。

**目标：** 汇总跨文件/跨目录的依赖关系，标记高风险结构。

**方法：**
1. 从 L1 的 `import`/`require`/`use` 语句提取文件级依赖
2. 聚合到目录级（顶级目录 = 一个模块）
3. 计算每个模块的扇入/扇出

**模块依赖产物结构：**
```json
{
  "modules": {
    "src/core": {
      "responsibility": "核心引擎，任务调度和生命周期管理",
      "imports": ["src/utils", "src/types"],
      "importedBy": ["src/api", "src/cli", "src/ui", "src/plugins"],
      "fanIn": 4,
      "fanOut": 2
    }
  },
  "warnings": {
    "circular": [
      { "cycle": "src/a → src/b → src/a", "sharedVia": "src/shared/types" }
    ],
    "highFanIn": [
      { "module": "src/types", "fanIn": 8, "risk": "修改影响面大" }
    ],
    "highFanOut": [
      { "module": "src/app", "fanOut": 10, "risk": "职责过重" }
    ]
  }
}
```

**警告阈值：**
- 🔴 循环依赖：任何长度的环
- 🟡 高扇入：≥ 5 个模块依赖它 → 改动影响面大
- 🟡 高扇出：≥ 7 个模块被它依赖 → 模块可能职责过重
- ⚪ 孤岛：扇入=0 且扇出=0 → 可能是死模块

---

## 最终产物：四层合并输出

```json
{
  "meta": {
    "depth": "standard",
    "sourceFiles": 87,
    "language": "TypeScript",
    "runAt": "ISO timestamp"
  },
  "layer1_symbols": { "total": 142, "items": [...] },
  "layer2_callGraph": { "totalEdges": 389, "entryPoints": [...], "deadCode": [...], "edges": [...] },
  "layer3_dataFlows": { "totalFlows": 12, "flows": [...] },
  "layer4_modules": { "modules": {...}, "warnings": {...} }
}
```

**当被 `repo-decompose` 调用时：** 输出写入共享上下文的 `supplements.knowledgeGraph` 字段，格式同上。

**当独立运行时：** 写入 `.knowledge-graph.json`。

---

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这个文件没有 export，跳过符号提取" | 没有 export 的文件可能是 CLI 入口或测试辅助，跳过导致调用链断裂 |
| 2 | "调用链只看前 3 层就够了" | 第 4-5 层的 bug 是最难排查的。不追踪到叶子节点 = 没做 |
| 3 | "数据流可以等需要时再追踪" | 数据流追踪耗时最长（要搜每个类型的引用），等需要时再来追 → 整个流程被阻塞 |
| 4 | "模块依赖用肉眼看一下就行" | 肉眼看不出循环依赖的完整链路，也数不清扇入扇出 |
| 5 | "小仓库直接用 quick 模式, deep 太慢" | quick 已经是最小模式——小仓库 quick = 2 分钟。2 分钟都省就别建图谱了 |
| 6 | "get_symbols 对某些文件报错，跳过它们" | 报错的文件往往是宏/装饰器/动态代码重灾区——正是需要深入分析的地方。用 search_content 回退，不跳过 |

## 验证清单

- [ ] L1 符号总数在 [源文件数×1.5, 源文件数×10] 区间
- [ ] L2 至少识别出 1 个入口点
- [ ] L2 调用边数 ≥ 符号数 × 0.5（大致：一半符号至少参与一次调用）
- [ ] L3 (deep) 覆盖 ≥ 60% 的核心数据结构
- [ ] L4 模块依赖图没有孤立的模块（除非确认为废弃代码）
- [ ] 输出可直接合并到 `repo-decompose` 共享上下文的 `supplements.knowledgeGraph`
