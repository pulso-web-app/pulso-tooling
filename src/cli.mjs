#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

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
import {
  checkRepositoryAgentConfiguration,
  syncRepositorySkills,
} from "./agents.mjs";

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
            stderr.trim() || `${commandName} exited with code ${code}`,
          ),
        );
      }
    });
  });
}

async function requireSupportedNode() {
  if (!isSupportedNodeVersion(process.version)) {
    fail(
      `Node ${process.version} is not supported. Use ^22.22.3, ^24.15.0, or ^26.0.0.`,
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
      `${project.folder}: unexpected origin (${origin}). Expected: ${project.repository}`,
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
        ? "dependencies installed"
        : "run npm run setup";
      const portStatus = (await isPortAvailable(project.port))
        ? `port ${project.port} available`
        : `port ${project.port} in use`;
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
      log(`Cloning ${project.folder}...`);
      const cloneCode = await runCommand(
        "git",
        ["clone", project.repository, project.folder],
        { cwd: PULSO_ROOT },
      );
      if (cloneCode !== 0) {
        fail(`Could not clone ${project.folder}.`);
      }
    } else {
      await assertRepository(project);
      log(
        `✓ ${project.folder} already exists; no pull or checkout will be performed.`,
      );
    }
  }

  for (const project of PROJECT_LIST) {
    log(`\nInstalling dependencies for ${project.folder}...`);
    const npm = npmInvocation(["ci"]);
    const installCode = await runCommand(npm.command, npm.args, {
      cwd: projectRoot(project),
    });
    if (installCode !== 0) {
      fail(`npm ci failed for ${project.folder}.`);
    }
  }

  log("\nSetup complete. Run npm run doctor and npm run open.");
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

async function runProjectScriptSequentially(script, selection) {
  const codes = [];
  for (const project of selectProjects(selection)) {
    log(`▶ ${project.folder}: npm run ${script}`);
    const npm = npmInvocation(["run", script]);
    codes.push(
      await runCommand(npm.command, npm.args, { cwd: projectRoot(project) }),
    );
    if (codes.at(-1) !== 0) break;
  }
  process.exitCode = aggregateExitCodes(codes);
}

async function generate(
  generator,
  rawName,
  targetDirectory,
  workspaceDirectory,
) {
  if (!GENERATORS.includes(generator)) {
    fail(`Unsupported generator. Use: ${GENERATORS.join(", ")}.`);
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
      `Local Nx was not found in ${context.project.folder}. Run npm run setup.`,
    );
  }

  log(`Generating ${generator} in ${context.target}`);
  const exitCode = await runCommand(
    process.execPath,
    [nxCli, "generate", `@nx/angular:${generator}`, name, "--no-interactive"],
    { cwd: context.target },
  );
  process.exitCode = exitCode;
}

async function generateFromSelectedResource(generator, targetDirectory) {
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let name;
  try {
    name = await prompt.question(
      `Artifact name for ${generator} (supports subfolder/name): `,
    );
  } finally {
    prompt.close();
  }

  await generate(generator, name, targetDirectory);
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
  log(`Opening ${workspace}`);
}

function availableRepositoryRoots() {
  return [
    TOOLING_ROOT,
    ...PROJECT_LIST.map(projectRoot).filter((root) => existsSync(root)),
  ];
}

async function manageAgents(action) {
  const repositories = availableRepositoryRoots();
  if (action === "sync") {
    for (const root of repositories) {
      const skills = await syncRepositorySkills(root);
      log(`✓ ${path.basename(root)}: synced ${skills.length} Pulso skill(s)`);
    }
    return;
  }

  if (action === "check") {
    let hasError = false;
    for (const root of repositories) {
      const issues = await checkRepositoryAgentConfiguration(root);
      if (issues.length) {
        hasError = true;
        log(`✗ ${path.basename(root)}: ${issues.join("; ")}`);
      } else {
        log(`✓ ${path.basename(root)}: agent configuration is synchronized`);
      }
    }
    if (hasError) process.exitCode = 1;
    return;
  }

  fail("Usage: cli.mjs agent <sync|check>");
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
      if (!script) {
        fail("Usage: cli.mjs run <script> [shell|crm|projects|all]");
      }
      await runProjectScript(script, selection);
      break;
    }
    case "run-sequential": {
      const [script, selection = "all"] = args;
      if (!script) {
        fail("Usage: cli.mjs run-sequential <script> [shell|crm|projects|all]");
      }
      await runProjectScriptSequentially(script, selection);
      break;
    }
    case "generate": {
      const [generator, name, targetDirectory, workspaceDirectory] = args;
      if (!generator || !name || !targetDirectory) {
        fail(
          "Usage: cli.mjs generate <generator> <name> <selected-path> [workspace]",
        );
      }
      await generate(generator, name, targetDirectory, workspaceDirectory);
      break;
    }
    case "generate-selected": {
      const [generator, targetDirectory] = args;
      if (!generator || !targetDirectory) {
        fail(
          "Usage: cli.mjs generate-selected <generator> <selected-path>",
        );
      }
      await generateFromSelectedResource(generator, targetDirectory);
      break;
    }
    case "agent": {
      const [action] = args;
      await manageAgents(action);
      break;
    }
    default:
      fail(
        "Use setup, doctor, open, run, run-sequential, generate, generate-selected, or agent.",
      );
  }
}

main().catch((error) => {
  process.stderr.write(`\nError: ${error.message}\n`);
  process.exitCode = 1;
});
