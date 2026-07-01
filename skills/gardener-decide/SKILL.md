---
name: gardener-decide
description: "Decide phase for Little Gardener. Use when deciding whether the loop should continue working, wait, idle, pause, or run another pass."
---

# Gardener Decide

Decide chooses the next loop state. The default loop is long-lived.

## Visual Phase Command

At the start of this skill, run:

```powershell
garden phase . decide
```

When the decision is to wait for the next scheduled scan, run:

```powershell
garden phase . idle
```

## Decision Rules

1. If the user manually stops the command, set `loop.status = "paused"` and `stopReason = "user-stopped-command"`.
2. If the loop is disabled in config, set `loop.status = "paused"`.
3. If a layer is below the health target or has issues, continue with the next configured phase and keep `activeLayer` set.
4. If all layers are healthy, do not stop. Set `loop.status = "running"`, `activePhase = "idle"`, and `activeLayer = null`.
5. If a scheduled run window exists, use it to decide when to run another pass, not whether the visual process should disappear.

## Output

Write:

- `decide.nextAction`
- `decide.reason`
- `loop.status`
- `loop.activePhase`
- `loop.activeLayer`
- `loop.stopReason`

## Visual Behavior

Most decide outcomes should end in idle. The character rests until the next pass or until another layer needs work.
