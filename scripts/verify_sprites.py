"""精灵图资源验证脚本"""
from pathlib import Path
from PIL import Image
import sys


def analyze_sprite(image_path: Path) -> dict:
    """分析单张精灵图的属性"""
    img = Image.open(image_path)

    result = {
        "file": image_path.name,
        "size": img.size,
        "width": img.width,
        "height": img.height,
        "mode": img.mode,
        "format": img.format,
    }

    # 检查透明通道的实际使用情况
    if img.mode == "RGBA":
        # 统计透明和半透明像素
        total_pixels = img.width * img.height
        fully_opaque = 0
        semi_transparent = 0
        fully_transparent = 0

        # 使用 getchannel 获取 alpha 通道
        alpha = img.getchannel("A")
        for val in alpha.getdata():
            if val == 255:
                fully_opaque += 1
            elif val == 0:
                fully_transparent += 1
            else:
                semi_transparent += 1

        result["transparent_stats"] = {
            "total": total_pixels,
            "fully_opaque": fully_opaque,
            "semi_transparent": semi_transparent,
            "fully_transparent": fully_transparent,
            "transparent_ratio": round(fully_transparent / total_pixels * 100, 2),
        }
        result["has_real_transparency"] = fully_transparent > 0 or semi_transparent > 0

    # 检查是否满足规范
    specs = {
        "format": img.format == "PNG",
        "size_64x64": img.size == (64, 64),
        "has_alpha": img.mode == "RGBA",
        "has_transparent_pixels": result.get("has_real_transparency", False),
    }
    result["specs_check"] = specs
    result["all_passed"] = all(specs.values())

    # 颜色分析（只统计不透明像素）
    if img.mode == "RGBA":
        pixels = list(img.getdata())
        non_transparent = [p[:3] for p in pixels if len(p) > 3 and p[3] > 0]
        if non_transparent:
            avg_r = sum(p[0] for p in non_transparent) / len(non_transparent)
            avg_g = sum(p[1] for p in non_transparent) / len(non_transparent)
            avg_b = sum(p[2] for p in non_transparent) / len(non_transparent)
            result["avg_color"] = {"r": round(avg_r, 1), "g": round(avg_g, 1), "b": round(avg_b, 1)}
            result["warm_green_dominant"] = avg_g > avg_r and avg_g > avg_b

    return result


def main():
    sprite_dir = Path(__file__).parent.parent / "src" / "sprites" / "gardener"

    print("=" * 60)
    print("精灵图资源分析报告")
    print("=" * 60)
    print()

    results = []
    for img_path in sorted(sprite_dir.glob("*.png")):
        print(f"分析: {img_path.name}")
        result = analyze_sprite(img_path)
        results.append(result)

        print(f"  尺寸: {result['width']}x{result['height']}")
        print(f"  模式: {result['mode']}")
        print(f"  格式: {result['format']}")

        if "transparent_stats" in result:
            ts = result["transparent_stats"]
            print(f"  像素统计:")
            print(f"    - 完全不透明: {ts['fully_opaque']} ({ts['fully_opaque']/ts['total']*100:.1f}%)")
            print(f"    - 半透明: {ts['semi_transparent']} ({ts['semi_transparent']/ts['total']*100:.1f}%)")
            print(f"    - 完全透明: {ts['fully_transparent']} ({ts['transparent_ratio']}%)")
            print(f"  是否有透明像素: {'是' if result['has_real_transparency'] else '否'}")

        if "avg_color" in result:
            c = result["avg_color"]
            print(f"  平均颜色(不含透明): RGB({c['r']}, {c['g']}, {c['b']})")
            print(f"  暖绿主调: {'是' if result['warm_green_dominant'] else '否'}")
        print(f"  规范检查: {'全部通过 [PASS]' if result['all_passed'] else '部分未通过 [FAIL]'}")
        if not result['all_passed']:
            for k, v in result['specs_check'].items():
                if not v:
                    print(f"    - {k}: {'通过' if v else '未通过'}")
        print()

    # 总结
    print("=" * 60)
    print("规范对照表")
    print("=" * 60)
    print(f"  要求: PNG 格式, 64x64 像素, RGBA 模式 (透明)")
    print()
    passed = [r for r in results if r["all_passed"]]
    print(f"  通过: {len(passed)}/{len(results)} 张")
    for r in passed:
        print(f"    [OK] {r['file']}")
    if len(results) > len(passed):
        failed = [r for r in results if not r["all_passed"]]
        for r in failed:
            print(f"    [FAIL] {r['file']}")


if __name__ == "__main__":
    main()
