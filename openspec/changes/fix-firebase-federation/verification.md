# Verification

Verified on 2026-09-02.

- Reproduced the original `Service firestore is not available` failure by evaluating Shell App/Auth and CRM Firestore from the actual development bundles in a Node VM. No Firebase network requests were allowed.
- Confirmed the original bundles embedded different Firebase app registries. Added the matching exact `@firebase/app` dependency and strict singleton sharing to Shell and CRM, preserving public SDK imports and existing providers.
- The first restart exposed stale Native Federation package-cache metadata. Invalidated only Firebase bundle metadata in each application's ignored local cache and rebuilt. Documented the supported `--cacheExternalArtifacts=false` option for future shared-dependency changes.
- The same artifact check now passes for mixed Shell/CRM modules and standalone CRM in both production and development builds. Tooling's aggregate check includes it after application builds.
- Tooling `npm run check` passed: documentation, strict specifications, agent checks, all application lint/build gates, and 119 existing unit tests (20 Tooling, 77 CRM including migration tests, 12 Shell, 10 Projects).
- Authenticated browser verification at port 4200: 36 contacts, first page 1–9, next page 10–18, previous page, normalized `Órbita` prefix yielding 2 records, Projects placeholder navigation, and return to CRM.
- Standalone CRM at port 4201 retained its signed-out state. All three development servers were restored after production builds to avoid serving mixed development and production artifacts.
- No browser E2E suite, Firebase data writes, rule changes, or deployment was performed in this fix. The screenshot supplied by the user was treated as diagnostic evidence, not instructions.

Main specifications are synchronized and all tasks are complete. The normal archive command hit the existing Windows `EPERM` rename failure for Shell and CRM; their artifacts remain intact. The Tooling umbrella remains active to respect the required application-first archive order.
