## Why

Shell and CRM bundle different Firebase entry points, which embeds separate @firebase/app service registries. A Shell-created app therefore cannot resolve the Firestore service registered by CRM.

## What Changes

- Explicitly share the @firebase/app registry as a strict singleton in Shell and CRM, pinning the matching installed SDK dependency.
- Verify the emitted host/remote module graph with a no-network Firebase initialization check and authenticated browser navigation.
- Coordinate this fix under the same change ID in Shell, CRM, and Tooling.

## Capabilities

### New Capabilities

None; tooling adds a validation command for generated artifacts.

### Modified Capabilities

None.

## Impact

Shell owns authentication and composition, CRM owns contact reads, and Tooling owns artifact validation and coordination. Preserve ports 4200/4201/4202, remote names, ./Routes, guards, database rules/data, filters, pagination, and hosting. No deployment or application CRUD changes. Apply the dependency fix in both consumers before rebuilding and restarting the affected development servers.
