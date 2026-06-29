# MakeSkillsBest

> **Skills that think in loops. First skill: Context Gardener 🌱**

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/skills-1-orange" alt="skills">
  <br>
</p>

[中文](README.md)

---

### This is not just another prompt collection

AI agents can write code and answer questions. But ask one to **automatically maintain something that needs ongoing attention**—like your project's instructions, rules, and memory files—and things fall apart:

- A CLAUDE.md untouched for three months, full of outdated conventions
- Three memory files describing the same decision, contradicting each other
- `.claude/` accumulating more and more instructions—no one dares to delete, no one reads them
- Every new session, the agent doesn't know your conventions. You explain everything again

The problem isn't model capability. It's that **maintenance work lacks structure**.

Loop Engineering fills this gap: **define maintenance tasks as repeatable loops, then let the agent execute, verify, and decide when to stop on its own.**

---

## Philosophy

MakeSkillsBest is a **skills repository**. Each skill embeds [**Loop Engineering**](docs/philosophy.md) as its core philosophy—not a one-shot tool, but a self-looping, self-maintaining agent workflow.

Every skill follows this skeleton:

```
Entry → Observe → Diagnose → Plan → Act → Verify → Learn → Decide
                              ↑________________________________↓
                     Decide=continue loops back to Observe or Act
```

This structure matters for three kinds of scenarios:

| Scenario | Why Loop Matters |
|----------|-----------------|
| **Ongoing maintenance** | Instruction files rot. One-time cleanup isn't enough—regular inspection is needed |
| **Multi-round iteration** | One pass isn't enough. Fix, verify, find new issues, fix again |
| **Long-term monitoring** | Left alone, things decay. The loop runs on a schedule; you just read the results |

---

## Featured Skill: Context Gardener 🌱

Your project's context files (`CLAUDE.md`, `.claude/memory/*.md`, `.claude/rules/*`) are a garden.
They rot over time—outdated conventions, contradictory rules, bloated documents no one maintains.

**The Gardener patrols regularly, trims dead branches, pulls weeds, and keeps your "context garden" healthy.**

```bash
# Claude Code
/gardener "check project instruction health"

# Cursor
@gardener check project instruction health

# Codex CLI
gardener run
```

### What It Does

Each run is a complete Loop:

```
🔍 Observe     → Scan all context files: size, last modified, structure
🩺 Diagnose    → Detect stale files / contradictions / bloat / redundancy
📋 Plan        → Generate pruning plan (what to delete, merge, flag)
🔧 Act         → Apply changes (with your confirmation)
✅ Verify      → Re-check: did issues improve? Any false positives?
📝 Learn       → Record what was learned, save to memory
🔁 Decide      → Garden healthy? Stop. Issues remain? Schedule next round
```

### Visual Report

After each run, a "garden" panorama is generated—every file is a plant, health at a glance:

```
🌻 CLAUDE.md  — Healthy (last updated 3 days ago)
🌿 memory/    — Good (1 suggestion)
🥀 rules/     — Needs attention (stale 45 days, contradiction detected)
```

> Post-MVP: Persistent web service with interactive garden interface + schedule panel.

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/dotVSdoll/MakeSkillsBest.git

# Install the Gardener skill
# Claude Code:
ln -s $(pwd)/skills/context-gardener ~/.claude/skills/context-gardener

# Run it
/gardener "check the current project's context file health"
```

Detailed platform-specific installation guides coming soon.

---

## Project Structure

```
MakeSkillsBest/
├── skills/
│   └── context-gardener/     # Gardener skill (Loop Engineering infused)
│       ├── SKILL.md           # Skill definition
│       ├── engine/            # Core engine
│       └── ui/                # Garden visualization
├── archive/
│   └── skills/                # Historical skills archive (reference)
├── docs/
│   └── philosophy.md          # Loop Engineering design philosophy
├── CLAUDE.md                  # Project-level instructions
└── README.md
```

---

## Roadmap

| Phase | Content |
|-------|---------|
| **MVP** | Context Gardener skill + static HTML report |
| **V2** | Persistent web service + interactive garden UI + scheduling |
| **V3** | More Loop Engineering skills (TBD) |

---

## License

MIT © [dotVSdoll](https://github.com/dotVSdoll)
