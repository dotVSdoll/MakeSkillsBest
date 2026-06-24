# MakeSkillsBest

> **Code Optimization Engineering Loop — not for building new features, but for making existing code better.**

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-13-orange" alt="skills">
  <img src="https://img.shields.io/badge/phases-12-purple" alt="phases">
</p>

![MakeSkillsBest Architecture](images/loop-architecture.png)

---

## Table of Contents

- [What It Is](#what-it-is)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Core Workflow](#core-workflow)
- [Full Case Study](#full-case-study)
- [Skill Ecosystem](#skill-ecosystem)
- [Output Examples](#output-examples)
- [How It Compares](#how-it-compares)
- [Key Capabilities](#key-capabilities)
- [Contributing](#contributing)
- [License](#license)

---

## What It Is

**MakeSkillsBest is a 12-phase, 13-skill code optimization engineering loop.** It doesn't build new features — it finds existing problems in your code and fixes them safely, traceably, and with style consistency.

Common AI coding agent mistakes:

- Fixes one bug, introduces three new ones
- Breaks the project's existing code style
- "Incidentally" refactors modules it shouldn't touch
- Changes code without knowing whether the fix actually works

MakeSkillsBest solves these with an engineering-grade **Diagnose → Plan → Bound → Fix → Verify → SelfReview** loop.

**Cross-Agent Adaptive:** On first run, automatically detects your AI Coding tool (Claude Code / Codex / Cursor / etc.), reads local configuration, and adapts sub-task dispatch and CLI permissions. No manual configuration needed.

**Prerequisites:**
- Any AI Coding Agent that accepts `/skill` or similar instructions
- A code repository (local path or GitHub URL)
- Recommended: `git` + the project's language runtime (the Loop auto-detects and prepares)

---

## Quick Start

```bash
# Simplest usage — analyze and optimize the current repo
/optimize-loop "Analyze and optimize this repository"

# Specific goals
/optimize-loop "Fix security vulnerabilities and unify error handling style"
/optimize-loop "Reduce core module complexity"
/optimize-loop "Clean up dead code and add missing tests"
```

**What happens:**

```
1. Detects your Agent tool → loads the appropriate adapter
2. Detects/prepares the runtime environment (venv, dependencies, .env)
3. Scans code style, security vulnerabilities, quality issues
4. Generates full technical documentation (knowledge graph, architecture, file index)
5. Creates a fix plan → locks modification boundaries → executes in small steps
6. Verifies fixes → self-reviews → captures lessons learned
7. All output goes to docs/loop-docs/ and .loop-log/
```

---

## Installation

**Recommended — Claude Code Marketplace:**

```bash
/plugin marketplace add dotVSdoll/MakeSkillsBest
```

**Universal — npx skills (Codex / Cursor / Gemini CLI / 50+ tools):**

```bash
npx skills add dotVSdoll/MakeSkillsBest -g
```

**Manual (for any SKILL.md-compatible Agent):**

```bash
git clone https://github.com/dotVSdoll/MakeSkillsBest.git
# Copy or symlink skills/*/SKILL.md to your Agent's skill directory
```

> Detailed instructions in [docs/setup-guide.md](docs/setup-guide.md)

---

## Core Workflow

```
Detect → EnvReady → Observe → Understand → Diagnose → Plan → Bound
    → Fix → Verify → SelfReview → Learn → Decide
     ↑___________________________________________↓
           Decide=continue loops back to Fix or Observe
```

| Phase | What It Does | Deliverable |
|---|---|---|
| 🔌 **Detect** | Detects AI tool → reads config → selects adapter | Capability matrix |
| ⚙️ **EnvReady** | Tiered env check 🟢🟡🟠🔴 → auto-prep venv/deps | Runnable environment |
| 🔍 **Observe** | Code style profiling: naming, error handling, organization, testing | Style constraints |
| 🧠 **Understand** | Semantic analysis + knowledge graph + architecture decomposition | Full technical docs |
| 🩺 **Diagnose** | 4-dim security scan + 6-dim quality audit (parallel) | Ranked issue list |
| 📋 **Plan** | Delivery plan + task DAG + critical path | Execution plan |
| 🔒 **Bound** | Allowlist + red zones + architecture contracts + blast radius | Safety boundaries |
| 🔧 **Fix** | Style-constrained, small-step fixes | Code changes |
| ✅ **Verify** | Template-based verification (CLI/Library/Skill/Security) | Verification report |
| 🔍 **SelfReview** | 10-point diff check: scope/deps/API/contract/snapshots | Self-review report |
| 📝 **Learn** | Capture lessons + generate next-round recommendations | Experience log |
| 🔁 **Decide** | 8 stop conditions → continue/stop/replan | Decision |

**Unified flow:** v2.0 no longer splits read-only vs. optimize modes. If no fixable issues are found, the Loop auto-ends after Plan. If there are tasks, it enters Fix.

**Auto environment prep:** Creates venv → installs dependencies → copies .env.example. If something can't be automated, it lists what needs manual work and honestly degrades to static analysis.

---

## Full Case Study

A real optimization run on [daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis) (Python stock analysis platform, ~200 source files):

### Input

```
/optimize-loop "Analyze and optimize D:\daily_stock_analysis"
```

### Phase-by-Phase Highlights

| Phase | Finding | Decision |
|---|---|---|
| **Detect** | Claude Code, Task tool parallelism supported | Security + quality audits run in parallel |
| **EnvReady** | Python 3.11, venv exists, deps installed | 🟢 Full — all CLI tools available |
| **Observe** | snake_case naming, try/except error handling, pytest | Style constraints locked |
| **Understand** | 4 tech docs generated, 12 modules detailed, evidence matrix | Direction: code organization + security hardening |
| **Diagnose** | 4 security (0C/0H/3M/1L) + 6 quality (0C/2H/3M/1L) | No CRITICALs, HIGH items enter fix plan |
| **Plan** | 5 tasks, 2 parallel batches | Security first (Batch 1), then code splitting (Batch 2) |
| **Bound** | 4 allowed files, pipeline/agent/sender red-zoned | Boundaries locked |
| **Fix** | 5/5 tasks completed | analyzer.py 4068→2598 lines, notification.py 2609→1024 lines |
| **Verify** | All files compile, backward compatible | Passed |
| **SelfReview** | 2 issues found (Mixin not inherited, regex bug) | Fixed and re-verified |

### End Result

| Metric | Before | After |
|---|---|---|
| `analyzer.py` lines | 4068 | 2598 (-36%) |
| `notification.py` lines | 2609 | 1024 (-61%) |
| Security findings | 4 (0C) | All fixed |
| Technical docs generated | 0 | 7 Markdown documents |
| Regression bugs introduced | — | 0 |

---

## Skill Ecosystem

13 skills organized into four usage groups:

### Analysis — Understanding Your Project

| Skill | When to Use | Standalone Call |
|---|---|---|
| `style-profile` | Joining a new project — learn its code style first | `/skill style-profile` |
| `semantic-rag` | Understanding overall architecture and module responsibilities | `/skill semantic-rag` |
| `knowledge-graph` | Tracing call chains, data flows, module dependencies | `/skill knowledge-graph` |
| `repo-decompose` | Decomposing requirements, generating architecture docs | `/skill repo-decompose` |
| `mvp-approach` | Validating which optimization direction is most feasible | `/skill mvp-approach` |

### Diagnosis — Finding Problems

| Skill | When to Use | Standalone Call |
|---|---|---|
| `security-audit` | Checking CVE, auth flaws, injection risks, secret leaks | `/skill security-audit` |
| `quality-audit` | Checking duplication, complexity, dead code, test gaps | `/skill quality-audit` |

### Execution — Planning & Fixing

| Skill | What It Does |
|---|---|
| `delivery-plan` | Generates phased fix plan by security/quality priority |
| `task-graph` | Builds task dependency DAG + critical path |
| `implementation-map` | Generates modification allowlist + red zones + blast radius |
| `verification-loop` | Template-based fix verification (CLI/Library/Skill/Security) |

### Infrastructure

| Skill | What It Does |
|---|---|
| `log-journal` | Writes structured logs per phase |
| `engineering-loop` | 12-phase orchestrator |

All skills can be invoked **independently** — no need to run the full Loop. Example:

```
/skill security-audit  # Scan current repo → writes to docs/loop-docs/
```

---

## Output Examples

Excerpt from `docs/loop-docs/project-overview.md` (generated during Understand phase):

```markdown
## src/analyzer.py — LLM Analysis Layer

**Role**: Wraps LLM calls — technicals+news→prompt→call LLM→parse JSON→AnalysisResult.
**Size**: 2598 lines (1507 lines of helpers in analyzer_helpers.py)

### Core Class: GeminiAnalyzer (2280 lines)

| Method | Line | Purpose |
|---|---|---|
| analyze() | 2866 | Main analysis flow — fetch data→build prompt→call LLM→parse→integrity check |
| _format_prompt() | 3140 | 450-line prompt template — covers technicals+news+market phase+decision instructions |
| _parse_response() | 3778 | Three-layer parsing defense — JSON parse→json_repair→text regex extraction |
| _call_litellm_impl() | 2603 | Multi-model fallback: primary→fallback1→fallback2→error |

### Design Decisions

- **Why analyze() is 270 lines**: Every step has error handling and retry logic — "long" isn't "bloated", it's "deeply defensive".
- **Why wrap litellm fallback**: litellm Router doesn't support per-model max_tokens differentiation.
- **Why prompt is inline, not a template file**: Prompt changes = code changes = full git history.
```

Excerpt from `docs/loop-docs/call-graph.md`:

```markdown
## Call Tree: main() → Full Chain

main() [main.py:42]
├── Config.load() [config.py:18]              ← L45: Load config at startup
│   ├── parseEnvFile() [config.py:30]
│   └── validateSchema() [config.py:55]
├── Database.connect() [db/index.ts:10]       ← L48: Connection pool init
├── Router.register() [api/router.ts:15]      ← L52: Register all API routes
└── Server.listen() [external]                ← L60: Start HTTP listener
```

---

## How It Compares

| Approach | What It Does | vs. MakeSkillsBest |
|---|---|---|
| Direct Agent fix | "Fix this bug" | No boundaries, no style checks, no self-review — Agent may break adjacent code |
| Lint / SonarQube | Static rule checking | Finds problems only — no fixing, no verification, no tech docs |
| Dependabot / Renovate | Dependency updates | Only versions — no code quality, injection audit, or architecture decay |
| AI Code Review | PR-level diff review | Post-hoc — problems are already committed when found |
| **MakeSkillsBest** | **Full engineering loop** | **Analyze→Diagnose→Plan→Bound→Fix→Verify→SelfReview→Learn** — a complete closed loop |

---

## Key Capabilities

- **Cross-Agent Adaptive** — Auto-detects Claude Code / Codex / Cursor, adapts dispatch model and permissions
- **Auto Environment Prep** — Creates venv → installs deps → copies .env; honestly degrades when blocked
- **Style-Adaptive Fixes** — Modified code is indistinguishable from human-written; matches naming, error handling, and comment conventions
- **Security-First Prioritization** — CVEs sorted by reachability × exposure × upgradeRisk; won't break your project for an unreachable dev dependency
- **Dead Code Protection** — 5-point deletion checklist: dynamic import? public API? config reference? plugin convention? test reference? All NO → safe to delete
- **Self-Review** — 10-point diff-level audit: allowed files / new deps / API changes / scope creep / contract violations / snapshots / error patterns / linter warnings / over-implementation
- **Diminishing Returns Stop** — 2 consecutive rounds with max severity ≤ LOW → auto-stop, no token waste
- **Permanent Tech Docs** — Knowledge graph, architecture diagrams, file index, call chains — readable Markdown documentation that outlives the Loop

---

## Contributing

Issues and PRs welcome.

- New skills: create a directory under `skills/` with a `SKILL.md`
- Improve existing skills: edit the corresponding `SKILL.md`
- Documentation improvements: all files under `docs/`

---

## License

MIT © [dotVSdoll](https://github.com/dotVSdoll)
