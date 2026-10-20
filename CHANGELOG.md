# Changelog

## Unreleased

- Added regression coverage for preserving authored deck content through JSON save/load cycles,
  including hidden instances, local edges, and cross-scene connections; runtime behavior is unchanged.

## 0.1.0 — 2026-07-24

- Split the original single-file prototype into core, player, editor, CLI, scripts, schema, example,
  and documentation modules.
- Added schema version 2.0 with validation and finite resource limits.
- Replaced deck-authored HTML injection with safe DOM construction and structured built-in visuals.
- Added reusable entities and scene-local visual instances.
- Added explicit narrative beats, progressive reveals, readable-scale protection, time-based motion,
  keyboard/touch navigation, reduced motion, and an optional whole-graph view.
- Added JSON import/export, undo/redo, node positioning, layout controls, and a portable single-file
  build with hashed CSP.
- Reworked the “Graphs Are Awesome” narrative and corrected or removed high-risk factual claims.
- Preserved the original prototype unchanged in `legacy/graph-deck_1.html`.
- Declared the initial public release as a technical preview and added cross-surface interface
  status, trust-boundary, Agent Skill, coding-agent, Pages, and release-governance contracts.
