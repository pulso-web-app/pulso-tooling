# Tooling CLI Rules

- Keep the CLI dependency-light and based on Node standard library APIs unless a reviewed requirement justifies otherwise.
- Every filesystem mutation must be limited to an explicit repository or generated mirror path.
- Setup may clone a missing repository and run `npm ci`; it must never pull, checkout, reset, or overwrite an existing directory.
- Spawn commands with argument arrays, hidden windows where appropriate, and process-tree termination on Windows.
- Aggregate commands must preserve per-project output and fail when any child fails.
- Generator commands may target only an application's `src/app` composition root or the `src/lib` tree of a library backed by an Nx `project.json`.
- Agent synchronization may replace only directories whose names match `pulso-*` inside the two mirror roots. It must preserve all `openspec-*` content.
- Export deterministic logic for `node:test`; keep process exits and console output at the CLI boundary.
- Keep prompts in the reusable native-Node prompt layer and keep library, feature, registry, template, and route logic outside `cli.mjs`.
- Repository scaffolds must pass in a validated staging directory before publication; cleanup may target only that command-owned staging directory.
