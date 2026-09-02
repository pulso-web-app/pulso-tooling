## Why

Pulso's business data must be shared by every authenticated user. The current CRM queries and Shell rules implement per-user collections, requiring a coordinated correction.

## What Changes

- Coordinate same-ID changes in CRM, Shell, and Projects.
- Record the shared paths and the separation between business records and private account profiles.
- Validate rules with two identities, migrate legacy records with verified backups, then run all repository checks.

## Capabilities

### New Capabilities

None; Tooling supplies coordination and documentation only and skips delta specs.

### Modified Capabilities

None.

## Impact

CRM owns shared queries, seed, and migration; Shell owns rules and rule tests; Projects documents its future integration without implementing features. Shared acceptance: both authenticated users can read/write identical business documents; unauthenticated clients cannot; legacy records retain IDs and content after transfer. Sequence: local implementation and tests, backup and migration, publish only Firestore rules, verify remote state, aggregate checks. Preserve remote names, ports, independent repositories, Firebase project, authentication providers, hosting, and CI. No roles, tenants, or application hosting deployments.
