import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PROJECT_LIST, projectRoot } from "./config.mjs";
import { readJson, writeFileExclusive, writeJsonAtomic } from "./files.mjs";
import { isPathInside, resolveSelectedTarget, runCommand } from "./lib.mjs";

export const LIBRARY_TYPES = Object.freeze([
  "data-access",
  "domain",
  "ui",
  "util",
]);
export const LIBRARY_RUNTIMES = Object.freeze(["angular", "typescript"]);

export function assertKebabCase(value, label = "Name") {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(String(value))) {
    throw new Error(`${label} must be kebab-case.`);
  }
  return value;
}

export function resolveWorkspaceContext(
  selectedPath,
  { allowTooling = false } = {},
) {
  const selected = path.resolve(selectedPath);
  const project = PROJECT_LIST.find((candidate) =>
    isPathInside(selected, projectRoot(candidate)),
  );
  if (project)
    return {
      project,
      workspace: projectRoot(project),
      selected: resolveSelectedTarget(selected),
    };
  if (allowTooling) {
    const tooling = PROJECT_LIST.length
      ? path.dirname(projectRoot(PROJECT_LIST[0]))
      : path.dirname(selected);
    const toolingRoot = path.join(tooling, "pulso-tooling");
    if (isPathInside(selected, toolingRoot))
      return {
        workspace: toolingRoot,
        selected: resolveSelectedTarget(selected),
      };
  }
  throw new Error("Select a resource inside a registered Pulso repository.");
}

export function repositoryAliasPrefix(project) {
  return `@pulso-${project.key}`;
}

export function buildLibraryPlan(project, { capability, type, runtime }) {
  assertKebabCase(capability, "Capability");
  if (![...LIBRARY_TYPES, "feature"].includes(type))
    throw new Error(`Unsupported library type: ${type}`);
  const resolvedRuntime = ["domain", "util"].includes(type)
    ? runtime
    : "angular";
  if (!LIBRARY_RUNTIMES.includes(resolvedRuntime)) {
    throw new Error("Runtime must be angular or typescript.");
  }
  const projectName = `${capability}-${type}`;
  const directory = `libs/${capability}/${type}`;
  return {
    kind: "library",
    project,
    capability,
    type,
    runtime: resolvedRuntime,
    directory,
    projectName,
    alias: `${repositoryAliasPrefix(project)}/${projectName}`,
    tags: [`scope:${capability}`, `type:${type}`],
    files: [directory, "architecture.config.json", "tsconfig.base.json"],
  };
}

export function buildLibraryNxArguments(plan) {
  if (plan.runtime === "typescript") {
    return [
      "generate",
      "@nx/js:library",
      plan.directory,
      `--name=${plan.projectName}`,
      `--importPath=${plan.alias}`,
      "--bundler=tsc",
      "--unitTestRunner=vitest",
      "--linter=eslint",
      `--tags=${plan.tags.join(",")}`,
      "--no-interactive",
    ];
  }
  return [
    "generate",
    "@nx/angular:library",
    plan.directory,
    `--name=${plan.projectName}`,
    `--importPath=${plan.alias}`,
    "--buildable",
    "--standalone",
    "--unitTestRunner=vitest-angular",
    "--linter=eslint",
    "--style=scss",
    `--tags=${plan.tags.join(",")}`,
    "--no-interactive",
  ];
}

export async function registerCapability(workspace, capability) {
  const configPath = path.join(workspace, "architecture.config.json");
  const config = await readJson(configPath);
  config.capabilities ??= {};
  config.capabilities[capability] ??= {
    dependsOn: capability === "shared" ? [] : ["shared"],
  };
  config.capabilities = Object.fromEntries(
    Object.entries(config.capabilities).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeJsonAtomic(configPath, config);
}

async function removeGeneratedEntryArtifacts(workspace, plan) {
  const libraryRoot = path.join(workspace, plan.directory);
  const generatedRoot = path.join(libraryRoot, "src", "lib");
  const entries = existsSync(generatedRoot)
    ? await import("node:fs/promises").then(({ readdir }) =>
        readdir(generatedRoot),
      )
    : [];
  for (const entry of entries)
    await rm(path.join(generatedRoot, entry), { recursive: true, force: true });
  await writeJsonAtomic(path.join(libraryRoot, "project.json"), {
    ...(await readJson(path.join(libraryRoot, "project.json"))),
    targets: Object.fromEntries(
      Object.entries(
        (await readJson(path.join(libraryRoot, "project.json"))).targets ?? {},
      ).filter(([, target]) => target.executor !== "@nx/eslint:lint"),
    ),
  });
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(
      path.join(libraryRoot, "src", "index.ts"),
      "// Public API is intentionally empty until the library owns behavior.\n",
      "utf8",
    ),
  );
}

export async function executeLibraryPlan(plan, { dryRun = false } = {}) {
  const workspace = projectRoot(plan.project);
  if (existsSync(path.join(workspace, plan.directory)))
    throw new Error(`${plan.directory} already exists.`);
  const tsconfig = await readJson(path.join(workspace, "tsconfig.base.json"));
  if (tsconfig.compilerOptions?.paths?.[plan.alias])
    throw new Error(`${plan.alias} already exists.`);
  if (dryRun) return;
  const nxCli = path.join(
    workspace,
    "node_modules",
    "nx",
    "dist",
    "bin",
    "nx.js",
  );
  if (!existsSync(nxCli))
    throw new Error(`Local Nx was not found in ${plan.project.folder}.`);
  const code = await runCommand(
    process.execPath,
    [nxCli, ...buildLibraryNxArguments(plan)],
    { cwd: workspace },
  );
  if (code !== 0)
    throw new Error(`Nx failed while creating ${plan.projectName}.`);
  await removeGeneratedEntryArtifacts(workspace, plan);
  await registerCapability(workspace, plan.capability);
}

export async function discoverFeatureProject(selectedPath) {
  const context = resolveWorkspaceContext(selectedPath);
  let current = context.selected;
  const libsRoot = path.join(context.workspace, "libs");
  while (isPathInside(current, libsRoot)) {
    const projectFile = path.join(current, "project.json");
    if (existsSync(projectFile)) {
      const project = await readJson(projectFile);
      if (!project.tags?.includes("type:feature"))
        throw new Error("The selected Nx project is not tagged type:feature.");
      const sourceRoot = path.join(current, "src", "lib");
      if (!isPathInside(context.selected, sourceRoot))
        throw new Error("Select inside the feature library's src/lib folder.");
      return {
        ...context,
        libraryRoot: current,
        sourceRoot,
        nxProject: project,
      };
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Select inside src/lib of an existing feature library.");
}

export function buildSlicePlan(
  context,
  { name, routed, routePath, title, routesFile },
) {
  assertKebabCase(name, "Slice name");
  if (routed) assertKebabCase(routePath || name, "Route path");
  const target = path.join(context.sourceRoot, name);
  if (existsSync(target))
    throw new Error(`Feature slice ${name} already exists.`);
  return {
    kind: "feature-slice",
    context,
    name,
    routed: Boolean(routed),
    routePath: routePath || name,
    title: title || name,
    routesFile,
    files: [
      path.relative(context.workspace, target),
      ...(routed ? [path.relative(context.workspace, routesFile)] : []),
    ],
  };
}

function componentClassName(name) {
  return (
    name
      .split("-")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join("") + "Component"
  );
}

export async function insertLazyRoute({
  workspace,
  routesFile,
  routePath,
  title,
  importPath,
  exportName,
  loader = "loadComponent",
}) {
  const source = await readFile(routesFile, "utf8");
  const ts = await import(
    pathToFileURL(
      path.join(
        workspace,
        "node_modules",
        "typescript",
        "lib",
        "typescript.js",
      ),
    )
  );
  const ast = ts.createSourceFile(
    routesFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let routesArray;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    )
      routesArray ??= node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (!routesArray)
    throw new Error(`No routes array was found in ${routesFile}.`);
  for (const element of routesArray.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const property = element.properties.find(
      (item) =>
        ts.isPropertyAssignment(item) && item.name.getText(ast) === "path",
    );
    if (
      property &&
      ts.isStringLiteral(property.initializer) &&
      property.initializer.text === routePath
    )
      throw new Error(`Route path '${routePath}' already exists.`);
  }
  let position = routesArray.elements.end;
  for (const element of routesArray.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const property = element.properties.find(
      (item) =>
        ts.isPropertyAssignment(item) && item.name.getText(ast) === "path",
    );
    if (
      property &&
      ts.isStringLiteral(property.initializer) &&
      (property.initializer.text.startsWith(":") ||
        property.initializer.text === "**")
    ) {
      position = element.getFullStart();
      break;
    }
  }
  const route = `  {\n    path: '${routePath}',\n    title: '${String(title).replaceAll("'", "\\'")}',\n    ${loader}: () => import('${importPath}').then((module) => module.${exportName}),\n  },\n`;
  const updated = `${source.slice(0, position)}${position === routesArray.elements.end && routesArray.elements.length ? "\n" : ""}${route}${source.slice(position)}`;
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(routesFile, updated, "utf8"),
  );
}

export async function assertRoutePathAvailable(workspace, routesFile, routePath) {
  const source = await readFile(routesFile, "utf8");
  const ts = await import(
    pathToFileURL(
      path.join(workspace, "node_modules", "typescript", "lib", "typescript.js"),
    )
  );
  const ast = ts.createSourceFile(
    routesFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let duplicate = false;
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === "path" &&
      ts.isStringLiteral(node.initializer) &&
      node.initializer.text === routePath
    ) {
      duplicate = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (duplicate) throw new Error(`Route path '${routePath}' already exists.`);
}

export async function executeSlicePlan(plan, { dryRun = false } = {}) {
  if (dryRun) return;
  const nxCli = path.join(
    plan.context.workspace,
    "node_modules",
    "nx",
    "dist",
    "bin",
    "nx.js",
  );
  const code = await runCommand(
    process.execPath,
    [
      nxCli,
      "generate",
      "@nx/angular:component",
      plan.name,
      "--standalone",
      "--style=scss",
      "--changeDetection=OnPush",
      "--no-interactive",
    ],
    { cwd: plan.context.sourceRoot },
  );
  if (code !== 0)
    throw new Error(`Nx failed while creating feature slice ${plan.name}.`);
  if (plan.routed) {
    const relative = `./${path.relative(path.dirname(plan.routesFile), path.join(plan.context.sourceRoot, plan.name, `${plan.name}.component`)).replaceAll("\\", "/")}`;
    await insertLazyRoute({
      workspace: plan.context.workspace,
      routesFile: plan.routesFile,
      routePath: plan.routePath,
      title: plan.title,
      importPath: relative,
      exportName: componentClassName(plan.name),
    });
  }
}

export async function findRouteFiles(sourceRoot) {
  const { readdir } = await import("node:fs/promises");
  const found = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.name.endsWith(".routes.ts")) found.push(target);
    }
  }
  await walk(sourceRoot);
  return found.sort();
}

export async function executeCapabilityFeature(
  project,
  options,
  execution = {},
) {
  const plan = buildLibraryPlan(project, {
    capability: options.capability,
    type: "feature",
    runtime: "angular",
  });
  await executeLibraryPlan(plan, execution);
  if (execution.dryRun) return plan;
  const workspace = projectRoot(project);
  const sourceRoot = path.join(workspace, plan.directory, "src", "lib");
  const nxCli = path.join(
    workspace,
    "node_modules",
    "nx",
    "dist",
    "bin",
    "nx.js",
  );
  const code = await runCommand(
    process.execPath,
    [
      nxCli,
      "generate",
      "@nx/angular:component",
      options.capability,
      "--standalone",
      "--style=scss",
      "--changeDetection=OnPush",
      "--no-interactive",
    ],
    { cwd: sourceRoot },
  );
  if (code !== 0)
    throw new Error("Nx failed while creating the initial feature component.");
  const constant = `${options.capability.replaceAll("-", "_").toUpperCase()}_ROUTES`;
  const routesPath = path.join(sourceRoot, `${options.capability}.routes.ts`);
  await writeFileExclusive(
    routesPath,
    `import { Routes } from '@angular/router';\n\nimport { ${componentClassName(options.capability)} } from './${options.capability}/${options.capability}.component';\n\nexport const ${constant}: Routes = [{ path: '', component: ${componentClassName(options.capability)} }];\n`,
  );
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(
      path.join(workspace, plan.directory, "src", "index.ts"),
      `export { ${constant} } from './lib/${options.capability}.routes';\n`,
      "utf8",
    ),
  );
  const remoteRoutes = path.join(
    workspace,
    "apps",
    project.nxProject,
    "src",
    "app",
    "remote-entry",
    "remote-entry.routes.ts",
  );
  await insertLazyRoute({
    workspace,
    routesFile: remoteRoutes,
    routePath: options.routePath,
    title: options.title,
    importPath: plan.alias,
    exportName: constant,
    loader: "loadChildren",
  });
  if (options.defaultRoute)
    await setDefaultRoute({
      workspace,
      routesFile: remoteRoutes,
      routePath: options.routePath,
    });
  return plan;
}

export async function setDefaultRoute({ workspace, routesFile, routePath }) {
  const source = await readFile(routesFile, "utf8");
  const ts = await import(
    pathToFileURL(
      path.join(
        workspace,
        "node_modules",
        "typescript",
        "lib",
        "typescript.js",
      ),
    )
  );
  const ast = ts.createSourceFile(
    routesFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let redirect;
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === "redirectTo" &&
      ts.isStringLiteral(node.initializer)
    )
      redirect ??= node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (!redirect)
    throw new Error(
      "No default redirect route exists; add one explicitly before changing the default capability.",
    );
  const updated = `${source.slice(0, redirect.getStart(ast))}'${routePath}'${source.slice(redirect.end)}`;
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(routesFile, updated, "utf8"),
  );
}
