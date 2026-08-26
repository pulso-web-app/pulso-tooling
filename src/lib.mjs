import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { GENERATORS, PROJECT_LIST, PROJECTS, projectRoot } from "./config.mjs";

export function parseVersion(version) {
  const match = String(version)
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid Node version: ${version}`);
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
    throw new Error(`Unsupported generator: ${generator}`);
  }

  const value = String(rawName ?? "")
    .trim()
    .replaceAll("\\", "/");
  if (!value) {
    throw new Error("Enter an artifact name.");
  }

  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    throw new Error("Use a name or relative path, never an absolute path.");
  }

  const segments = value.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error('The name cannot contain empty, ".", or ".." segments.');
  }

  let fileName = segments.at(-1).replace(/\.ts$/i, "");
  const suffix = new RegExp(`\\.${generator}$`, "i");
  fileName = fileName.replace(suffix, "");

  if (!fileName) {
    throw new Error("The artifact name is empty after normalization.");
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

export function resolveSelectedTarget(targetPath) {
  const selected = path.resolve(targetPath);

  try {
    return statSync(selected).isFile() ? path.dirname(selected) : selected;
  } catch {
    // Nx can create a missing final directory from a valid logical name.
    return selected;
  }
}

export function resolveGeneratorContext(targetDirectory, workspaceDirectory) {
  const selected = path.resolve(targetDirectory);
  const target = resolveSelectedTarget(selected);

  let project;
  let workspace;

  if (workspaceDirectory) {
    workspace = path.resolve(workspaceDirectory);
    project = PROJECT_LIST.find(
      (entry) => path.resolve(projectRoot(entry)) === workspace,
    );
  } else {
    project = PROJECT_LIST.find((entry) =>
      isPathInside(selected, projectRoot(entry)),
    );
    workspace = project ? path.resolve(projectRoot(project)) : undefined;
  }

  if (!project || !workspace) {
    throw new Error(
      "The selected resource does not belong to pulso-shell, pulso-crm, or pulso-projects.",
    );
  }

  const appSource = path.join(
    workspace,
    "apps",
    project.nxProject,
    "src",
    "app",
  );

  if (isPathInside(target, appSource)) {
    return {
      project,
      target,
      workspace,
      sourceRoot: appSource,
      sourceKind: "app",
      appSource,
    };
  }

  const librariesRoot = path.join(workspace, "libs");
  if (isPathInside(target, librariesRoot)) {
    let candidate = target;

    while (isPathInside(candidate, librariesRoot)) {
      const isLibrarySourceRoot =
        path.basename(candidate) === "lib" &&
        path.basename(path.dirname(candidate)) === "src";

      if (isLibrarySourceRoot) {
        const libraryRoot = path.dirname(path.dirname(candidate));
        if (existsSync(path.join(libraryRoot, "project.json"))) {
          return {
            project,
            target,
            workspace,
            sourceRoot: candidate,
            sourceKind: "library",
            appSource,
          };
        }
      }

      const parent = path.dirname(candidate);
      if (parent === candidate) break;
      candidate = parent;
    }
  }

  throw new Error(
    `Select a folder or file inside apps/${project.nxProject}/src/app or an Nx library's src/lib before generating an artifact.`,
  );
}

export function aggregateExitCodes(codes) {
  return codes.every((code) => code === 0) ? 0 : 1;
}

export function aggregateChildEnvironment(environment = process.env) {
  const childEnvironment = { ...environment };
  delete childEnvironment.NO_COLOR;
  return childEnvironment;
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
      `Invalid project: ${selection}. Use shell, crm, projects, or all.`,
    );
  }

  return [project];
}
