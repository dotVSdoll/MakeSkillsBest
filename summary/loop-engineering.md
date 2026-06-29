# Loop Engineering 在本项目的应用

## 循环定义

Context Gardener 的 Loop 是一个 **7 阶段生命周期**：

```
Entry: /gardener 命令
  │
  ├── 🔍 Observe   → 扫描上下文文件，记录指标
  ├── 🩺 Diagnose  → 检测 D1-D5 问题，计算健康分
  ├── 📋 Plan      → 生成修剪计划
  ├── 🔧 Act       → 执行修剪（用户确认）
  ├── ✅ Verify    → 重新检查，验证改善
  ├── 📝 Learn     → 沉淀经验到 memory
  └── 🔁 Decide    → 停止 / 继续 / 待机
                        │
                        └── 可视化：Pygame 花园窗口
                              └── 园艺师动画映射每个阶段
```

## 五个核心要素

| 要素 | 在本项目的实现 |
|------|---------------|
| **Entry** | Agent 命令 `/gardener` + session hook 自动安装 |
| **Body** | scanner → analyser → (optional act) → verify → learn |
| **Exit** | 健康分 ≥90 且无 P0 问题 / 连续 3 轮无改进 / 用户主动停止 |
| **State** | `.gardener-state.json`（会话）+ `.gardener-memory.json`（跨会话） |
| **Safety** | Observe/Diagnose 只读；Act 需要用户确认；修改前创建备份 |

## 可视化映射

```
Loop 阶段    →  园艺师动画
Observe      →  园艺师在花园中巡逻
Diagnose     →  园艺师蹲下检查某株植物
Plan         →  园艺师站住思考（头顶问号）
Act          →  园艺师修剪/浇水/拔除杂草
Verify       →  园艺师退后一步，看看修好的部分
Learn        →  园艺师坐在长凳上写笔记
Decide       →  园艺师点头（继续）或坐下休息（待机）
待机模式     →  园艺师坐在长凳上，偶尔伸懒腰
```

## 配置化 Loop

用户可以通过右边栏修改 Loop 的行为：
- **开关阶段**：可以通过 `loop.skipPhases` 跳过某个阶段
- **停止条件**：`loop.exitCondition.healthTarget` 和 `loop.exitCondition.maxRoundsNoImprovement`
- **确认环节**：`loop.requireConfirmationFor` 指定哪些阶段需要用户点击确认
