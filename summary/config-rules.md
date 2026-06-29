# 规则配置系统

## 配置文件

`.gardener-config.json` — 用户可完全自定义的规则文件。通过花园右边栏编辑，也可以通过 JSON 直接修改。

## 配置项全览（A-E）

### A) 阈值类 (Thresholds)

```json
{
  "thresholds": {
    "staleDays": 30,       // 多少天未更新算"枯萎"
    "maxLines": 200,       // 超过多少行算"膨胀"
    "maxWords": 1000,      // 超过多少字算"膨胀"
    "orphanCheck": true    // 是否检查枯根引用
  }
}
```

### B) 检测开关 (Detection)

```json
{
  "detection": {
    "stale": true,         // 检测枯萎
    "contradiction": true, // 检测矛盾规则
    "bloat": true,         // 检测膨胀
    "orphan": true         // 检测枯根引用
  }
}
```

### C) 动作策略 (Action)

```json
{
  "action": {
    "mode": "ask",         // "ask" | "auto" | "report-only"
    "autoPruneP3": true,   // P3 级别问题自动修复
    "backupEnabled": true  // 修改前备份
  }
}
```

### D) Loop 流程 (Loop)

```json
{
  "loop": {
    "enabled": true,
    "skipPhases": [],                        // 跳过的阶段名, e.g. ["plan"]
    "maxIterations": 5,                      // 一次会话最多轮次
    "requireConfirmationFor": ["act", "replan"],  // 需要确认的阶段
    "exitCondition": {
      "healthTarget": 90,                    // 健康分目标
      "maxRoundsNoImprovement": 3            // 连续无改进轮次上限
    }
  }
}
```

### E) 调度 (Schedule)

```json
{
  "schedule": {
    "enabled": false,
    "cron": "0 9 * * 1",    // cron 表达式
    "timezone": "local"
  }
}
```

## 默认值

未设置任何配置时，全部使用默认值（见 `src/config.py` 的 `DEFAULT_CONFIG`）。
用户只需在配置文件中写想覆盖的项，缺失的会自动补默认值。

## 修改方式

1. **花园 UI**：按 S 打开右边栏 → 点击修改 → 自动保存
2. **直接编辑**：项目根目录的 `.gardener-config.json`
3. **CLI 参数**：`python -m src.main scan . --stale-days 45`（优先级最高）
