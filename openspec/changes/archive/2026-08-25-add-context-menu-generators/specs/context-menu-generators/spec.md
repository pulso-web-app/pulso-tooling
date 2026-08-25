## Purpose

Defines safe Angular artifact generation from resources selected in the VS Code Explorer.

## ADDED Requirements

### Requirement: Explorer context-menu generation

The Pulso multi-root workspace SHALL recommend and configure an existing VS Code extension that offers predefined English commands for component, service, guard, directive, pipe, interceptor, and resolver generation from the selected Explorer resource.

#### Scenario: Developer selects an application folder

- **WHEN** a developer right-clicks a folder below `apps/<app>/src/app`, chooses a Pulso generator command, and provides a valid logical name
- **THEN** the tooling executes the corresponding local Nx generator in that folder with the repository defaults

### Requirement: Selected-resource ownership

The generator helper SHALL infer Shell, CRM, or Projects ownership from the selected path, treat a selected file as its parent directory, and SHALL NOT depend on the active editor to choose the Nx workspace.

#### Scenario: Active editor and selected folder belong to different repositories

- **WHEN** the active editor belongs to one Pulso repository and the selected Explorer resource belongs to another
- **THEN** generation targets the repository and directory containing the selected resource

### Requirement: Context-menu safety

The context-menu workflow SHALL retain the generator allowlist, logical-name normalization, traversal rejection, source-root restriction, and local Nx requirement of the existing helper.

#### Scenario: Developer selects an unsafe target

- **WHEN** a selected resource is outside a known `apps/<app>/src/app` tree or the provided name is absolute or contains traversal
- **THEN** generation stops with a clear error before invoking Nx
