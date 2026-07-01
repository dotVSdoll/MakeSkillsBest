"""Web runtime for Context Gardener.

This module connects the existing scanner/analyser backend to the Vite canvas
frontend. It performs one lightweight loop pass, persists the state, mirrors it
into ``web/public`` for the dev server, and can start/open the local web view.
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from src.analyser import Issue, analyse
from src.config import config_path, load_config, save_config
from src.gardener_state import load_memory, save_memory, save_state
from src.scanner import FileInfo, scan


PHASES = ("observe", "diagnose", "plan", "act", "verify", "learn", "decide")
LAYERS = ("CLAUDE.md", "skills", "hooks", "memory")
SEVERITY_PENALTIES = {"P0": 25, "P1": 10, "P2": 5, "P3": 2}
SERVICE_FILE = ".gardener-service.json"


def run_web_runtime(
    project_path: str,
    *,
    port: int = 5173,
    open_browser: bool = False,
    start_server: bool = True,
    keep_alive: bool = False,
    loop_interval: int = 21600,
    max_runtime: int = 86400,
) -> Dict[str, Any]:
    """Open the web visualisation immediately, then run one basic loop pass."""
    project = Path(project_path).resolve()
    repo_root = Path(__file__).resolve().parents[1]
    web_public = repo_root / "web" / "public"
    web_public.mkdir(parents=True, exist_ok=True)

    url = f"http://127.0.0.1:{port}"
    config = load_config(str(project))
    loop_interval = resolve_loop_seconds(
        config,
        provided_seconds=loop_interval,
        default_seconds=21600,
        config_key="scanIntervalHours",
    )
    max_runtime = resolve_loop_seconds(
        config,
        provided_seconds=max_runtime,
        default_seconds=86400,
        config_key="maxRuntimeHours",
    )
    project_config_path = config_path(str(project))
    if not project_config_path.exists() or config_needs_migration(project_config_path):
        save_config(str(project), config)

    bootstrap_state = build_bootstrap_state(project)
    write_json_atomic(web_public / "garden-state.json", bootstrap_state)
    write_json_atomic(web_public / "gardener-config.json", config)
    write_json_atomic(web_public / "gardener-runtime.json", build_runtime_meta(project, url))

    log_path: Optional[Path] = None
    server_started = False
    if start_server:
        server_started, log_path = ensure_vite_server(repo_root, port, project)

    if open_browser and (not start_server or wait_for_port(port, timeout=12)):
        webbrowser.open(url)

    started_at = time.time()
    result = run_loop_pass(project, config, web_public, round_index=1)
    result.update({
        "project": str(project),
        "webStatePath": str(web_public / "garden-state.json"),
        "configPath": str(config_path(str(project))),
        "url": url,
        "loopIntervalSeconds": loop_interval,
        "maxRuntimeSeconds": max_runtime,
        "serverStarted": server_started,
        "serverLog": str(log_path) if log_path else None,
    })

    if keep_alive:
        print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
        round_index = 1
        try:
            while should_keep_running(started_at, max_runtime):
                sleep_seconds = seconds_until_next_pass(started_at, max_runtime, loop_interval)
                sleep_with_idle_heartbeat(project, web_public, result, sleep_seconds)
                if not should_keep_running(started_at, max_runtime):
                    break
                round_index += 1
                config = load_config(str(project))
                result = run_loop_pass(project, config, web_public, round_index=round_index)
                result.update({
                    "project": str(project),
                    "webStatePath": str(web_public / "garden-state.json"),
                    "configPath": str(config_path(str(project))),
                    "url": url,
                    "loopIntervalSeconds": loop_interval,
                    "maxRuntimeSeconds": max_runtime,
                    "serverStarted": server_started,
                    "serverLog": str(log_path) if log_path else None,
                })
                print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
            write_paused_state(project, web_public, result, "max-runtime-reached")
            result["stopReason"] = "max-runtime-reached"
        except KeyboardInterrupt:
            write_paused_state(project, web_public, result, "user-stopped-command")
            return result

    return result


def start_background_service(
    project_path: str,
    *,
    port: int = 5173,
    loop_interval: int = 21600,
    max_runtime: int = 86400,
) -> Dict[str, Any]:
    """Start or reuse the detached project scanner service."""
    project = Path(project_path).resolve()
    existing = load_service_state(project)
    if existing and existing.get("status") == "running" and pid_is_running(existing.get("pid")):
        existing["reused"] = True
        return existing

    repo_root = Path(__file__).resolve().parents[1]
    log_dir = repo_root / "summary" / "runtime-logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"service-{time.strftime('%Y%m%d-%H%M%S')}.log"
    log_file = log_path.open("a", encoding="utf-8")

    args = [
        sys.executable,
        "-m",
        "src.main",
        "service",
        str(project),
        "--port",
        str(port),
        "--loop-interval",
        str(loop_interval),
        "--max-runtime",
        str(max_runtime),
    ]

    popen_kwargs: Dict[str, Any] = {
        "cwd": repo_root,
        "stdout": log_file,
        "stderr": subprocess.STDOUT,
        "stdin": subprocess.DEVNULL,
        "env": {**os.environ, "GARDENER_PROJECT_PATH": str(project)},
    }
    if sys.platform.startswith("win"):
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    else:
        popen_kwargs["start_new_session"] = True

    process = subprocess.Popen(args, **popen_kwargs)
    now = time.time()
    state = build_service_state(
        project,
        pid=process.pid,
        port=port,
        interval_seconds=loop_interval,
        max_runtime_seconds=max_runtime,
        status="running",
        reason=None,
        started_at=now,
        next_scan_at=now + loop_interval,
        log_path=log_path,
    )
    state["reused"] = False
    save_service_state(project, state)
    return state


def run_service_process(
    project_path: str,
    *,
    port: int = 5173,
    loop_interval: int = 21600,
    max_runtime: int = 86400,
) -> Dict[str, Any]:
    """Run the detached scheduler loop. This is called by the service child."""
    project = Path(project_path).resolve()
    repo_root = Path(__file__).resolve().parents[1]
    web_public = repo_root / "web" / "public"
    web_public.mkdir(parents=True, exist_ok=True)

    start = time.time()
    stop_at = start + max_runtime if max_runtime > 0 else None
    next_scan = start + max(1, loop_interval)
    round_index = next_round_index(project)
    last_result: Dict[str, Any] = {}
    stop_reason = "max-runtime-reached"

    save_service_state(
        project,
        build_service_state(
            project,
            pid=os.getpid(),
            port=port,
            interval_seconds=loop_interval,
            max_runtime_seconds=max_runtime,
            status="running",
            reason=None,
            started_at=start,
            next_scan_at=next_scan,
            log_path=None,
        ),
    )

    try:
        while stop_at is None or time.time() < stop_at:
            while time.time() < next_scan:
                if service_stop_requested(project):
                    stop_reason = "user-stopped-service"
                    stop_at = time.time()
                    break
                time.sleep(min(5, max(1, next_scan - time.time())))

            if stop_at is not None and time.time() >= stop_at:
                break

            config = load_config(str(project))
            round_index += 1
            save_service_state(
                project,
                build_service_state(
                    project,
                    pid=os.getpid(),
                    port=port,
                    interval_seconds=loop_interval,
                    max_runtime_seconds=max_runtime,
                    status="scanning",
                    reason=None,
                    started_at=start,
                    next_scan_at=next_scan,
                    log_path=None,
                ),
            )
            last_result = run_loop_pass(project, config, web_public, round_index=round_index)
            next_scan = time.time() + max(1, loop_interval)
            save_service_state(
                project,
                build_service_state(
                    project,
                    pid=os.getpid(),
                    port=port,
                    interval_seconds=loop_interval,
                    max_runtime_seconds=max_runtime,
                    status="running",
                    reason=None,
                    started_at=start,
                    next_scan_at=next_scan,
                    log_path=None,
                ),
            )
    finally:
        if last_result:
            write_paused_state(project, web_public, last_result, stop_reason)
        write_service_stopped(project, port, loop_interval, max_runtime, stop_reason)

    return load_service_state(project) or {}


def stop_background_service(project_path: str) -> Dict[str, Any]:
    """Request the detached scheduler to stop."""
    project = Path(project_path).resolve()
    state = load_service_state(project) or {}
    state["status"] = "stopping"
    state["stopRequestedAt"] = iso_now()
    state["reason"] = "user-stopped-service"
    save_service_state(project, state)
    pid = state.get("pid")
    if pid_is_running(pid):
        try:
            if sys.platform.startswith("win"):
                subprocess.run(["taskkill", "/pid", str(pid), "/t", "/f"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                os.kill(int(pid), 15)
        except OSError:
            pass
    state["status"] = "stopped"
    state["stoppedAt"] = iso_now()
    save_service_state(project, state)
    return state


def run_loop_pass(
    project: Path,
    config: Dict[str, Any],
    web_public: Path,
    *,
    round_index: int = 1,
) -> Dict[str, Any]:
    """Run one observe/diagnose pass and mirror each visible step."""
    write_web_json_if_current(web_public, project, "garden-state.json", build_step_state(project, "observe"))

    memory = load_memory(str(project))
    scanned = scan(str(project), memory)
    write_web_json_if_current(
        web_public,
        project,
        "garden-state.json",
        build_step_state(project, "diagnose", files_scanned=len(scanned.files)),
    )

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
    state = build_web_state(project, scanned.files, issues, visual_health, layer_health, active_layer, round_index)

    project_state_path = save_state(str(project), state)
    memory_path = persist_round_memory(project, state, scanned.files, issues, round_index)
    round_path = persist_round_snapshot(project, state, round_index)
    write_web_json_if_current(web_public, project, "garden-state.json", state)
    write_web_json_if_current(web_public, project, "gardener-config.json", config)

    return {
        "statePath": project_state_path,
        "health": visual_health,
        "analyserHealth": analyser_health,
        "issues": len(issues),
        "activePhase": state["loop"]["activePhase"],
        "activeLayer": active_layer,
        "visualPhases": enabled_visual_phases(config),
        "memoryPath": memory_path,
        "roundPath": round_path,
        "round": round_index,
    }


def sleep_with_idle_heartbeat(
    project: Path,
    web_public: Path,
    result: Dict[str, Any],
    loop_interval: int,
) -> None:
    """Keep the process alive while the visual state rests between passes."""
    deadline = time.time() + max(1, loop_interval)
    while time.time() < deadline:
        state_path = Path(str(result.get("statePath", "")))
        if state_path.exists():
            try:
                state = json.loads(state_path.read_text("utf-8"))
            except (json.JSONDecodeError, OSError):
                state = build_bootstrap_state(project)
        else:
            state = build_bootstrap_state(project)

        active_layer = result.get("activeLayer")
        active_phase = next_heartbeat_phase(result, active_layer)

        state["meta"]["status"] = "running"
        state["meta"]["currentPhase"] = active_phase
        state["meta"]["stateRole"] = f"heartbeat-{active_phase}"
        state["loop"]["status"] = "running"
        state["loop"]["activePhase"] = active_phase
        state["loop"]["activeLayer"] = active_layer
        state["loop"]["lastTransitionAt"] = iso_now()
        state["loop"]["stopReason"] = None
        write_web_json_if_current(web_public, project, "garden-state.json", state)
        time.sleep(min(5, max(1, deadline - time.time())))


def write_paused_state(
    project: Path,
    web_public: Path,
    result: Dict[str, Any],
    stop_reason: str,
) -> None:
    """Mark the visual loop as paused when the user stops the command."""
    state_path = Path(str(result.get("statePath", "")))
    if state_path.exists():
        try:
            state = json.loads(state_path.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            state = build_bootstrap_state(project)
    else:
        state = build_bootstrap_state(project)

    state["meta"]["status"] = "paused"
    state["loop"]["status"] = "paused"
    state["loop"]["activePhase"] = "idle"
    state["loop"]["activeLayer"] = None
    state["loop"]["lastTransitionAt"] = iso_now()
    state["loop"]["stopReason"] = stop_reason
    save_state(str(project), state)
    persist_stop_memory(project, state, stop_reason)
    write_web_json_if_current(web_public, project, "garden-state.json", state)


def next_heartbeat_phase(result: Dict[str, Any], active_layer: Any) -> str:
    """Choose a visible phase while the long-running loop waits."""
    if active_layer:
        phase = result.get("activePhase")
        return phase if isinstance(phase, str) and phase in PHASES else "diagnose"
    return "idle"


def build_bootstrap_state(project: Path) -> Dict[str, Any]:
    """Create the first visible state shown while the loop starts."""
    now = iso_now()
    layer_health = {
        layer: {"score": 100, "issues": 0, "status": "healthy"}
        for layer in LAYERS
    }

    return {
        "meta": {
            "repo": project.name,
            "createdAt": now,
            "currentPhase": "observe",
            "loopCount": 1,
            "status": "running",
            "firstRunComplete": False,
            "stateRole": "bootstrap-before-scan",
        },
        "health": {
            "current": 100,
            "previous": None,
            "issuesRemaining": 0,
        },
        "issues": [],
        "files": [],
        "project": project.name,
        "layerHealth": layer_health,
        "loop": {
            "status": "running",
            "activePhase": "observe",
            "activeLayer": None,
            "firstRunComplete": False,
            "lastTransitionAt": now,
            "stopReason": None,
        },
        "observe": {
            "filesScanned": 0,
        },
        "diagnose": None,
        "plan": None,
        "act": None,
        "verify": None,
        "learn": None,
        "decide": None,
    }


def build_runtime_meta(project: Path, url: str) -> Dict[str, Any]:
    """Expose the current target project to the local Vite config API."""
    return {
        "project": str(project),
        "projectName": project.name,
        "configPath": str(config_path(str(project))),
        "statePath": str(project / ".gardener-state.json"),
        "memoryPath": str(project / ".gardener-memory.json"),
        "url": url,
        "updatedAt": iso_now(),
    }


def build_step_state(
    project: Path,
    phase: str,
    *,
    files_scanned: int = 0,
) -> Dict[str, Any]:
    """Create a transient state that mirrors the step currently being executed."""
    state = build_bootstrap_state(project)
    state["meta"]["currentPhase"] = phase
    state["meta"]["stateRole"] = f"running-{phase}"
    state["loop"]["activePhase"] = phase
    state["loop"]["lastTransitionAt"] = iso_now()
    state["observe"] = {"filesScanned": files_scanned}
    return state


def build_web_state(
    project: Path,
    files: Iterable[FileInfo],
    issues: List[Issue],
    health: int,
    layer_health: Dict[str, Dict[str, Any]],
    active_layer: Optional[str],
    round_index: int,
) -> Dict[str, Any]:
    """Create the JSON shape consumed by the React canvas app."""
    now = iso_now()
    phase = "diagnose" if active_layer else "idle"
    status = "running"

    return {
        "meta": {
            "repo": project.name,
            "createdAt": now,
            "currentPhase": phase,
            "loopCount": round_index,
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
            "stopReason": None,
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


def enabled_visual_phases(config: Dict[str, Any]) -> List[str]:
    """Return enabled loop phases for the visual heartbeat."""
    steps = config.get("loop", {}).get("steps", [])
    phases: List[str] = []
    if isinstance(steps, list):
        for step in steps:
            if not isinstance(step, dict):
                continue
            phase = step.get("phase")
            if step.get("enabled", True) and phase in PHASES and phase not in phases:
                phases.append(str(phase))

    if phases:
        return phases
    return list(PHASES[:6])


def file_score(file: FileInfo, issues: List[Issue]) -> int:
    """Compute a stable per-file display score."""
    score = 100
    for issue in issues:
        raw_files = issue.file if isinstance(issue.file, list) else [issue.file]
        if file.path in raw_files:
            score -= SEVERITY_PENALTIES.get(issue.severity, 0)
    return max(0, score)


def ensure_vite_server(repo_root: Path, port: int, project: Path) -> Tuple[bool, Optional[Path]]:
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
        env={**os.environ, "GARDENER_PROJECT_PATH": str(project)},
        creationflags=creationflags,
    )
    wait_for_port(port, timeout=15)
    return True, log_path


def persist_round_memory(
    project: Path,
    state: Dict[str, Any],
    files: Iterable[FileInfo],
    issues: List[Issue],
    round_index: int,
) -> str:
    """Append one durable round record for future Claude Code sessions."""
    memory = load_memory(str(project))
    sessions = memory.setdefault("sessions", [])
    sessions.append({
        "round": round_index,
        "timestamp": state["loop"]["lastTransitionAt"],
        "repo": project.name,
        "health": state["health"],
        "layerHealth": state["layerHealth"],
        "activePhase": state["loop"]["activePhase"],
        "activeLayer": state["loop"]["activeLayer"],
        "filesScanned": len(list(files)) if not isinstance(files, list) else len(files),
        "issues": [
            {
                "id": issue.id,
                "severity": issue.severity,
                "type": issue.type,
                "file": issue_file_label(issue),
            }
            for issue in issues
        ],
    })
    memory["lastRun"] = sessions[-1]
    return save_memory(str(project), memory)


def persist_round_snapshot(project: Path, state: Dict[str, Any], round_index: int) -> str:
    """Keep a per-round JSON snapshot instead of only the latest state."""
    run_dir = project / ".gardener-runs"
    run_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S", time.gmtime())
    path = run_dir / f"round-{round_index:04d}-{stamp}.json"
    write_json_atomic(path, state)
    return str(path)


def persist_stop_memory(project: Path, state: Dict[str, Any], stop_reason: str) -> str:
    """Record why the long-lived loop paused."""
    memory = load_memory(str(project))
    stops = memory.setdefault("stops", [])
    stops.append({
        "timestamp": state["loop"]["lastTransitionAt"],
        "reason": stop_reason,
        "repo": project.name,
        "health": state.get("health"),
    })
    memory["lastStop"] = stops[-1]
    return save_memory(str(project), memory)


def service_path(project: Path) -> Path:
    return project / SERVICE_FILE


def load_service_state(project: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(service_path(project).read_text("utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def save_service_state(project: Path, state: Dict[str, Any]) -> str:
    write_json_atomic(service_path(project), state)
    return str(service_path(project))


def build_service_state(
    project: Path,
    *,
    pid: int,
    port: int,
    interval_seconds: int,
    max_runtime_seconds: int,
    status: str,
    reason: Optional[str],
    started_at: float,
    next_scan_at: Optional[float],
    log_path: Optional[Path],
) -> Dict[str, Any]:
    stop_at = started_at + max_runtime_seconds if max_runtime_seconds > 0 else None
    return {
        "pid": pid,
        "project": str(project),
        "port": port,
        "intervalSeconds": interval_seconds,
        "maxRuntimeSeconds": max_runtime_seconds,
        "startedAt": iso_from_epoch(started_at),
        "stopAt": iso_from_epoch(stop_at) if stop_at else None,
        "nextScanAt": iso_from_epoch(next_scan_at) if next_scan_at else None,
        "status": status,
        "reason": reason,
        "logPath": str(log_path) if log_path else None,
        "updatedAt": iso_now(),
    }


def write_service_stopped(
    project: Path,
    port: int,
    interval_seconds: int,
    max_runtime_seconds: int,
    reason: str,
) -> None:
    existing = load_service_state(project) or {}
    started_at = parse_iso_epoch(existing.get("startedAt")) or time.time()
    state = build_service_state(
        project,
        pid=int(existing.get("pid") or os.getpid()),
        port=port,
        interval_seconds=interval_seconds,
        max_runtime_seconds=max_runtime_seconds,
        status="stopped",
        reason=reason,
        started_at=started_at,
        next_scan_at=None,
        log_path=Path(str(existing["logPath"])) if existing.get("logPath") else None,
    )
    state["stoppedAt"] = iso_now()
    save_service_state(project, state)


def service_stop_requested(project: Path) -> bool:
    state = load_service_state(project)
    return bool(state and state.get("status") == "stopping")


def pid_is_running(pid: Any) -> bool:
    try:
        pid_int = int(pid)
    except (TypeError, ValueError):
        return False
    if pid_int <= 0:
        return False
    if sys.platform.startswith("win"):
        try:
            result = subprocess.run(
                ["tasklist", "/FI", f"PID eq {pid_int}", "/FO", "CSV", "/NH"],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                timeout=2,
            )
            return str(pid_int) in result.stdout
        except (OSError, subprocess.TimeoutExpired):
            return False
    try:
        os.kill(pid_int, 0)
        return True
    except Exception:
        return False


def next_round_index(project: Path) -> int:
    state_path = project / ".gardener-state.json"
    try:
        state = json.loads(state_path.read_text("utf-8"))
        return int(state.get("meta", {}).get("loopCount") or 1)
    except (json.JSONDecodeError, OSError, TypeError, ValueError):
        return 1


def iso_from_epoch(value: Optional[float]) -> str:
    if value is None:
        return iso_now()
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(value))


def parse_iso_epoch(value: Any) -> Optional[float]:
    if not isinstance(value, str) or not value:
        return None
    try:
        return time.mktime(time.strptime(value, "%Y-%m-%dT%H:%M:%SZ"))
    except ValueError:
        return None


def should_keep_running(started_at: float, max_runtime: int) -> bool:
    """Return whether the default long-lived loop should continue."""
    if max_runtime <= 0:
        return True
    return time.time() - started_at < max_runtime


def seconds_until_next_pass(started_at: float, max_runtime: int, loop_interval: int) -> int:
    """Cap the idle wait so max-runtime pauses happen on time."""
    interval = max(1, loop_interval)
    if max_runtime <= 0:
        return interval
    remaining = max_runtime - int(time.time() - started_at)
    return max(1, min(interval, remaining))


def resolve_loop_seconds(
    config: Dict[str, Any],
    *,
    provided_seconds: int,
    default_seconds: int,
    config_key: str,
) -> int:
    """Use config hour values when the CLI did not override the default."""
    if provided_seconds != default_seconds:
        return provided_seconds
    hours = config.get("loop", {}).get(config_key)
    if not isinstance(hours, (int, float)) or hours <= 0:
        return default_seconds
    return int(hours * 3600)


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


def write_web_json_if_current(
    web_public: Path,
    project: Path,
    filename: str,
    data: Dict[str, Any],
) -> None:
    """Write the shared web mirror only for the currently selected project."""
    runtime_path = web_public / "gardener-runtime.json"
    try:
        runtime = json.loads(runtime_path.read_text("utf-8"))
    except (json.JSONDecodeError, OSError):
        runtime = None

    runtime_project = Path(str(runtime.get("project", ""))).resolve() if isinstance(runtime, dict) and runtime.get("project") else None
    if runtime_project and runtime_project != project.resolve():
        return
    write_json_atomic(web_public / filename, data)


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
    steps = loop.get("steps")
    if (
        not isinstance(steps, list)
        or "stepLimit" not in loop
        or "maxRuntimeHours" not in loop
        or "scanIntervalHours" not in loop
    ):
        return True
    schedule = data.get("schedule", {})
    if (
        schedule.get("cron") == "0 9 * * 1"
        or schedule.get("runWindowMinutes") == 30
    ):
        return True
    return any(
        isinstance(step, dict) and str(step.get("skill", "")).startswith("context-gardener/")
        for step in steps
    )


def write_json_atomic(path: Path, data: Dict[str, Any]) -> None:
    """Write JSON via a temporary file and atomic replace."""
    tmp = path.with_name(f"{path.name}.{os.getpid()}.{time.time_ns()}.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    for attempt in range(8):
        try:
            tmp.replace(path)
            return
        except PermissionError:
            if attempt == 7:
                raise
            time.sleep(0.05 * (attempt + 1))
