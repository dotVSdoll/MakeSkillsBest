"""
Context Gardener — Configuration manager.

Reads/writes .gardener-config.json for user-customizable rules.
All settings can be modified at runtime via the garden UI rule panel.

Config file location: <project-root>/.gardener-config.json
"""

import json
import os
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
        "skipPhases": [],          # e.g. ["plan"] to skip plan phase
        "maxIterations": 5,
        "requireConfirmationFor": ["act", "replan"],
        "exitCondition": {
            "healthTarget": 90,    # Stop when health >= this
            "maxRoundsNoImprovement": 3,  # Stop after N rounds with <5 gain
        },
    },

    # ── Scheduling ──
    "schedule": {
        "enabled": False,
        "cron": "0 9 * * 1",       # Every Monday 9am (cron format)
        "timezone": "local",
    },
}


def config_path(project_path: str) -> Path:
    return Path(project_path) / ".gardener-config.json"


def load_config(project_path: str) -> Dict[str, Any]:
    """Load config, merging with defaults so unknown keys get defaults."""
    cfg = dict(DEFAULT_CONFIG)
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
    fp.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), "utf-8")
    return str(fp)


def reset_config(project_path: str) -> Dict[str, Any]:
    """Reset to defaults and save."""
    cfg = dict(DEFAULT_CONFIG)
    save_config(project_path, cfg)
    return cfg


def _deep_merge(base: Dict, override: Dict) -> None:
    """Recursively merge override into base (mutates base)."""
    for key, val in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            _deep_merge(base[key], val)
        else:
            base[key] = val
