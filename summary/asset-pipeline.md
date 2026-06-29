# 美术资源管线

## 生成工具

使用 **Gemini** 生成像素风 sprite 资源。

## Prompt 模板

### 园艺师角色

```
Generate a pixel art character sprite sheet for a cute gardener.
Style: 16-bit pixel art, top-down view (similar to Stardew Valley)
Size: 64x64 pixels per frame
Palette: warm greens, browns, soft yellows
Character: small, round, wearing a straw hat and green apron
Frames:
1. idle_front.png — facing forward, holding pruning shears
2. walk_1.png ~ walk_4.png — walking animation, front view
3. trim_1.png ~ trim_3.png — trimming/cutting animation
4. water_1.png ~ water_3.png — holding watering can
5. rest.png — sitting on a bench, resting
```

### 植物

```
Generate pixel art plant sprites for a garden visualization game.
Size: 64x64 pixels per frame
Style: 16-bit pixel art, front view
Palette: various greens, yellow for flowers

Plant types:
1. healthy.png — a lush sunflower, fully bloomed, bright green leaves
2. wilting.png — a drooping sunflower, yellow-brown leaves
3. dead.png — a dead plant, brown stem, no leaves
```

### 场景图块

```
Generate pixel art tiles for a 2D garden scene.
Size: 64x64 pixels per tile
Style: 16-bit pixel art, top-down view

Tiles:
1. grass.png — grass ground with slight color variation
2. path.png — dirt/stone garden path
3. fence.png — wooden fence segment
4. flower_deco.png — small decorative flowers
```

## 目录结构

```
sprites/
├── gardener/         → 园艺师角色
│   ├── Gardener.png  (已有)
│   ├── idle.png
│   ├── walk_1.png ~ walk_4.png
│   ├── trim_1.png ~ trim_3.png
│   └── rest.png
├── plants/           → 植物状态
│   ├── healthy.png
│   ├── wilting.png
│   └── dead.png
└── tiles/            → 场景图块
    ├── grass.png
    ├── path.png
    └── fence.png
```

## 加载方式

```python
# 在 garden_scene.py 中
sprite = self.load_sprite("gardener/Gardener.png")
sprite = self.load_sprite("plants/healthy.png")
sprite = self.load_sprite("tiles/grass.png")
```

`load_sprite()` 会自动缓存，重复加载不费性能。

## 回退方案

如果某个 sprite 文件不存在，代码不会崩溃——会使用形状绘制的 fallback（圆形头 + 椭圆身体的简易角色）。这意味着即使一张图都没有，花园也能正常打开，只是没那么好看。
