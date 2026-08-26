import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { Readable, Writable } from "node:stream";

import {
  PROJECT_LIST,
  PROJECTS,
  TOOLING_ROOT,
  projectRoot,
} from "../src/config.mjs";
import {
  checkRepositoryAgentConfiguration,
  discoverCanonicalSkills,
  syncRepositorySkills,
  validateCrossRepositoryChangeId,
} from "../src/agents.mjs";
import {
  aggregateChildEnvironment,
  aggregateExitCodes,
  isPathInside,
  isSupportedNodeVersion,
  normalizeArtifactName,
  repositoryMatches,
  resolveGeneratorContext,
  resolveSelectedTarget,
} from "../src/lib.mjs";
import {
  assertKebabCase,
  buildLibraryNxArguments,
  buildLibraryPlan,
  insertLazyRoute,
} from "../src/architecture.mjs";
import { createPrompter, parseFlags } from "../src/prompts.mjs";
import {
  renderFederationManifest,
  renderRemoteRegistry,
} from "../src/registry.mjs";
import {
  nextAvailablePort,
  renderRepositoryTemplate,
  validateRepositoryOptions,
} from "../src/repository.mjs";

test("accepts only the Node.js ranges supported by Angular 22", () => {
  assert.equal(isSupportedNodeVersion("v22.22.3"), true);
  assert.equal(isSupportedNodeVersion("24.15.0"), true);
  assert.equal(isSupportedNodeVersion("v26.0.0"), true);
  assert.equal(isSupportedNodeVersion("v22.22.2"), false);
  assert.equal(isSupportedNodeVersion("v23.10.0"), false);
  assert.equal(isSupportedNodeVersion("v25.0.0"), false);
});

test("matches HTTPS and SSH URLs for the same repository", () => {
  assert.equal(
    repositoryMatches(
      "git@github.com:pulso-web-app/pulso-shell.git",
      "https://github.com/pulso-web-app/pulso-shell.git",
    ),
    true,
  );
  assert.equal(
    repositoryMatches(
      "https://github.com/example/pulso-shell.git",
      "https://github.com/pulso-web-app/pulso-shell.git",
    ),
    false,
  );
});

test("removes TypeScript extensions and duplicate artifact suffixes", () => {
  assert.equal(normalizeArtifactName("card.component.ts", "component"), "card");
  assert.equal(
    normalizeArtifactName("cards/contact-card.component", "component"),
    "cards/contact-card",
  );
  assert.equal(normalizeArtifactName("auth.service", "service"), "auth");
});

test("rejects absolute paths and directory traversal", () => {
  assert.throws(
    () => normalizeArtifactName("../card", "component"),
    /cannot contain/,
  );
  assert.throws(
    () => normalizeArtifactName("C:\\temp\\card", "component"),
    /absolute/,
  );
  assert.throws(
    () => normalizeArtifactName("/tmp/card", "component"),
    /absolute/,
  );
});

test("restricts generation to an application or Nx library source root", () => {
  const shellRoot = projectRoot(PROJECTS.shell);
  const validTarget = path.join(
    shellRoot,
    "apps",
    "shell",
    "src",
    "app",
    "features",
  );
  const context = resolveGeneratorContext(validTarget, shellRoot);
  assert.equal(context.project.key, "shell");
  assert.equal(context.sourceKind, "app");
  assert.equal(context.sourceRoot, context.appSource);
  assert.equal(isPathInside(validTarget, context.appSource), true);

  const libraryTarget = path.join(
    shellRoot,
    "libs",
    "auth",
    "feature",
    "src",
    "lib",
    "login",
  );
  const libraryProjectFile = path.join(
    shellRoot,
    "libs",
    "auth",
    "feature",
    "project.json",
  );
  const libraryContext = resolveGeneratorContext(libraryTarget, shellRoot, {
    fileExists: (candidate) => candidate === libraryProjectFile,
  });
  assert.equal(libraryContext.sourceKind, "library");
  assert.equal(
    libraryContext.sourceRoot,
    path.join(shellRoot, "libs", "auth", "feature", "src", "lib"),
  );
  assert.throws(
    () =>
      resolveGeneratorContext(libraryTarget, shellRoot, {
        fileExists: () => false,
      }),
    /Nx library's src\/lib/,
  );

  assert.throws(
    () => resolveGeneratorContext(path.join(shellRoot, "tools"), shellRoot),
    /Select a folder or file inside/,
  );
  assert.throws(
    () =>
      resolveGeneratorContext(
        path.join(shellRoot, "libs", "auth", "feature", "src"),
        shellRoot,
      ),
    /Nx library's src\/lib/,
  );
});

test("infers the owning workspace from an Explorer folder selection", () => {
  const crmRoot = projectRoot(PROJECTS.crm);
  const selectedFolder = path.join(
    crmRoot,
    "apps",
    "crm",
    "src",
    "app",
    "features",
    "contacts",
  );

  const context = resolveGeneratorContext(selectedFolder);

  assert.equal(context.project.key, "crm");
  assert.equal(context.workspace, crmRoot);
  assert.equal(context.target, selectedFolder);
});

test("resolves Explorer files to their parent directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pulso-target-test-"));
  const selectedFile = path.join(root, "feature.ts");

  try {
    await writeFile(selectedFile, "export {};\n");

    assert.equal(resolveSelectedTarget(selectedFile), root);
    assert.equal(resolveSelectedTarget(root), root);
    assert.equal(
      resolveSelectedTarget(path.join(root, "future-directory")),
      path.join(root, "future-directory"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("aggregates exit codes from multiple projects", () => {
  assert.equal(aggregateExitCodes([0, 0, 0]), 0);
  assert.equal(aggregateExitCodes([0, 1, 0]), 1);
});

test("removes NO_COLOR from aggregate child environments", () => {
  const source = {
    FORCE_COLOR: "1",
    NO_COLOR: "1",
    PULSO_FIXTURE: "preserved",
  };

  assert.deepEqual(aggregateChildEnvironment(source), {
    FORCE_COLOR: "1",
    PULSO_FIXTURE: "preserved",
  });
  assert.equal(source.NO_COLOR, "1");
});

test("references only existing workspace tasks and safe generator commands", async () => {
  const workspaceSource = await readFile(
    path.join(TOOLING_ROOT, "pulso.code-workspace"),
    "utf8",
  );
  const workspace = JSON.parse(workspaceSource.replace(/,\s*([}\]])/g, "$1"));
  const labels = new Set(workspace.tasks.tasks.map((task) => task.label));

  for (const task of workspace.tasks.tasks) {
    for (const dependency of task.dependsOn ?? []) {
      assert.equal(
        labels.has(dependency),
        true,
        `${dependency} does not exist`,
      );
    }
  }

  assert.equal(
    JSON.stringify(workspace).includes("nxConsole.nxWorkspacePath"),
    false,
  );

  const commands = workspace.settings["command-runner.commands"];
  const expectedGenerators = {
    "Pulso: Generate Component Here": "component",
    "Pulso: Generate Service Here": "service",
    "Pulso: Generate Guard Here": "guard",
    "Pulso: Generate Directive Here": "directive",
    "Pulso: Generate Pipe Here": "pipe",
    "Pulso: Generate Interceptor Here": "interceptor",
    "Pulso: Generate Resolver Here": "resolver",
  };
  assert.deepEqual(
    Object.keys(commands).slice(0, 7),
    Object.keys(expectedGenerators),
  );
  for (const [label, generator] of Object.entries(expectedGenerators)) {
    const command = commands[label];
    assert.match(command, /\$\{selectedFile\}/);
    assert.match(command, new RegExp(`generate-selected ${generator}`));
    assert.doesNotMatch(command, /\$\{input\}/);
  }
  assert.match(
    commands["Pulso: Create Library Here"],
    /create-selected library/,
  );
  assert.match(
    commands["Pulso: Create Feature Here"],
    /create-selected feature/,
  );
  assert.match(
    commands["Pulso: Initialize Repository Here"],
    /create-selected repository/,
  );
  assert.equal(
    workspace.extensions.recommendations.includes(
      "edonet.vscode-command-runner",
    ),
    true,
  );
});

test("builds canonical Angular and TypeScript library plans", () => {
  const angular = buildLibraryPlan(PROJECTS.crm, {
    capability: "sales-pipeline",
    type: "data-access",
  });
  assert.equal(angular.directory, "libs/sales-pipeline/data-access");
  assert.equal(angular.projectName, "sales-pipeline-data-access");
  assert.equal(angular.alias, "@pulso-crm/sales-pipeline-data-access");
  assert.deepEqual(angular.tags, ["scope:sales-pipeline", "type:data-access"]);
  assert.deepEqual(buildLibraryNxArguments(angular).slice(0, 3), [
    "generate",
    "@nx/angular:library",
    "libs/sales-pipeline/data-access",
  ]);

  const pure = buildLibraryPlan(PROJECTS.projects, {
    capability: "planning",
    type: "domain",
    runtime: "typescript",
  });
  assert.match(
    buildLibraryNxArguments(pure).join(" "),
    /@nx\/js:library.*--bundler=tsc.*--unitTestRunner=vitest/,
  );
  assert.throws(() => assertKebabCase("Sales Pipeline"), /kebab-case/);
  for (const type of ["data-access", "domain", "ui", "util"]) {
    for (const runtime of ["angular", "typescript"]) {
      if (!["domain", "util"].includes(type) && runtime === "typescript")
        continue;
      const plan = buildLibraryPlan(PROJECTS.crm, {
        capability: "sales",
        type,
        runtime,
      });
      assert.equal(plan.directory, `libs/sales/${type}`);
      assert.equal(plan.runtime, runtime);
    }
  }
});

test("parses automation flags without changing positional arguments", () => {
  assert.deepEqual(
    parseFlags([
      "target",
      "--capability",
      "sales",
      "--dry-run",
      "--runtime=typescript",
    ]),
    {
      positional: ["target"],
      flags: { capability: "sales", "dry-run": true, runtime: "typescript" },
    },
  );
});

test("supports numbered prompts and explicit cancellation", async () => {
  let output = "";
  const selectionPrompt = createPrompter({
    input: Readable.from(["2\n"]),
    output: new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    }),
  });
  try {
    assert.equal(
      await selectionPrompt.select("Runtime", [
        { label: "Angular", value: "angular" },
        { label: "TypeScript", value: "typescript" },
      ]),
      "typescript",
    );
    assert.match(output, /1\. Angular/);
  } finally {
    selectionPrompt.close();
  }
  const confirmationPrompt = createPrompter({
    input: Readable.from(["n\n"]),
    output: new Writable({ write(_chunk, _encoding, callback) { callback(); } }),
  });
  try {
    assert.equal(await confirmationPrompt.confirm("Apply?"), false);
  } finally {
    confirmationPrompt.close();
  }
});

test("inserts static lazy routes before parameter and wildcard routes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pulso-route-test-"));
  const routeFile = path.join(root, "sample.routes.ts");
  try {
    await writeFile(
      routeFile,
      "import { Routes } from '@angular/router';\nexport const ROUTES: Routes = [{ path: ':id', loadComponent: async () => null }, { path: '**', loadComponent: async () => null }];\n",
    );
    await insertLazyRoute({
      workspace: projectRoot(PROJECTS.crm),
      routesFile: routeFile,
      routePath: "new",
      title: "New",
      importPath: "./new.component",
      exportName: "NewComponent",
    });
    const source = await readFile(routeFile, "utf8");
    assert.ok(source.indexOf("path: 'new'") < source.indexOf("path: ':id'"));
    await assert.rejects(
      () =>
        insertLazyRoute({
          workspace: projectRoot(PROJECTS.crm),
          routesFile: routeFile,
          routePath: "new",
          title: "New",
          importPath: "./new.component",
          exportName: "NewComponent",
        }),
      /already exists/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("renders Shell remotes and validates repository ports", () => {
  const registry = {
    repositories: [PROJECTS.shell, PROJECTS.crm, PROJECTS.projects],
  };
  assert.match(renderRemoteRegistry(registry), /REMOTE_ROUTES|PULSO_REMOTES/);
  assert.equal(
    renderFederationManifest(registry, "development").crm,
    "http://localhost:4201/remoteEntry.json",
  );
  assert.equal(nextAvailablePort(), 4203);
  assert.throws(
    () =>
      validateRepositoryOptions({
        key: "crm",
        displayName: "CRM",
        capability: "sales",
        routePath: "sales",
        routeTitle: "Sales",
        icon: "dashboard",
        port: 4300,
        repository: "https://github.com/pulso-web-app/pulso-crm.git",
        firebaseProject: "pulso-web-app",
        firebaseTarget: "crm",
        firebaseSite: "pulso-web-app-crm",
        publicUrl: "https://pulso-web-app-crm.web.app",
      }),
    /already registered/,
  );
});

test("renders a complete remote template without unresolved tokens", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pulso-remote-template-"));
  try {
    await renderRepositoryTemplate(root, {
      key: "billing",
      displayName: "Billing",
      capability: "invoices",
      routePath: "billing",
      routeTitle: "Billing",
      icon: "receipt",
      showInNavigation: true,
      port: 4203,
      repository: "https://github.com/pulso-web-app/pulso-billing.git",
      firebaseProject: "pulso-web-app",
      firebaseTarget: "billing",
      firebaseSite: "pulso-web-app-billing",
      publicUrl: "https://pulso-web-app-billing.web.app",
    });
    assert.equal(
      existsSync(path.join(root, "apps", "billing", "federation.config.mjs")),
      true,
    );
    assert.equal(
      existsSync(
        path.join(root, "libs", "invoices", "feature", "project.json"),
      ),
      true,
    );
    assert.match(
      await readFile(
        path.join(root, "libs", "invoices", "feature", "src", "index.ts"),
        "utf8",
      ),
      /INVOICES_ROUTES/,
    );
    assert.doesNotMatch(
      await readFile(path.join(root, "tsconfig.base.json"), "utf8"),
      /projects-feature-placeholder|__PULSO_/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createAgentFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "pulso-agent-test-"));
  const required = [
    "README.md",
    "AGENTS.md",
    "CLAUDE.md",
    "CONTRIBUTING.md",
    path.join("docs", "architecture.md"),
    path.join(".github", "copilot-instructions.md"),
    path.join(".github", "pull_request_template.md"),
  ];
  for (const relative of required) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "# Fixture\n");
  }
  const skill = path.join(root, ".agents", "skills", "pulso-fixture");
  await mkdir(skill, { recursive: true });
  await writeFile(
    path.join(skill, "SKILL.md"),
    "---\nname: pulso-fixture\ndescription: Fixture skill used for deterministic mirroring tests.\n---\n\n# Fixture\n",
  );
  return root;
}

test("discovers and deterministically mirrors only Pulso skills", async () => {
  const root = await createAgentFixture();
  try {
    const openspec = path.join(root, ".claude", "skills", "openspec-explore");
    await mkdir(openspec, { recursive: true });
    await writeFile(path.join(openspec, "SKILL.md"), "preserve me");

    assert.deepEqual(
      (await discoverCanonicalSkills(root)).map((skill) => skill.name),
      ["pulso-fixture"],
    );
    await syncRepositorySkills(root);
    assert.deepEqual(await checkRepositoryAgentConfiguration(root), []);
    assert.equal(
      await readFile(path.join(openspec, "SKILL.md"), "utf8"),
      "preserve me",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detects drift and missing agent adapters", async () => {
  const root = await createAgentFixture();
  try {
    await syncRepositorySkills(root);
    await writeFile(
      path.join(root, ".claude", "skills", "pulso-fixture", "SKILL.md"),
      "drift",
    );
    await rm(path.join(root, "CLAUDE.md"));
    const issues = await checkRepositoryAgentConfiguration(root);
    assert.equal(
      issues.some((issue) => issue.includes("drift")),
      true,
    );
    assert.equal(issues.includes("missing CLAUDE.md"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("all Pulso repositories contain required documentation and agent files", async () => {
  const availableRoots = [
    TOOLING_ROOT,
    ...PROJECT_LIST.map(projectRoot),
  ].filter((root) => existsSync(root));
  for (const root of availableRoots) {
    const issues = await checkRepositoryAgentConfiguration(root);
    assert.deepEqual(
      issues,
      [],
      `${path.basename(root)}: ${issues.join(", ")}`,
    );
  }
});

test("validates one kebab-case change ID across repositories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pulso-change-test-"));
  const repositories = [path.join(root, "tooling"), path.join(root, "shell")];
  try {
    for (const repository of repositories) {
      await mkdir(
        path.join(repository, "openspec", "changes", "shared-contract"),
        { recursive: true },
      );
    }
    assert.equal(
      validateCrossRepositoryChangeId("shared-contract", repositories),
      true,
    );
    assert.throws(
      () => validateCrossRepositoryChangeId("Shared Contract", repositories),
      /kebab-case/,
    );
    assert.throws(
      () => validateCrossRepositoryChangeId("missing-change", repositories),
      /missing from/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
