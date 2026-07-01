---
name: gardener-learn
description: "Learn phase for Little Gardener. Use when persisting durable loop memory, user preferences, false positives, or repeated context-health patterns."
---

# Gardener Learn

Learn records durable lessons from the loop. It should keep memory small and useful.

## Visual Phase Command

At the start of this skill, run:

```powershell
garden phase . learn
```

After durable memory is written and no immediate work remains, run:

```powershell
garden phase . idle
```

## What To Store

- Session timestamp and project name.
- Health score changes.
- Recommendation counts.
- Repeated issue patterns.
- User preferences, such as ignored paths or preferred report-only behavior.
- False positives explicitly identified by the user.

## What Not To Store

- Full reports.
- Large file excerpts.
- Secrets, tokens, credentials, or private runtime logs.
- One-off details that will not help future loops.

## Output

Write `.gardener-memory.json` with:

- `sessions[]`
- `patterns.commonIssues[]`
- `patterns.userPreferences`
- `falsePositives[]`
- `loop.activePhase = "learn"`

## Visual Behavior

Learning is usually brief. Show the learn label while writing memory, then return to idle unless another layer needs attention.
