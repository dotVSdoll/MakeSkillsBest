"""
Context Gardener — Issue analyser.

Analyses the scanner output to detect:
    D1 — Stale: files not updated in N days
    D2 — Contradiction: conflicting rules across files
    D3 — Bloat: files exceeding size thresholds
    D4 — Redundancy: multiple files covering the same topic
    D5 — Orphan: memory files referencing deleted code

Computes a garden health score (0–100) based on issue severity.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from src.scanner import ScanResult


# ─── Contradiction keyword pairs ───

CONTRADICTION_PAIRS: List[Tuple[str, str]] = [
    ("use tabs", "use spaces"),
    ("camelcase", "snake_case"),
    ("camel_case", "snake_case"),
    ("2 spaces", "4 spaces"),
    ("single quote", "double quote"),
    ("semicolon", "no semicolon"),
    ("trailing comma", "no trailing comma"),
    ("lf", "crlf"),
    ("use crlf", "use lf"),
]


# ─── Issue model ───

class Issue:
    def __init__(self, issue_id: str, issue_type: str, severity: str,
                 file: str, detail: str, suggestion: str = "",
                 requires_confirmation: bool = False):
        self.id = issue_id
        self.type = issue_type        # stale | contradiction | bloat | redundancy | orphan
        self.severity = severity      # P0 | P1 | P2 | P3
        self.file = file
        self.detail = detail
        self.suggestion = suggestion
        self.requires_confirmation = requires_confirmation

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "file": self.file if not isinstance(self.file, list) else " ↔ ".join(self.file),
            "detail": self.detail,
            "suggestion": self.suggestion,
        }


# ─── Severity helpers ───

PENALTIES = {"P0": 25, "P1": 10, "P2": 5, "P3": 2}


def compute_health_score(issues: List[Issue]) -> int:
    score = 100
    for issue in issues:
        score -= PENALTIES.get(issue.severity, 0)
    return max(0, score)


# ─── Suggestion generation ───

SUGGESTIONS = {
    "stale": {
        "default": "审查文件内容，更新过时信息或归档",
        "old": "文件超过 90 天未更新，建议全面审查并归档不再适用的内容",
    },
    "contradiction": {
        "default": "统一规则，确保所有文件所述一致",
    },
    "bloat": {
        "default": "考虑拆分为多个主题文件，或移除不再需要的内容",
    },
    "orphan": {
        "default": "更新引用或移除相关段落",
    },
}


# ─── Analyser ───

def analyse(scanned: ScanResult, stale_days: int = 30,
            max_lines: int = 200, max_words: int = 1000,
            project_path: str = "", memory: Optional[Dict] = None) -> Tuple[List[Issue], int]:
    """Analyse scan results and return (issues, health_score)."""
    issues: List[Issue] = []
    stale_days = memory.get("patterns", {}).get("userPreferences", {}).get("stalenessThreshold", stale_days) if memory else stale_days

    # --- D1: Stale ---
    for file in scanned.files:
        if file.age_days > stale_days:
            if file.age_days > stale_days * 3:
                severity = "P1"
                suggestion = SUGGESTIONS["stale"]["old"]
            elif file.age_days > stale_days * 2:
                severity = "P2"
                suggestion = SUGGESTIONS["stale"]["default"]
            else:
                severity = "P3"
                suggestion = "检查是否有新的约定需要补充"

            safe_id = re.sub(r'[^a-zA-Z0-9]', '-', file.path)
            issues.append(Issue(
                issue_id=f"stale-{safe_id}",
                issue_type="stale",
                severity=severity,
                file=file.path,
                detail=f"{file.age_days} 天未更新（阈值：{stale_days} 天）",
                suggestion=suggestion,
                requires_confirmation=(severity == "P1"),
            ))

    # --- D3: Bloat ---
    for file in scanned.files:
        reasons = []
        if file.lines > max_lines:
            reasons.append(f"{file.lines} 行（阈值：{max_lines} 行）")
        if file.words > max_words:
            reasons.append(f"{file.words} 字（阈值：{max_words} 字）")
        if not reasons:
            continue

        severity = "P1" if file.lines > max_lines * 2 else "P2"
        safe_id = re.sub(r'[^a-zA-Z0-9]', '-', file.path)
        issues.append(Issue(
            issue_id=f"bloat-{safe_id}",
            issue_type="bloat",
            severity=severity,
            file=file.path,
            detail="；".join(reasons),
            suggestion=SUGGESTIONS["bloat"]["default"],
            requires_confirmation=(severity == "P1"),
        ))

    # --- D2: Contradiction ---
    if project_path:
        contents: Dict[str, str] = {}
        for file in scanned.files:
            try:
                fp = Path(project_path) / file.path
                contents[file.path] = fp.read_text("utf-8").lower()
            except (OSError, UnicodeDecodeError):
                contents[file.path] = ""

        paths = list(contents.keys())
        seen_pairs = set()
        for i in range(len(paths)):
            for j in range(i + 1, len(paths)):
                for a, b in CONTRADICTION_PAIRS:
                    has_a_i = a in contents[paths[i]]
                    has_a_j = a in contents[paths[j]]
                    has_b_i = b in contents[paths[i]]
                    has_b_j = b in contents[paths[j]]
                    if not (has_a_i or has_b_i) and not (has_a_j or has_b_j):
                        continue
                    if (has_a_i and has_b_j) or (has_b_i and has_a_j):
                        pair_key = f"{paths[i]}<->{paths[j]}<->{a}"
                        if pair_key in seen_pairs:
                            continue
                        seen_pairs.add(pair_key)
                        issues.append(Issue(
                            issue_id=f"contra-{len(issues)}",
                            issue_type="contradiction",
                            severity="P0",
                            file=[paths[i], paths[j]],
                            detail=f"「{a}」与「{b}」在两个文件中同时出现，可能互相矛盾",
                            suggestion=SUGGESTIONS["contradiction"]["default"],
                            requires_confirmation=True,
                        ))

    # --- D5: Orphan (check memory file refs against project source) ---
    if project_path:
        source_exts = {".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".java", ".rb", ".php"}
        for file in scanned.files:
            if "memory" not in file.path:
                continue
            try:
                fp = Path(project_path) / file.path
                content = fp.read_text("utf-8")
                refs = set(re.findall(r'\b[a-zA-Z0-9_-]+\.(?:py|js|ts|jsx|tsx|go|rs|java|rb|php)\b', content))
                for ref in refs:
                    # Check if referenced file exists anywhere in the project
                    found = any(
                        p.name == ref
                        for p in Path(project_path).rglob("*")
                        if p.is_file() and p.suffix in source_exts
                    )
                    if not found:
                        safe_id = re.sub(r'[^a-zA-Z0-9]', '-', f"{file.path}-{ref}")
                        issues.append(Issue(
                            issue_id=f"orphan-{safe_id}",
                            issue_type="orphan",
                            severity="P0",
                            file=file.path,
                            detail=f"引用了已不存在的文件：{ref}",
                            suggestion=f"更新引用或移除相关段落。文件 {ref} 可能已被删除或重命名",
                            requires_confirmation=True,
                        ))
            except (OSError, UnicodeDecodeError):
                continue

    # Compute health score
    score = compute_health_score(issues)
    return issues, score
