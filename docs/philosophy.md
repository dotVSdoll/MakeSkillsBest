# Loop Engineering Philosophy

Little Gardener treats long-running agent work as an engineered loop rather
than a one-shot prompt.

## Why Loops

Agents are strong at single responses, but recurring maintenance needs more
structure:

- a clear entry point,
- bounded phases,
- durable state,
- explicit exit or pause conditions,
- and safety rules around any project modification.

The loop is simple:

```text
observe -> diagnose -> plan -> act -> verify -> learn -> decide
```

When no work is needed, the visual phase becomes `idle`. That does not mean the
service has ended; it means the agent is waiting for the next scheduled scan.

## Design Principles

1. **Separate phases**: each phase has a small responsibility and can be tested
   independently.
2. **Persist state**: every round writes state and memory so long sessions can
   survive Claude Code restarts.
3. **Prefer explicit signals**: phase skills call `garden phase`; hooks only
   infer state as a fallback.
4. **Stay safe by default**: scanning and diagnosis are read-only. Action skills
   should not modify user projects unless a later policy explicitly allows it.
5. **Make health visible**: the garden is not decoration. It is a compact view
   of what the loop believes about project context health.

## Context Gardener

Context Gardener applies the loop to files that shape agent behavior:

- `CLAUDE.md`
- `.github/` instructions and templates
- local skill definitions
- hook and command configuration
- memory files

The goal is to keep these files fresh, small enough to reason about, and aligned
with the project the user is actually building.
