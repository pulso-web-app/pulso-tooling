## Why

Pulso's independent repositories model domain ownership well, but each Angular repository currently concentrates product code in one application project and therefore gains little from Nx project graphs, boundaries, affected execution, or granular caching. The developer platform must support a feature-first, multi-project Nx architecture without turning the parent directory into a shared workspace.

## What Changes

- Coordinate the same feature-first Nx architecture across Shell, CRM, and Projects while preserving independent repositories, lockfiles, CI, caches, and deploys.
- Allow safe Angular artifact generation inside both application composition roots and Nx library source roots.
- Update workspace guidance, tasks, agent instructions, and curated Skills to explain repository, deployable MFE, and internal Nx-project boundaries.
- Preserve every existing public script and add project-aware validation without changing federation names, ports, routes, or deployment targets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-ready-workspace`: The coordinated workspace documents and validates the feature-first Nx project model used inside each independent application repository.
- `context-menu-generators`: Safe artifact generation accepts owned application and library source roots while retaining traversal protection and local Nx execution.

## Impact

Affected repositories are `pulso-tooling`, `pulso-shell`, `pulso-crm`, and `pulso-projects`. Tooling CLI path validation, tests, the multi-root workspace, documentation, agent instructions, Skills, and application-local Nx configurations change. Runtime federation contracts, ports 4200-4202, Git histories, hosting targets, and deployment independence do not change. Application changes are implemented and validated first; the tooling umbrella is validated and archived last.
