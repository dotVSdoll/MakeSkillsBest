---
name: gardener-observe
description: "Observe phase for Little Gardener. Use when scanning a project, reading context files, building project profile, or showing the garden character as actively reading the codebase."
---

# Gardener Observe

Observe reads the target project just enough to understand its context surface. It should be light, repeatable, and safe.

## Visual Phase Command

At the start of this skill, run:

```powershell
garden phase . observe
```

If observe completes and no follow-up work is needed, run:

```powershell
garden phase . idle
```

## Inputs

- Project root.
- Existing `.gardener-memory.json`, if present.
- Current `.gardener-config.json` thresholds and detection toggles.

## Workflow

1. Set `loop.activePhase` to `observe`.
2. Scan only context-relevant files:
   - `CLAUDE.md`
   - `.claude/commands/*.toml`
   - `.claude/hooks/*`
   - `commands/*.toml`
   - `skills/**/SKILL.md`
   - `hooks/**`
   - memory files such as `.gardener-memory.json`
3. Detect lightweight project signals such as `pyproject.toml`, `package.json`, `go.mod`, `Cargo.toml`, and top-level source/test folders.
4. Record file path, line count, word count, age, and layer mapping.
5. Avoid broad source-code traversal unless a later phase explicitly requests it.

## Output

Write or update:

- `observe.filesScanned`
- `files[]`
- basic project profile fields when available
- `loop.activePhase = "observe"`

## Visual Behavior

The character may walk during observe because the agent is reading the codebase. If no specific layer is known yet, use the observe anchor rather than a layer row.
