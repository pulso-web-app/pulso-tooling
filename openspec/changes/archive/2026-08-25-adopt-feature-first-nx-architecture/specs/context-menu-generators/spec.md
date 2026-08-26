## MODIFIED Requirements

### Requirement: Explorer context-menu generation

The Pulso multi-root workspace SHALL recommend and configure an existing VS Code extension that offers predefined English commands for component, service, guard, directive, pipe, interceptor, and resolver generation from the selected Explorer resource.

#### Scenario: Developer selects an application folder

- **WHEN** a developer right-clicks a folder below an application's `apps/<app>/src/app` composition root or a project's `libs/**/src/lib` feature-first source root, chooses a Pulso generator command, and provides a valid logical name
- **THEN** the tooling executes the corresponding local Nx generator in that folder with the repository defaults

### Requirement: Context-menu safety

The context-menu workflow SHALL retain the generator allowlist, logical-name normalization, traversal rejection, explicit Angular source-root restriction, and local Nx requirement of the existing helper.

#### Scenario: Developer selects an unsafe target

- **WHEN** a selected resource is outside a known `apps/<app>/src/app` or `libs/**/src/lib` tree, or the provided name is absolute or contains traversal
- **THEN** generation stops with a clear error before invoking Nx
