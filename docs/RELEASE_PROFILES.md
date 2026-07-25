# Release profiles

Public copy must describe the selected profile, not the intended end state.

## Current selection: Profile A — technical preview

The first public repository promises:

- graph-based browser presentations from schema-versioned JSON;
- safe built-in deck selection and local JSON import;
- validation and statistics through the local CLI;
- a CSP-protected offline single-file export;
- a static discovery site and example deck;
- an Agent Skill that returns inert JSON source.

It does **not** promise YAML, a hosted API, MCP, persistent sharing, registry packages, or arbitrary
remote material ingestion.

## Profile B — public alpha

Profile B may be selected only when at least one developer interface has deterministic installation,
executable documentation, adversarial fixtures, accessibility evidence, privacy controls, versioned
examples, and signed/checksummed release artifacts.

Likely gate candidates:

- publishable CLI package with lockfile and tested install path;
- safe YAML parser with JSON parity;
- browser accessibility and visual-regression automation;
- release checksums, SBOM, provenance, and upgrade notes;
- stable static site URLs and example versioning.

## Profile C — complete multi-interface launch

Profile C may publicly promise web, CLI, MCP, API, JSON/YAML, Agent Skill, and offline/self-hosted
use only when every P0 interface and trust task has executable evidence. There is no partial-credit
marketing language: an unavailable interface is marked planned until its closure gate passes.

## Copy gate

Any change to README opening text, homepage H1, GitHub About, package description, Agent Skill
metadata, CLI help, schema status, or future API/MCP metadata must pass the discovery contract test
and this profile review.
