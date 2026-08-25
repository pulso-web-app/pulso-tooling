# agent-ready-workspace Specification

## Purpose
Defines a safe, discoverable, and repository-independent workflow for humans and coding agents working across the Pulso web repositories.

## Requirements

### Requirement: Authoritative agent instructions

Each Pulso repository SHALL expose concise root instructions and only use scoped instructions where local architectural or safety rules differ. Claude Code and GitHub Copilot adapters SHALL direct their tools to the same authoritative instructions without duplicating the manual.

#### Scenario: Agent begins repository work

- **WHEN** an agent starts a task or enters a scoped application area
- **THEN** it can discover the repository purpose, boundaries, commands, validation, security constraints, and nearest local rules

### Requirement: Deterministic curated Skill mirroring

The tooling SHALL discover canonical Skill directories named `pulso-*` under `.agents/skills`, mirror their complete content into Claude and Copilot layouts, and fail a check when a mirror is missing or differs.

#### Scenario: Synchronization runs beside OpenSpec integrations

- **WHEN** a developer synchronizes curated Pulso Skills
- **THEN** every canonical Skill mirror matches by content and all `openspec-*` Skills, commands, and prompts remain unchanged

### Requirement: Repository-local specification workflow

Each repository SHALL keep its specifications and changes locally and support strict non-interactive validation. A cross-repository effort SHALL use one kebab-case change ID with an umbrella change in tooling and a same-ID change in each affected application.

#### Scenario: Change affects host and remote

- **WHEN** a reviewed behavior change spans multiple Pulso repositories
- **THEN** tooling records coordination while each affected repository records and validates its owned behavioral delta under the same change ID

### Requirement: Discoverable quality gates

The multi-root workspace SHALL expose tasks for documentation, specification, agent configuration, and Skill synchronization, and aggregate checks SHALL fail when any participating repository fails.

#### Scenario: Developer validates the workspace

- **WHEN** a developer runs the documented aggregate check or VS Code validation tasks
- **THEN** documentation, specifications, agent drift, tests, and application quality gates produce identifiable repository results and a non-zero aggregate failure when applicable
