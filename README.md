<h1 align="center">
  <span style="color:#22c55e;font-family:Segoe UI,Inter,Arial,sans-serif;">Little Gardener</span>
</h1>

<p align="center">
  <strong style="color:#38bdf8;font-family:Segoe UI,Inter,Arial,sans-serif;">
    A Web Canvas garden for Claude Code loop engineering and project context health.
  </strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-22c55e" alt="version">
  <img src="https://img.shields.io/badge/runtime-Python%203.11%2B-38bdf8" alt="python">
  <img src="https://img.shields.io/badge/frontend-Vite%20%2B%20React-f59e0b" alt="frontend">
  <img src="https://img.shields.io/badge/license-MIT-a855f7" alt="license">
</p>

<h2 align="center">
  <span style="color:#f59e0b;font-family:Trebuchet MS,Segoe UI,Inter,Arial,sans-serif;">
    Web Canvas Garden Preview
  </span>
</h2>

<p align="center">
  <img src="SceneforGardener.png" alt="Little Gardener scene overview（参考图）" width="860">
  <br>
  <em>⬆ 参考效果图，实际渲染以 Web Canvas 实时画面为准</em>
</p>

Little Gardener turns a project into a small pixel garden. Claude Code runs a
context-health loop, the Python runtime writes durable JSON state, and the Web
Canvas scene shows which phase and layer the agent is working on.

The current first release focuses on one skill family: **Context Gardener**.
It scans and evaluates context files such as `CLAUDE.md`, `.github/`
instructions, local skills, hooks, and memory files.

## Install

Install into Claude Code with `npx`:

```bash
npx -y github:dotVSdoll/little-gardener install-claude
```

For local development from a checkout:

```bash
node bin/gardener-run.js install-claude
```

`garden install-claude` registers:

- `~/.claude/commands/garden.toml`
- `~/.claude/skills/context-gardener`
- `~/.claude/skills/gardener-*`
- `~/.claude/little-gardener`, a self-contained runtime copy
- `~/.claude/bin/garden.cmd` on Windows, or `~/.claude/bin/garden` on macOS/Linux
- Claude Code lifecycle hooks that call the installed launcher

After installation, open any project in Claude Code and run:

```text
/garden
```

The command starts or reuses the local Web Canvas service, opens the browser,
runs the first scan immediately, then returns control to the Claude Code
session. The background service scans again every 6 hours and pauses after the
default 24 hour window unless the user stops it earlier.

## How It Works

Little Gardener has four moving pieces:

1. **Claude command**: `/garden` asks Claude Code to invoke `garden . --open`.
2. **Global CLI**: `garden` resolves its installed package root, starts the
   Python runtime, installs web dependencies on first use, and launches Vite.
3. **Python runtime**: `src/main.py` and `src/web_runtime.py` scan the target
   project, calculate health, write state, and manage the detached scheduler.
4. **Web Canvas**: `web/src/App.tsx` reads JSON state and maps loop phases onto
   the pixel scene.

The loop phases are:

```text
observe -> diagnose -> plan -> act -> verify -> learn -> decide -> idle
```

Each phase can explicitly update the visual state:

```bash
garden phase . observe
garden phase . diagnose --layer hooks
garden phase . idle
```

Explicit phase writes are the source of truth. Claude hooks remain as a fallback
when a skill has not written a recent phase. `idle` means the character stops in
place; the service may still be running and waiting for the next scheduled scan.

## Runtime Files

Little Gardener writes runtime data into the project being scanned:

- `.gardener-state.json`: latest visual and health state
- `.gardener-memory.json`: durable loop memory across rounds
- `.gardener-service.json`: background service pid, status, port, and schedule
- `.gardener-runs/round-*.json`: immutable snapshots for each scan round
- `.gardener-config.json`: user rules, thresholds, schedule, and skill mapping

These files are ignored by git by default.

## Project Layout

```text
bin/                         CLI launcher, installer, phase writer
commands/                    Claude Code /garden command
hooks/                       Claude lifecycle hook fallback
skills/context-gardener/     loop orchestrator skill
skills/gardener-*/           focused phase skills
src/                         Python scanner, analyser, state, service runtime
web/                         Vite + React + Canvas 2D visualizer
docs/                        architecture notes and preview images
scripts/                     Playwright and runtime regression checks
```

## Current Scope

The first version is intentionally narrow:

- Web Canvas is the only supported visualization path.
- The default loop audits context-health files and does not modify source code.
- The service mode runs a first pass immediately, then scans every 6 hours.
- Skills can be remapped by configuration, but deep multi-platform agent testing
  is not part of v0.1.

## Next Work

The next releases should improve these areas:

- **Installer polish**: publish to npm, add `garden doctor`, and validate PATH,
  Python, Node, and Claude Code config in one command.
- **Service controls**: expose service status, pause, resume, stop, and next scan
  time directly in the Web UI.
- **Skill composition**: split the orchestration skill into smaller installable
  phase skills and support user-defined key/value step mappings in the UI.
- **Agent fidelity**: make Claude Code phase writes part of every phase skill so
  the character always reflects the active skill instead of hook inference.
- **Long-run memory**: add richer round summaries, compaction, and comparisons
  between the current and previous project health.
- **Visual QA**: keep Playwright screenshot tests for phase movement, idle
  behavior, active layer rows, and real project scans.

## Development

```bash
python -m src.main scan .
python -m src.main garden . --open --once
npm run build --prefix web
```

Useful regression checks:

```bash
node scripts/test_service_mode.mjs
node scripts/test_explicit_phase_writer.mjs
node scripts/test_claude_hook_phase_mapping.mjs
node scripts/test_config_api_persistence.mjs
node scripts/test_visual_hook_e2e.mjs
python -m compileall src
npm run build --prefix web
```

## License

MIT
