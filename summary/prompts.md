# 🎨 像素风精灵生成指南

> 使用 Gemini 生成，统一放入 `web/public/sprites/` 目录。

---

## 格式规范

| 项目 | 规格 |
|------|------|
| **风格** | 16-bit 像素风（类似 Stardew Valley / 牧场物语） |
| **角色帧尺寸** | **16×32** 像素/帧，**合成 sprite sheet**（所有帧一张图） |
| **植物/地块/家具** | 单帧独立 PNG，各自的实际像素尺寸 |
| **背景** | **透明** —— 不画背景，不要底色，不要 canvas |
| **格式** | PNG |
| **调色板** | 温暖、柔和：绿色系、棕色系、暖黄色 |
| **视角** | 俯视（top-down），角色朝前 |
| **像素** | 硬边像素，不要抗锯齿（anti-aliasing） |

---

## 🧑‍🌾 园艺师角色 Spritesheet

### 注意：这是唯一用 spritesheet 格式的资源

`src/sprites/gardener.png`（或 `web/public/sprites/gardener.png`）

```
Generate a pixel art character sprite sheet for a cute gardener.
ALL frames in ONE image, NOT separate files.
Style: 16-bit pixel art, top-down view.
Frame size: 16x32 pixels per frame.
Palette: warm greens, browns, soft yellows.
Character: small, round, wearing a straw hat and green apron, holding small pruning shears.
TRANSPARENT background — no solid color behind the character.
Pixel art, NO anti-aliasing, hard edges.

Layout (grid, left to right, top to bottom):
Row 1 (facing down):  idle, walk1, walk2, walk3
Row 2 (facing up):    idle, walk1, walk2, walk3  
Row 3 (facing right): idle, walk1, walk2, walk3
Row 4:                trim1, trim2, water1, water2, rest, decide

Each frame 16x32 pixels. Keep character centered.
```

---

## 🌱 植物精灵（每张独立 PNG）

### 命名规则

`web/public/sprites/plants/<variant>.png`

### healthy — 健康植物（16×32）

```
Generate a pixel art plant sprite, 16x32 pixels, TRANSPARENT background.
Style: 16-bit pixel art, warm palette.
A lush sunflower in full bloom: bright yellow petals around a brown center,
tall green stem with two large green leaves. Vibrant and healthy.
Centered, facing forward.
```

### wilting — 枯萎植物（16×32）

```
Generate a pixel art wilting plant sprite, 16x32 pixels, TRANSPARENT background.
Style: 16-bit pixel art, warm palette.
A sunflower that is wilting: yellow-brown drooping petals,
stem bent slightly, leaves turning yellow-brown at edges.
Looks thirsty and neglected but not dead yet.
```

### dead — 死亡植物（16×16）

```
Generate a pixel art dead plant sprite, 16x16 pixels, TRANSPARENT background.
Style: 16-bit pixel art, warm palette.
A dead plant: brown dry stem, no leaves, no flowers,
just a withered stalk sticking out of a small dirt mound.
```

---

## 🏞 场景图块（每张独立 PNG）

### 命名规则

`web/public/sprites/tiles/<name>.png`

### grass — 草地（16×16）

```
Generate a pixel art grass tile, 16x16 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
Top-down view of grass ground. Soft green with subtle color variation,
a few tiny light green grass blades scattered. Looks like well-maintained garden grass.
Tile-able (seamless if tiled).
```

### path — 小径（16×16）

```
Generate a pixel art garden path tile, 16x16 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
Top-down view of a dirt/stone path. Warm brown-gray color,
small pebbles and slightly uneven surface. Garden path aesthetic.
Tile-able horizontally.
```

### soil — 土壤（16×16）

```
Generate a pixel art soil tile, 16x16 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
Rich brown garden soil, fine texture, tiny pebbles.
Tile-able.
```

---

## 🏛 四区域背景（每张独立 PNG）

### soil_zone — 土壤区（代表 CLAUDE.md）（32×32）

```
Generate a pixel art garden zone background, 32x32 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
A garden soil/earth zone. Rich brown soil with a large engraved stone tablet
standing in the center. The tablet has a few small plant sprouts growing around its base.
Small pebbles and earth texture. Top-down view.
```

### tools_zone — 工具区（代表 skills/）（32×32）

```
Generate a pixel art garden tools zone background, 32x32 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
A garden workbench area with tools. A small wooden table with a trowel, shears,
and a roll of twine on it. A wooden tool rack behind it. Warm browns and grays.
Top-down view.
```

### gear_zone — 齿轮水井区（代表 hooks/）（32×32）

```
Generate a pixel art garden well with a gear-driven mechanism, 32x32 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
A rustic stone well with a wooden crank and a large brass gear mechanism mounted on top.
Climbing green vines wrapping around the gears.
A small bucket hanging from a chain.
The overall feel is mechanical but overgrown with garden elements — 
gears and nature working together. Top-down view.
```

### seed_zone — 种子区（代表 memory/）（32×32）

```
Generate a pixel art seed bed zone background, 32x32 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
A garden seed bed: neatly organized rows of small sprouts emerging from dark soil,
with tiny wooden markers (blank) at the end of each row. A small watering can nearby.
Soft greens and browns. Top-down view.
```

---

## 🪑 装饰物（每张独立 PNG）

### fence — 围栏（16×16）

```
Generate a pixel art wooden fence segment, 16x16 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
A short wooden fence section: three horizontal rails with vertical posts,
warm brown wood color. Cute garden fence.
Tile-able horizontally.
```

### bench — 长凳（32×16）

```
Generate a pixel art wooden garden bench, 32x16 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
A small wooden bench, top-down view. Wooden slats, warm brown.
Just the bench, no character on it.
```

### flower_deco — 装饰花（16×16）

```
Generate a pixel art small decorative flowers, 16x16 pixels, TRANSPARENT background.
Style: 16-bit pixel art.
A small cluster of mixed garden flowers: a few pink, blue, and yellow blooms
with small green leaves. Ground-level view.
```

---

## 📁 最终目录结构

生成完成后，文件应该放在：

```
web/public/sprites/
├── gardener.png              # 园丁 spritesheet（16×32/帧）
├── plants/
│   ├── healthy.png           # 16×32
│   ├── wilting.png           # 16×32
│   └── dead.png              # 16×16
├── tiles/
│   ├── grass.png             # 16×16
│   ├── path.png              # 16×16
│   └── soil.png              # 16×16
├── zones/
│   ├── soil_zone.png         # 32×32
│   ├── tools_zone.png        # 32×32
│   ├── gear_zone.png         # 32×32（齿轮水井）
│   └── seed_zone.png         # 32×32
└── decor/
    ├── fence.png             # 16×16
    ├── bench.png             # 32×16
    └── flower_deco.png       # 16×16
```

---

## 使用流程

1. 复制某个 prompt → 粘贴到 Gemini → 生成
2. 下载生成的 PNG
3. Photopea 打开 → Magic Wand（W）→ 顶部取消勾选 "Contiguous" → 点背景 → Delete
4. File → Export As → PNG（勾选 Transparency）
5. 放入 `web/public/sprites/` 对应目录

> **回退方案：** 如果某个 sprite 不存在，代码不会崩溃——会使用形状绘制的 fallback 替代。
> 所以你可以分批生成，分批放入，随时可以看到效果。
