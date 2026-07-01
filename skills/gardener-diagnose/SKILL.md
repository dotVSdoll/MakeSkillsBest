---
name: gardener-diagnose
description: "Diagnose phase for Little Gardener. Use when scoring CLAUDE.md, skills, hooks, and memory layers, selecting activeLayer, or deciding which garden row needs attention."
---

# Gardener Diagnose

Diagnose converts observed context files into layer health and concrete issues.

## Visual Phase Command

At the start of this skill, run:

```powershell
garden phase . diagnose
```

When diagnosing a known layer, include it:

```powershell
garden phase . diagnose --layer hooks
```

If all layers are healthy after diagnosis, run:

```powershell
garden phase . idle
```

## Layer Model

Use four visual layers:

- `CLAUDE.md`: project-level rules and durable operating context.
- `skills`: reusable workflows and specialist procedures.
- `hooks`: automation and Claude Code lifecycle hooks.
- `memory`: persistent behavior memory and prior loop outcomes.

## Scoring

Start each layer at `100`.

Apply penalties:

- P0 contradiction: `-25`
- P1 stale or invalid automation: `-10`
- P2 misplaced, bloated, or missing workflow: `-5`
- P3 low-severity noise or duplication: `-2`

Set status:

- `healthy`: score >= 90 and no issues.
- `warning`: score < 90 or issues > 0.
- `critical`: score < 60.

## Active Layer Selection

Choose the first layer, in this order, whose score is below the configured health target or has issues:

1. `CLAUDE.md`
2. `skills`
3. `hooks`
4. `memory`

If no layer needs work, set `activeLayer = null`.

## Output

Write:

- `diagnose.issues`
- `diagnose.health`
- `layerHealth`
- `issues[]`
- `loop.activePhase = "diagnose"`
- `loop.activeLayer` to the chosen layer or `null`

## Visual Behavior

If `activeLayer` is set, the character must stand on that layer row. The plant renderer should mute one plant in that row to make the problem visible. Do not draw route lines.
