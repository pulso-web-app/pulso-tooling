import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TOOLING_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const PULSO_ROOT = path.dirname(TOOLING_ROOT);

export const REGISTRY_PATH = path.join(TOOLING_ROOT, "pulso.repositories.json");

export function readRepositoryRegistry(registryPath = REGISTRY_PATH) {
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  if (registry.version !== 1 || !Array.isArray(registry.repositories)) {
    throw new Error("pulso.repositories.json must use registry version 1.");
  }
  const keys = new Set();
  const ports = new Set();
  for (const repository of registry.repositories) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(repository.key)) {
      throw new Error(`Invalid repository key: ${repository.key}`);
    }
    if (keys.has(repository.key) || ports.has(repository.port)) {
      throw new Error(`Duplicate repository key or port: ${repository.key}`);
    }
    keys.add(repository.key);
    ports.add(repository.port);
  }
  return registry;
}

export const REPOSITORY_REGISTRY = readRepositoryRegistry();
export const PROJECT_LIST = Object.freeze(
  REPOSITORY_REGISTRY.repositories.map((project) => Object.freeze(project)),
);
export const PROJECTS = Object.freeze(
  Object.fromEntries(PROJECT_LIST.map((project) => [project.key, project])),
);

export const GENERATORS = Object.freeze([
  "component",
  "service",
  "guard",
  "directive",
  "pipe",
  "interceptor",
  "resolver",
]);

export function projectRoot(project) {
  return path.join(PULSO_ROOT, project.folder);
}
