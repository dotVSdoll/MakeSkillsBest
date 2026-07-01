"""
Context Gardener — Entry points.

CLI:
    python -m src.main scan [--stale-days N] [--output FILE] <project_path>
    python -m src.main web [--open] [<project_path>]
    python -m src.main garden [<project_path>]

Modes:
    scan        Run scanner + analyser (headless), output JSON report.
    garden      Launch the Pygame immersive garden window.
"""

import argparse
import json
import sys
from pathlib import Path

from src.scanner import scan
from src.analyser import analyse
from src.gardener_state import load_memory
from src.web_runtime import run_web_runtime


def cmd_scan(args: argparse.Namespace) -> None:
    """Headless scan mode: scan project, analyse, output JSON."""
    project_path = args.project or "."
    stale_days = args.stale_days
    max_lines = args.max_lines
    max_words = args.max_words
    output = args.output

    memory = load_memory(project_path)
    print(f"🔍 Scanning {project_path} ...", file=sys.stderr)

    scanned = scan(project_path, memory)
    if scanned.files:
        print(f"   Found {scanned.summary['totalFiles']} context files", file=sys.stderr)
    else:
        print("   ⚠️  No context files found", file=sys.stderr)

    print(f"🩺 Analysing ...", file=sys.stderr)
    issues, health = analyse(
        scanned, stale_days, max_lines, max_words,
        project_path=project_path, memory=memory,
    )

    report = {
        "repo": Path(project_path).resolve().name,
        "timestamp": __import__("time").strftime("%Y-%m-%dT%H:%M:%SZ", __import__("time").gmtime()),
        "scanner": scanned.to_dict(),
        "diagnose": {
            "issues": [i.to_dict() for i in issues],
            "summary": {
                "totalIssues": len(issues),
                "bySeverity": {"P0": 0, "P1": 0, "P2": 0, "P3": 0},
                "gardenHealthScore": health,
            },
        },
        "files": [
            {
                "path": f.path,
                "score": max(0, 100 - len([i for i in issues if i.file == f.path or (isinstance(i.file, list) and f.path in i.file)]) * 15),
                "lines": f.lines,
                "ageDays": f.age_days,
            }
            for f in scanned.files
        ],
    }

    # Fill severity counts
    for i in issues:
        sev = i.severity
        if sev in report["diagnose"]["summary"]["bySeverity"]:
            report["diagnose"]["summary"]["bySeverity"][sev] += 1

    if output:
        Path(output).write_text(json.dumps(report, ensure_ascii=False, indent=2), "utf-8")
        print(f"📝 Report written to {output}", file=sys.stderr)
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2))


def cmd_garden(args: argparse.Namespace) -> None:
    """Launch interactive garden mode (Pygame window)."""
    project_path = args.project or "."
    memory = load_memory(project_path)
    scanned = scan(project_path, memory)

    if not scanned.files:
        print("⚠️  No context files found. Garden will be empty.", file=sys.stderr)

    issues, health = analyse(
        scanned, project_path=project_path, memory=memory,
    )

    try:
        from src.game.garden_scene import run_garden
        state = {
            "health": health if isinstance(health, dict) else {"current": health, "previous": None, "issuesRemaining": len(issues)},
            "issues": [i.to_dict() for i in issues],
            "files": [f.to_dict() for f in scanned.files],
            "project": Path(project_path).resolve().name,
        }
        run_garden(state, project_path=project_path)
    except ImportError as e:
        print(f"❌ Could not start garden: {e}", file=sys.stderr)
        print("   Make sure pygame is installed: pip install pygame", file=sys.stderr)
        sys.exit(1)


def cmd_web(args: argparse.Namespace) -> None:
    """Run one basic loop pass and launch the Web Canvas visualisation."""
    result = run_web_runtime(
        args.project or ".",
        port=args.port,
        open_browser=args.open,
        start_server=not args.no_server,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="🌱 Context Gardener")
    parser.add_argument("--version", action="version", version="0.1.0")
    sub = parser.add_subparsers(dest="mode", help="Mode: scan, web, or garden")

    # scan mode
    scan_p = sub.add_parser("scan", help="Run scanner + analyser (headless)")
    scan_p.add_argument("project", nargs="?", default=".", help="Project path")
    scan_p.add_argument("--stale-days", type=int, default=30, dest="stale_days", help="Staleness threshold (days)")
    scan_p.add_argument("--max-lines", type=int, default=200, dest="max_lines", help="Bloat threshold (lines)")
    scan_p.add_argument("--max-words", type=int, default=1000, dest="max_words", help="Bloat threshold (words)")
    scan_p.add_argument("--output", "-o", type=str, help="Output JSON file path")

    # garden mode
    garden_p = sub.add_parser("garden", help="Launch interactive garden (Pygame)")
    garden_p.add_argument("project", nargs="?", default=".", help="Project path")

    # web mode
    web_p = sub.add_parser("web", help="Run basic loop and launch Web Canvas garden")
    web_p.add_argument("project", nargs="?", default=".", help="Project path")
    web_p.add_argument("--open", action="store_true", help="Open the local web page in a browser")
    web_p.add_argument("--port", type=int, default=5173, help="Vite dev server port")
    web_p.add_argument("--no-server", action="store_true", help="Only write JSON state files")

    args = parser.parse_args()
    if args.mode == "scan":
        cmd_scan(args)
    elif args.mode == "web":
        cmd_web(args)
    elif args.mode == "garden":
        cmd_garden(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
