## Context

See `proposal.md` for motivation. This repository coordinates independent application repositories and does not own their rendered icon implementations.

## Goals / Non-Goals

**Goals:**
- Keep one change ID and one acceptance contract across affected repositories.
- Make preservation of Angular Material an explicit integration invariant.
- Verify both repository-local quality gates and the federated result.

**Non-Goals:**
- Hoist dependencies or source code between repositories.
- Change generated integrations, manifests, authentication, routes, or deployment.

## Decisions

- The coordinator records scope and verification only. Application code and dependencies remain owned by Shell and CRM, preserving repository independence.
- Projects is excluded after source inventory confirms it renders no authored Material icons. Adding a package there would create an unused dependency.
- Acceptance combines static inventory, repository checks, and browser inspection because compilation alone cannot establish visual alignment with Material controls.

## Risks / Trade-offs

- [The same package can render differently across host and remote styles] -> Inspect the federated composition, not only standalone applications.
- [An icon-only change can accidentally broaden into a component rewrite] -> Treat existing Material elements and dependencies as protected invariants in specs, tasks, and regression tests.

## Migration Plan

1. Apply the same change ID to Shell and CRM.
2. Verify application-local icon inventories and quality gates.
3. Start Shell, CRM, and Projects and inspect the integrated experience.
4. Roll back by reverting only icon-package, icon-template, icon-style, and icon-test changes; no data migration is required.
