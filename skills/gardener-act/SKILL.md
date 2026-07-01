---
name: gardener-act
description: "Act phase for Little Gardener. Use when emitting garden advice reports or applying explicitly approved context-maintenance actions."
---

# Gardener Act

Act is report-first. By default it writes advice and state, not code changes.

## Visual Phase Command

At the start of this skill, run:

```powershell
garden phase . act
```

When acting on a known layer, include it:

```powershell
garden phase . act --layer CLAUDE.md
```

## Default Mode

In default mode:

1. Set `loop.activePhase = "act"`.
2. Generate or update `.gardener-advice.md`.
3. Preserve existing user changes.
4. Do not edit source code, tests, application config, or project behavior.

## Approved Action Mode

Only apply changes when the user explicitly asks for it or config later enables a confirmed action mode. Before editing:

- Back up changed context files when backup is enabled.
- Scope edits to context artifacts only.
- Keep changes small and reversible.

## Output

Write:

- `act.mode`
- `act.reportPath`
- `act.appliedChanges[]` when changes were explicitly approved
- `loop.activePhase = "act"`

## Visual Behavior

When acting on a layer, keep the character on that layer row. If only writing a report, the character may remain idle after the report is written.
