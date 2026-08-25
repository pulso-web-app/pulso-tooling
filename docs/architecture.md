# Pulso Tooling Architecture

## Purpose

Pulso Tooling provides one entry point for a product composed of three independent Nx repositories. It improves discoverability and consistency without coupling their Git histories, dependency graphs, caches, CI, or deployments.

## Multi-root workspace

`pulso.code-workspace` references the Shell, CRM, Projects, and Tooling sibling directories. VS Code treats each as a separate folder and Source Control root while centralizing tasks and extension recommendations.

The parent `pulso` directory intentionally has no `nx.json`, root `package.json`, npm workspace, or hoisted `node_modules`.

## CLI boundaries

`src/cli.mjs` is the process and user-interface boundary. Deterministic parsing, path validation, repository matching, Skill discovery, hashing, and drift detection are exported for `node:test`.

Setup validates tools and known origins, clones only missing repositories, and runs `npm ci`. Aggregate commands spawn each repository's public npm script and aggregate exit codes. Development children are terminated as process trees, including through `taskkill` on Windows.

## Generator safety

The generator helper accepts either an explicit active-file context from a native VS Code task or a resource selected through Command Runner. For an Explorer selection, it infers the owning known repository and treats a selected file as its parent directory. It resolves the app source root, rejects traversal and absolute artifact names, normalizes accidental suffixes, and invokes the local Nx binary. It never guesses a target outside `apps/<app>/src/app`.

## Agent configuration

The root and scoped `AGENTS.md` files are authoritative. Each repository stores canonical curated Skills in `.agents/skills/pulso-*`. Synchronization mirrors those directories to Claude and Copilot layouts by content, while OpenSpec-owned names and integration directories are never modified.

OpenSpec stays local to each repository. A cross-repository effort uses an umbrella change in tooling and a same-ID change in each affected app, preserving behavioral ownership and independent validation.

## Failure model

Incorrect origins, unsupported Node versions, unsafe paths, missing local tools, Skill drift, occupied ports, and any failed child command produce explicit failures. Tooling does not attempt destructive automatic repair.
