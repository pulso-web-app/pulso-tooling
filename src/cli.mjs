#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

import {
  GENERATORS,
  PROJECT_LIST,
  PULSO_ROOT,
  TOOLING_ROOT,
  projectRoot,
} from "./config.mjs";
import {
  aggregateExitCodes,
  isPortAvailable,
  isSupportedNodeVersion,
  npmInvocation,
  normalizeArtifactName,
  repositoryMatches,
  resolveGeneratorContext,
  runCommand,
  selectProjects,
} from "./lib.mjs";

const [, , command, ...args] = process.argv;

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

async function capture(commandName, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, commandArgs, {
      windowsHide: true,
      ...options,
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            stderr.trim() || `${commandName} encerrou com código ${code}`,
          ),
        );
      }
    });
  });
}

async function requireSupportedNode() {
  if (!isSupportedNodeVersion(process.version)) {
    fail(
      `Node ${process.version} não é suportado. Use ^22.22.3, ^24.15.0 ou ^26.0.0.`,
    );
  }
}

async function assertRepository(project) {
  const root = projectRoot(project);
  const origin = await capture("git", [
    "-C",
    root,
    "remote",
    "get-url",
    "origin",
  ]);
  if (!repositoryMatches(origin, project.repository)) {
    fail(
      `${project.folder}: origin inesperado (${origin}). Esperado: ${project.repository}`,
    );
  }
}

async function doctor() {
  await requireSupportedNode();
  const gitVersion = await capture("git", ["--version"]);
  const npm = npmInvocation(["--version"]);
  const npmVersion = await capture(npm.command, npm.args);

  log(`✓ Node ${process.version}`);
  log(`✓ ${npmVersion.startsWith("npm") ? npmVersion : `npm ${npmVersion}`}`);
  log(`✓ ${gitVersion}`);

  let hasError = false;
  for (const project of PROJECT_LIST) {
    const root = projectRoot(project);
    try {
      await access(path.join(root, "package.json"));
      await access(path.join(root, "nx.json"));
      await assertRepository(project);

      const nxBinary = path.join(
        root,
        "node_modules",
        ".bin",
        process.platform === "win32" ? "nx.cmd" : "nx",
      );
      const dependencies = existsSync(nxBinary)
        ? "dependências instaladas"
        : "execute npm run setup";
      const portStatus = (await isPortAvailable(project.port))
        ? `porta ${project.port} livre`
        : `porta ${project.port} em uso`;
      log(`✓ ${project.folder}: ${dependencies}; ${portStatus}`);
    } catch (error) {
      hasError = true;
      log(`✗ ${project.folder}: ${error.message}`);
    }
  }

  if (hasError) {
    process.exitCode = 1;
  }
}

async function setup() {
  await requireSupportedNode();
  await capture("git", ["--version"]);
  const npmVersion = npmInvocation(["--version"]);
  await capture(npmVersion.command, npmVersion.args);

  for (const project of PROJECT_LIST) {
    const root = projectRoot(project);
    if (!existsSync(root)) {
      log(`Clonando ${project.folder}...`);
      const cloneCode = await runCommand(
        "git",
        ["clone", project.repository, project.folder],
        { cwd: PULSO_ROOT },
      );
      if (cloneCode !== 0) {
        fail(`Não foi possível clonar ${project.folder}.`);
      }
    } else {
      await assertRepository(project);
      log(
        `✓ ${project.folder} já existe; nenhum pull ou checkout será executado.`,
      );
    }
  }

  for (const project of PROJECT_LIST) {
    log(`\nInstalando dependências de ${project.folder}...`);
    const npm = npmInvocation(["ci"]);
    const installCode = await runCommand(npm.command, npm.args, {
      cwd: projectRoot(project),
    });
    if (installCode !== 0) {
      fail(`npm ci falhou em ${project.folder}.`);
    }
  }

  log("\nSetup concluído. Execute npm run doctor e npm run open.");
}

function terminateProcessTree(child) {
  if (!child.pid || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

async function runProjectScript(script, selection) {
  const projects = selectProjects(selection);
  const children = projects.map((project) => {
    log(`▶ ${project.folder}: npm run ${script}`);
    const npm = npmInvocation(["run", script]);
    return spawn(npm.command, npm.args, {
      cwd: projectRoot(project),
      stdio: "inherit",
      windowsHide: true,
      detached: process.platform !== "win32",
    });
  });

  const stopAll = () => children.forEach(terminateProcessTree);
  process.once("SIGINT", stopAll);
  process.once("SIGTERM", stopAll);

  const codes = await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve, reject) => {
          child.once("error", reject);
          child.once("exit", (code, signal) =>
            resolve(code ?? (signal ? 1 : 0)),
          );
        }),
    ),
  );

  process.removeListener("SIGINT", stopAll);
  process.removeListener("SIGTERM", stopAll);
  process.exitCode = aggregateExitCodes(codes);
}

async function generate(
  generator,
  rawName,
  targetDirectory,
  workspaceDirectory,
) {
  if (!GENERATORS.includes(generator)) {
    fail(`Generator inválido. Use: ${GENERATORS.join(", ")}.`);
  }

  const name = normalizeArtifactName(rawName, generator);
  const context = resolveGeneratorContext(targetDirectory, workspaceDirectory);
  const nxCli = path.join(
    context.workspace,
    "node_modules",
    "nx",
    "dist",
    "bin",
    "nx.js",
  );

  if (!existsSync(nxCli)) {
    fail(
      `Nx local não encontrado em ${context.project.folder}. Execute npm run setup.`,
    );
  }

  log(`Gerando ${generator} em ${context.target}`);
  const exitCode = await runCommand(
    process.execPath,
    [nxCli, "generate", `@nx/angular:${generator}`, name, "--no-interactive"],
    { cwd: context.target },
  );
  process.exitCode = exitCode;
}

async function openWorkspace() {
  const workspace = path.join(TOOLING_ROOT, "pulso.code-workspace");
  const executable =
    process.platform === "win32" ? process.env.ComSpec : "code";
  const openArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "code", workspace]
      : [workspace];
  const child = spawn(executable, openArgs, {
    cwd: TOOLING_ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  log(`Abrindo ${workspace}`);
}

async function main() {
  switch (command) {
    case "doctor":
      await doctor();
      break;
    case "setup":
      await setup();
      break;
    case "open":
      await openWorkspace();
      break;
    case "run": {
      const [script, selection = "all"] = args;
      if (!script) fail("Uso: cli.mjs run <script> [shell|crm|projects|all]");
      await runProjectScript(script, selection);
      break;
    }
    case "generate": {
      const [generator, name, targetDirectory, workspaceDirectory] = args;
      if (!generator || !name || !targetDirectory || !workspaceDirectory) {
        fail(
          "Uso: cli.mjs generate <generator> <nome> <diretório> <workspace>",
        );
      }
      await generate(generator, name, targetDirectory, workspaceDirectory);
      break;
    }
    default:
      fail("Use setup, doctor, open, run ou generate.");
  }
}

main().catch((error) => {
  process.stderr.write(`\nErro: ${error.message}\n`);
  process.exitCode = 1;
});
