## Context

The host shares firebase/app and firebase/auth while the remote additionally shares firebase/firestore. Package-level chunking embeds @firebase/app twice, even with the same Firebase version. Unit tests load one module graph and therefore missed the failure.

## Decisions

Share @firebase/app explicitly as a strict singleton and retain it during dependency pruning. Declare its exact version in both application dependency manifests so auto version inference and independent installs are deterministic. Keep public Firebase SDK imports in application code and preserve domain boundaries.

Validate the actual generated public modules from different builds in an isolated Node VM without requesting Firebase data, then exercise authenticated navigation through the existing development servers. No registry mutation or provider workaround belongs in ContactsRepository.

## Risks / Trade-offs

Firebase upgrades must keep the explicit app dependency aligned with the installed SDK. Rebuild/restart federation servers after configuration changes. Existing tests and all production builds must remain green; browser E2E suites remain excluded. No Firebase deployment or data writes are needed.
