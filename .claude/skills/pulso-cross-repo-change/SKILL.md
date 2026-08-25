---
name: pulso-cross-repo-change
description: Coordinate one Pulso change across tooling, shell, CRM, and Projects while keeping repositories independent and OpenSpec artifacts aligned. Use when behavior, contracts, commands, documentation, or validation must change in more than one Pulso repository.
---

# Pulso Cross-Repository Change

1. Read the tooling `AGENTS.md` and each affected repository's root and scoped instructions.
2. Choose one kebab-case change ID. Create the umbrella OpenSpec change in tooling and a linked change with the identical ID in every affected app.
3. Put coordination, sequencing, shared acceptance criteria, and rollback concerns in tooling. Put behavioral requirements and implementation tasks in the repository that owns them.
4. Record federation names, ports, public scripts, environment assumptions, and deployment impact before implementation.
5. Apply changes repository by repository without joining Git histories, dependencies, caches, or Nx workspaces.
6. Run each repository's strict spec validation and checks, then run the tooling aggregate checks.
7. Archive the app changes after their validations pass, then archive the tooling umbrella change.

Never pull, switch branches, discard work, expose secrets, edit generated OpenSpec integrations, or deploy without explicit approval.
