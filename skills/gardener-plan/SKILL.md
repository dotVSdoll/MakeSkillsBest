---
name: gardener-plan
description: "Plan phase for Little Gardener. Use when turning diagnosed context-health issues into ordered, non-destructive recommendations."
---

# Gardener Plan

Plan turns diagnosed issues into a small set of actionable recommendations. It does not modify project files.

## Visual Phase Command

At the start of this skill, run:

```powershell
garden phase . plan
```

When planning for a known layer, include it:

```powershell
garden phase . plan --layer skills
```

## Workflow

1. Set `loop.activePhase = "plan"`.
2. Group issues by severity and layer.
3. Prefer recommendations that reduce confusion without expanding the system.
4. Keep each recommendation specific: target file, problem, suggested action, expected effect.
5. De-duplicate repeated advice.

## Recommendation Types

- `remove`: stale one-off notes or noise.
- `move`: content belongs in a skill, hook, or memory file.
- `update`: rule conflicts with current project reality.
- `create`: missing skill/hook/memory artifact.
- `merge`: duplicated guidance or memory.
- `watch`: keep as-is but monitor.

## Output

Write:

- `plan.recommendations[]`
- priority groups: high, medium, low
- estimated health improvement where obvious
- `loop.activePhase = "plan"`

## Visual Behavior

If planning for a specific layer, keep `activeLayer` set so the character stays on that row. If planning is general, use the plan anchor.
