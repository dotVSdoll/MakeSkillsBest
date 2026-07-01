# Little Gardener - Project Instructions

## Identity

Little Gardener is a Loop Engineering skill repository for Claude Code. The
current product surface is **Context Gardener**, a service-backed loop that
visualizes project context health in a Web Canvas garden.

## Current Architecture

```text
Claude Code /garden
  -> global CLI: garden . --open
  -> Python runtime: scan, analyse, persist, schedule
  -> Web runtime: Vite + React + Canvas 2D
  -> JSON files: .gardener-state.json, .gardener-memory.json
```

The Web Canvas path is the only supported visualization path for v0.1. Do not
reintroduce Pygame or desktop-window behavior.

## Key Directories

```text
bin/                         CLI launcher, Claude installer, phase writer
commands/                    Claude Code command definitions
hooks/                       lifecycle hook fallback
skills/context-gardener/     orchestration skill
skills/gardener-*/           focused phase skills
src/                         Python scanner, analyser, config, service runtime
web/                         Vite + React + TypeScript + Canvas visualizer
docs/                        architecture notes and screenshots
scripts/                     Playwright and runtime regression scripts
```

## Runtime Files

Generated files are not committed:

- `.gardener-state.json`
- `.gardener-memory.json`
- `.gardener-config.json`
- `.gardener-service.json`
- `.gardener-hooks.jsonl`
- `.gardener-runs/`
- `web/public/garden-state.json`
- `web/public/gardener-config.json`
- `web/public/gardener-runtime.json`

## Development Commands

```bash
python -m src.main scan .
python -m src.main garden . --open --once
garden install-claude
npm run build --prefix web
```

Regression checks:

```bash
node scripts/test_service_mode.mjs
node scripts/test_explicit_phase_writer.mjs
node scripts/test_claude_hook_phase_mapping.mjs
node scripts/test_config_api_persistence.mjs
node scripts/test_visual_hook_e2e.mjs
python -m compileall src
npm run build --prefix web
```

## Engineering Rules

- Prefer existing project patterns over new abstractions.
- Keep phase and service behavior deterministic and testable.
- Explicit phase writes (`garden phase`) are the source of truth; hooks are
  fallback only.
- `idle` means the character stops in place. It does not mean the service has
  stopped.
- Do not decide visualization availability from the scanned project structure.
  The installed Little Gardener package owns the Web Canvas app.
- Do not commit generated runtime state or local Claude config.
