---
name: gardener-verify
description: "Verify phase for Little Gardener. Use when re-scanning after recommendations or user edits and comparing context-health changes."
---

# Gardener Verify

Verify checks whether context health changed after advice or user action.

## Visual Phase Command

At the start of this skill, run:

```powershell
garden phase . verify
```

If verification confirms all layers are healthy, run:

```powershell
garden phase . idle
```

## Workflow

1. Set `loop.activePhase = "verify"`.
2. Re-run observe and diagnose with the same thresholds.
3. Compare layer scores, issue count, active layer, and high-severity issues against the previous state.
4. Report changes honestly. If the user has not edited anything, scores may remain the same.

## Output

Write:

- `verify.previousHealth`
- `verify.currentHealth`
- `verify.resolvedIssues`
- `verify.newIssues`
- `verify.changedLayers`
- `loop.activePhase = "verify"`

## Visual Behavior

If verification finds a remaining problem, set `activeLayer` to that row. If all layers are healthy, transition to `idle` while keeping `loop.status = "running"`.
