## Why

Pulso's feature-first Nx boundaries are currently documented but still require long commands and coordinated manual edits. That makes the intended architecture harder to reproduce safely in a portfolio that deliberately models multiple autonomous repositories.

## What Changes

- Add guided and flag-driven library, feature, and remote-repository generators.
- Replace the hard-coded repository list with a validated registry and deterministic workspace output.
- Make repository creation transactional and leave external provisioning explicit.
- Coordinate declarative architecture configuration and a uniform remote route contract across the app repositories.

## Capabilities

### New Capabilities

- `architecture-scaffold-generators`: safe generation and registration of Pulso architecture units.

### Modified Capabilities

- `context-menu-generators`: exposes the three architecture generators next to existing artifact generators.
- `agent-ready-workspace`: derives repository orchestration from a versioned registry.

## Impact

The Tooling CLI, workspace file, Shell federation registry, app boundary configuration, documentation, tests, and generated-repository template are affected. No external repository or Firebase resource is provisioned.
