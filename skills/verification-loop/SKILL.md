---
name: verification-loop
description: "五级验证链 — build → --help → minimal command → artifact → content check。自动从构建文件提取验证命令，每级通过才进下一级。产出写入状态文件。"
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

## 五级验证链

```
L1: Build      → L2: Help      → L3: Command   → L4: Artifact  → L5: Content
   编译通过        能输出帮助      能跑最小命令      产物文件存在     产物内容正确
   ↓ FAIL         ↓ FAIL          ↓ FAIL          ↓ FAIL          ↓ FAIL
   停止，修复      停止，修复       停止，修复       停止，修复       停止，修复
```

**规则：任何一级 FAIL → 停止验证链。不跳过、不降级。**

## 工作流

### Step 1: 自动提取验证命令

从构建文件中提取可用的验证命令，按语言/构建系统分类：

| 构建系统 | 检测文件 | L1 build | L2 help | L3 command | L4 artifact | L5 content |
|---|---|---|---|---|---|---|
| Make | Makefile | `make` or `make -f Makefile.cbm` | `./binary --help` | `./binary [最小参数]` | `ls binary` | `./binary verify` |
| CMake | CMakeLists.txt | `cmake --build build/` | 同上 | 同上 | 同上 | `ctest` |
| npm | package.json | `npm run build` | `npm start -- --help` | `npm start -- [最小参数]` | `ls dist/` | `npm test` |
| Go | go.mod | `go build ./...` | `./binary --help` | `./binary [最小参数]` | `ls binary` | `go test ./...` |
| Python | pyproject.toml | `pip install -e .` | `python -m pkg --help` | `python -m pkg [最小参数]` | `python -c "import pkg"` | `pytest` |

**选择规则：**
1. 优先选需要最少外部依赖的命令
2. 如果 makefile 中有 `test-foundation` 和 `test-integration`，选 `test-foundation`（不需要 Docker/DB）
3. 如果项目没有 --help → L2 跳过，标注 `N/A`
4. 如果项目没有 produced artifact → L4 跳过，标注 `N/A`

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
