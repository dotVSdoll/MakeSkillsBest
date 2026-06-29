"""
Sprite Processor — 精灵图处理器

将 Gemini 生成的像素风精灵表切割为独立透明 PNG 文件。
支持单个文件处理和批量处理。

Usage:
    python -m src.sprite_processor cut <path-to-sprite-sheet.png>
    python -m src.sprite_processor batch <directory>
    python -m src.sprite_processor clean
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Optional

try:
    from PIL import Image
except ImportError:
    print("[FAIL] 需要 Pillow 库，请执行: pip install Pillow")
    sys.exit(1)

# ─── 常量 ───

TILE_SIZE = 64
BG_COLOR = (253, 253, 253, 255)  # 默认背景色
BG_TOLERANCE = 15  # 颜色容差
SPRITES_DIR = Path(__file__).resolve().parent / "sprites"


# ─── 核心函数 ───


def load_sprite_sheet(path: str) -> Image.Image:
    """加载精灵表并验证格式。"""
    img = Image.open(path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    w, h = img.size
    if w % TILE_SIZE != 0 or h % TILE_SIZE != 0:
        raise ValueError(
            f"精灵表尺寸 {w}×{h} 不是 {TILE_SIZE} 的整数倍"
        )
    return img


def remove_background(tile: Image.Image, bg_color=BG_COLOR, tolerance=BG_TOLERANCE) -> Image.Image:
    """将接近背景色的像素设为透明。"""
    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")
    pixels = tile.load()
    for y in range(tile.height):
        for x in range(tile.width):
            r, g, b, a = pixels[x, y]
            if (abs(r - bg_color[0]) < tolerance and
                abs(g - bg_color[1]) < tolerance and
                abs(b - bg_color[2]) < tolerance):
                pixels[x, y] = (r, g, b, 0)
    return tile


def cut_sprite_sheet(
    img: Image.Image,
    output_dir: str,
    tile_size: int = TILE_SIZE,
    prefix: str = "grid",
) -> list[dict]:
    """
    切割精灵表为独立 tile，返回每个 tile 的信息。

    Returns:
        [{"row": int, "col": int, "path": str, "bg_pct": float}, ...]
    """
    w, h = img.size
    cols = w // tile_size
    rows = h // tile_size
    os.makedirs(output_dir, exist_ok=True)

    results = []
    for row in range(rows):
        for col in range(cols):
            x1, y1 = col * tile_size, row * tile_size
            tile = img.crop((x1, y1, x1 + tile_size, y1 + tile_size)).copy()
            tile = remove_background(tile)

            # 计算背景占比
            pixels = list(tile.getdata())
            total = len(pixels)
            transparent = sum(1 for p in pixels if p[3] == 0)
            bg_pct = 100 * transparent / total if total > 0 else 100

            fname = f"{prefix}_{row:02d}_{col:02d}.png"
            fpath = os.path.join(output_dir, fname)
            tile.save(fpath)

            results.append({
                "row": row,
                "col": col,
                "path": fpath,
                "bg_pct": round(bg_pct, 1),
                "size": f"{tile_size}×{tile_size}",
                "has_content": bg_pct < 98,
            })

    return results


def generate_reference_grid(
    img: Image.Image,
    output_path: str,
    tile_size: int = TILE_SIZE,
) -> str:
    """生成带行列标签的参考网格图。"""
    from PIL import ImageDraw

    w, h = img.size
    cols = w // tile_size
    rows = h // tile_size
    margin = 36
    ref_w = w + margin
    ref_h = h + margin

    ref = Image.new("RGBA", (ref_w, ref_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(ref)

    for row in range(rows):
        for col in range(cols):
            x1, y1 = col * tile_size, row * tile_size
            tile = img.crop((x1, y1, x1 + tile_size, y1 + tile_size)).copy()
            tile = remove_background(tile)

            # 粘贴到参考图
            tx = col * tile_size + margin // 2
            ty = row * tile_size + margin // 2
            ref.paste(tile, (tx, ty), tile)

            # 网格线
            draw.rectangle(
                [tx, ty, tx + tile_size, ty + tile_size],
                outline=(200, 200, 200), width=1,
            )

    # 行列标签
    for row in range(rows):
        draw.text((4, row * tile_size + margin // 2 + tile_size // 2 - 6),
                   f"R{row}", fill=(0, 0, 0))
    for col in range(cols):
        draw.text((col * tile_size + margin // 2 + tile_size // 2 - 8, 4),
                   f"C{col}", fill=(0, 0, 0))

    ref.save(output_path)
    return output_path


# ─── 命令实现 ───


def cmd_cut(args):
    """cut 命令：切割单个精灵表"""
    path = args.path
    if not os.path.exists(path):
        print(f"[FAIL] 文件不存在: {path}")
        return 1

    print(f"[DIR] 加载精灵表: {path}")
    try:
        img = load_sprite_sheet(path)
        w, h = img.size
        cols = w // TILE_SIZE
        rows = h // TILE_SIZE
        print(f"  ├ 尺寸: {w}×{h}")
        print(f"  ├ 网格: {cols}×{rows} (每块 {TILE_SIZE}×{TILE_SIZE})")
    except Exception as e:
        print(f"[FAIL] {e}")
        return 1

    # 确定输出目录
    out_dir = args.output or os.path.join(os.path.dirname(path), "cut")
    print(f"  └ 输出: {out_dir}")

    # 切割
    print(f"\n 切割中...")
    tiles = cut_sprite_sheet(img, out_dir)

    has_content = [t for t in tiles if t["has_content"]]
    empty = [t for t in tiles if not t["has_content"]]
    print(f"  ├ 有内容: {len(has_content)}/{len(tiles)}")
    print(f"  ├ 空白: {len(empty)}/{len(tiles)}")
    print(f"  └ 总计: {len(tiles)} 个 tile")

    # 参考网格图
    ref_name = "_grid_reference.png"
    ref_path = os.path.join(out_dir, ref_name)
    generate_reference_grid(img, ref_path)
    print(f"\n[CHART] 参考网格图: {ref_path}")

    return 0


def cmd_batch(args):
    """batch 命令：批量处理目录下所有 PNG"""
    directory = args.directory
    if not os.path.isdir(directory):
        print(f"[FAIL] 目录不存在: {directory}")
        return 1

    files = sorted([
        f for f in os.listdir(directory)
        if f.lower().endswith(".png") and not f.startswith("grid_")
    ])
    if not files:
        print(f"[FAIL] 目录中没有 PNG 文件: {directory}")
        return 1

    print(f"[DIR] 目录: {directory}")
    print(f"  └ 找到 {len(files)} 个文件")

    for i, fname in enumerate(files, 1):
        fpath = os.path.join(directory, fname)
        print(f"\n[{i}/{len(files)}] {fname}")
        sys.argv = ["sprite-processor", "cut", fpath]
        cmd_cut(argparse.Namespace(
            path=fpath,
            output=os.path.join(directory, fname.replace(".png", "_cut")),
        ))

    return 0


def cmd_clean(args):
    """clean 命令：清理精灵目录"""
    target_dir = args.directory or str(SPRITES_DIR)
    if not os.path.isdir(target_dir):
        print(f"[FAIL] 目录不存在: {target_dir}")
        return 1

    # 需要保留的文件模式
    keep_patterns = ["grid_", "_grid_reference", "Gemini_Generated_Image"]

    removed = 0
    kept = 0
    for root, _, files in os.walk(target_dir):
        for fname in files:
            if not fname.lower().endswith(".png"):
                continue
            # 检查是否应保留
            should_keep = any(fname.startswith(p) for p in keep_patterns)
            if not should_keep and not fname.startswith("Gemini_Generated_Image"):
                # asset1_cutout 等中间产物的清理
                fpath = os.path.join(root, fname)
                size = os.path.getsize(fpath)
                os.remove(fpath)
                print(f"  [删除] {fname} ({size/1024:.0f} KB)")
                removed += 1
            else:
                kept += 1

    print(f"\n✅ 清理完成: 删除 {removed} 个文件，保留 {kept} 个文件")
    return 0


# ─── 入口 ───


def main():
    parser = argparse.ArgumentParser(
        description="Sprite Processor — 精灵图处理器",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # cut
    p_cut = sub.add_parser("cut", help="切割单个精灵表")
    p_cut.add_argument("path", help="精灵表 PNG 路径")
    p_cut.add_argument("-o", "--output", help="输出目录（默认同目录下 cut/）")

    # batch
    p_batch = sub.add_parser("batch", help="批量处理目录")
    p_batch.add_argument("directory", help="PNG 目录")

    # clean
    p_clean = sub.add_parser("clean", help="清理精灵目录")
    p_clean.add_argument("directory", nargs="?", help="目标目录（默认 src/sprites）")

    args = parser.parse_args()

    if args.command == "cut":
        return cmd_cut(args)
    elif args.command == "batch":
        return cmd_batch(args)
    elif args.command == "clean":
        return cmd_clean(args)

    return 0


if __name__ == "__main__":
    sys.exit(main())
