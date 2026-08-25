import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

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
  aggregateExitCodes,
  isPathInside,
  isSupportedNodeVersion,
  normalizeArtifactName,
  repositoryMatches,
  resolveGeneratorContext,
} from "../src/lib.mjs";

test("aceita somente as faixas de Node suportadas pelo Angular 22", () => {
  assert.equal(isSupportedNodeVersion("v22.22.3"), true);
  assert.equal(isSupportedNodeVersion("24.15.0"), true);
  assert.equal(isSupportedNodeVersion("v26.0.0"), true);
  assert.equal(isSupportedNodeVersion("v22.22.2"), false);
  assert.equal(isSupportedNodeVersion("v23.10.0"), false);
  assert.equal(isSupportedNodeVersion("v25.0.0"), false);
});

test("normaliza URLs HTTPS e SSH do mesmo repositório", () => {
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

test("remove extensão e sufixo duplicado do artefato", () => {
  assert.equal(normalizeArtifactName("card.component.ts", "component"), "card");
  assert.equal(
    normalizeArtifactName("cards/contact-card.component", "component"),
    "cards/contact-card",
  );
  assert.equal(normalizeArtifactName("auth.service", "service"), "auth");
});

test("rejeita paths absolutos e travessia de diretórios", () => {
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

test("restringe geração ao sourceRoot do app correspondente", () => {
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
  assert.equal(isPathInside(validTarget, context.appSource), true);

  assert.throws(
    () => resolveGeneratorContext(path.join(shellRoot, "tools"), shellRoot),
    /Select a folder or file inside/,
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

test("uses the parent directory when an Explorer file is selected", () => {
  const crmRoot = projectRoot(PROJECTS.crm);
  const selectedFile = path.join(
    crmRoot,
    "apps",
    "crm",
    "src",
    "app",
    "app.ts",
  );

  assert.equal(existsSync(selectedFile), true, "CRM app.ts fixture is missing");
  const context = resolveGeneratorContext(selectedFile);

  assert.equal(context.project.key, "crm");
  assert.equal(context.target, path.dirname(selectedFile));
});

test("agrega códigos de saída de múltiplos projetos", () => {
  assert.equal(aggregateExitCodes([0, 0, 0]), 0);
  assert.equal(aggregateExitCodes([0, 1, 0]), 1);
});

test("workspace referencia somente tasks existentes", async () => {
  const workspaceSource = await readFile(
    path.join(TOOLING_ROOT, "pulso.code-workspace"),
    "utf8",
  );
  const workspace = JSON.parse(workspaceSource.replace(/,\s*([}\]])/g, "$1"));
  const labels = new Set(workspace.tasks.tasks.map((task) => task.label));

  for (const task of workspace.tasks.tasks) {
    for (const dependency of task.dependsOn ?? []) {
      assert.equal(labels.has(dependency), true, `${dependency} não existe`);
    }
  }

  assert.equal(
    JSON.stringify(workspace).includes("nxConsole.nxWorkspacePath"),
    false,
  );

  const commands = workspace.settings["command-runner.commands"];
  assert.deepEqual(Object.keys(commands), [
    "Pulso: Generate Component Here",
    "Pulso: Generate Service Here",
    "Pulso: Generate Guard Here",
    "Pulso: Generate Directive Here",
    "Pulso: Generate Pipe Here",
    "Pulso: Generate Interceptor Here",
    "Pulso: Generate Resolver Here",
  ]);
  for (const command of Object.values(commands)) {
    assert.match(command, /\$\{selectedFile\}/);
    assert.match(command, /generate-selected/);
    assert.doesNotMatch(command, /\$\{input\}/);
  }
  assert.equal(
    workspace.extensions.recommendations.includes(
      "edonet.vscode-command-runner",
    ),
    true,
  );
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
    assert.equal(issues.some((issue) => issue.includes("drift")), true);
    assert.equal(issues.includes("missing CLAUDE.md"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("all Pulso repositories contain required documentation and agent files", async () => {
  const availableRoots = [TOOLING_ROOT, ...PROJECT_LIST.map(projectRoot)].filter(
    (root) => existsSync(root),
  );
  for (const root of availableRoots) {
    const issues = await checkRepositoryAgentConfiguration(root);
    assert.deepEqual(issues, [], `${path.basename(root)}: ${issues.join(", ")}`);
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
