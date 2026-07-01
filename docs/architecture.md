# Architecture

Little Gardener is split into a Claude integration layer, a Python runtime, and
a Web Canvas visualizer.

```mermaid
graph TB
    User["User in Claude Code"] --> Command["/garden command"]
    Command --> CLI["global garden CLI"]
    CLI --> Python["Python runtime"]
    CLI --> Hook["garden hook fallback"]
    Python --> Scan["scanner.py"]
    Python --> Analyse["analyser.py"]
    Python --> Service["detached scheduler service"]
    Python --> State["project JSON state"]
    State --> Web["Vite + React + Canvas 2D"]
    Web --> Browser["local browser window"]
    Skills["context-gardener + gardener-* skills"] --> Phase["garden phase writes"]
    Phase --> State
    Hook --> State
```

## Runtime Flow

```mermaid
sequenceDiagram
    actor U as User
    participant C as Claude Code
    participant G as garden CLI
    participant P as Python Runtime
    participant W as Web Canvas
    participant S as Service

    U->>C: /garden
    C->>G: garden . --open
    G->>P: python -m src.main garden . --open
    P->>W: write bootstrap observe state
    P->>W: start/reuse Vite server
    P->>P: scan + analyse first round
    P->>S: start/reuse detached scheduler
    P-->>C: return status and URL
    S->>P: scan every 6 hours until max runtime
```

## State Files

```text
.gardener-state.json       latest visual and health state
.gardener-memory.json      durable loop memory
.gardener-service.json     background service status
.gardener-runs/            immutable round snapshots
.gardener-config.json      user thresholds, schedule, skill mapping
```

## Phase Mapping

```mermaid
flowchart LR
    O[observe] --> D[diagnose]
    D --> P[plan]
    P --> A[act]
    A --> V[verify]
    V --> L[learn]
    L --> DE[decide]
    DE --> I[idle]
    I --> O
```

Explicit phase writes are preferred:

```bash
garden phase . observe
garden phase . diagnose --layer hooks
garden phase . idle
```

Hooks only infer phases when no recent explicit phase write exists.
