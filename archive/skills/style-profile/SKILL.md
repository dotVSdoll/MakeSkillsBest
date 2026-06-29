---
name: style-profile
description: "代码风格画像 — 检测仓库的命名约定、错误处理模式、代码组织风格、测试习惯。Observe 阶段运行，Fix 阶段消费——确保修改不破坏现有风格。"
argument-hint: "detect code style | analyze coding conventions | what style does this repo use"
dependencies:
  upstream: []
  downstream:
    - engineering-loop  # Act/Fix 阶段引用 styleProfile
---

# Style Profile — 代码风格画像

## 概述

**不评判风格好坏——只记录现有风格。** 在 Observe 阶段扫描仓库，提取开发者已经形成的编码习惯。后续 Fix 阶段使用此画像确保所有修改与现有代码风格一致。

**核心原则：修改的代码应该看不出是 AI 写的。**

## PRECONDITIONS

```
[1] 仓库路径可访问？
    NO → STOP. "❌ 找不到仓库"
```

## 检测维度

### D1: 命名约定

```
检测项:
  - 变量命名: camelCase / snake_case / PascalCase
  - 文件命名: kebab-case / snake_case / PascalCase
  - 常量命名: UPPER_SNAKE / camelCase
  - 私有成员: _prefix / #prefix / 无标记

采样方法:
  随机抽取 10 个导出符号 + 10 个内部符号 → 统计命名模式占比

输出:
  { "variables": "camelCase (87%)", "files": "kebab-case (92%)", "constants": "UPPER_SNAKE (100%)" }
```

### D2: 错误处理模式

```
检测项:
  - try/catch vs Result<T,E> vs if err != nil
  - 错误是否向上传播 (throw/reject/return err)
  - 是否有自定义错误类型
  - 是否有错误日志记录

输出:
  {
    "pattern": "try/catch with custom error classes",
    "propagation": "向上传播，在 controller 层统一 catch",
    "customErrors": true,
    "errorLogging": "console.error at catch site"
  }
```

### D3: 代码组织结构

```
检测项:
  - 单文件 vs 按功能拆分
  - 每个文件是否只有一个 export
  - import 组织顺序 (第三方 → 内部 → 类型)
  - 是否存在 barrel export (index.ts 重导出)
  - 测试文件放置 (同目录 __tests__/ vs 同级 .test.ts)

输出:
  {
    "fileStructure": "按功能拆分，每文件 ≤ 1 个主要 export",
    "importOrder": "第三方 → 内部模块 → 类型",
    "barrelExports": true,
    "testPlacement": "同级 .test.ts"
  }
```

### D4: 测试习惯

```
检测项:
  - 测试框架: jest / vitest / pytest / go test
  - 测试命名: describe/it vs test/suite
  - 是否有 snapshot 测试
  - 是否有 fixture/helper 目录
  - 测试覆盖率阈值 (jest.config / vitest.config)

输出:
  {
    "framework": "vitest",
    "naming": "describe('module', () => { it('behavior', () => {}) })",
    "snapshots": true,
    "fixtures": "__tests__/fixtures/",
    "coverageThreshold": 80
  }
```

### D5: 注释和文档风格

```
检测项:
  - JSDoc/TSDoc vs 行注释 vs 块注释
  - 是否有 // TODO / // FIXME 约定
  - README 语言 (中文/英文)
  - Commit message 格式 (conventional commits / free-form)

输出:
  {
    "docStyle": "JSDoc on public API, 行注释 on internal logic",
    "todoConvention": "// TODO(@owner): 描述",
    "readmeLanguage": "en",
    "commitStyle": "conventional commits"
  }
```

## 最终产物

写入 `.repo-loop-state.json` → `meta.styleProfile`：

```json
{
  "styleProfile": {
    "detectedAt": "ISO8601",
    "naming": { "variables": "camelCase", "files": "kebab-case", "constants": "UPPER_SNAKE" },
    "errorHandling": { "pattern": "try/catch", "propagation": "controller level" },
    "codeOrganization": { "structure": "feature-based", "barrelExports": true },
    "testing": { "framework": "vitest", "naming": "describe/it" },
    "comments": { "docStyle": "JSDoc", "language": "en" }
  }
}
```

## Fix 阶段如何消费

engineering-loop 的 Fix 阶段在生成代码前必须读取 `styleProfile`，并应用：

```
命名: 生成的变量/文件/常量遵循检测到的命名约定
错误处理: 使用仓库已有的模式，不引入新的错误处理范式
组织结构: 新增文件放在仓库约定位置，遵循 import 顺序
测试: 使用相同框架和命名约定
注释: 首次修改时询问语言偏好，保存后不再重复询问
```

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "这个风格不好，我写一个更好的" | 你不是来重构风格的。一致性 > 你的偏好 |
| 2 | "我把这部分也重构一下，风格统一" | style-profile 只记录不改。重构风格是另一个 loop 目标 |
| 3 | "这个项目没有明显风格" | 总是有风格的——采样 20 个文件足够提取模式 |
| 4 | "camelCase 和 snake_case 混用，没有统一风格" | 记录"混用"本身就是风格特征。按文件所在目录的主流风格选择 |

## 验证清单

- [ ] 5 个维度各采样 ≥ 10 个文件
- [ ] 每个维度的置信度 ≥ 70%（一个模式占总样本 ≥ 70%）
- [ ] 写入 `.repo-loop-state.json` → `meta.styleProfile`
- [ ] Fix 阶段可检索到全部 5 个维度
