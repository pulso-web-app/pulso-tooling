## Context

Command Runner receives the selected Explorer resource through `${selectedFile}`, but its `${workspaceFolder}` variable is based on the active editor. The four Pulso repositories are fixed sibling directories, so any workspace root can locate `pulso-tooling`, while the selected path is the only safe source for determining the owning application and generation target.

## Goals / Non-Goals

**Goals:**

- Generate all seven supported Angular artifact types from an Explorer selection.
- Keep path validation and local Nx execution in the existing tooling helper.
- Work with folders, files, spaces in paths, and the Pulso multi-root workspace.
- Keep all distributed command labels and documentation in English.

**Non-Goals:**

- Building or publishing a Pulso VS Code extension.
- Replacing Nx generators, changing their defaults, or modifying application code.
- Supporting arbitrary repositories or directories outside the known Pulso apps.

## Decisions

- Use `edonet.vscode-command-runner` because it exposes `${selectedFile}`, `${input}`, and an Explorer context-menu command.
- Configure seven explicit commands rather than accepting a free-form generator type. This keeps generator selection within the existing allowlist.
- Leave `${selectedFile}` unquoted in the command template because Command Runner already serializes selected paths with quotes; quote `${input}` and the tooling script path separately.
- Make the CLI workspace argument optional and infer the known repository from the selected path. Existing VS Code tasks may continue passing an explicit workspace for compatibility.
- Treat a selected file as its parent directory and reject every target outside `apps/<app>/src/app`.

## Risks / Trade-offs

- [Command Runner executes shell text] → Distribute only fixed commands and retain all name/path validation in the Node helper.
- [The active editor belongs to another workspace root] → Use it only to locate the fixed sibling `pulso-tooling`; infer the Nx workspace from `${selectedFile}`.
- [The extension is unavailable] → Preserve the existing native VS Code tasks as a fallback.

## Migration Plan

Add the recommendation and settings, update the helper and tests, document the workflow, and validate the workspace. Rollback removes the Command Runner settings while leaving the existing tasks operational.
