#!/usr/bin/env bash
# session-start.sh — Context Gardener auto-setup hook
#
# Runs every time Claude Code opens a project.
# Checks Python dependency integrity and auto-installs if missing.
# Failures are non-blocking — the session continues regardless.

set -euo +pipefail

REQUIREMENTS=(
  "pygame>=2.6"
)

GARDENER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYPROJECT="$GARDENER_DIR/pyproject.toml"
SPRITES="$GARDENER_DIR/src/sprites"

# ── Check if we're inside a Gardener project ──
if [ ! -f "$PYPROJECT" ]; then
  exit 0
fi

# ── Check Python availability ──
PYTHON=""
for cmd in python3 python; do
  if command -v "$cmd" &>/dev/null; then
    PYTHON="$cmd"
    break
  fi
done

if [ -z "$PYTHON" ]; then
  echo "🌱 [Gardener] ⚠️  Python not found. Install Python 3.11+ to use Context Gardener."
  exit 0
fi

# ── Check pygame ──
if ! "$PYTHON" -c "import pygame" &>/dev/null; then
  echo "🌱 [Gardener] 📦 Installing pygame for garden visualization..."
  if pip install pygame &>/dev/null; then
    echo "🌱 [Gardener] ✅ pygame installed successfully"
  else
    echo "🌱 [Gardener] ⚠️  pygame install failed. Run 'pip install pygame' manually."
  fi
fi

# ── Check sprites exist ──
if [ -d "$SPRITES" ]; then
  SPRITE_COUNT=$(find "$SPRITES" -type f 2>/dev/null | wc -l)
  if [ "$SPRITE_COUNT" -eq 0 ]; then
    echo "🌱 [Gardener] ⚠️  No sprites found in src/sprites/. Garden visuals may be incomplete."
  fi
fi

exit 0
