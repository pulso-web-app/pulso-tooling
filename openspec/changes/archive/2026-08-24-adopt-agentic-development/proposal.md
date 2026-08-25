## Why

Pulso's independent repositories need consistent, discoverable documentation and safe agent-assisted workflows without sacrificing repository ownership. The existing multi-root tooling is the right coordination point for shared conventions and cross-repository validation.

## What Changes

- Add authoritative hierarchical agent instructions and thin Claude/Copilot adapters across all four repositories.
- Add curated repository Skills with deterministic synchronization and drift checks.
- Adopt repository-local OpenSpec 1.10.0 and a same-ID umbrella workflow for cross-repository changes.
- Add English project documentation, architecture guidance, contribution rules, pull-request templates, Markdown validation, public commands, VS Code tasks, tests, and CI gates.
- Remove the legacy generic Firebase Skill bundle from the shell.

Non-goals include joining the repositories, backfilling every existing product specification, adopting the beta OpenSpec Store, changing application architecture, or changing deployment automation.

## Capabilities

### New Capabilities

- `agent-ready-workspace`: Coordinated instructions, Skills, specifications, validation, documentation, and multi-repository agent workflows.

### Modified Capabilities

None.

## Impact

This umbrella affects `pulso-tooling`, `pulso-shell`, `pulso-crm`, and `pulso-projects`. It adds development dependencies and validation gates but does not change runtime federation contracts, application behavior, Firebase projects, hosting targets, or secrets.
