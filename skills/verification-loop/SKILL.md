---
name: verification-loop
description: "分模板验证 — Template A: CLI (build→help→command→artifact→content) / Template B: Library (install→import→usage→behavior→tests) / Template C: Skill Eval (frontmatter→trigger→resources→eval-prompts→baseline)。自动按 repoType 选择。"
argument-hint: "verify | run verification | check the build | prove it works"
dependencies:
  upstream:
    - implementation-map  # 知道改了哪些文件
    - task-graph          # 知道当前完成了哪些任务
  downstream:
    - engineering-loop    # 总控根据验证结果决定 continue/stop/replan
---

# Verification Loop — 验证循环

## 概述

**代码写完了≠能工作。** 本 skill 执行五级递增验证链，每一级是下一级的前置条件。验证结果写入 `.repo-loop-state.json` 的 `verify` 字段。

**与 mvp-approach Step 6 的关系：** 本 skill 是 mvp-approach 中 execution-proof 的独立化和增强版。mvp-approach 的 Step 6 委托到此 skill。

## PRECONDITIONS

```
[1] .repo-loop-state.json 中 act.completedTasks 非空？
    NO → STOP. "❌ 没有已完成的任务需要验证"

[2] .repo-loop-state.json 中 bound.implementationMap 非空？
    NO → STOP. "❌ 需要先运行 implementation-map"
```

## 验证模板

**不再使用统一的 CLI 五级链。** 根据 `meta.verificationMode` 选择验证模板。

### 模板选择

```
meta.verificationMode == "cli"               → Template A: CLI 工具验证链
meta.verificationMode == "library"           → Template B: Library 验证链
meta.verificationMode == "framework"         → Template B: Library 验证链 (framework 是 library 的超集)
meta.verificationMode == "sdk"               → Template B: Library 验证链 + 额外 L3.5 protocol example
meta.verificationMode == "frontend-monorepo" → Template B + testProfile 选择
meta.verificationMode == "skill-eval"        → Template C: Skill Eval 验证链
```

---

### Template A: CLI 工具验证链

**适用：** cli / app 类型项目（有 `--help`、可执行入口、产出文件）

| 级别 | 验证内容 | 命令提取方式 |
|---|---|---|
| L1-build | 编译通过 | Makefile → `make` / npm → `npm run build` / go → `go build` |
| L2-help | 能输出帮助 | `./binary --help` 或 `npm start -- --help` |
| L3-command | 能跑最小命令 | `./binary [核心动作的最简参数]` → exit 0 + 有输出 |
| L4-artifact | 产物存在 | `ls binary` 或 `ls dist/` → 文件存在 + size > 0 |
| L5-content | 产物内容正确 | `./binary verify` 或 `./binary search "main"` → 预期输出 |

**提取规则：** 选最少外部依赖的命令。Makefile 中优先 `test-foundation` 而非 `test-integration`（不需要 Docker）。

---

### Template B: Library/Framework 验证链

**适用：** library / monorepo 类型项目（无 CLI 入口，核心产物是 importable module）

| 级别 | 验证内容 | 命令提取方式 |
|---|---|---|
| L1-install | 可安装 | `pip install -e .` / `npm install` / `go install` / `cargo build` |
| L2-import | 可导入 | `python -c "import pkg"` / `node -e "require('pkg')"` / 检查类型 |
| L3-minimal-usage | 最小 API 可用 | `python -c "from pkg import App; App().run()"` → exit 0 |
| L4-behavior | 行为断言 | 最小 API 调用 → 输出/返回值符合预期 |
| L5-targeted-tests | 针对性测试 | `pytest tests/test_auth.py` / `npm test -- --testPathPattern=auth` |

**提取规则：**
- L3: 从 README 的 "Quick Start" 或 "Usage" 示例中提取最简代码片段
- L5: 只跑与修改文件相关的测试，不全量——从 `task-graph` 的 `modifiedFiles` 反向查找对应测试文件

**框架项目特殊情况：**
- FastAPI 类 → L3: `from fastapi import FastAPI; app = FastAPI(); app.get("/")(lambda: "ok")` → TestClient 请求
- React 组件库 → L3: `import { Button } from "ui"; render(<Button/>)` → 无 crash

---

### Template C: Skill Eval 验证链

**适用：** skill-repo 类型项目（`SKILL.md` 文件 + skills/ 目录结构）

| 级别 | 验证内容 | 方法 |
|---|---|---|
| L1-frontmatter | 每个 SKILL.md 有完整的 frontmatter | 检查 `name` + `description` 字段非空 |
| L2-trigger | description 写清触发条件 | 检查是否包含 "Use when" / "触发" / "trigger" 等关键词 |
| L3-resources | scripts/references/assets 被正确引用 | `search_content` 确认 SKILL.md 中引用的资源文件实际存在 |
| L4-eval-prompts | 每个 skill 至少 2 个 eval prompt | 检查 `evals/` 目录下是否有足够测试用例 |
| L5-baseline | with-skill vs without-skill 对比 | 跑 eval prompts → 有 skill 输出 vs 无 skill 输出 → 比较差异 |

**L1-L3 强制，L4-L5 有 eval 目录时执行，无则标注 `N/A (no evals/)`。** 如果仓库本身没有 evals，L4-L5 跳过但不标记为 FAIL。

**L5 执行细则：**

```
对于每个 eval prompt:
  1. 无 skill 运行 → 记录 baseline 输出
  2. 加载 skill → 运行相同 prompt → 记录 with-skill 输出
  3. 比较:
     - skill 是否被正确触发？（L2 验证）
     - 输出是否比 baseline 有实质改进？（定性评估）
     - skill 的 frontmatter 约束是否被遵守？（L1 验证）
  4. 写入: { prompt, baseline, withSkill, improvement: "yes|partial|no" }
```

**示例（对 MakeSkillsBest 自身）：**

```
L1: semantic-rag 有 name + description ✅
    knowledge-graph 有 name + description ✅
    ...

L2: "Use when" / trigger keywords 检查:
    repo-decompose: "接手陌生开源项目" ✅
    ...

L3: SKILL.md 中引用的 docs/loop-state-schema.md 存在 ✅

L4: evals/ 目录不存在 → N/A

L5: N/A
```

---

### 选择规则（三种模板通用）

1. 优先不需要外部服务的命令
2. 项目没有对应能力的级别 → 跳过，标注 `N/A`
3. L5 始终跑 targeted tests，不全量——大仓库全量测试不现实

## 工作流

### Step 1: 按模板提取验证命令

从状态文件读取 `meta.verificationMode`，选择对应模板，从构建文件中提取命令。

### Step 2: 确认修改范围内无红区违规

对照 `implementationMap.forbiddenZones`，检查当前修改的文件列表中是否包含红区文件：

```
检查: act.modifiedFiles[] 与 bound.implementationMap.forbiddenZones[] 的交集
  非空 → 验证中止。输出违规文件列表。
```

### Step 3: 逐级执行验证

```json
{
  "results": [
    {
      "level": "L1-build",
      "command": "make -f Makefile.cbm",
      "exitCode": 0,
      "output": "Build successful. Binary: ./cbm",
      "passed": true,
      "duration": "2.3s"
    },
    {
      "level": "L2-help",
      "command": "./cbm --help",
      "exitCode": 0,
      "output": "Codebase Mapper v0.1\nUsage: cbm <command> [options]",
      "passed": true,
      "duration": "0.1s"
    },
    {
      "level": "L3-command",
      "command": "./cbm index ./src --output /tmp/test.db",
      "exitCode": 0,
      "output": "Indexed 142 symbols in 18 files",
      "passed": true,
      "duration": "1.5s"
    },
    {
      "level": "L4-artifact",
      "command": "test -f /tmp/test.db",
      "exitCode": 0,
      "output": "File exists: /tmp/test.db (20480 bytes)",
      "passed": true,
      "duration": "0.0s"
    },
    {
      "level": "L5-content",
      "command": "./cbm search main --db /tmp/test.db",
      "exitCode": 0,
      "output": "src/main.c:15 — int main(int argc, char **argv)",
      "passed": true,
      "duration": "0.3s"
    }
  ]
}
```

### Step 4: 输出验证报告

写入 `.repo-loop-state.json` → `verify`：

```json
{
  "verify": {
    "status": "done",
    "results": [...],
    "passedCount": 5,
    "failedCount": 0,
    "skippedCount": 0,
    "consecutiveFailures": 0,
    "summary": "✅ 全部 5 级通过 — L1 build → L5 content check"
  }
}
```

**状态判定：**
- `done` — 所有非跳过的级别通过
- `failed` — 任一级别 FAIL
- `partial` — 部分级别通过但 L5 未执行（仅 L1-L2 通过但 L3 失败）

## 反合理化表

| # | Agent 借口 | 反驳 |
|---|---|---|
| 1 | "L1 build 过了，L5 太麻烦跳过" | build 过 ≠ 产物正确。L5 是唯一验证"产物内容对"的级别 |
| 2 | "这个项目没有 --help，L2 就是 N/A" | N/A 没问题——但必须明确标注。不能悄悄跳过 |
| 3 | "连续两次验证失败，再试一次" | 连续 2 次失败 → 停止，回到 planning。不反复重试 |
| 4 | "测试没写但是代码逻辑看着没问题" | 没有测试 = L5 无法执行。"看着没问题"不是验证 |

## 验证清单

- [ ] 所有已修改文件不在 implementation-map 红区中
- [ ] 每一级验证有明确的 exit code 和输出摘要
- [ ] 失败级别之后的级别未执行（记录为 `skipped`）
- [ ] `consecutiveFailures` 跨轮正确累积
- [ ] 输出已写入 `.repo-loop-state.json` → `verify`
