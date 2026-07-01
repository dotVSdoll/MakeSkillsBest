"""
Context Gardener — Configuration manager.

Reads/writes .gardener-config.json for user-customizable rules.
All settings can be modified at runtime via the garden UI rule panel.

Config file location: <project-root>/.gardener-config.json
"""

import json
import os
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
        "stepLimit": 6,
        "steps": [
            {"id": "step-1", "phase": "observe", "skill": "context-gardener/observe", "enabled": True},
            {"id": "step-2", "phase": "diagnose", "skill": "context-gardener/diagnose", "enabled": True},
            {"id": "step-3", "phase": "plan", "skill": "context-gardener/plan", "enabled": True},
            {"id": "step-4", "phase": "act", "skill": "context-gardener/act", "enabled": True},
            {"id": "step-5", "phase": "verify", "skill": "context-gardener/verify", "enabled": True},
            {"id": "step-6", "phase": "learn", "skill": "context-gardener/learn", "enabled": True},
        ],
        "exitCondition": {
            "healthTarget": 90,    # Stop when health >= this
            "maxRoundsNoImprovement": 3,  # Stop after N rounds with <5 gain
        },
        "stop": {
            "allowManualStop": True,
            "stopWhenAllLayersHealthy": True,
            "stopAfterScheduledWindow": True,
        },
        "phaseSkills": {
            "observe": {"skill": "context-gardener", "enabled": True},
            "diagnose": {"skill": "context-gardener", "enabled": True},
            "plan": {"skill": "context-gardener", "enabled": True},
            "act": {"skill": "context-gardener", "enabled": True},
            "verify": {"skill": "context-gardener", "enabled": True},
            "learn": {"skill": "context-gardener", "enabled": True},
            "decide": {"skill": "context-gardener", "enabled": True},
        },
    },

    # ── Scheduling ──
    "schedule": {
        "enabled": False,
        "cron": "0 9 * * 1",       # Every Monday 9am (cron format)
        "timezone": "local",
        "runWindowMinutes": 30,
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


def write_json_atomic(path: Path, data: Dict[str, Any]) -> None:
    """Write JSON via a temporary file and atomic replace."""
    tmp = path.with_name(f"{path.name}.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    tmp.replace(path)
