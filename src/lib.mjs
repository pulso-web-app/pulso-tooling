import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

import { GENERATORS, PROJECT_LIST, PROJECTS, projectRoot } from "./config.mjs";

export function parseVersion(version) {
  const match = String(version)
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Versão inválida do Node: ${version}`);
  }

  return match.slice(1).map(Number);
}

export function isSupportedNodeVersion(version) {
  const [major, minor, patch] = parseVersion(version);

  if (major === 22) {
    return minor > 22 || (minor === 22 && patch >= 3);
  }

  if (major === 24) {
    return minor > 15 || (minor === 15 && patch >= 0);
  }

  return major === 26;
}

export function normalizeRepositoryUrl(url) {
  return String(url)
    .trim()
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
    .replace(/\/$/, "")
    .replace(/\.git$/, "")
    .toLowerCase();
}

export function repositoryMatches(actual, expected) {
  return normalizeRepositoryUrl(actual) === normalizeRepositoryUrl(expected);
}

export function normalizeArtifactName(rawName, generator) {
  if (!GENERATORS.includes(generator)) {
    throw new Error(`Generator não suportado: ${generator}`);
  }

  const value = String(rawName ?? "")
    .trim()
    .replaceAll("\\", "/");
  if (!value) {
    throw new Error("Informe o nome do artefato.");
  }

  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    throw new Error(
      "Use um nome ou caminho relativo, nunca um caminho absoluto.",
    );
  }

  const segments = value.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error('O nome não pode conter segmentos vazios, "." ou "..".');
  }

  let fileName = segments.at(-1).replace(/\.ts$/i, "");
  const suffix = new RegExp(`\\.${generator}$`, "i");
  fileName = fileName.replace(suffix, "");

  if (!fileName) {
    throw new Error("O nome do artefato ficou vazio após a normalização.");
  }

  return [...segments.slice(0, -1), fileName].join("/");
}

export function isPathInside(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function resolveGeneratorContext(targetDirectory, workspaceDirectory) {
  const workspace = path.resolve(workspaceDirectory);
  const target = path.resolve(targetDirectory);
  const project = PROJECT_LIST.find(
    (entry) => path.resolve(projectRoot(entry)) === workspace,
  );

  if (!project) {
    throw new Error(
      "O arquivo ativo não pertence a pulso-shell, pulso-crm ou pulso-projects.",
    );
  }

  const appSource = path.join(
    workspace,
    "apps",
    project.nxProject,
    "src",
    "app",
  );

  if (!isPathInside(target, appSource)) {
    throw new Error(
      `Abra um arquivo dentro de apps/${project.nxProject}/src/app antes de gerar o artefato.`,
    );
  }

  return { project, target, workspace, appSource };
}

export function aggregateExitCodes(codes) {
  return codes.every((code) => code === 0) ? 0 : 1;
}

export function commandForPlatform(command) {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

export function npmInvocation(args = []) {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, ...args],
    };
  }

  return {
    command: commandForPlatform("npm"),
    args,
  };
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      windowsHide: true,
      ...options,
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

export function selectProjects(selection) {
  if (selection === "all") {
    return PROJECT_LIST;
  }

  const project = PROJECTS[selection];
  if (!project) {
    throw new Error(
      `Projeto inválido: ${selection}. Use shell, crm, projects ou all.`,
    );
  }

  return [project];
}
