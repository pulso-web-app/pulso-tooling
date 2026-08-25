## Why

The existing VS Code generator tasks depend on the active editor, so developers cannot generate an Angular artifact directly from a folder selected in the Explorer. Pulso needs a lightweight context-menu workflow without maintaining a custom VS Code extension.

## What Changes

- Recommend and configure the existing Command Runner extension in the multi-root workspace.
- Add predefined English commands for every supported Angular generator.
- Resolve the owning Nx workspace and target directory from the Explorer selection instead of the active editor.
- Preserve the existing task-based generator workflow as a keyboard-friendly alternative.
- Add automated coverage and English usage documentation for folder and file selections.

## Capabilities

### New Capabilities

- `context-menu-generators`: Safe Angular generation from a selected VS Code Explorer folder or file.

### Modified Capabilities

None.

## Impact

This change affects only `pulso-tooling`. It adds a recommended editor extension and workspace settings but does not modify application runtime code, federation contracts, dependencies, deployment, or secrets.
