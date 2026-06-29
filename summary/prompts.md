# 🎨 像素风精灵生成指南

> 使用 Gemini 生成，统一放入 `src/sprites/` 目录。

---

## 格式规范

| 项目 | 规格 |
|------|------|
| **风格** | 16-bit 像素风（类似 Stardew Valley / 牧场物语） |
| **尺寸** | 64×64 像素/帧 |
| **背景** | **透明** —— 不画背景，不要底色，不要 canvas |
| **格式** | PNG，单帧单独文件 |
| **调色板** | 温暖、柔和：绿色系、棕色系、暖黄色 |
| **视角** | 俯视（top-down），角色朝前 |
| **输出** | 直接输出透明 PNG，不要拼合为 sprite sheet |

---

## 🧑‍🌾 园艺师角色动画

### 命名规则

`src/sprites/gardener/<state>_<frame>.png`，例如 `idle_1.png`

### idle — 待机/站立

```
Generate a pixel art character of a cute gardener, top-down view, facing forward.
Single frame, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette (greens, browns, soft yellows).
The gardener is small and round, wearing a straw hat and green apron, holding small pruning shears in one hand.
Standing still, looking forward with a gentle smile.
File name: idle_1.png
```

### walk — 行走（4 帧循环）

```
Generate a pixel art character of a cute gardener walking, top-down view.
4 frames of walking animation, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette, straw hat and green apron.
Frame 1: left leg forward, right leg back, shears in hand
Frame 2: both legs together mid-step
Frame 3: right leg forward, left leg back
Frame 4: both legs together, different arm swing
Walking pose, gentle motion. Top-down perspective, facing forward.
File names: walk_1.png, walk_2.png, walk_3.png, walk_4.png
```

### observe — 观察/眺望

```
Generate a pixel art character of a cute gardener observing, top-down view.
Single frame, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
The gardener is standing, one hand raised to forehead like shading eyes,
looking into the distance with curiosity. Straw hat, green apron.
File name: observe_1.png
```

### diagnose — 诊断/检查

```
Generate a pixel art character of a cute gardener crouching down, top-down view.
2 frames, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
Frame 1: kneeling down, reaching a hand toward the ground
Frame 2: kneeling, touching the ground/plant with one hand, examining closely
Straw hat, green apron. Gentle, focused expression.
File names: diagnose_1.png, diagnose_2.png
```

### plan — 思考/计划

```
Generate a pixel art character of a cute gardener thinking, top-down view.
2 frames, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
Frame 1: standing still, one hand on chin, looking thoughtful
Frame 2: same pose but tilting head slightly, a small question mark above head
Straw hat, green apron.
File names: plan_1.png, plan_2.png
```

### act_trim — 修剪动作

```
Generate a pixel art character of a cute gardener trimming plants, top-down view.
2 frames, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
Frame 1: leaning forward slightly, holding pruning shears open near a small branch
Frame 2: shears closed, cutting motion, small leaf particle flying off
Straw hat, green apron. Focused expression.
File names: act_trim_1.png, act_trim_2.png
```

### act_water — 浇水动作

```
Generate a pixel art character of a cute gardener watering, top-down view.
2 frames, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
Frame 1: holding a small green watering can with both hands, tilting forward
Frame 2: water droplets falling from can spout
Straw hat, green apron.
File names: act_water_1.png, act_water_2.png
```

### verify — 验证/检查效果

```
Generate a pixel art character of a cute gardener stepping back to look, top-down view.
2 frames, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
Frame 1: standing a step back, head tilted up slightly looking at work
Frame 2: nodding in satisfaction, a small smile, hands on hips
Straw hat, green apron.
File names: verify_1.png, verify_2.png
```

### learn — 学习/记录

```
Generate a pixel art character of a cute gardener sitting on a small bench writing, top-down view.
2 frames, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
Frame 1: sitting on a wooden bench, holding a small notebook and pencil
Frame 2: writing in the notebook, pencil moving
Straw hat, green apron.
File name: learn_1.png, learn_2.png
```

### decide — 决定/指引

```
Generate a pixel art character of a cute gardener pointing forward, top-down view.
1 frame, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
The gardener stands confidently, one arm extended forward pointing,
the other hand on hip. Straw hat, green apron. Determined but cute expression.
File name: decide_1.png
```

### rest — 休息

```
Generate a pixel art character of a cute gardener resting on a bench, top-down view.
2 frames, 64x64 pixels each, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
Frame 1: sitting on a bench, leaning back, shears resting on lap, eyes closed peacefully
Frame 2: same pose but yawning, small Zzz above head
Straw hat, green apron.
File names: rest_1.png, rest_2.png
```

---

## 🌱 植物精灵

### 命名规则

`src/sprites/plants/<variant>.png`

### healthy — 健康植物

```
Generate a pixel art plant sprite, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
A lush sunflower in full bloom: bright yellow petals around a brown center,
tall green stem with two large green leaves. Vibrant and healthy.
Centered, facing forward.
File name: healthy.png
```

### wilting — 枯萎植物

```
Generate a pixel art wilting plant sprite, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
A sunflower that is wilting: yellow-brown drooping petals,
stem bent slightly, leaves turning yellow-brown at edges.
Looks thirsty and neglected but not dead yet.
File name: wilting.png
```

### dead — 死亡植物

```
Generate a pixel art dead plant sprite, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art, warm palette.
A dead plant: brown dry stem, no leaves, no flowers,
just a withered stalk sticking out of a small dirt mound.
File name: dead.png
```

---

## 🏞 场景图块

### 命名规则

`src/sprites/tiles/<name>.png`

### grass — 草地

```
Generate a pixel art grass tile, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
Top-down view of grass ground. Soft green with subtle color variation,
a few tiny light green grass blades scattered. Looks like well-maintained garden grass.
Tile-able (seamless if tiled).
File name: grass.png
```

### path — 小径

```
Generate a pixel art garden path tile, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
Top-down view of a dirt/stone path. Warm brown-gray color,
small pebbles and slightly uneven surface. Garden path aesthetic.
Tile-able horizontally.
File name: path.png
```

### fence — 围栏

```
Generate a pixel art wooden fence segment, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
A short wooden fence section: three horizontal rails with vertical posts,
warm brown wood color. Cute garden fence, not barbed or industrial.
Tile-able horizontally.
File name: fence.png
```

### flower_deco — 装饰花

```
Generate a pixel art small decorative flowers, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
A small cluster of mixed garden flowers: a few pink, blue, and yellow blooms
with small green leaves. Ground-level view. Just a cute patch of flowers.
File name: flower_deco.png
```

### bench — 长凳

```
Generate a pixel art wooden garden bench, 64x64 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
A small wooden bench, top-down view. Wooden slats, warm brown.
Just the bench, no character on it. Simple and recognizable.
File name: bench.png
```

---

## 🏛 四区域背景

### soil_zone — 土壤区（代表 CLAUDE.md）

```
Generate a pixel art garden zone background, 256x128 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
A garden soil/earth zone. Rich brown soil with a large engraved stone tablet
standing in the center. The tablet has a few small plant sprouts growing around its base.
Small pebbles and earth texture. Top-down view.
File name: soil_zone.png
```

### tools_zone — 工具区（代表 skills/）

```
Generate a pixel art garden tools zone background, 256x128 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
A garden workbench area with tools. A small wooden table with a trowel, shears,
and a roll of twine on it. A wooden tool rack behind it. Warm browns and grays.
Top-down view.
File name: tools_zone.png
```

### gear_zone — 齿轮区（代表 hooks/）

```
Generate a pixel art mechanical gear zone background, 256x128 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
A corner of the garden with small mechanical elements: a few brass gears of different sizes,
a small pipe or two, integrated into the garden environment with climbing vines growing
over the gears. Warm browns, brass, and green vines. Top-down view.
File name: gear_zone.png
```

### seed_zone — 种子区（代表 memory/）

```
Generate a pixel art seed bed zone background, 256x128 pixels, TRANSPARENT BACKGROUND.
Style: 16-bit pixel art.
A garden seed bed: neatly organized rows of small sprouts emerging from dark soil,
with tiny wooden markers (blank) at the end of each row. A small watering can nearby.
Soft greens and browns. Top-down view.
File name: seed_zone.png
```

---

## 📁 最终目录结构

生成完成后，文件应该放在：

```
src/sprites/
├── gardener/
│   ├── idle_1.png          # 待机
│   ├── observe_1.png       # 观察
│   ├── walk_1.png          # 行走帧1
│   ├── walk_2.png          # 行走帧2
│   ├── walk_3.png          # 行走帧3
│   ├── walk_4.png          # 行走帧4
│   ├── diagnose_1.png      # 诊断帧1
│   ├── diagnose_2.png      # 诊断帧2
│   ├── plan_1.png          # 思考帧1
│   ├── plan_2.png          # 思考帧2
│   ├── act_trim_1.png      # 修剪帧1
│   ├── act_trim_2.png      # 修剪帧2
│   ├── act_water_1.png     # 浇水帧1
│   ├── act_water_2.png     # 浇水帧2
│   ├── verify_1.png        # 验证帧1
│   ├── verify_2.png        # 验证帧2
│   ├── learn_1.png         # 学习帧1
│   ├── learn_2.png         # 学习帧2
│   ├── decide_1.png        # 决定
│   └── rest_1.png          # 休息
├── plants/
│   ├── healthy.png
│   ├── wilting.png
│   └── dead.png
├── tiles/
│   ├── grass.png
│   ├── path.png
│   ├── fence.png
│   ├── flower_deco.png
│   ├── bench.png
│   ├── soil_zone.png
│   ├── tools_zone.png
│   ├── gear_zone.png
│   └── seed_zone.png
```

---

## 使用方式

1. 复制某个 prompt → 粘贴到 Gemini → 生成
2. 下载生成的 PNG → 放到 `src/sprites/` 对应目录
3. 文件名为 prompt 中指定的名称，代码会按名加载

> **回退方案：** 如果某个 sprite 不存在，代码不会崩溃——会使用形状绘制的 fallback 替代。
> 所以你可以分批生成，分批放入，随时可以看到效果。
