"""
Context Gardener — State management.

Handles reading/writing .gardener-state.json and .gardener-memory.json
for cross-session persistence and Loop Engineering lifecycle tracking.
"""

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional


STATE_FILE = ".gardener-state.json"
MEMORY_FILE = ".gardener-memory.json"


def load_state(project_path: str) -> Optional[Dict[str, Any]]:
    """Load .gardener-state.json from the project root."""
    fp = Path(project_path) / STATE_FILE
    if fp.exists():
        try:
            return json.loads(fp.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            return None
    return None


def save_state(project_path: str, state: Dict[str, Any]) -> str:
    """Save .gardener-state.json to the project root."""
    fp = Path(project_path) / STATE_FILE
    write_json_atomic(fp, state)
    return str(fp)


def load_memory(project_path: str) -> Dict[str, Any]:
    """Load .gardener-memory.json from the project root."""
    fp = Path(project_path) / MEMORY_FILE
    if fp.exists():
        try:
            return json.loads(fp.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {
        "sessions": [],
        "patterns": {
            "commonIssues": [],
            "userPreferences": {},
        },
        "falsePositives": [],
    }


def save_memory(project_path: str, memory: Dict[str, Any]) -> str:
    """Save .gardener-memory.json to the project root."""
    fp = Path(project_path) / MEMORY_FILE
    write_json_atomic(fp, memory)
    return str(fp)


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


def init_state(repo: str) -> Dict[str, Any]:
    """Create a new empty state document."""
    return {
        "meta": {
            "repo": repo,
            "createdAt": None,
            "currentPhase": "idle",
            "loopCount": 0,
            "status": "running",
            "firstRunComplete": True,
        },
        "loop": {
            "status": "running",
            "activePhase": "idle",
            "activeLayer": None,
            "firstRunComplete": True,
            "lastTransitionAt": None,
            "stopReason": None,
        },
        "layerHealth": {
            "CLAUDE.md": {"score": 100, "issues": 0, "status": "healthy"},
            "skills": {"score": 100, "issues": 0, "status": "healthy"},
            "hooks": {"score": 100, "issues": 0, "status": "healthy"},
            "memory": {"score": 100, "issues": 0, "status": "healthy"},
        },
        "observe": None,
        "diagnose": None,
        "plan": None,
        "act": None,
        "verify": None,
        "learn": None,
        "decide": None,
    }
