import { readFile } from "node:fs/promises";
import path from "node:path";

import { REGISTRY_PATH, TOOLING_ROOT } from "./config.mjs";
import { readJson, writeJsonAtomic } from "./files.mjs";

export function renderRemoteRegistry(registry) {
  const remotes = registry.repositories.filter(
    (item) => item.kind === "remote",
  );
  const lines = remotes.map(
    (remote) =>
      `  { key: '${remote.key}', path: '${remote.routePath}', title: '${String(remote.routeTitle).replaceAll("'", "\\'")}', icon: '${remote.icon}', showInNavigation: ${Boolean(remote.showInNavigation)} },`,
  );
  const selectedDefault =
    remotes.find((remote) => remote.defaultRemote) ?? remotes[0];
  return `// Generated from pulso-tooling/pulso.repositories.json. Do not edit manually.\nexport interface PulsoRemote {\n  readonly key: string;\n  readonly path: string;\n  readonly title: string;\n  readonly icon: string;\n  readonly showInNavigation: boolean;\n}\n\nexport const PULSO_REMOTES: readonly PulsoRemote[] = [\n${lines.join("\n")}\n];\n\nexport const PULSO_DEFAULT_REMOTE = '${selectedDefault?.routePath ?? ""}';\n`;
}

export function renderFederationManifest(registry, environment) {
  const field =
    environment === "development"
      ? "developmentRemoteEntry"
      : "productionRemoteEntry";
  return Object.fromEntries(
    registry.repositories
      .filter((item) => item.kind === "remote")
      .map((item) => [item.key, item[field]]),
  );
}

function taskFor(project, action, hidden = true) {
  const display = project.displayName;
  const labels = {
    build: "Build",
    lint: "Lint",
    test: "Test",
    e2e: "Run E2E",
    check: "Check",
    "spec:validate": "Validate Specifications",
    "docs:check": "Validate Documentation",
  };
  return {
    label: `Pulso Internal: ${labels[action]} ${display}`,
    type: "shell",
    command: "npm",
    args: action === "test" ? ["test"] : ["run", action],
    options: { cwd: `\${workspaceFolder:${display}}` },
    problemMatcher: [],
    ...(hidden ? { hide: true } : {}),
  };
}

export async function synchronizeWorkspace(
  registry,
  workspacePath = path.join(TOOLING_ROOT, "pulso.code-workspace"),
) {
  const workspace = JSON.parse(
    (await readFile(workspacePath, "utf8")).replace(/,\s*([}\]])/g, "$1"),
  );
  workspace.folders = [
    ...registry.repositories.map((item) => ({
      name: item.displayName,
      path: `../${item.folder}`,
    })),
    { name: "Tooling", path: "." },
  ];
  workspace.settings["command-runner.commands"] = {
    "Pulso: Generate Component Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" generate-selected component ${selectedFile}',
    "Pulso: Generate Service Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" generate-selected service ${selectedFile}',
    "Pulso: Generate Guard Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" generate-selected guard ${selectedFile}',
    "Pulso: Generate Directive Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" generate-selected directive ${selectedFile}',
    "Pulso: Generate Pipe Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" generate-selected pipe ${selectedFile}',
    "Pulso: Generate Interceptor Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" generate-selected interceptor ${selectedFile}',
    "Pulso: Generate Resolver Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" generate-selected resolver ${selectedFile}',
    "Pulso: Create Library Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" create-selected library ${selectedFile}',
    "Pulso: Create Feature Here":
      'node "${workspaceFolder}/../pulso-tooling/src/cli.mjs" create-selected feature ${selectedFile}',
    "Pulso: Initialize Repository Here":
      'node "${workspaceFolder}/src/cli.mjs" create-selected repository ${selectedFile}',
  };
  const generatedLabels = new Set([
    "Pulso: Start All Apps",
    "Pulso: Build All Apps",
    "Pulso: Lint All Apps",
    "Pulso: Test All Apps",
    "Pulso: Run All E2E Tests",
    "Pulso: Check All Apps",
    "Pulso: Validate Specifications",
    "Pulso: Validate Documentation",
  ]);
  const preserved = workspace.tasks.tasks.filter(
    (task) =>
      !task.label.startsWith("Pulso: Start ") &&
      !task.label.startsWith("Pulso Internal:") &&
      !generatedLabels.has(task.label),
  );
  const startTasks = registry.repositories.map((project) => ({
    label: `Pulso: Start ${project.displayName}`,
    type: "shell",
    command: "npm",
    args: ["run", "dev"],
    options: { cwd: `\${workspaceFolder:${project.displayName}}` },
    problemMatcher: [],
    presentation: { panel: "dedicated", group: `pulso-dev-${project.key}` },
  }));
  const internal = registry.repositories.flatMap((project) =>
    [
      "build",
      "lint",
      "test",
      "e2e",
      "check",
      "spec:validate",
      "docs:check",
    ].map((action) => taskFor(project, action)),
  );
  const aggregate = (label, action, order = "parallel") => ({
    label,
    dependsOn: registry.repositories.map(
      (project) => `Pulso Internal: ${action} ${project.displayName}`,
    ),
    dependsOrder: order,
    problemMatcher: [],
  });
  const aggregates = [
    {
      label: "Pulso: Start All Apps",
      dependsOn: startTasks.map((task) => task.label),
      dependsOrder: "parallel",
      problemMatcher: [],
    },
    aggregate("Pulso: Build All Apps", "Build"),
    aggregate("Pulso: Lint All Apps", "Lint"),
    aggregate("Pulso: Test All Apps", "Test"),
    aggregate("Pulso: Run All E2E Tests", "Run E2E", "sequence"),
    aggregate("Pulso: Check All Apps", "Check"),
    aggregate("Pulso: Validate Specifications", "Validate Specifications"),
    aggregate("Pulso: Validate Documentation", "Validate Documentation"),
  ];
  workspace.tasks.tasks = [
    ...preserved,
    ...startTasks,
    ...aggregates,
    ...internal,
  ];
  await writeJsonAtomic(workspacePath, workspace);
}

export async function synchronizeShell(registry, shellRoot) {
  const generated = path.join(
    shellRoot,
    "libs",
    "shell",
    "feature",
    "src",
    "lib",
    "remotes",
    "pulso-remotes.generated.ts",
  );
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(generated, renderRemoteRegistry(registry), "utf8"),
  );
  await writeJsonAtomic(
    path.join(
      shellRoot,
      "apps",
      "shell",
      "public",
      "federation.manifest.dev.json",
    ),
    renderFederationManifest(registry, "development"),
  );
  await writeJsonAtomic(
    path.join(shellRoot, "apps", "shell", "public", "federation.manifest.json"),
    renderFederationManifest(registry, "production"),
  );
}

export async function registerRepository(
  repository,
  {
    registryPath = REGISTRY_PATH,
    shellRoot,
    packagePath = path.join(TOOLING_ROOT, "package.json"),
    workspacePath,
  } = {},
) {
  const registry = await readJson(registryPath);
  if (
    registry.repositories.some(
      (item) =>
        item.key === repository.key ||
        item.folder === repository.folder ||
        item.port === repository.port,
    )
  )
    throw new Error("Repository key, folder, or port is already registered.");
  registry.repositories.push(repository);
  registry.repositories.sort((a, b) =>
    a.kind === b.kind ? a.key.localeCompare(b.key) : a.kind === "host" ? -1 : 1,
  );
  const packageJson = await readJson(packagePath);
  packageJson.scripts[`dev:${repository.key}`] =
    `node src/cli.mjs run dev ${repository.key}`;
  packageJson.scripts = Object.fromEntries(Object.entries(packageJson.scripts));
  if (shellRoot) await synchronizeShell(registry, shellRoot);
  await synchronizeWorkspace(registry, workspacePath);
  await writeJsonAtomic(packagePath, packageJson);
  await writeJsonAtomic(registryPath, registry);
  return registry;
}
