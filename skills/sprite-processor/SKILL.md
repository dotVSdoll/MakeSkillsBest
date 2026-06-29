---
name: sprite-processor
description: "精灵图处理器 — 将 Gemini 或其他工具生成的像素风精灵表（sprite sheet）切割为独立透明 PNG。自动去除背景色，按 64×64 网格切割，生成参考网格图，并整理到项目标准目录。"
argument-hint: "cut <sprite-sheet-path> | batch <directory> | clean"
phases:
  - analyze
  - cut
  - organize
  - verify
state-files:
  - .sprite-processor.json
---

# Sprite Processor 🌄 — 精灵图处理器

## 定位

将像素风精灵表（sprite sheet）按照项目规范自动切割为 **64×64 独立透明 PNG**，并整理到 `src/sprites/` 对应的子目录中。

## 使用方式

```bash
# 切割单个精灵表
python -m src.sprite_processor cut <path-to-sprite-sheet.png>

# 批量处理目录下所有 PNG
python -m src.sprite_processor batch <directory>

# 清理临时文件和未使用资源
python -m src.sprite_processor clean
```

## 处理流程

```
analyze → 识别精灵表网格结构（16×16，每块 64×64）
  → 检测背景色（默认 RGB(253,253,253) 附近）
  → 去除背景并转透明
  → 按网格切割为独立 PNG
  → 生成参考网格图
  → 分类整理到对应目录
```

## 标准输出结构

```
src/sprites/
├── gardener/          # 角色动作帧（行走、修剪、浇水、待机等）
├── plants/            # 植物精灵（健康/枯萎/死亡）
└── tiles/             # 场景图块（草地、路径、围栏等）
```

## 技术规范

| 项目 | 规格 |
|------|------|
| **帧尺寸** | 64×64 像素 |
| **格式** | PNG RGBA（透明背景） |
| **背景去除** | 色键抠图（chroma-key），默认 RGB(253,253,253)±15 |
| **网格** | 自动检测（图像宽高 ÷ 64） |
| **命名** | `grid_{row:02d}_{col:02d}.png`（按网格位置） |

## 清理规则

`clean` 命令自动清理以下文件：
- 与当前精灵表重复的旧版文件
- 不再使用的 `asset1_cutout.png` 等中间产物
- 空的或未使用的精灵目录
