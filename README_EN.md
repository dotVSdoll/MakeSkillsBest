# MakeSkillsBest

> **Loop Engineering — Automate complex workflows with AI agents. Less manual oversight, more reliable outcomes.**

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-13-orange" alt="skills">
  <img src="https://img.shields.io/badge/phases-12-purple" alt="phases">
  <br>
  <a href="https://discord.gg/ESaTn66P4"><img src="https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/DVBbdipl"><img src="https://img.shields.io/badge/X-%23000000.svg?logo=X&logoColor=white" alt="X"></a>
</p>

[中文](README.md)

---

### Why Loop Engineering?

AI agents can write code and answer questions. But ask one to **autonomously complete a multi-step workflow**, and things start to break down:

- The agent fixes a bug, then "incidentally" rewrites three unrelated modules
- You ask it to review code quality — next session, it's forgotten everything
- A security vulnerability gets patched, but nobody checked whether the fix introduced new issues
- You want ongoing tech debt monitoring, but every conversation starts from scratch

The problem isn't model capability. It's that **complex workflows lack structure**. Agents excel at single-turn output, but cross-step **state management, boundary control, and exit conditions** — the engineering of reliable automation — doesn't emerge from a raw prompt.

Loop Engineering fills this gap: **define complex workflows as repeatable loops, then let the agent execute, verify, and decide when to stop on its own.**

One input. The loop handles the rest.

---

## Table of Contents

- [Which Problem Are You Facing](#which-problem-are-you-facing)
- [What MakeSkillsBest Is](#what-makeskillsbest-is)
- [Current Status](#current-status)
- [Under Construction](#under-construction)
- [Quick Start](#quick-start)
- [Platform Support](#platform-support)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Which Problem Are You Facing

### Problem A: Code changes break things

```
You ask the agent to "fix this security vulnerability". It fixes the vulnerability, but also:
- Renames nearby functions to match its own style preference
- Deletes a variable that looks "unused" — but another module imports it
- Skips tests, and you only discover the breakage in production
```

**How a Loop helps:** `Bound → Fix → Verify → SelfReview` locks down the modification boundary. Any overstepping or missed validation is caught at the SelfReview phase and rolled back.

### Problem B: Every session starts from zero

```
You run a weekly code quality review. But every new conversation:
- The agent doesn't know your repository
- Past findings are invisible
- The same false positives get flagged over and over
```

**How a Loop helps:** Loop state is persisted to `.loop-log/`. On the next run, past findings, resolved issues, and known false positives are loaded automatically.

### Problem C: The workflow exceeds a single turn

```
You want the agent to do something multi-phase:
"Analyze the repo → diagnose issues → generate a fix plan → apply changes → verify → redo if needed"
But no single prompt handles a chain this long. What you get back is plausible but unreliable.
```

**How a Loop helps:** A 12-phase lifecycle where each phase's output is the next phase's input. The Decide phase determines whether to continue, stop, or re-plan. No manual intervention required.

---

## What MakeSkillsBest Is

MakeSkillsBest is a **Library of Loop Patterns** — reusable workflow definitions you can drop into any AI coding agent.

Each Loop defines:

| Element | What It Means |
|---------|---------------|
| **Entry** | What triggers the loop? |
| **Body** | What phases does it cycle through? What does each phase produce? |
| **Exit** | When does it stop? (task complete / diminishing returns / consecutive failures / user interrupt) |
| **State** | How does persistent state carry across iterations? |
| **Safety** | How do we prevent overstepping, enable rollback, and request human confirmation? |

### Bare Agent vs. Loop

```
Bare agent:
  You give a prompt → it responds once → done
  └ Complex task? Guide it step by step, manually

Loop:
  You give a goal → it iterates, verifies, and adjusts autonomously
  └ Unless it gets stuck, you don't hear from it
```

---

## Current Status

### Code Optimization Loop (Engineering Loop)

**12 phases, 13 skills, covering analysis → diagnosis → fix → verification.**

For: onboarding large repos, managing tech debt, fixing security issues, reducing code complexity.

```
Detect → EnvReady → Observe → Understand → Diagnose → Plan → Bound
    → Fix → Verify → SelfReview → Learn → Decide
     ↑___________________________________________↓
           Decide=continue loops back to Fix or Observe
```

| Phase | What It Does | Deliverable |
|-------|-------------|-------------|
| 🔌 **Detect** | Detects AI tool → reads config → selects adapter | Capability matrix |
| ⚙️ **EnvReady** | Tiered env check → auto-prep venv/deps | Runnable environment |
| 🔍 **Observe** | Code style profiling | Style constraints |
| 🧠 **Understand** | Semantic analysis + knowledge graph + architecture decomposition | Full technical docs |
| 🩺 **Diagnose** | Security scan + quality audit (parallel) | Ranked issue list |
| 📋 **Plan** | Delivery plan + task DAG | Execution plan |
| 🔒 **Bound** | Allowlist + red zones | Safety boundaries |
| 🔧 **Fix** | Style-constrained small-step fixes | Code changes |
| ✅ **Verify** | Template-based fix verification | Verification report |
| 🔍 **SelfReview** | 10-point diff audit | Self-review report |
| 📝 **Learn** | Capture lessons + generate recommendations | Experience log |
| 🔁 **Decide** | Stop condition evaluation | continue/stop/replan |

Real-world case: On a 200+ source file Python stock analysis platform, completed security fixes + code splitting. `analyzer.py` 4068→2598 lines, `notification.py` 2609→1024 lines. Zero regression bugs introduced. See the [full case study](#).

### Skill Ecosystem

13 skills in four groups. **Each skill can be used independently:**

| Group | Skill | When to Use |
|-------|-------|-------------|
| **Analysis** | `style-profile` | Learning a new project's code style |
| | `semantic-rag` | Understanding architecture and module responsibilities |
| | `knowledge-graph` | Tracing call chains, data flow, dependencies |
| | `repo-decompose` | Decomposing requirements, generating architecture docs |
| | `mvp-approach` | Validating which direction is most feasible |
| **Diagnosis** | `security-audit` | Checking dependencies, injection risks, secrets |
| | `quality-audit` | Checking duplication, complexity, dead code, test gaps |
| **Execution** | `delivery-plan` | Generating phased fix plans by priority |
| | `task-graph` | Building task dependency DAGs |
| | `implementation-map` | Generating modification allowlists + red zones |
| | `verification-loop` | Template-based fix verification |
| **Infrastructure** | `log-journal` | Writing structured logs per phase |
| | `engineering-loop` | Orchestrator — 2 gates + 10-phase optimization cycle |

---

## Under Construction

This project is evolving from "a single code optimization loop" into a **multi-loop pattern library + platform adaptation layer**.

### Loop Patterns (Expansion)

| Loop | Status | Description |
|------|--------|-------------|
| Code Optimization | ✅ Released | 12-phase code analysis → diagnose → fix → verify |
| Info Gathering | 🔄 Planning | Automated search, aggregation, dedup, structured output |
| Document Processing | 🔄 Planning | Batch analysis, classification, summarization, formatting |
| Multimedia Review | 📋 Evaluating | Image/audio/video understanding and quality checks |

### Platform Adaptation (New Direction)

The same Loop needs different wiring on different agent tools. This layer is being built to bridge that gap:

| Platform | Integration Method | Status |
|----------|-------------------|--------|
| **Claude Code** | `CLAUDE.md` + hooks + `/loop` command | 🔄 In progress |
| **Cursor** | `.cursor/rules/` | 🔄 In progress |
| **Codex CLI** | Plugin registration + prompt templates | 📋 Planned |
| **Windsurf** | `.windsurf/rules/` | 📋 Planned |
| **Gemini CLI** | `gemini-extension.json` | 📋 Planned |
| **Tools without Loop** | MCP server injection | 📋 Evaluating |

> The core question: **For tools that don't natively support loops, can we inject loop capability through MCP servers or hooks?**

---

## Quick Start

```bash
# Claude Code — Code Optimization Loop (ready now)
/optimize-loop "Analyze and optimize this repository"

# Specific goals
/optimize-loop "Fix security vulnerabilities and unify error handling style"
/optimize-loop "Reduce core module complexity"
/optimize-loop "Clean up dead code and add missing tests"

# Analysis only, no changes
/optimize-loop "Analyze this repo, generate architecture docs and risk report, don't modify code"
```

**Prerequisites:**

- Any AI Coding Agent that accepts `/skill` or similar instructions
- A target code repository (local path)
- Recommended: `git` + the project's language runtime (the Loop auto-detects and prepares)

**Installation:**

```bash
# Claude Code Marketplace
/plugin marketplace add dotVSdoll/MakeSkillsBest

# Universal — npx skills (Codex / Cursor / Gemini CLI / 50+ tools)
npx skills add dotVSdoll/MakeSkillsBest -g

# Manual (for any SKILL.md-compatible Agent)
git clone https://github.com/dotVSdoll/MakeSkillsBest.git
# Copy or symlink skills/*/SKILL.md to your Agent's skill directory
```

---

## Platform Support

| Platform | Native Loop | How to Integrate | Status |
|----------|-------------|-----------------|--------|
| Claude Code | ✅ `/loop` command | hooks + CLAUDE.md | Ready |
| Codex CLI | ✅ Sub-agent dispatch | Plugin registration | Planned |
| Cursor | ⚠️ Self-chaining agent mode | `.cursor/rules/` | In progress |
| Windsurf | ⚠️ Cascade mode | `.windsurf/rules/` | Planned |
| Gemini CLI | ⚠️ Extensions | `gemini-extension.json` | Planned |
| Other tools | ❌ No loop | MCP Server injection | Evaluating |

---

## Project Structure

```
MakeSkillsBest/
├── skills/              # Skill definitions (single SKILL.md each)
│   ├── engineering-loop/
│   ├── security-audit/
│   ├── quality-audit/
│   └── ...
├── loops/               # 🔄 Planned: reusable Loop pattern definitions
│   └── code-optimization/
├── platforms/           # 🔄 Planned: per-tool platform wiring
│   ├── claude-code/
│   │   ├── CLAUDE.md
│   │   └── hooks/
│   ├── cursor/
│   │   └── .cursor/rules/
│   └── codex/
├── mcp/                 # 🔄 Planned: MCP server injection layer
├── commands/            # 🔄 Planned: CLI command registration
├── docs/                # Documentation
└── images/              # Assets
```

---

## Contributing

Issues and PRs welcome.

- New skills: create a directory under `skills/` with a `SKILL.md`
- Improve existing skills: edit the corresponding `SKILL.md`
- New Loop patterns: define Entry / Body / Exit / State / Safety under `loops/`

---

## License

MIT © [dotVSdoll](https://github.com/dotVSdoll)
