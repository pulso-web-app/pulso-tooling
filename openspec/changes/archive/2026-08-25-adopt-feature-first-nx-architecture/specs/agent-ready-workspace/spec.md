## MODIFIED Requirements

### Requirement: Authoritative agent instructions

Each Pulso repository SHALL expose concise root instructions and only use scoped instructions where local architectural or safety rules differ. The guidance SHALL distinguish repository ownership, deployable microfrontend boundaries, and internal feature-first Nx project boundaries. Claude Code and GitHub Copilot adapters SHALL direct their tools to the same authoritative instructions without duplicating the manual.

#### Scenario: Agent begins repository work

- **WHEN** an agent starts a task or enters a scoped application or library area
- **THEN** it can discover the repository purpose, feature-first placement rules, dependency boundaries, commands, validation, security constraints, and nearest local rules

### Requirement: Discoverable quality gates

The multi-root workspace SHALL expose tasks for documentation, specification, agent configuration, Skill synchronization, and application-wide Nx validation, and aggregate checks SHALL fail when any participating repository fails.

#### Scenario: Developer validates the workspace

- **WHEN** a developer runs the documented aggregate check or VS Code validation tasks
- **THEN** documentation, specifications, agent drift, library and application tests, boundary linting, and production builds produce identifiable repository results and a non-zero aggregate failure when applicable
