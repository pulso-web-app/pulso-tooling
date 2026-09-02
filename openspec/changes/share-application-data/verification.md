# Verification

Verified on 2026-09-02 against Firebase project `pulso-web-app`.

- Tooling `npm run check`: passed documentation, strict specifications, agent consistency, 20 tooling tests, and all three application's full checks.
- CRM: 70 Angular unit tests plus 7 migration tests; lint and production build passed.
- Shell: 12 Angular unit tests; lint and production build passed. Separate `npm run test:rules`: 8 passing Firestore emulator tests with two authenticated identities and an unauthenticated client.
- Projects: 10 existing unit tests; lint and production build passed. Only shared-storage documentation changed in this repository.
- Total: 127 passing tests. Browser E2E was excluded as requested.
- Live migration: 36 contacts preserved with the same IDs and fields, backed up locally before writes; zero remaining legacy business documents. No existing project or interaction documents were found.
- Live shared queries: total 36; first and next pages contain 9 distinct records each, with no overlap; normalized `orbita` prefix returns 2 contacts; all 3 required indexes are ready.
- Idempotency: repeated migration found zero source documents; repeated seed created zero and skipped 36 existing records.
- Published only Firestore rules. Active ruleset `91e16117-52aa-4444-bb06-1b44804ea6c4` matches the exact tested local rules. No hosting release or application CRUD UI was added.

Rule behavior was verified using the real emulator rule engine; administrative live data reads were used only to verify migration and query results. New client queries or reloads see shared data; the directory does not subscribe to live record changes.

## Archive status

Main CRM and Shell specifications are synchronized and all implementation tasks are complete. The Projects change archived successfully as `2026-09-02-share-application-data`. The normal OpenSpec archive command failed with Windows `EPERM` while renaming the CRM and Shell change directories; it made no fallback copies. Their complete change artifacts remain in place. The Tooling umbrella is retained until those application archives can finish, following the repository's archive order.

The earlier CRM `connect-firestore-contact-directory` change has the same archive error. Its original owner-scoped requirement is superseded by the shared-directory requirement in the synchronized main spec. Future archival of these already-synchronized changes must skip spec reapplication to avoid restoring historical ownership behavior.
