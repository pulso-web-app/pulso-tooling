## Context

Pulso uses four independent Git repositories, while Nx provides project boundaries inside each application repository. The tooling must therefore coordinate repositories without turning their parent directory into another package workspace.

## Decisions

- `pulso.repositories.json` is the single registry for orchestration and Shell remote metadata.
- App dependency constraints are derived from each repository's `architecture.config.json`.
- Interactive prompts use Node's built-in readline API; the same operations accept flags for automation.
- Nx remains responsible for library and component scaffolding. Tooling normalizes the result and owns route and registry integration.
- Repository scaffolding is rendered into a validated temporary sibling directory, checked locally, initialized with Git, and moved only after success.
- Shell remote source and both federation manifests are deterministic generated artifacts.

## Safety

Generation rejects invalid names, traversal, duplicates, occupied ports, dirty registration targets, and unresolved template tokens. Structured files use atomic replacement. A failed repository subprocess removes only its validated staging directory and does not register partial state.
