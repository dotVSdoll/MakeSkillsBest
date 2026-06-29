"""
Context Gardener — Context file scanner.

Scans a project directory for agent context files (CLAUDE.md, .claude/memory/*.md,
.claude/rules/*.md, etc.) and records file metrics for the analyser.

Usage:
    from src.scanner import scan
    inventory = scan("/path/to/project")
"""

import os
import re
import time
from pathlib import Path
from typing import List, Dict, Optional


# ─── Patterns ───

CONTEXT_PATTERNS = [
    "CLAUDE.md",
    "CLAUDE_EN.md",
    ".claude/memory/*.md",
    ".claude/rules/*.md",
    ".cursor/rules/*.md",
    ".claude/commands/*.toml",
]

IGNORED_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}


# ─── Data Types ───

class FileInfo:
    def __init__(self, path: str, size: int, lines: int, words: int,
                 sections: int, has_frontmatter: bool,
                 last_modified: str, age_days: int, key_terms: List[str]):
        self.path = path
        self.size = size
        self.lines = lines
        self.words = words
        self.sections = sections
        self.has_frontmatter = has_frontmatter
        self.last_modified = last_modified
        self.age_days = age_days
        self.key_terms = key_terms

    def to_dict(self) -> Dict:
        return {
            "path": self.path,
            "size": self.size,
            "lines": self.lines,
            "words": self.words,
            "sections": self.sections,
            "hasFrontmatter": self.has_frontmatter,
            "lastModified": self.last_modified,
            "ageDays": self.age_days,
            "keyTerms": self.key_terms,
        }


class ScanResult:
    def __init__(self, files: List[FileInfo]):
        self.files = files
        total_size = sum(f.size for f in files)
        avg_age = round(sum(f.age_days for f in files) / len(files)) if files else 0
        self.summary = {
            "totalFiles": len(files),
            "totalSize": total_size,
            "avgAgeDays": avg_age,
        }

    def to_dict(self) -> Dict:
        return {
            "files": [f.to_dict() for f in self.files],
            "summary": self.summary,
        }


# ─── Scanner ───

def is_context_file(rel_path: str) -> bool:
    """Check if a file is a known agent context file."""
    if rel_path in ("CLAUDE.md", "CLAUDE_EN.md"):
        return True
    if rel_path.startswith(".claude/memory/") and rel_path.endswith(".md"):
        return True
    if rel_path.startswith(".claude/rules/") and rel_path.endswith(".md"):
        return True
    if rel_path.startswith(".cursor/rules/") and rel_path.endswith(".md"):
        return True
    if rel_path.startswith(".github/") and rel_path.endswith(".md"):
        return True
    return False


def count_sections(content: str) -> int:
    """Count markdown sections (## headings)."""
    return len(re.findall(r'^##\s', content, re.MULTILINE))


def has_frontmatter(content: str) -> bool:
    """Check if file starts with YAML frontmatter (---)."""
    return content.startswith("---")


def extract_key_terms(content: str, min_len: int = 3, top_k: int = 10) -> List[str]:
    """Extract most frequent terms from text."""
    words = re.findall(r'[a-zA-Z一-鿿-]{3,}', content.lower())
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    sorted_terms = sorted(freq.items(), key=lambda x: -x[1])
    return [t[0] for t in sorted_terms[:top_k]]


def walk_md_files(root: Path) -> List[Path]:
    """Walk directory tree finding .md files in context-relevant dirs."""
    results = []
    if not root.exists():
        return results

    # Quick scan: check root-level CLAUDE.md
    for f in root.glob("CLAUDE*.md"):
        results.append(f)

    # Check .claude/ subtree
    claude_dir = root / ".claude"
    if claude_dir.exists():
        results.extend(claude_dir.rglob("*.md"))

    # Check .cursor/rules/
    cursor_rules = root / ".cursor" / "rules"
    if cursor_rules.exists():
        results.extend(cursor_rules.rglob("*.md"))

    # Check .github/
    github_dir = root / ".github"
    if github_dir.exists():
        results.extend(github_dir.rglob("*.md"))

    return results


def scan(project_path: str, memory: Optional[Dict] = None) -> ScanResult:
    """Scan the project for context files and measure metrics."""
    root = Path(project_path).resolve()
    ignored = set(memory.get("patterns", {}).get("userPreferences", {}).get("ignoredPaths", [])) if memory else set()
    now = time.time()

    md_files = walk_md_files(root)
    context_files = []

    for f in md_files:
        rel = str(f.relative_to(root)).replace("\\", "/")
        if not is_context_file(rel):
            continue
        # Check ignored paths
        if any(rel.startswith(ign) for ign in ignored):
            continue

        stat = f.stat()
        try:
            content = f.read_text("utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        lines = content.split("\n")
        words = len(content.split())
        age_seconds = now - stat.st_mtime
        age_days = round(age_seconds / (24 * 3600))

        info = FileInfo(
            path=rel,
            size=stat.st_size,
            lines=len(lines),
            words=words,
            sections=count_sections(content),
            has_frontmatter=has_frontmatter(content),
            last_modified=time.strftime(
                "%Y-%m-%dT%H:%M:%SZ", time.gmtime(stat.st_mtime)
            ),
            age_days=age_days,
            key_terms=extract_key_terms(content),
        )
        context_files.append(info)

    return ScanResult(context_files)
