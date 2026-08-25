## Why

Pulso defines English as the shared language for authored content, but Portuguese remains in tooling CLI output and application copy. Mixed-language output reduces consistency for developers, tests, accessibility, and agent-assisted maintenance.

## What Changes

- Translate authored Portuguese CLI messages, user-facing copy, accessibility labels, route titles, and test expectations across all Pulso repositories.
- Preserve product behavior, routes, architecture, commands, and deployment configuration.
- Validate tracked authored content with language scans and run each repository's quality gates.

## Capabilities

### New Capabilities

- `english-authored-content`: English-only authored developer and product content across Pulso repositories.

### Modified Capabilities

None.

## Impact

This umbrella change affects `pulso-tooling`, `pulso-shell`, `pulso-crm`, and `pulso-projects`. It changes visible copy and matching test assertions but does not change runtime contracts, dependencies, persistence, authentication behavior, federation, or deployment.
