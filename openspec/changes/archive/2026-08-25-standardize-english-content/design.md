## Context

English is already required by repository instructions, documentation, Skills, and OpenSpec context. Remaining Portuguese appears in isolated CLI strings and application templates, with a few tests coupled to that copy.

## Goals / Non-Goals

**Goals:**

- Make authored CLI, UI, accessibility, and test content consistently English.
- Keep test expectations aligned with user-visible copy.
- Verify all tracked authored sources while excluding dependencies, caches, builds, and third-party generated integrations.

**Non-Goals:**

- Localization infrastructure or runtime language switching.
- Renaming stable code identifiers, repository names, routes, or external contracts.
- Editing vendored dependencies or OpenSpec-managed integrations.

## Decisions

- Translate semantic meaning rather than mechanically replacing words.
- Treat accessible names and route titles as user-facing copy.
- Update assertions in the same repository as the copy they verify.
- Use the same OpenSpec change ID in every repository and archive app changes before the tooling umbrella.

## Risks / Trade-offs

- [Text-based E2E selectors change] → Update selectors with the corresponding visible copy and run E2E suites.
- [Broad searches produce false positives] → Review matches and exclude package locks, generated output, caches, and third-party integrations.

## Migration Plan

Translate repository-owned content, run focused language scans, validate each repository, archive application changes, and archive this umbrella change. Rollback is a copy-only reversal with no data migration.
