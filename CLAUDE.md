# Little Gardener - Claude Development Notes

Little Gardener is a Claude Code skill and command package. Its v0.1 goal is to
make the `/garden` command start a local Web Canvas visualization, run one
context-health scan immediately, then leave a detached service to scan on a
schedule.

## Command Chain

```text
/garden
  -> garden . --open
  -> src.main garden
  -> run_web_runtime(...)
  -> start/reuse background service
```

The command must return after startup so the user can keep working in the same
Claude Code session.

## Visual Contract

- Route lines are not drawn.
- The head label reflects `loop.activePhase`.
- `loop.activeLayer` places the character on the corresponding row.
- `idle` stops the character where it is.
- `loop.status = running` can coexist with `activePhase = idle`.

## Service Contract

- First scan runs immediately.
- Default interval is 6 hours.
- Default max runtime is 24 hours.
- `.gardener-service.json` stores pid, port, schedule, status, and stop reason.
- `.gardener-runs/round-*.json` stores per-round snapshots.

## Packaging Contract

The repository provides a CLI named `garden`, but Claude installation should be
self-contained under the Claude config directory.

```bash
npx -y github:dotVSdoll/little-gardener install-claude
```

Claude commands and skills should call global commands such as:

```bash
garden . --open
garden phase . diagnose --layer hooks
garden hook
```

Do not hardcode a developer checkout path. The global `garden` CLI must resolve
the installed package root, or the Claude installer must call the launcher under
`~/.claude/bin`.
