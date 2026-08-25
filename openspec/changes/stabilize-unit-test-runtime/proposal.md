## Why

Aggregate app tests currently emit avoidable environment and builder warnings, making genuine failures harder to identify.

## What Changes

- Normalize the child-process color environment used by aggregate commands.
- Coordinate compatible Angular unit-test build targets in all app repositories.
- Verify aggregate output contains no known runtime errors or configuration warnings.

## Capabilities

### New Capabilities

None. This change only corrects test infrastructure and opts out of behavioral specifications.

### Modified Capabilities

None.

## Impact

Only local and CI test orchestration changes. Product behavior, federation contracts, dependencies, and deployment remain unchanged.
