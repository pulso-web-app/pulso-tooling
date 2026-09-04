## Purpose

Coordinates a safe, icon-only visual migration across Pulso applications while preserving each application's established component system and runtime contracts.

## ADDED Requirements

### Requirement: Affected repositories use one coordinated icon migration
The workspace SHALL use the same change identifier in the coordinator and every application that renders authored icons, and SHALL leave repositories without authored icons unchanged.

#### Scenario: Migration scope is determined
- **WHEN** the workspace icon inventory is evaluated
- **THEN** the shell and CRM are included under the shared change identifier
- **AND** Projects remains unchanged because it has no authored Material icon glyphs

### Requirement: Material component behavior is preserved
The migration SHALL preserve Angular Material components, themes, CDK facilities, and interaction behavior in affected applications while changing only authored icon presentation.

#### Scenario: Integrated UI is verified
- **WHEN** affected applications are loaded through the shell
- **THEN** Phosphor icons render in the intended locations
- **AND** Material dialogs, navigation, buttons, form fields, selects, menus, pagination, and date/time controls retain their existing behavior and appearance

### Requirement: Migration is independently verifiable
Each affected repository MUST pass its documented quality gate before integrated visual verification is accepted.

#### Scenario: Repository checks complete
- **WHEN** the coordinated migration is ready for handoff
- **THEN** the shell and CRM checks pass independently
- **AND** the integrated shell view is visually inspected at desktop and narrow viewports
