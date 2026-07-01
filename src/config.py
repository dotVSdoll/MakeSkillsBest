"""
Context Gardener — Configuration manager.

Reads/writes .gardener-config.json for user-customizable rules.
All settings can be modified at runtime via the garden UI rule panel.

Config file location: <project-root>/.gardener-config.json
"""

import json
import os
import time
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Optional


# ─── Default configuration ───

DEFAULT_CONFIG: Dict[str, Any] = {
    # ── A) Thresholds ──
    "thresholds": {
        "staleDays": 30,
        "maxLines": 200,
        "maxWords": 1000,
        "orphanCheck": True,
    },

    # ── B) Detection toggles ──
    "detection": {
        "stale": True,
        "contradiction": True,
        "bloat": True,
        "orphan": True,
    },

    # ── C) Action strategy ──
    "action": {
        "mode": "ask",             # "ask" | "auto" | "report-only"
        "autoPruneP3": True,       # Auto-apply P3 (low severity) fixes
        "backupEnabled": True,
    },

    # ── D) Loop flow customization ──
    "loop": {
        "enabled": True,
        "mode": "managed",          # "managed" | "custom"
        "skipPhases": [],          # e.g. ["plan"] to skip plan phase
        "maxIterations": 5,
        "requireConfirmationFor": ["act", "replan"],
        "maxRuntimeHours": 24,
        "scanIntervalHours": 6,
        "stepLimit": 6,
        "steps": [
            {"id": "step-1", "phase": "observe", "skill": "gardener-observe", "enabled": True},
            {"id": "step-2", "phase": "diagnose", "skill": "gardener-diagnose", "enabled": True},
            {"id": "step-3", "phase": "plan", "skill": "gardener-plan", "enabled": True},
            {"id": "step-4", "phase": "act", "skill": "gardener-act", "enabled": True},
            {"id": "step-5", "phase": "verify", "skill": "gardener-verify", "enabled": True},
            {"id": "step-6", "phase": "learn", "skill": "gardener-learn", "enabled": True},
        ],
        "exitCondition": {
            "healthTarget": 90,    # Stop when health >= this
            "maxRoundsNoImprovement": 3,  # Stop after N rounds with <5 gain
        },
        "stop": {
            "allowManualStop": True,
            "stopWhenAllLayersHealthy": False,
            "stopAfterScheduledWindow": False,
        },
        "phaseSkills": {
            "observe": {"skill": "gardener-observe", "enabled": True},
            "diagnose": {"skill": "gardener-diagnose", "enabled": True},
            "plan": {"skill": "gardener-plan", "enabled": True},
            "act": {"skill": "gardener-act", "enabled": True},
            "verify": {"skill": "gardener-verify", "enabled": True},
            "learn": {"skill": "gardener-learn", "enabled": True},
            "decide": {"skill": "gardener-decide", "enabled": True},
        },
    },

    # ── Scheduling ──
    "schedule": {
        "enabled": True,
        "cron": "0 */6 * * *",     # Every 6 hours
        "timezone": "local",
        "runWindowMinutes": 1440,
    },
}


def config_path(project_path: str) -> Path:
    return Path(project_path) / ".gardener-config.json"


def load_config(project_path: str) -> Dict[str, Any]:
    """Load config, merging with defaults so unknown keys get defaults."""
    cfg = deepcopy(DEFAULT_CONFIG)
    fp = config_path(project_path)
    if fp.exists():
        try:
            user_cfg = json.loads(fp.read_text("utf-8"))
            _deep_merge(cfg, user_cfg)
        except (json.JSONDecodeError, OSError):
            pass
    _migrate_config(cfg)
    return cfg


def save_config(project_path: str, cfg: Dict[str, Any]) -> str:
    """Save config to file."""
    fp = config_path(project_path)
    write_json_atomic(fp, cfg)
    return str(fp)


def reset_config(project_path: str) -> Dict[str, Any]:
    """Reset to defaults and save."""
    cfg = deepcopy(DEFAULT_CONFIG)
    save_config(project_path, cfg)
    return cfg


def _deep_merge(base: Dict, override: Dict) -> None:
    """Recursively merge override into base (mutates base)."""
    for key, val in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            _deep_merge(base[key], val)
        else:
            base[key] = val


def _migrate_config(cfg: Dict[str, Any]) -> None:
    """Normalize older config files to the current garden loop contract."""
    loop = cfg.setdefault("loop", {})
    defaults = DEFAULT_CONFIG["loop"]
    loop.setdefault("maxRuntimeHours", defaults["maxRuntimeHours"])
    loop.setdefault("scanIntervalHours", defaults["scanIntervalHours"])

    steps = loop.get("steps")
    if (
        not isinstance(steps, list)
        or any(
            isinstance(step, dict)
            and str(step.get("skill", "")).startswith("context-gardener/")
            for step in steps
        )
    ):
        loop["steps"] = deepcopy(defaults["steps"])
        loop["phaseSkills"] = deepcopy(defaults["phaseSkills"])

    schedule = cfg.setdefault("schedule", {})
    schedule_defaults = DEFAULT_CONFIG["schedule"]
    if schedule.get("cron") == "0 9 * * 1":
        schedule["cron"] = schedule_defaults["cron"]
    if schedule.get("runWindowMinutes") == 30:
        schedule["runWindowMinutes"] = schedule_defaults["runWindowMinutes"]
    schedule.setdefault("enabled", schedule_defaults["enabled"])
    schedule.setdefault("timezone", schedule_defaults["timezone"])


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
