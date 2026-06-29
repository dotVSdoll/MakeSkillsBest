#!/usr/bin/env bash
# Context Gardener — Run Script
# Usage: ./gardener.sh [project-path] [options]
#
# Example:
#   ./gardener.sh                           # scan current directory
#   ./gardener.sh /path/to/project           # scan specific project
#   ./gardener.sh . --staleDays 45           # custom staleness threshold
#   ./gardener.sh . --apply                  # scan + auto-prune (requires confirmation)
#
# Scheduling (cron):
#   # Every Monday at 9am
#   0 9 * * 1 /path/to/gardener.sh /path/to/project --output /path/to/reports/latest.json
#
# Scheduling (Windows Task Scheduler):
#   - Action: Start a program
#   - Program: C:\Program Files\nodejs\node.exe
#   - Arguments: "C:\path\to\skills\context-gardener\engine\gardener.js" "C:\path\to\project"

set -euo pipefail

PROJECT_DIR="${1:-.}"
shift 2>/dev/null || true
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🌱 Context Gardener — Starting"
echo "   Project: $(cd "$PROJECT_DIR" && pwd)"
echo "   Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Run the scanner/analyser
node "$SCRIPT_DIR/engine/gardener.js" "$PROJECT_DIR" "$@"

echo ""
echo "✅ Gardener run complete"
