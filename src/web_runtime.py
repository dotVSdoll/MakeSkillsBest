"""Web runtime for Context Gardener.

This module connects the existing scanner/analyser backend to the Vite canvas
frontend. It performs one lightweight loop pass, persists the state, mirrors it
into ``web/public`` for the dev server, and can start/open the local web view.
"""

from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from src.analyser import Issue, analyse
from src.config import config_path, load_config, save_config
from src.gardener_state import load_memory, save_state
from src.scanner import FileInfo, scan


PHASES = ("observe", "diagnose", "plan", "act", "verify", "learn", "decide")
LAYERS = ("CLAUDE.md", "skills", "hooks", "memory")
SEVERITY_PENALTIES = {"P0": 25, "P1": 10, "P2": 5, "P3": 2}


def run_web_runtime(
    project_path: str,
    *,
    port: int = 5173,
    open_browser: bool = False,
    start_server: bool = True,
) -> Dict[str, Any]:
    """Run one basic loop pass and prepare the web visualisation."""
    project = Path(project_path).resolve()
    repo_root = Path(__file__).resolve().parents[1]
    web_public = repo_root / "web" / "public"
    web_public.mkdir(parents=True, exist_ok=True)

    config = load_config(str(project))
    project_config_path = config_path(str(project))
    if not project_config_path.exists() or config_needs_migration(project_config_path):
        save_config(str(project), config)

    memory = load_memory(str(project))
    scanned = scan(str(project), memory)
    thresholds = config.get("thresholds", {})
    issues, analyser_health = analyse(
        scanned,
        thresholds.get("staleDays", 30),
        thresholds.get("maxLines", 200),
        thresholds.get("maxWords", 1000),
        project_path=str(project),
        memory=memory,
    )

    layer_health = build_layer_health(scanned.files, issues)
    target = config.get("loop", {}).get("exitCondition", {}).get("healthTarget", 90)
    active_layer = pick_active_layer(layer_health, target)
    visual_health = overall_health_from_layers(layer_health)
    state = build_web_state(project, scanned.files, issues, visual_health, layer_health, active_layer)

    project_state_path = save_state(str(project), state)
    write_json_atomic(web_public / "garden-state.json", state)
    write_json_atomic(web_public / "gardener-config.json", config)

    url = f"http://127.0.0.1:{port}"
    log_path: Optional[Path] = None
    server_started = False
    if start_server:
        server_started, log_path = ensure_vite_server(repo_root, port)

    if open_browser and (not start_server or wait_for_port(port, timeout=12)):
        webbrowser.open(url)

    return {
        "project": str(project),
        "statePath": project_state_path,
        "webStatePath": str(web_public / "garden-state.json"),
        "configPath": str(config_path(str(project))),
        "url": url,
        "serverStarted": server_started,
        "serverLog": str(log_path) if log_path else None,
        "health": visual_health,
        "analyserHealth": analyser_health,
        "issues": len(issues),
        "activeLayer": active_layer,
    }


def build_web_state(
    project: Path,
    files: Iterable[FileInfo],
    issues: List[Issue],
    health: int,
    layer_health: Dict[str, Dict[str, Any]],
    active_layer: Optional[str],
) -> Dict[str, Any]:
    """Create the JSON shape consumed by the React canvas app."""
    now = iso_now()
    phase = "diagnose" if active_layer else "idle"
    status = "running" if active_layer else "standby"

    return {
        "meta": {
            "repo": project.name,
            "createdAt": now,
            "currentPhase": phase,
            "loopCount": 1,
            "status": status,
            "firstRunComplete": True,
            "stateRole": "persistent-state-and-web-mirror",
        },
        "health": {
            "current": health,
            "previous": None,
            "issuesRemaining": len(issues),
        },
        "issues": [
            {
                "id": issue.id,
                "file": issue_file_label(issue),
                "severity": issue.severity,
                "type": issue.type,
                "message": issue.detail,
                "suggestion": issue.suggestion,
            }
            for issue in issues
        ],
        "files": [
            {
                "path": file.path,
                "score": file_score(file, issues),
                "lines": file.lines,
                "ageDays": file.age_days,
            }
            for file in files
        ],
        "project": project.name,
        "layerHealth": layer_health,
        "loop": {
            "status": status,
            "activePhase": phase,
            "activeLayer": active_layer,
            "firstRunComplete": True,
            "lastTransitionAt": now,
            "stopReason": None if active_layer else "all-layers-healthy",
        },
        "observe": {
            "filesScanned": len(list(files)) if not isinstance(files, list) else len(files),
        },
        "diagnose": {
            "issues": len(issues),
            "health": health,
        },
        "plan": None,
        "act": None,
        "verify": None,
        "learn": None,
        "decide": None,
    }


def build_layer_health(files: Iterable[FileInfo], issues: List[Issue]) -> Dict[str, Dict[str, Any]]:
    """Aggregate issue penalties into the four visual garden layers."""
    result: Dict[str, Dict[str, Any]] = {
        layer: {"score": 100, "issues": 0, "status": "healthy"}
        for layer in LAYERS
    }

    file_layers = {file.path: layer_for_path(file.path) for file in files}
    for issue in issues:
        touched_layers = issue_layers(issue, file_layers)
        for layer in touched_layers:
            result[layer]["issues"] += 1
            result[layer]["score"] = max(
                0,
                result[layer]["score"] - SEVERITY_PENALTIES.get(issue.severity, 0),
            )

    for layer, data in result.items():
        if data["score"] < 60:
            data["status"] = "critical"
        elif data["score"] < 90 or data["issues"] > 0:
            data["status"] = "warning"
        else:
            data["status"] = "healthy"

    return result


def overall_health_from_layers(layer_health: Dict[str, Dict[str, Any]]) -> int:
    """Compute the authoritative visual health score from layer health."""
    if not layer_health:
        return 100
    scores = [int(data.get("score", 100)) for data in layer_health.values()]
    if not scores:
        return 100
    return round(sum(scores) / len(scores))


def issue_layers(issue: Issue, file_layers: Dict[str, str]) -> List[str]:
    """Return all visual layers touched by an analyser issue."""
    raw_files = issue.file if isinstance(issue.file, list) else [issue.file]
    layers = [file_layers.get(str(file), layer_for_path(str(file))) for file in raw_files]
    return sorted(set(layers))


def issue_file_label(issue: Issue) -> str:
    """Return a frontend-friendly file label for an issue."""
    if isinstance(issue.file, list):
        return " -> ".join(str(file) for file in issue.file)
    return str(issue.file)


def layer_for_path(path: str) -> str:
    """Map project files into the four visual rows."""
    normalized = path.replace("\\", "/").lower()
    if normalized == "claude.md" or normalized.endswith("/claude.md"):
        return "CLAUDE.md"
    if normalized.startswith("skills/") or "/skills/" in normalized:
        return "skills"
    if (
        normalized.startswith("hooks/")
        or "/hooks/" in normalized
        or normalized.startswith(".claude/hooks/")
        or normalized.startswith(".claude/commands/")
        or normalized.startswith("commands/")
    ):
        return "hooks"
    if "memory" in normalized or normalized.endswith(".gardener-memory.json"):
        return "memory"
    return "CLAUDE.md"


def pick_active_layer(layer_health: Dict[str, Dict[str, Any]], health_target: int) -> Optional[str]:
    """Choose the first layer that needs attention."""
    for layer in LAYERS:
        data = layer_health[layer]
        if data["score"] < health_target or data["issues"] > 0:
            return layer
    return None


def file_score(file: FileInfo, issues: List[Issue]) -> int:
    """Compute a stable per-file display score."""
    score = 100
    for issue in issues:
        raw_files = issue.file if isinstance(issue.file, list) else [issue.file]
        if file.path in raw_files:
            score -= SEVERITY_PENALTIES.get(issue.severity, 0)
    return max(0, score)


def ensure_vite_server(repo_root: Path, port: int) -> Tuple[bool, Optional[Path]]:
    """Start Vite unless a server is already listening on the target port."""
    if wait_for_port(port, timeout=0.2):
        return False, None

    web_dir = repo_root / "web"
    log_dir = repo_root / "summary" / "runtime-logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"vite-{time.strftime('%Y%m%d-%H%M%S')}.log"
    log_file = log_path.open("a", encoding="utf-8")

    npm = "npm.cmd" if sys.platform.startswith("win") else "npm"
    creationflags = 0
    if sys.platform.startswith("win"):
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP

    subprocess.Popen(
        [npm, "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port)],
        cwd=web_dir,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
    )
    wait_for_port(port, timeout=15)
    return True, log_path


def wait_for_port(port: int, *, timeout: float) -> bool:
    """Wait until localhost accepts TCP connections on ``port``."""
    deadline = time.time() + timeout
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.25)
            try:
                sock.connect(("127.0.0.1", port))
                return True
            except OSError:
                pass

        if time.time() >= deadline:
            return False
        time.sleep(0.2)


def iso_now() -> str:
    """Return a UTC ISO timestamp."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def config_needs_migration(path: Path) -> bool:
    """Return True when an existing config is missing current loop fields."""
    try:
        data = json.loads(path.read_text("utf-8"))
    except (json.JSONDecodeError, OSError):
        return True

    loop = data.get("loop", {})
    return not isinstance(loop.get("steps"), list) or "stepLimit" not in loop


def write_json_atomic(path: Path, data: Dict[str, Any]) -> None:
    """Write JSON via a temporary file and atomic replace."""
    tmp = path.with_name(f"{path.name}.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    tmp.replace(path)
