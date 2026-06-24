# MakeSkillsBest

> **Code Optimization Engineering Loop — not for building new features, but for making existing code better.**

[中文](README.md)

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-13-orange" alt="skills">
  <img src="https://img.shields.io/badge/phases-12-purple" alt="phases">
</p>

---

### TL;DR

MakeSkillsBest is an **engineering loop for AI Coding Agents**. It understands your repo, diagnoses security/quality issues, generates a fix plan, locks modifiable files, then fixes in small steps with self-review. Good for onboarding large repos, managing tech debt, fixing security, reducing complexity. Not for building new features from scratch.

---

## Table of Contents

- [What It Is](#what-it-is)
- [Three Ways to Use](#three-ways-to-use)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Safety Contract](#safety-contract)
- [Core Workflow](#core-workflow)
- [Output Directory](#output-directory)
- [Full Case Study](#full-case-study)
- [Output Examples](#output-examples)
- [Skill Ecosystem](#skill-ecosystem)
- [How It Compares](#how-it-compares)
- [What It's Good For](#what-its-good-for)
- [Key Capabilities](#key-capabilities)
- [Contributing](#contributing)
- [License](#license)

---

## What It Is

**MakeSkillsBest is a 12-phase, 13-skill code optimization lifecycle.** The first 2 phases (Detect + EnvReady) handle tool detection and environment prep; the remaining 10 phases are executed by `engineering-loop` as a complete **Diagnose → Plan → Bound → Fix → Verify → SelfReview** closed loop.

It doesn't build new features — it finds existing problems in your code and fixes them safely, traceably, and with style consistency.

Common AI coding agent mistakes:

- Fixes one bug, introduces three new ones
- Breaks the project's existing code style
- "Incidentally" refactors modules it shouldn't touch
- Changes code without knowing whether the fix actually works

**Cross-Agent Adaptive:** On first run, automatically detects your AI Coding tool, reads local configuration, and adapts sub-task dispatch and CLI permissions. Detection covers: host tool type, parallel sub-task support, shell command and file write permissions, git workspace status. No manual configuration needed.

**Prerequisites:**

- Any AI Coding Agent that accepts `/skill` or similar instructions
- A code repository (local path or GitHub URL)
- Recommended: `git` + the project's language runtime (the Loop auto-detects and prepares)

---

## Three Ways to Use

No mode switching — just express intent in natural language:

### 1. Just Understand the Project

```
/optimize-loop "Analyze this repo, generate architecture docs and risk report, don't modify code"
```

The Loop runs through all analysis phases, finds no tasks at Plan → auto-ends, leaving zero code changes.

### 2. Get a Fix Plan First

```
/optimize-loop "Analyze this repo, generate a fix plan and modification boundaries, don't execute yet"
```

Stops after the Bound phase — you get a complete fix plan + allowlist/red zones before confirming.

### 3. Let It Fix in Small Steps

```
/optimize-loop "Reduce core module complexity and verify after each batch of fixes"
```

Full 12-phase run — each batch verified after execution, problems trigger immediate rollback.

> If no fixable issues are found during diagnosis, the Loop auto-ends after Plan. You're never forced into code changes.

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

## Safety Contract

MakeSkillsBest operates on **least privilege**. You can trust it won't overstep:

| Promise | How It's Enforced |
|---|---|
| Won't modify code before locking boundaries | Fixes only execute after `implementation-map` generates an allowlist |
| Won't touch red-zone files | `implementation-map` auto-detects forbidden modules from architecture contracts and dependency analysis |
| Won't fake execution results | When environment prep fails, it honestly degrades to static analysis — never pretends a CLI tool ran |
| All changes are traceable | Every step logged to `.loop-log/`, every commit is an atomic task |
| Style consistency checked before changes | `style-profile` ensures fixes match existing naming, error handling, and comment conventions |
| Self-review after every change | 10-point diff audit: scope creep, new deps, API breakage, contract violations… |
| Consecutive failures trigger stop | 2 verify failures → replan; 2 self-review failures → stop |
| Diminishing returns auto-stop | 2 consecutive rounds with max severity ≤ LOW → stops to save tokens |

---

## Core Workflow

```
Detect → EnvReady → Observe → Understand → Diagnose → Plan → Bound
    → Fix → Verify → SelfReview → Learn → Decide
     ↑___________________________________________↓
           Decide=continue loops back to Fix or Observe
```

The first 2 phases are **one-time gates** (not part of the loop). The remaining 10 form the `engineering-loop` optimization cycle.

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

---

## Output Directory

After a run, you'll have reusable assets — not a disposable chat transcript:

```
docs/loop-docs/
├── knowledge-graph.md         ← Four-layer graph (symbols→calls→data flow→dependencies)
├── symbol-index.md            ← Per-file symbol index
├── call-graph.md              ← Tree-structured call graph from entry points
├── module-dependencies.md     ← Module dependency matrix + impact analysis
├── project-overview.md        ← Full project technical doc (per-module deep dive)
├── architecture.md            ← Architecture doc + data flow + decision points
└── file-index.md              ← Complete file index (role/deps/modification notes)

.loop-log/
└── {YYYY-MM-DD}_{repo}-{goal}/
    ├── 00-detect.md           ← Agent detection + adapter selection
    ├── 01-env-ready.md        ← Environment readiness + auto-prep
    ├── 02-observe.md          ← Style profiling
    ├── 03-understand.md       ← Semantic understanding + direction validation
    ├── 04-diagnose.md         ← Security audit + quality diagnosis
    ├── 05-plan.md             ← Fix plan + task DAG
    ├── 06-bound.md            ← Allowlist + red zones
    ├── 07-fix.md              ← Per-task fix details
    ├── 08-verify.md           ← Verification results
    ├── 09-self-review.md      ← Self-review findings
    ├── 10-learn.md            ← Lessons learned
    └── INDEX.md               ← Quick index (searchable by keyword)
```

---

## Full Case Study

A real optimization run on [daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis) (Python stock analysis platform, ~200 source files).

> Not simulated — from an actual static/execution hybrid optimization test. All numbers correspond to real diffs and compilation output.

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
| **Understand** | 7 tech docs generated, 12 modules detailed, evidence matrix | Direction: code organization + security hardening |
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
| _format_prompt() | 3140 | 450-line prompt template — covers all analysis dimensions |
| _parse_response() | 3778 | Three-layer parsing defense — JSON→json_repair→text regex |

### Design Decisions

- **Why analyze() is 270 lines**: Every step has error handling and retries — "long" isn't "bloated", it's "deeply defensive"
- **Why wrap litellm fallback**: Router doesn't support per-model max_tokens differentiation
- **Why prompt is inline**: Prompt changes = code changes = full git history
```

Excerpt from `docs/loop-docs/call-graph.md`:

```markdown
## Call Tree: main() → Full Chain

main() [main.py:42]
├── Config.load() [config.py:18]              ← L45: Load config at startup
│   ├── parseEnvFile() [config.py:30]
│   └── validateSchema() [config.py:55]
├── Database.connect() [db/index.ts:10]       ← L48: Connection pool init
└── Server.listen() [external]                ← L60: Start HTTP listener
```

---

## Skill Ecosystem

13 skills organized into four usage groups. **All skills can be invoked independently — no need to run the full Loop.**

### When to Use the Full Loop vs. a Single Skill?

| Scenario | Recommendation |
|---|---|
| Onboarding a large unfamiliar repo | Full `/optimize-loop` |
| Just want to understand architecture | Run `semantic-rag` + `knowledge-graph` standalone |
| Just want a security check | Run `security-audit` standalone |
| About to edit code, worried about boundaries | Run `implementation-map` standalone |
| Made changes, want to prove nothing broke | Run `verification-loop` standalone |
| Just want project documentation | Run `repo-decompose` standalone |

### Analysis — Understanding Your Project

| Skill | When to Use |
|---|---|
| `style-profile` | Joining a new project — learn its code style first |
| `semantic-rag` | Understanding overall architecture and module responsibilities |
| `knowledge-graph` | Tracing call chains, data flows, module dependencies |
| `repo-decompose` | Decomposing requirements, generating architecture docs |
| `mvp-approach` | Validating which optimization direction is most feasible |

### Diagnosis — Finding Problems

| Skill | When to Use |
|---|---|
| `security-audit` | Checking CVE, auth flaws, injection risks, secret leaks |
| `quality-audit` | Checking duplication, complexity, dead code, test gaps |

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
| `engineering-loop` | Orchestrator — 2 gates + 10-phase optimization cycle |

---

## How It Compares

| Approach | Common Failure Mode | How MakeSkillsBest Prevents It |
|---|---|---|
| Direct Agent fix | Scope creep, Agent rewrites adjacent code | `implementation-map` allowlist + red zones + SelfReview |
| Lint / SonarQube | Reports rules but doesn't know how to fix | `delivery-plan` + `task-graph` generate executable fix plan |
| Dependabot / Renovate | Upgrades deps without reachability check | CVE × reachability × exposure × upgradeRisk ranking |
| AI Code Review | Post-hoc — problems already committed | Bound before changes, Verify + SelfReview after |
| **MakeSkillsBest** | **Full analyze→diagnose→plan→bound→fix→verify→self-review→learn closed loop** | |

---

## What It's Good For

**Good for:**

- Medium to large existing codebases
- Projects needing security audit, quality governance, dead code cleanup, complexity reduction
- Multi-maintainer projects where AI style consistency and boundary safety matter
- Engineering workflows: plan first, fix in small steps, verify after each batch

**Not good for:**

- Generating a new app or feature from scratch
- One-shot massive rewrites (the Loop philosophy is small-step iteration)
- Environments without git or where dependency installation is forbidden
- Scenarios where you want the Agent to make large-scale changes without confirmation

---

## Key Capabilities

- **Cross-Agent Adaptive** — Auto-detects host tool (Claude Code / Codex / Cursor / Gemini CLI / Windsurf), reads local config, adapts dispatch model and permissions
- **Auto Environment Prep** — Creates venv → installs deps → copies .env; honestly degrades to static analysis when blocked
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
