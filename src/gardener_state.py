"""
Context Gardener — State management.

Handles reading/writing .gardener-state.json and .gardener-memory.json
for cross-session persistence and Loop Engineering lifecycle tracking.
"""

import json
import os
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
    fp.write_text(json.dumps(state, ensure_ascii=False, indent=2), "utf-8")
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
    fp.write_text(json.dumps(memory, ensure_ascii=False, indent=2), "utf-8")
    return str(fp)


def init_state(repo: str) -> Dict[str, Any]:
    """Create a new empty state document."""
    return {
        "meta": {
            "repo": repo,
            "createdAt": None,
            "currentPhase": "observe",
            "loopCount": 0,
        },
        "observe": None,
        "diagnose": None,
        "plan": None,
        "act": None,
        "verify": None,
        "learn": None,
        "decide": None,
    }
