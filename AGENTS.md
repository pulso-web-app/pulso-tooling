# Pulso Tooling Agent Instructions

## Purpose

This repository coordinates developer experience across four independent repositories. It owns the VS Code multi-root workspace, safe setup and diagnostics, aggregate commands, generators, agent adapters, and cross-repository OpenSpec conventions.

## Working Agreement

- Read the nearest scoped `AGENTS.md` before changing files below it.
- Keep `pulso-tooling` a plain Node repository; do not create a parent Nx or npm workspace.
- Preserve independent lockfiles, dependencies, Git histories, CI, and deploys.
- Keep authored documentation, OpenSpec artifacts, code, and CLI output in English.
- Never overwrite existing sibling repositories or modify their branches during setup.

## Architecture Boundaries

- Tooling may orchestrate public npm scripts but must not import application source code.
- Cross-platform process cleanup must include descendant Nx and browser-builder processes.
- Generators must use each app's local Nx binary and target only the app composition root or a real Nx library's `src/lib` tree; reject absolute paths and traversal.
- Preserve the distinction between independent repositories, internal Nx projects, and runtime microfrontends in orchestration and documentation.
- Canonical Pulso Skills live in `.agents/skills`; mirrors are generated, not hand-edited.
- Treat `pulso.repositories.json` as the repository source of truth and regenerate workspace/Shell artifacts deterministically.
- Architecture generators must preview mutations, support `--dry-run` and `--yes`, reject collisions, and never provision external resources.

## Commands

- `npm run setup` — validate and prepare sibling repositories without pulling.
- `npm run doctor` — inspect prerequisites, origins, dependencies, and ports.
- `npm run agent:sync` — mirror canonical `pulso-*` Skills in available repositories.
- `npm run agent:check` — detect missing files or Skill drift.
- `npm run check` — local docs/specs/agent/tests plus aggregate app checks.

## Spec-Driven Development

- Tooling owns the umbrella proposal and coordination tasks for cross-repository work.
- Every affected repository uses the same kebab-case change ID and owns its behavioral delta.
- Follow explore, propose, human review, apply, strict validation, repository checks, and archive.
- Keep generated OpenSpec integrations untouched; refresh them with `npm run spec:update`.

## Validation

- Add `node:test` coverage for safety, discovery, mirroring, drift, and aggregate exit behavior.
- Run `npm test`, `npm run docs:check`, `npm run spec:validate`, and `npm run agent:check` while iterating.
- Run full `npm run check` before handoff when sibling repositories are available.

## Security and Prohibited Actions

- Never commit tokens, credentials, private repository URLs, or user-specific absolute paths.
- Do not add `git pull`, branch switching, force operations, broad deletion, or dependency hoisting.
- Do not deploy, push, rewrite history, or discard user changes unless explicitly requested.
- Do not remove or overwrite `openspec-*` Skills, prompts, commands, or directories during agent synchronization.
