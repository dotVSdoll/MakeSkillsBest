# Roadmap

## v0.1 - First Repository Release

- [x] Web Canvas scene using Vite, React, TypeScript, and Canvas 2D
- [x] Python scanner and analyser for context-health files
- [x] Detached service mode with immediate first scan
- [x] 6 hour default scan interval and 24 hour default runtime window
- [x] Explicit phase writer through `garden phase`
- [x] Claude Code `/garden` command and lifecycle hook fallback
- [x] npm-style global CLI with `garden install-claude`
- [x] Playwright and runtime regression scripts

## v0.2 - Operator Controls

- [ ] Web UI service status, stop, pause, resume, and next scan time
- [ ] `garden doctor` to validate Node, Python, PATH, Claude config, and ports
- [ ] UI for step-to-skill key/value mapping
- [ ] Better service log viewer and round history browser

## v0.3 - Agent Fidelity

- [ ] Split orchestration into smaller installable phase skills
- [ ] Make every phase skill write phase/layer state before and after work
- [ ] Add real Claude Code terminal integration tests for `/garden`
- [ ] Improve active-layer plant degradation and recovery visuals

## v0.4 - Long-Run Memory

- [ ] Round-to-round trend summaries
- [ ] Memory compaction and retention policy
- [ ] Health history chart in the Web UI
- [ ] Safer recommendations for context repair workflows
