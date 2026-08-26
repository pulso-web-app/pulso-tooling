## 1. Cross-Repository Architecture

- [x] 1.1 Coordinate the identical change ID in tooling, Shell, CRM, and Projects and verify strict OpenSpec validation in every repository.
- [x] 1.2 Verify the three application repositories preserve remote names, `./Routes`, ports, public routes, and independent deployment configuration.

## 2. Generator and Workspace Support

- [x] 2.1 Extend generator target resolution to accept owned app and `libs/**/src/lib` roots and verify positive and negative `node:test` cases.
- [x] 2.2 Preserve all existing generator commands and verify the VS Code workspace references only valid safe commands.
- [x] 2.3 Update tooling architecture, README, AGENTS, and the canonical cross-repository Skill, then verify Markdown and agent drift checks.

## 3. Validation and Closure

- [x] 3.1 Run application-local checks and the tooling aggregate `npm run check`, correcting regressions before handoff.
- [x] 3.2 Archive validated app changes before archiving this umbrella change and verify strict final spec validation.
