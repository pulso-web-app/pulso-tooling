## Context

See the same-ID changes in CRM, Shell, and Projects. Tooling remains a coordinator without application dependencies.

## Goals / Non-Goals

Coordinate consistent shared paths, safe transfer, and validation without changing CLI behavior or joining workspaces.

## Decisions

CRM implements shared reads, seed, and migration. Shell owns canonical rules and indexes plus two-user emulator tests. Projects records its future persistence contract only. Validate local code and rules, back up and migrate legacy trees, publish rules, verify stored data and published source, then run aggregate checks. Keep old-source snapshots for recovery; do not silently restore per-user rules after shared writes begin.

## Risks / Trade-offs

Use one change ID and explicit local links. Preserve independent artifacts and hosting. The migration aborts on collisions, and no real credentials enter source control. App changes are archived before this umbrella when the filesystem permits normal archival.
