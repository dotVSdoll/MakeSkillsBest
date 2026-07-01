"""Generate the asset-driven garden scene overview."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "web" / "public" / "sprites"
OUT = ROOT / "docs" / "scene-overview.png"

WIDTH = 1280
HEIGHT = 720
TILE = 64
SCALE = 4


def load(path: str) -> Image.Image:
    """Load a sprite with alpha."""
    return Image.open(SPRITES / path).convert("RGBA")


def clear_edge_black(sprite: Image.Image, threshold: int = 8) -> Image.Image:
    """Remove near-black sheet background connected to image edges."""
    rgba = sprite.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    seen: set[tuple[int, int]] = set()
    queue: list[tuple[int, int]] = []

    def is_black(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        return a > 0 and r <= threshold and g <= threshold and b <= threshold

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height or (x, y) in seen:
            return
        if not is_black(x, y):
            return
        seen.add((x, y))
        queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.pop()
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    return rgba


def crop(sheet: Image.Image, col: int, row: int, w: int = 16, h: int = 16) -> Image.Image:
    """Crop a frame from a 16px-grid sheet."""
    x = col * 16
    y = row * 16
    return clear_edge_black(sheet.crop((x, y, x + w, y + h)))


def farmer_frame(sheet: Image.Image, col: int) -> Image.Image:
    """Crop a correctly sized 32x64 farmer frame."""
    return sheet.crop((col * 32, 0, col * 32 + 32, 64))


def scale(sprite: Image.Image, factor: int) -> Image.Image:
    """Scale pixel art without smoothing."""
    return sprite.resize((sprite.width * factor, sprite.height * factor), Image.Resampling.NEAREST)


def paste(canvas: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    """Alpha-paste a sprite onto the canvas."""
    canvas.alpha_composite(sprite, (x, y))


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, fill: str = "#243228") -> None:
    """Draw compact overview labels."""
    draw.text(xy, value, fill=fill, font=ImageFont.load_default())


def paste_center_bottom(canvas: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    """Paste a sprite using bottom-center anchor."""
    paste(canvas, sprite, x - sprite.width // 2, y - sprite.height)


def main() -> None:
    """Build a product-oriented scene overview image."""
    tiles = clear_edge_black(load("tiles/Tileset Spring.png"))
    road = clear_edge_black(load("tiles/road.png"))
    fence = clear_edge_black(load("tiles/fence.png"))
    crops = clear_edge_black(load("plants/Spring Crops.png"))
    catalog = clear_edge_black(load("plants/Plants_Spreadsheet.png"))
    tree_sheet = clear_edge_black(load("decor/Maple Tree.png"))
    bench = load("decor/bench.png")

    farmer_front_idle = load("character/farmer front idle.png")
    farmer_front_walk = load("character/farmer front walk.png")
    farmer_back_idle = load("character/farmer back idle.png")
    farmer_back_walk = load("character/farmer back walk.png")
    farmer_left_walk = load("character/farmer left walk.png")
    farmer_right_walk = load("character/farmer right walk.png")

    canvas = Image.new("RGBA", (WIDTH, HEIGHT), "#9ed8ee")
    draw = ImageDraw.Draw(canvas)

    for y in range(0, 136):
        ratio = y / 136
        r = int(134 * (1 - ratio) + 178 * ratio)
        g = int(203 * (1 - ratio) + 224 * ratio)
        b = int(232 * (1 - ratio) + 246 * ratio)
        draw.line((0, y, WIDTH, y), fill=(r, g, b, 255))
    draw.rectangle((0, 136, WIDTH, HEIGHT), fill="#57ad4f")

    grass = scale(crop(tiles, 0, 0), SCALE)
    grass_detail = scale(crop(tiles, 9, 0), SCALE)
    soil = scale(crop(tiles, 9, 10), SCALE)
    soil_light = scale(crop(tiles, 9, 11), SCALE)
    path_tile = scale(crop(tiles, 9, 8), SCALE)
    water = scale(crop(tiles, 9, 16), SCALE)

    for row in range(2, 11):
        for col in range(0, 19):
            x = col * TILE
            y = row * TILE
            draw.rectangle((x, y, x + TILE, y + TILE), fill="#4fae4d")
            paste(canvas, grass_detail if (row + col) % 7 == 0 else grass, x, y)

    # Boundary and quiet pond.
    for col in range(0, 19):
        paste(canvas, scale(crop(fence, col % 3, 0), SCALE), col * TILE, 122)
    for row in range(3, 11):
        paste(canvas, scale(crop(fence, 0, 1), SCALE), 22, row * TILE)
    for col in range(16, 19):
        paste(canvas, water, col * TILE, 9 * TILE)

    # Left-side four-layer health matrix: 4 rows x 4 columns.
    row_names = ["CLAUDE.md", "skills", "hooks", "memory"]
    crop_rows = [
        [crop(crops, 2, 1), crop(crops, 3, 1), crop(crops, 4, 1), crop(crops, 5, 1)],
        [crop(crops, 2, 3), crop(crops, 3, 3), crop(crops, 4, 3), crop(crops, 5, 3)],
        [crop(crops, 2, 5), crop(crops, 3, 5), crop(crops, 4, 5), crop(crops, 5, 5)],
        [crop(crops, 2, 7), crop(crops, 3, 7), crop(crops, 4, 7), crop(crops, 5, 7)],
    ]
    plant_points: list[tuple[int, int]] = []
    for row in range(4):
        y = (3 + row) * TILE
        label(draw, (76, y + 24), row_names[row], "#f4f1cd")
        for col in range(4):
            x = (2 + col) * TILE
            paste(canvas, soil if (row + col) % 2 == 0 else soil_light, x, y)
            plant = scale(crop_rows[row][col], SCALE)
            paste(canvas, plant, x, y)
            plant_points.append((x + TILE // 2, y + TILE))

    # Sparse stepping-stone path: even, readable, and not overbuilt.
    stone_points = [
        (7, 3), (7, 4), (7, 5), (7, 6),
        (9, 6), (11, 6), (13, 6), (14, 7), (15, 8),
    ]
    for index, (col, row) in enumerate(stone_points):
        paste(canvas, scale(crop(road, index % 5, 0), SCALE), col * TILE, row * TILE)

    # Tree is the Observe/scan anchor. Bench is the idle anchor.
    large_tree = scale(clear_edge_black(tree_sheet.crop((96, 0, 136, 48))), 4)
    stump = scale(clear_edge_black(tree_sheet.crop((128, 32, 160, 48))), 3)
    paste_center_bottom(canvas, large_tree, 930, 350)
    paste_center_bottom(canvas, stump, 1120, 604)

    bench_sprite = scale(bench, 8)
    paste_center_bottom(canvas, bench_sprite, 1024, 640)

    # A few flower pots use Plants_Spreadsheet as decor without becoming a resource board.
    for index, source in enumerate([(8, 1), (12, 4), (16, 7)]):
        flower = scale(crop(catalog, source[0], source[1]), 2)
        paste_center_bottom(canvas, flower, 1086 + index * 34, 586)

    # Gardener route with semantic anchors. The route is subtle and walkable.
    anchors = {
        "observe": (892, 360),
        "diagnose": (506, 246),
        "plan": (506, 374),
        "act": (414, 454),
        "verify": (506, 520),
        "learn": (780, 520),
        "decide": (668, 420),
        "idle": (1136, 640),
    }
    route = [anchors[key] for key in ["observe", "diagnose", "plan", "act", "verify", "learn", "decide", "idle"]]
    draw.line(route, fill="#e7d77a", width=2)
    for key, (x, y) in anchors.items():
        draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill="#fff1a1")
        label(draw, (x + 8, y - 6), key, "#fff1c2")

    phase_sprites = [
        ("observe", farmer_back_walk, 1),
        ("diagnose", farmer_back_idle, 1),
        ("act", farmer_left_walk, 2),
        ("verify", farmer_right_walk, 2),
        ("idle", farmer_front_idle, 0),
    ]
    for key, sheet, frame_col in phase_sprites:
        x, y = anchors[key]
        paste_center_bottom(canvas, scale(farmer_frame(sheet, frame_col), 2), x, y)

    # Main current character, correctly cut from a 32x64 frame.
    paste_center_bottom(canvas, scale(farmer_frame(farmer_front_walk, 1), 2), anchors["decide"][0], anchors["decide"][1])

    # HUD and scene title.
    draw.rectangle((24, 22, 312, 112), fill=(30, 42, 35, 224), outline="#dce8bc")
    label(draw, (42, 42), "Little Gardener", "#f8efbc")
    label(draw, (42, 66), "4-layer health garden: 4 x 4 beds", "#cfe3c0")
    label(draw, (42, 90), "scan near tree / idle near bench", "#f8efbc")

    # Low-opacity layout grid.
    grid = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    for x in range(0, WIDTH, TILE):
        grid_draw.line((x, 0, x, HEIGHT), fill=(255, 255, 255, 30))
    for y in range(0, HEIGHT, TILE):
        grid_draw.line((0, y, WIDTH, y), fill=(255, 255, 255, 30))
    canvas.alpha_composite(grid)

    label(draw, (24, 688), "scene-overview.png: product layout from existing sprites, 64px grid", "#26362b")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
