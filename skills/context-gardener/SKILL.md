---
name: context-gardener
description: "Loop orchestrator for Little Gardener. Use when /garden runs, when coordinating context-health loop phases, or when mapping Claude Code work into the Web Canvas garden visualization."
---

# Context Gardener

Context Gardener is the orchestrator for Little Gardener. It coordinates the loop, delegates each phase to a focused skill, persists state, and keeps the Web Canvas visualization accurate.

## Command Chain

When `/garden` runs in Claude Code:

1. Open the Web Canvas visualization immediately with an `observe` bootstrap state.
2. Run the phase sequence through the configured skills.
3. Mirror each state transition to `.gardener-state.json` and `web/public/garden-state.json`.
4. Start or reuse the detached local scanner service. The `/garden` command returns after startup so the user can keep working in the same Claude Code window.
5. Run the first pass immediately. After that, the background service evaluates the project every 6 hours by default.
6. If no layer needs work, keep `loop.status = running`, set `activePhase = idle`, and leave the character stopped at its current position until the next scheduled evaluation.

Do not decide visualization availability from the target project structure. The Web Canvas app belongs to the installed Little Gardener package and can visualize any scanned project.

## Phase Skills

Use these default phase skills unless the user config replaces a step:

| Phase | Skill | Role |
| --- | --- | --- |
| `observe` | `gardener-observe` | Read the project and collect context files. |
| `diagnose` | `gardener-diagnose` | Score the four layers and choose the active layer. |
| `plan` | `gardener-plan` | Convert findings into ordered recommendations. |
| `act` | `gardener-act` | Emit advice/report artifacts; do not modify project code by default. |
| `verify` | `gardener-verify` | Re-scan and compare state after user changes. |
| `learn` | `gardener-learn` | Persist durable behavior memory. |
| `decide` | `gardener-decide` | Decide idle, continue, wait, or pause. |

## Visual Contract

- The character head label must match `loop.activePhase`.
- If `loop.activeLayer` is set, the character must stand on that layer's row.
- Route waypoints may guide movement internally, but route lines must not be drawn.
- `idle` means stop in place. Do not move the character to a bench, idle anchor, or any other new target.
- Most time should be idle/resting. Only active reading, analysis, or handling phases should move.
- A problematic layer should mute one plant in that row so the row visibly needs care.

## Explicit Phase Writes

Each phase skill must write its own visual phase when it starts:

```powershell
garden phase . observe
garden phase . diagnose --layer hooks
garden phase . idle
```

Use explicit phase writes as the source of truth. Claude Code lifecycle hooks are only a fallback when a phase skill has not written a recent state.

## State Contract

Write state with these fields:

```json
{
  "loop": {
    "status": "running",
    "activePhase": "observe|diagnose|plan|act|verify|learn|decide|idle",
    "activeLayer": "CLAUDE.md|skills|hooks|memory|null",
    "firstRunComplete": true,
    "lastTransitionAt": "ISO timestamp",
    "stopReason": null
  }
}
```

Only set `status` to `paused` when the user stops the command or disables the loop. Do not set `stopped` merely because all layers are healthy.

Persist durable memory on every loop pass:

- `.gardener-state.json` stores the latest authoritative runtime state.
- `.gardener-memory.json` appends the round summary for future Claude Code sessions.
- `.gardener-runs/round-*.json` stores immutable per-round snapshots.
- `.gardener-service.json` stores the detached scheduler pid, port, next scan time, stop time, and status.
- When the 24 hour default run window ends, set `loop.status = "paused"` and `stopReason = "max-runtime-reached"`.

## Guardrails

- Do not edit source code as part of the default loop.
- Do not run expensive whole-repository analysis unless a phase skill explicitly needs it.
- Do not create duplicate recommendations; update existing report/state when possible.
- Keep phase-specific details inside the phase skills, not in this orchestrator.
