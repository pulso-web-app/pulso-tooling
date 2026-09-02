# Application Data Map

Pulso uses one shared set of business records in Firestore's `(default)` database. Every authenticated account can access the same contacts, interactions, projects, and their descendants. There are no business roles, teams, or user-owner filters at this stage. Login remains required.

| Data | Canonical path | Responsibility |
| --- | --- | --- |
| Contacts | `contacts/{contactId}` | CRM data-access and feature |
| Interactions | `contacts/{contactId}/interactions/{interactionId}` | CRM; writes not implemented yet |
| Projects | `projects/{projectId}` | Projects; application remains a placeholder |
| Project children | `projects/{projectId}/...` | Projects; define schemas as features arrive |
| Personal account profile | `users/{uid}` | Private to its account; never a business-data parent |

Shell owns sign-in, the common Firebase configuration, deployed rules, and the canonical index file. Each remote owns its actual domain schema and integration. Source code remains inside its owning repository; this contract does not introduce cross-repository imports or change Native Federation routes and providers.

The shared rules allow business CRUD, but this does not imply that creation or editing screens are implemented. The current CRM integration is a read-only paginated directory. New business collections need an explicit contract and rules; unknown roots stay denied.

## Coordinated validation

The `share-application-data` changes in Shell, CRM, Projects, and Tooling record the same contract. CRM migrates old `users/{uid}/contacts` and `users/{uid}/projects` trees with a backup, stable IDs, collision detection, and atomic tree commits. Shell tests the rules with two accounts before publishing them. Only the database rules are published as part of this change; hosting release remains separate.

Run `npm run check` here to validate all repositories and their unit tests and builds. Run `npm run test:rules` in Shell to exercise the real rule engine locally. Browser E2E is separate.

See [CRM query, seed, and migration details](../../pulso-crm/docs/firestore-contacts.md), [Shell rules and indexes](../../pulso-shell/docs/firestore.md), and [Projects maturity](../../pulso-projects/docs/architecture.md).
