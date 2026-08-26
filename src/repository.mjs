import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { PULSO_ROOT, PROJECT_LIST, TOOLING_ROOT } from "./config.mjs";
import { assertKebabCase, resolveWorkspaceContext } from "./architecture.mjs";
import {
  checkRepositoryAgentConfiguration,
  syncRepositorySkills,
} from "./agents.mjs";
import { readJson, writeJsonAtomic } from "./files.mjs";
import { booleanFlag } from "./prompts.mjs";
import { registerRepository } from "./registry.mjs";
import { npmInvocation, runCommand } from "./lib.mjs";

const TEXT_EXTENSIONS = new Set([
  "",
  ".json",
  ".md",
  ".mjs",
  ".js",
  ".ts",
  ".mts",
  ".html",
  ".scss",
  ".css",
  ".yaml",
  ".yml",
  ".toml",
  ".txt",
]);

async function capture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error(output.trim() || `${command} exited with ${code}`)),
    );
  });
}

export function nextAvailablePort(repositories = PROJECT_LIST, first = 4201) {
  const occupied = new Set(repositories.map((item) => Number(item.port)));
  let port = first;
  while (occupied.has(port)) port += 1;
  return port;
}

export function validateRepositoryOptions(
  options,
  repositories = PROJECT_LIST,
) {
  assertKebabCase(options.key, "Repository key");
  assertKebabCase(options.capability, "Initial capability");
  assertKebabCase(options.routePath, "Route path");
  const port = Number(options.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Port must be an integer from 1024 to 65535.");
  if (
    !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/pulso-[a-z0-9-]+\.git$/.test(
      options.repository,
    )
  )
    throw new Error("Expected GitHub URL must be HTTPS and end in .git.");
  if (!String(options.displayName).trim() || !String(options.routeTitle).trim())
    throw new Error("Visible name and route title are required.");
  if (!/^[a-z][a-z0-9_]*$/.test(options.icon))
    throw new Error(
      "Material icon must use lowercase letters, digits, or underscores.",
    );
  for (const [label, value] of [
    ["Firebase project", options.firebaseProject],
    ["Firebase target", options.firebaseTarget],
    ["Firebase site", options.firebaseSite],
  ]) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(String(value)))
      throw new Error(
        `${label} must use lowercase letters, digits, and hyphens.`,
      );
  }
  if (!/^https:\/\//.test(options.publicUrl))
    throw new Error("Public URL must use HTTPS.");
  if (
    repositories.some(
      (item) =>
        item.key === options.key ||
        item.port === port ||
        item.routePath === options.routePath,
    )
  )
    throw new Error(
      "Repository key, port, or route path is already registered.",
    );
  return { ...options, port };
}

export function repositoryPlan(options) {
  return {
    kind: "repository",
    projectName: options.key,
    files: [
      `../pulso-${options.key}`,
      "pulso.repositories.json",
      "pulso.code-workspace",
      "package.json",
      "../pulso-shell/apps/shell/public/federation.manifest.dev.json",
      "../pulso-shell/apps/shell/public/federation.manifest.json",
      "../pulso-shell/libs/shell/feature/src/lib/remotes/pulso-remotes.generated.ts",
    ],
  };
}

function replacementPairs(options) {
  const capabilityPascal = options.capability
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return [
    ["libs/projects/feature-placeholder", `libs/${options.capability}/feature`],
    [
      "@pulso-projects/projects-feature-placeholder",
      `@pulso-${options.key}/${options.capability}-feature`,
    ],
    ["projects-feature-placeholder", `${options.capability}-feature`],
    ["ProjectsPlaceholderComponent", `${capabilityPascal}Component`],
    ["projects.routes", `${options.capability}.routes`],
    ["projects-placeholder", options.capability],
    [
      "PROJECTS_ROUTES",
      `${options.capability.replaceAll("-", "_").toUpperCase()}_ROUTES`,
    ],
    ["pulso-web-app-projects", options.firebaseSite],
    ["pulso-projects", `pulso-${options.key}`],
    ["Projects", options.displayName],
    ["PROJECTS", options.key.toUpperCase().replaceAll("-", "_")],
    ["projects", options.key],
  ];
}

function transformText(value, options) {
  let output = value;
  for (const [from, to] of replacementPairs(options))
    output = output.replaceAll(from, to);
  return output;
}

function transformRelativePath(relative, options) {
  let result = relative.replaceAll("\\", "/");
  result = result.replace(
    /^libs\/projects\/feature-placeholder/,
    `libs/${options.capability}/feature`,
  );
  for (const [from, to] of replacementPairs(options))
    result = result.replaceAll(from, to);
  return result;
}

async function copyTemplateTree(source, target, options, excluded) {
  async function walk(directory, relative = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const sourcePath = path.join(directory, entry.name);
      const sourceRelative = path.join(relative, entry.name);
      const destination = path.join(
        target,
        transformRelativePath(sourceRelative, options),
      );
      if (entry.isDirectory()) {
        await mkdir(destination, { recursive: true });
        await walk(sourcePath, sourceRelative);
      } else {
        await mkdir(path.dirname(destination), { recursive: true });
        const extension = path.extname(entry.name).toLowerCase();
        if (TEXT_EXTENSIONS.has(extension) || entry.name.startsWith(".")) {
          await writeFile(
            destination,
            transformText(await readFile(sourcePath, "utf8"), options),
            "utf8",
          );
        } else {
          await copyFile(sourcePath, destination);
        }
      }
    }
  }
  await walk(source);
}

async function normalizeGeneratedRepository(root, options) {
  const architecture = {
    version: 1,
    appScope: options.key,
    capabilities: {
      [options.capability]: { dependsOn: ["shared"] },
      [options.key]: { dependsOn: [options.capability, "shared"] },
      shared: { dependsOn: [] },
    },
  };
  await writeJsonAtomic(
    path.join(root, "architecture.config.json"),
    architecture,
  );
  const firebase = await readJson(path.join(root, "firebase.json"));
  firebase.hosting.target = options.firebaseTarget;
  firebase.hosting.public = `dist/apps/${options.key}/browser`;
  await writeJsonAtomic(path.join(root, "firebase.json"), firebase);
  await writeJsonAtomic(path.join(root, ".firebaserc"), {
    projects: { default: options.firebaseProject },
    targets: {
      [options.firebaseProject]: {
        hosting: { [options.firebaseTarget]: [options.firebaseSite] },
      },
    },
    etags: {},
  });
  const appProjectPath = path.join(root, "apps", options.key, "project.json");
  const appProject = await readJson(appProjectPath);
  appProject.tags = [`scope:${options.key}`, "type:app"];
  appProject.targets["serve-original"].options.port = options.port;
  await writeJsonAtomic(appProjectPath, appProject);
  const featureProjectPath = path.join(
    root,
    "libs",
    options.capability,
    "feature",
    "project.json",
  );
  const featureProject = await readJson(featureProjectPath);
  featureProject.name = `${options.capability}-feature`;
  featureProject.sourceRoot = `libs/${options.capability}/feature/src`;
  featureProject.tags = [`scope:${options.capability}`, "type:feature"];
  await writeJsonAtomic(featureProjectPath, featureProject);
  const componentPath = path.join(
    root,
    "libs",
    options.capability,
    "feature",
    "src",
    "lib",
    options.capability,
    `${options.capability}.component.ts`,
  );
  const componentSource = await readFile(componentPath, "utf8");
  await writeFile(
    componentPath,
    componentSource.replace(
      /selector: '[^']+'/,
      `selector: 'pulso-${options.key}-${options.capability}'`,
    ),
    "utf8",
  );
  const routesConstant = `${options.capability.replaceAll("-", "_").toUpperCase()}_ROUTES`;
  await writeFile(
    path.join(root, "libs", options.capability, "feature", "src", "index.ts"),
    `export { ${routesConstant} } from './lib/${options.capability}.routes';\n`,
    "utf8",
  );
  await writeFile(
    path.join(
      root,
      "apps",
      options.key,
      "src",
      "app",
      "remote-entry",
      "remote-entry.routes.spec.ts",
    ),
    `import { REMOTE_ROUTES } from './remote-entry.routes';\n\ndescribe('REMOTE_ROUTES', () => {\n  it('exposes a loadable default capability route', () => {\n    expect(REMOTE_ROUTES[0]?.path).toBe('');\n    expect(REMOTE_ROUTES[0]?.loadComponent).toBeTypeOf('function');\n  });\n});\n`,
    "utf8",
  );
  const tsconfig = await readJson(path.join(root, "tsconfig.base.json"));
  tsconfig.compilerOptions.paths = Object.fromEntries(
    Object.entries(tsconfig.compilerOptions.paths).map(([alias, targets]) => [
      alias,
      targets.map((target) =>
        target.replace(
          `./libs/${options.key}/feature/src`,
          `./libs/${options.capability}/feature/src`,
        ),
      ),
    ]),
  );
  await writeJsonAtomic(path.join(root, "tsconfig.base.json"), tsconfig);
}

export async function renderRepositoryTemplate(
  target,
  options,
  { sourceRoot = path.join(PULSO_ROOT, "pulso-projects") } = {},
) {
  const descriptor = await readJson(
    path.join(TOOLING_ROOT, "templates", "remote-repository", "template.json"),
  );
  await copyTemplateTree(
    sourceRoot,
    target,
    options,
    new Set(descriptor.excludedDirectories),
  );
  await normalizeGeneratedRepository(target, options);
  const unresolved = [];
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) await inspect(candidate);
      else if (
        TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ||
        entry.name.startsWith(".")
      ) {
        const text = await readFile(candidate, "utf8");
        if (/__PULSO_[A-Z_]+__/.test(text)) unresolved.push(candidate);
      }
    }
  }
  await inspect(target);
  if (unresolved.length)
    throw new Error(`Unresolved template tokens: ${unresolved.join(", ")}`);
}

async function assertRegistrationTargetsClean() {
  const toolingTargets = [
    "pulso.repositories.json",
    "pulso.code-workspace",
    "package.json",
  ];
  const shellTargets = [
    "apps/shell/public/federation.manifest.dev.json",
    "apps/shell/public/federation.manifest.json",
    "libs/shell/feature/src/lib/remotes/pulso-remotes.generated.ts",
  ];
  for (const [root, targets] of [
    [TOOLING_ROOT, toolingTargets],
    [path.join(PULSO_ROOT, "pulso-shell"), shellTargets],
  ]) {
    const dirty = await capture("git", [
      "-C",
      root,
      "status",
      "--porcelain",
      "--",
      ...targets,
    ]);
    if (dirty)
      throw new Error(
        `Registration target has uncommitted changes in ${path.basename(root)}:\n${dirty}`,
      );
  }
}

async function scaffoldRepository(options, log) {
  const target = path.join(PULSO_ROOT, `pulso-${options.key}`);
  if (existsSync(target)) throw new Error(`${target} already exists.`);
  await assertRegistrationTargetsClean();
  const staging = await mkdtemp(
    path.join(PULSO_ROOT, `.pulso-${options.key}-`),
  );
  try {
    log(`\nRendering template in ${path.basename(staging)}...`);
    await renderRepositoryTemplate(staging, options);
    const npm = npmInvocation(["install"]);
    if ((await runCommand(npm.command, npm.args, { cwd: staging })) !== 0)
      throw new Error("npm install failed in the generated repository.");
    const format = npmInvocation([
      "exec",
      "prettier",
      "--",
      "--write",
      "**/*.{md,json,mjs,ts,html,scss,yaml,yml}",
    ]);
    if ((await runCommand(format.command, format.args, { cwd: staging })) !== 0)
      throw new Error("Formatting failed in the generated repository.");
    const update = npmInvocation(["run", "spec:update"]);
    if ((await runCommand(update.command, update.args, { cwd: staging })) !== 0)
      throw new Error("OpenSpec adapter initialization failed.");
    await syncRepositorySkills(staging);
    const agentIssues = await checkRepositoryAgentConfiguration(staging);
    if (agentIssues.length)
      throw new Error(`Agent configuration failed: ${agentIssues.join("; ")}`);
    const check = npmInvocation(["run", "check"]);
    if ((await runCommand(check.command, check.args, { cwd: staging })) !== 0)
      throw new Error("npm run check failed in the generated repository.");
    if (
      (await runCommand("git", ["init", "-b", "main"], { cwd: staging })) !== 0
    )
      throw new Error("git init failed.");
    await rename(staging, target);
  } catch (error) {
    if (existsSync(staging) && (await stat(staging)).isDirectory())
      await rm(staging, { recursive: true, force: true });
    throw error;
  }
  const repository = {
    key: options.key,
    displayName: options.displayName,
    folder: `pulso-${options.key}`,
    kind: "remote",
    nxProject: options.key,
    e2eProject: `${options.key}-e2e`,
    port: options.port,
    repository: options.repository,
    routePath: options.routePath,
    routeTitle: options.routeTitle,
    icon: options.icon,
    showInNavigation: options.showInNavigation,
    defaultRemote: false,
    developmentRemoteEntry: `http://localhost:${options.port}/remoteEntry.json`,
    productionRemoteEntry: `${options.publicUrl.replace(/\/$/, "")}/remoteEntry.json`,
  };
  await registerRepository(repository, {
    shellRoot: path.join(PULSO_ROOT, "pulso-shell"),
  });
  return target;
}

function required(flags, key) {
  if (!flags[key] || flags[key] === true)
    throw new Error(`--${key} is required with --yes.`);
  return String(flags[key]);
}

export async function initializeRepositorySelected(
  selectedPath,
  flags,
  prompt,
  { log = console.log } = {},
) {
  const selection = resolveWorkspaceContext(selectedPath, {
    allowTooling: true,
  });
  if (selection.project)
    throw new Error(
      "Repository initialization must be launched from the pulso-tooling workspace.",
    );
  const interactive = !flags.yes;
  const ask = async (key, label, fallback, validator) =>
    flags[key] ||
    (interactive
      ? prompt.text(label, { defaultValue: fallback, validate: validator })
      : required(flags, key));
  const key = await ask("key", "Repository key", undefined, (value) =>
    assertKebabCase(value, "Repository key"),
  );
  const displayName = await ask("display-name", "Visible name", key);
  const capability = await ask(
    "capability",
    "Initial capability",
    key,
    (value) => assertKebabCase(value, "Initial capability"),
  );
  const routePath = await ask("path", "Shell route path", key, (value) =>
    assertKebabCase(value, "Route path"),
  );
  const routeTitle = await ask("title", "Route title", displayName);
  const icon = await ask("icon", "Material icon", "apps");
  const showInNavigation = booleanFlag(
    flags.navigation,
    interactive ? await prompt.confirm("Show in navigation?", true) : true,
  );
  const port = Number(
    await ask("port", "Development port", String(nextAvailablePort())),
  );
  const repository = await ask(
    "repository",
    "Expected GitHub URL",
    `https://github.com/pulso-web-app/pulso-${key}.git`,
  );
  const firebaseProject = await ask(
    "firebase-project",
    "Firebase project",
    "pulso-web-app",
  );
  const firebaseTarget = await ask(
    "firebase-target",
    "Firebase hosting target",
    key,
  );
  const firebaseSite = await ask(
    "firebase-site",
    "Firebase site ID",
    `pulso-web-app-${key}`,
  );
  const publicUrl = await ask(
    "public-url",
    "Public URL",
    `https://${firebaseSite}.web.app`,
  );
  const options = validateRepositoryOptions({
    key,
    displayName,
    capability,
    routePath,
    routeTitle,
    icon,
    showInNavigation,
    port,
    repository,
    firebaseProject,
    firebaseTarget,
    firebaseSite,
    publicUrl,
  });
  const plan = repositoryPlan(options);
  log("\nPreview");
  log(`  Repository: pulso-${key}`);
  log(`  Remote: ${routePath} on port ${port}`);
  for (const file of plan.files) log(`    - ${file}`);
  if (flags["dry-run"]) {
    log("\nDry run: no files or commands were executed.");
    return;
  }
  if (
    !flags.yes &&
    !(await prompt.confirm("Create and register this repository?"))
  )
    throw new Error("Generation cancelled.");
  const target = await scaffoldRepository(options, log);
  log(`\n✓ Repository created at ${target}`);
  log("External operations still required:");
  log(`  - Create ${repository} and add it as origin.`);
  log(
    `  - Provision Firebase site ${firebaseSite} and target ${firebaseTarget}.`,
  );
  log(
    "  - Configure GitHub/Firebase deployment secrets, then commit and push.",
  );
}
