import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PROJECTS, TOOLING_ROOT, projectRoot } from "../src/config.mjs";
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
    /não pode conter/,
  );
  assert.throws(
    () => normalizeArtifactName("C:\\temp\\card", "component"),
    /absoluto/,
  );
  assert.throws(
    () => normalizeArtifactName("/tmp/card", "component"),
    /absoluto/,
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
    /Abra um arquivo dentro/,
  );
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
});
