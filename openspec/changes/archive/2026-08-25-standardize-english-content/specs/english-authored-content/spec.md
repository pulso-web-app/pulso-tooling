## Purpose

Defines the shared language requirement for Pulso-authored developer and product content.

## ADDED Requirements

### Requirement: English authored content

All Pulso-authored documentation, instructions, CLI output, user-facing copy, accessibility labels, route titles, and test descriptions or expectations SHALL be written in English unless an approved product localization requirement explicitly defines another language.

#### Scenario: Developer or user encounters repository-owned text

- **WHEN** repository-owned content is displayed, logged, documented, or asserted by a test
- **THEN** the content is English and corresponding tests use the same English meaning

### Requirement: Translation preserves behavior

Language standardization SHALL NOT rename stable technical contracts or change application behavior, persistence, authentication, federation, deployment, or repository independence.

#### Scenario: Existing Portuguese copy is translated

- **WHEN** authored Portuguese content is replaced with English
- **THEN** only copy and directly coupled test expectations change
