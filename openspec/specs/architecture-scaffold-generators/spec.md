# architecture-scaffold-generators Specification

## Purpose
Defines safe, repeatable creation of Nx architecture units and Pulso remote repositories.

## Requirements

### Requirement: Guided architecture generation

The Tooling CLI SHALL create libraries, feature slices, capability feature libraries, and remote repositories through interactive prompts or complete non-interactive flags, and SHALL preview affected paths before mutation.

#### Scenario: Dry-run requested

- **WHEN** a developer invokes an architecture generator with `--dry-run`
- **THEN** the CLI validates and prints the plan without invoking Nx or writing files

### Requirement: Canonical Nx library boundaries

Generated libraries SHALL use `libs/<capability>/<type>`, a public `@pulso-<repo>/<capability>-<type>` alias, scope/type tags, build and test targets appropriate to their runtime, and an initially empty public API.

#### Scenario: Pure TypeScript utility library

- **WHEN** a developer creates a util library with the TypeScript runtime
- **THEN** Tooling invokes the Nx JavaScript library generator with TSC, Node Vitest, and no Angular dependency

### Requirement: Feature-first slices

A slice SHALL be created only inside a `type:feature` project's `src/lib`, and an optional lazy route SHALL be inserted using the workspace TypeScript parser before parameter and wildcard routes.

#### Scenario: Route path already exists

- **WHEN** a routed slice requests an existing path
- **THEN** generation stops without adding a duplicate route

### Requirement: Transactional remote repository initialization

Repository initialization SHALL render a complete Native Federation remote in a temporary directory, install and validate it, initialize `main`, then atomically publish and register it without creating an origin or external resource.

#### Scenario: Generated repository check fails

- **WHEN** installation, agent synchronization, specification update, or `npm run check` fails
- **THEN** the final sibling repository and Shell/Tooling registrations remain absent
