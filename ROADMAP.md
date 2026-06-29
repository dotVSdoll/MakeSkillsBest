# Little Gardener — 开发路线图

> 方向性规划，按优先级分组。不是承诺，是探索路线。

---

## 🎯 Phase 1: MVP 核心（当前）

- [x] 项目结构搭建（Python + Pygame）
- [x] 文件扫描器（scanner.py）
- [x] 问题分析器（analyser.py）
- [x] 规则配置系统（config.py）
- [x] 四层审计 SKILL.md 定义
- [x] 状态持久化（gardener_state.py）
- [x] Pygame 花园窗口框架
- [x] session-start hook 自动安装
- [x] 架构图 + summary 上下文
- [ ] **美术资源准备（当前焦点）**
- [ ] scanner.py 适配"先读项目再读 CLAUDE.md"新流程
- [ ] analyser.py 适配四层加权评分
- [ ] garden_scene.py 四区域花园布局

---

## 🌱 Phase 2: 核心体验完善

- [ ] .gardener-advice.md 建议报告生成
- [ ] 花园窗口交互（点击植物看详情）
- [ ] 规则面板可交互（修改保存到 config）
- [ ] 待机模式倒计时
- [ ] 多平台命令（Cursor / Codex CLI / Windsurf）

---

## 🧭 Phase 3: 方向探索（已确认有价值）

### 方向 1: CLAUDE.md 版本追踪
- [ ] 读取 `git log -- CLAUDE.md` 变更历史
- [ ] 判断规则来源（深思熟虑 vs 顺手塞入）
- [ ] 标记超过 3 个月未修改的规则 → "可能过时"
- [ ] 标记被反复修改的规则 → "可能痛点"

### 方向 2: 规则漂移趋势图
- [ ] 每次对照结果存入 memory 长期积累
- [ ] 花园展示趋势曲线（健康分 4 周变化）
- [ ] 矛盾规则数量趋势
- [ ] 用户能看到"规则健康度在下降/上升"

### 方向 3: CLAUDE.md 模板建议
- [ ] 按项目类型（Python/JS/Go）生成最佳 CLAUDE.md 草案
- [ ] 严重缺失时自动提供模板
- [ ] 用户可直接采纳

### 方向 5: 深层规则推导
- [ ] 从代码统计中主动推导建议规则
  - 80% 测试用 pytest fixture → 建议加测试规范
  - 文件普遍 >300 行 → 建议函数长度约束
  - 多种错误处理风格混合 → 建议统一
- [ ] 建议分级（强推荐 / 弱推荐 / 仅供参考）

### 方向 6: 多平台技能同步
- [ ] 检测项目使用的 Agent 工具（.claude/ / .cursor/ / .opencode/）
- [ ] 生成跨平台配置同步建议
- [ ] 自动检测 hook 是否在所有平台生效

---

## 🏗 Phase 4: 平台扩展

- [ ] 常驻 Web 服务（替代 Pygame 窗口）
- [ ] 多项目聚合仪表盘
- [ ] CI 集成（Gardener 作为 CI check）
- [ ] VSCode 扩展
