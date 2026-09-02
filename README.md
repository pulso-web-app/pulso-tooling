# Pulso Tooling

Pulso Tooling is the public developer-experience repository for the Pulso web application. It coordinates four sibling Git repositories without turning their parent directory into an Nx workspace, npm workspace, or shared dependency installation.

## Repository layout

Clone the repositories as siblings with these exact directory names:

```text
pulso/
├── pulso-shell/      # Native Federation host, port 4200
├── pulso-crm/        # CRM remote, port 4201
├── pulso-projects/   # Projects remote, port 4202
└── pulso-tooling/    # This repository
```

Each application keeps its own Git history, Nx configuration, package lock, `node_modules`, cache, CI, hosting target, and deployment lifecycle.

## Fresh onboarding

1. Install Git, npm, VS Code, and Node.js `^22.22.3`, `^24.15.0`, or `^26.0.0`.
2. Clone this repository into an empty parent directory:

   ```bash
   git clone https://github.com/pulso-web-app/pulso-tooling.git
   cd pulso-tooling
   ```

3. Install tooling dependencies:

   ```bash
   npm ci
   ```

4. Clone missing application repositories and install each app's dependencies:

   ```bash
   npm run setup
   ```

5. Validate repositories, origins, local dependencies, and ports:

   ```bash
   npm run doctor
   ```

6. Open the multi-root workspace:

   ```bash
   npm run open
   ```

7. In VS Code, open **Terminal → Run Task → Pulso: Start All Apps**, then browse to <http://localhost:4200>.

`setup` never pulls, switches branches, resets, or overwrites an existing directory. An unexpected Git origin is reported as an error for the developer to resolve deliberately.

## Public commands

| Command                      | Purpose                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `npm run setup`              | Validate prerequisites, clone missing apps, and run `npm ci` in each app.         |
| `npm run doctor`             | Check Node, npm, Git, app folders, origins, Nx binaries, and ports 4200–4202.     |
| `npm run open`               | Open `pulso.code-workspace`.                                                      |
| `npm run dev`                | Serve all three apps concurrently.                                                |
| `npm run dev:shell`          | Serve only the shell.                                                             |
| `npm run dev:crm`            | Serve only CRM.                                                                   |
| `npm run dev:projects`       | Serve only Projects.                                                              |
| `npm run build`              | Build all applications.                                                           |
| `npm run lint`               | Lint all applications.                                                            |
| `npm run test`               | Run tooling's `node:test` suite.                                                  |
| `npm run test:apps`          | Run unit tests in all applications.                                               |
| `npm run e2e`                | Run all application E2E suites sequentially to isolate their development servers. |
| `npm run docs:check`         | Validate authored tooling documentation.                                          |
| `npm run docs:check:apps`    | Validate authored documentation in all apps.                                      |
| `npm run spec:validate`      | Strictly validate tooling OpenSpec artifacts.                                     |
| `npm run spec:validate:apps` | Strictly validate app OpenSpec artifacts.                                         |
| `npm run agent:sync`         | Mirror canonical `pulso-*` Skills in every available sibling repository.          |
| `npm run agent:check`        | Detect required-file, adapter, or Skill-mirror drift.                             |
| `npm run check`              | Run local agent/docs/spec/tests, then each app's full check.                      |

Aggregate commands keep output identified by repository and return failure when any child fails. Interrupting an aggregate development command propagates termination to descendant processes, including Windows Nx process trees.

`npm run test:firebase-federation` checks the generated Shell and CRM Firebase modules together after a build. It initializes App/Auth from Shell and Firestore from CRM against the same app, without Firebase network requests, and also checks standalone CRM. The aggregate `check` runs this after application checks. To inspect running development builds, use `npm run test:firebase-federation -- --host http://localhost:4200/ --remote http://localhost:4201/`. It requires the Node VM modules flag supplied by the script and does not run browser E2E tests.

After changing the shared dependency graph, rebuild each affected application once with `npm run build -- --cacheExternalArtifacts=false` to refresh Native Federation's package cache. For development, restart with `npm run dev -- --cacheExternalArtifacts=false`. Later runs can reuse the refreshed cache normally; the runtime artifact check catches incompatible cached Firebase modules as well as configuration regressions.

## VS Code workspace and tasks

`pulso.code-workspace` opens Shell, CRM, Projects, and Tooling as separate folders and Source Control roots. Recommended extensions include Nx Console, Angular Language Service, ESLint, Prettier, and [Command Runner](https://marketplace.visualstudio.com/items?itemName=edonet.vscode-command-runner).

The `Pulso:` tasks cover setup, diagnostics, individual or aggregate development servers, termination, build, lint, unit tests, E2E, full checks, documentation validation, specification validation, agent configuration checks, Skill synchronization, and safe Angular generation.

Nx Console remains useful inside an individual repository. If it displays one Nx workspace at a time, use the multi-root tasks for cross-repository workflows.

### Faster command access

The workspace enables VS Code's native **Run NPM Script in Folder...** Explorer action. Use it only on a repository root such as **Shell**, **CRM**, or **Projects**, where a `package.json` exists, to run public `dev`, `check`, `test`, or other npm scripts. It does not generate Angular artifacts and does not work on nested source folders.

Angular generators use Command Runner and the selected Explorer resource. See [Safe Angular generators](#safe-angular-generators) for the primary context-menu workflow.

Native tasks remain available as a fallback and can have user-level shortcuts. Open **Preferences: Open Keyboard Shortcuts (JSON)** from the Command Palette and add entries like these to your `keybindings.json`:

```json
{
  "key": "ctrl+alt+c",
  "command": "workbench.action.tasks.runTask",
  "args": "Pulso: Generate Component Here"
},
{
  "key": "ctrl+alt+a",
  "command": "workbench.action.tasks.runTask",
  "args": "Pulso: Generate Angular Artifact Here"
},
{
  "key": "ctrl+alt+d",
  "command": "workbench.action.tasks.runTask",
  "args": "Pulso: Start All Apps"
}
```

Keybindings are VS Code user configuration and cannot be distributed as workspace tasks. The generator tasks use the active file's directory, while the Command Runner workflow uses the resource selected in the Explorer.

## Safe Angular generators

Install the recommended Command Runner extension, reload VS Code, and use this primary workflow:

1. Right-click a folder or file inside an application's `apps/<app>/src/app` tree or an Nx library's `libs/**/src/lib` tree.
2. Select **Run Command**.
3. Choose one of the predefined `Pulso: Generate ... Here` commands.
4. Enter the logical artifact name in the **Pulso Generators** terminal and press Enter.

If a file is selected, its parent folder is used. The helper accepts a logical name such as `contact-card` or `cards/contact-card`, finds the owning Nx workspace from the selected resource, uses its local Nx binary, and applies that repository's generator defaults. A library target is accepted only when its project has a real `project.json`. Absolute paths, `..`, paths outside recognized source roots, and duplicate suffixes such as `.component.component.ts` are rejected or normalized safely.

The predefined commands support component, service, guard, directive, pipe, interceptor, and resolver. The original native tasks, `Pulso: Generate Component Here` and `Pulso: Generate Angular Artifact Here`, remain available through **Tasks: Run Task** and use the active file as their target.

## Architecture generators

The Explorer also exposes three guided commands:

- **Pulso: Create Library Here** creates the canonical `libs/<capability>/<type>` Nx project. Domain and util libraries can be Angular or framework-independent TypeScript.
- **Pulso: Create Feature Here** creates either a vertical slice in the selected feature library or a new capability with its own feature library and lazy route.
- **Pulso: Initialize Repository Here** creates a complete sibling Native Federation remote from Tooling in a checked staging directory before registering it.

Every command validates names and collisions, prints a preview, and asks for confirmation. Automation uses the same CLI with complete flags, `--yes`, and optional `--dry-run`:

```bash
node src/cli.mjs create-selected library ../pulso-crm --capability contacts --type domain --runtime typescript --yes --dry-run
node src/cli.mjs create-selected feature ../pulso-crm/libs/contacts/feature/src/lib --mode slice --name import-contacts --routed false --yes
```

`pulso.repositories.json` is the source of truth for known repositories and Shell remote metadata. Initialization intentionally does not create an origin, GitHub repository, Firebase site, secrets, commit, or push.

Command Runner executes configured terminal commands by design. Use these entries only from a trusted Pulso workspace and review any future command changes before accepting them.

## Agent-ready workflow

`AGENTS.md` is the authoritative instruction layer. Scoped files add rules for the tooling CLI. Canonical Pulso Skills live under `.agents/skills`; `npm run agent:sync` mirrors only names beginning with `pulso-` into `.claude/skills` and `.github/skills`. OpenSpec-managed Skills, commands, and prompts are preserved.

The supported OpenSpec workflow is:

1. Explore existing behavior.
2. Propose a change.
3. Obtain human review.
4. Apply the approved tasks.
5. Run strict spec validation and repository checks.
6. Archive the change.

Tool integrations generated by OpenSpec include:

| Tool           | Example proposal entry point |
| -------------- | ---------------------------- |
| Codex          | `$openspec-propose`          |
| Claude Code    | `/opsx:propose`              |
| GitHub Copilot | `/opsx-propose`              |

Use `npm run spec:update` after upgrading OpenSpec rather than editing generated integrations.

## Shared application data

The [application data map](docs/shared-data.md) defines common Firestore paths and responsibilities across Shell, CRM, and Projects. Business data is shared by every authenticated account.

## Cross-repository specifications

Choose one kebab-case change ID for the entire effort. Create an umbrella change with that ID in `pulso-tooling`, then create a linked local change with the same ID in every affected application.

- Tooling owns coordination, sequencing, shared acceptance criteria, and cross-repository risks.
- Each app owns its behavioral requirements, implementation tasks, tests, and deployment impact.
- Validate each repository independently, archive app changes, then archive the tooling umbrella.

Specifications grow from real changes. The repositories do not attempt to backfill every existing behavior before useful work can continue, and the OpenSpec beta Store is not used.

## Troubleshooting

- **Unexpected origin:** inspect `git remote -v` in the named repository. A missing origin produces an actionable warning for a generated repository; a mismatched origin remains an error.
- **Port already in use:** stop the owning task or process, then rerun `npm run doctor`.
- **A development task leaves processes behind:** use `Pulso: Stop All Tasks`; if the terminal was killed externally, rerun the doctor and terminate the specific process tree.
- **Agent Skill drift:** run `npm run agent:sync`, review the generated mirrors, then run `npm run agent:check`.
- **OpenSpec integration drift:** run `npm run spec:update` in the affected repository.
- **Run Command is missing:** confirm `edonet.vscode-command-runner` is enabled, then run **Developer: Reload Window**.
- **Pulso generator commands are missing:** reopen `pulso.code-workspace`; opening one repository alone does not load the shared workspace settings.
- **Generator refuses the selected resource:** select a folder or file below `apps/<app>/src/app` or a real Nx library's `libs/**/src/lib` tree in Shell, CRM, or Projects.
- **Playwright browser missing:** run `npm exec playwright install` in the affected app.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/architecture.md](docs/architecture.md).
