## Context

The existing Node tooling coordinates three independent Nx repositories and already owns setup, diagnostics, aggregate commands, safe generators, and the multi-root VS Code workspace. OpenSpec generates tool-specific integrations, while curated Pulso guidance needs one editable source.

## Goals / Non-Goals

**Goals:**

- Preserve repository independence and provide a shared workflow.
- Make agent rules hierarchical, small, portable, and testable.
- Detect Skill and adapter drift without overwriting OpenSpec content.
- Add strict documentation and specification gates locally and in CI.

**Non-Goals:**

- A parent Nx/npm workspace, dependency hoisting, or shared application source.
- OpenSpec Store, cloud coding agents, deployment changes, or full brownfield specification backfill.

## Decisions

- Use root `AGENTS.md` as the authority because it supports hierarchical discovery across tools. Thin adapters avoid contradictory copies.
- Store curated Skills under `.agents/skills/pulso-*` and mirror by deterministic filesystem content. Name-based ownership provides a safe mutation boundary and preserves OpenSpec-managed names.
- Keep OpenSpec local and coordinate cross-repository work by identical change IDs. This preserves behavioral ownership and independent validation.
- Include authored Markdown only in markdownlint inputs; generated OpenSpec integrations and artifacts are excluded.
- Keep synchronization and validation in Node standard-library code so the tooling remains portable and directly testable.

## Risks / Trade-offs

- [Tool discovery conventions evolve] → Keep adapters thin and refresh generated OpenSpec integrations through the pinned CLI.
- [A standalone tooling checkout lacks sibling repositories] → Agent commands operate on the tooling repository plus available known siblings; aggregate application checks require full onboarding.
- [Mirrors can be edited accidentally] → Hash checks fail and synchronization recreates only `pulso-*` mirror directories.

## Migration Plan

Install pinned dependencies, initialize integrations, replace legacy Skills, add documentation and validation, synchronize mirrors, validate all repositories, then archive same-ID app changes before the umbrella change. Rollback is file-level removal of the new development layer; runtime artifacts are unaffected.
