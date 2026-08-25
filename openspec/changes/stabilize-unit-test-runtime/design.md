## Context

Aggregate commands inherit the parent environment. When both `NO_COLOR` and tool-managed `FORCE_COLOR` reach Node processes, Node reports a warning for every worker.

## Goals / Non-Goals

**Goals:** keep aggregate output readable while preserving exit-code aggregation.

**Non-Goals:** change application test runners or suppress arbitrary stderr.

## Decisions

- Build a child environment for aggregate commands that removes `NO_COLOR` only when it conflicts with `FORCE_COLOR` or when the aggregate runner intentionally preserves colored Nx output.
- Cover normalization as deterministic library logic.

## Risks / Trade-offs

- [A caller expects color suppression] → Apply normalization only to Pulso aggregate child processes and document the colored task output behavior.
