# Contributing to Pulso Tooling

## Before you start

Read `AGENTS.md`, `src/AGENTS.md`, and `docs/architecture.md`. This repository coordinates independent repositories; it must not become a parent Nx/npm workspace or a source-code dependency of an app.

Use a reviewed OpenSpec change for non-trivial tooling behavior. For work spanning apps, create the tooling umbrella and same-ID local changes before implementation.

## Development workflow

1. Run `npm ci`.
2. Run `npm run doctor` when the sibling repositories are present.
3. Explore current CLI behavior and tests.
4. Specify safety boundaries, platform behavior, failure aggregation, repository/Nx-project/MFE ownership, and non-goals.
5. Implement deterministic logic outside the CLI boundary and cover it with `node:test`.
6. Run `npm run docs:check`, `npm run spec:validate`, `npm run agent:check`, and `npm test`.
7. Run `npm run check` when all application repositories are available.

## Safety expectations

Setup may clone a missing known repository and run `npm ci`. It may not pull, switch branches, reset, overwrite existing directories, or rewrite origins. Filesystem mutations and process termination must use explicit verified targets and remain cross-platform.

Artifact generators may target only a known app composition root or the `src/lib` tree of a real Nx project. Preserve all existing convenience commands when feature-first source locations evolve.

Architecture generators must keep validation and planning pure, use atomic structured writes, and cover interactive, flag, confirmation, cancellation, and dry-run behavior. Never overwrite a project, alias, route, repository, or registry entry. Repository initialization may remove only its validated staging directory after failure and must leave external provisioning to the developer.

## Pull requests

Link the OpenSpec change, identify every affected repository, and include Windows plus POSIX considerations for process behavior. Provide test evidence, task/workspace impact, compatibility notes, and rollback considerations. Never include local absolute paths, credentials, private repository URLs, or user data.
