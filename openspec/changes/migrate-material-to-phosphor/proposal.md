## Why

Pulso needs a consistent icon system with broader icon coverage, including social networks, without altering the established Angular Material component system or visual behavior.

## What Changes

- Coordinate an icon-only migration in `pulso-shell` and `pulso-crm` under the same change ID.
- Replace authored Material icon glyphs with Phosphor icons while retaining Angular Material components, theming, CDK behavior, dialogs, form controls, date/time inputs, buttons, navigation, menus, and pagination.
- Remove only the obsolete Material Icons font dependency after no authored Material glyphs remain.
- Leave `pulso-projects` unchanged because it does not currently render authored Material icons.
- Verify each affected repository independently and verify the integrated shell visually.

## Capabilities

### New Capabilities

- `workspace-icon-migration`: Coordinates affected repositories, shared acceptance criteria, sequencing, and integration verification for the icon-only migration.

### Modified Capabilities

None.

## Impact

- Affected repositories: `pulso-tooling`, `pulso-shell`, and `pulso-crm`; `pulso-projects` is explicitly out of scope.
- Dependencies: `pulso-shell` and `pulso-crm` add the Phosphor Web Components package. Angular Material and CDK dependencies remain in place.
- Sequencing: document the umbrella contract, migrate and verify each app independently, then run integrated federation and visual checks.
- Non-goals: component rewrites, design-system replacement, layout restyling, route changes, data changes, authentication changes, federation changes, or deployment changes.
- Deployment: no target, credential, or environment changes.
