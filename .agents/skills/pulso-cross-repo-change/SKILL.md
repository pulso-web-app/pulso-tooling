---
name: pulso-cross-repo-change
description: Coordinate one Pulso change across tooling, shell, CRM, and Projects while keeping repositories independent and OpenSpec artifacts aligned. Use when behavior, contracts, commands, documentation, or validation must change in more than one Pulso repository.
---

# Pulso Cross-Repository Change

1. Read the tooling `AGENTS.md` and each affected repository's root and scoped instructions.
2. Choose one kebab-case change ID. Create the umbrella OpenSpec change in tooling and a linked change with the identical ID in every affected app.
3. Put coordination, sequencing, shared acceptance criteria, and rollback concerns in tooling. Put behavioral requirements and implementation tasks in the repository that owns them.
4. Record federation names, ports, public scripts, environment assumptions, Nx project ownership, and deployment impact before implementation.
5. Distinguish boundaries explicitly: repositories represent independent teams and delivery; Nx projects represent internal source/task ownership; microfrontends require independent runtime ownership and are not created per screen.
6. Apply changes repository by repository without joining Git histories, dependencies, caches, or Nx workspaces.
7. Keep app projects thin, expose library APIs through repository aliases, and enforce dependency direction with Nx scope/type tags.
8. Run each repository's strict spec validation and checks, then run the tooling aggregate checks.
9. Archive the app changes after their validations pass, then archive the tooling umbrella change.

For architecture creation, prefer the Tooling commands over assembling Nx arguments by hand. Review their preview before confirmation. Treat `architecture.config.json` and `pulso.repositories.json` as authored registries; treat the Shell remote source, manifests, and multi-root workspace as deterministic generated outputs. A new remote is not complete until its local scaffold passes, while GitHub, Firebase resources, secrets, commit, and push remain explicit external steps.

Never pull, switch branches, discard work, expose secrets, edit generated OpenSpec integrations, or deploy without explicit approval.
