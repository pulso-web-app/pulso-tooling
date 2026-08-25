## 1. Dependencies and OpenSpec

- [x] 1.1 Pin OpenSpec 1.10.0 and markdownlint 0.23.2 and verify `npm ci` resolves exact versions
- [x] 1.2 Initialize deterministic core integrations and verify Codex, Claude Code, and Copilot layouts are present

## 2. Documentation and Instructions

- [x] 2.1 Add the English README, contribution guide, architecture document, and pull-request template and verify `npm run docs:check`
- [x] 2.2 Add authoritative root/scoped instructions and thin adapters and verify required-file discovery tests

## 3. Skills and Tooling

- [x] 3.1 Add the canonical cross-repository Skill and verify it with the Skill Creator validator
- [x] 3.2 Implement deterministic Skill synchronization and drift detection and verify preservation, missing-adapter, and drift tests
- [x] 3.3 Add public scripts and VS Code agent/docs/spec tasks and verify workspace task references

## 4. Cross-Repository Coordination

- [x] 4.1 Create same-ID local changes in shell, CRM, and Projects and verify kebab-case cross-repository change-ID tests
- [x] 4.2 Add tooling CI for docs, specs, agent drift, and tests and verify the workflow uses public commands

## 5. Validation and Archive

- [x] 5.1 Run local documentation, specification, agent, and tooling tests and verify every command succeeds
- [x] 5.2 Run aggregate application checks and sequential E2E suites and verify all three repositories succeed
- [x] 5.3 Verify onboarding commands, multi-root task references, Skill discovery layouts, and process cleanup, then archive application changes before this umbrella change
