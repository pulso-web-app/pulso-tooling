import path from "node:path";
import { fileURLToPath } from "node:url";

export const TOOLING_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const PULSO_ROOT = path.dirname(TOOLING_ROOT);

export const PROJECTS = Object.freeze({
  shell: Object.freeze({
    key: "shell",
    folder: "pulso-shell",
    nxProject: "shell",
    e2eProject: "shell-e2e",
    port: 4200,
    repository: "https://github.com/pulso-web-app/pulso-shell.git",
  }),
  crm: Object.freeze({
    key: "crm",
    folder: "pulso-crm",
    nxProject: "crm",
    e2eProject: "crm-e2e",
    port: 4201,
    repository: "https://github.com/pulso-web-app/pulso-crm.git",
  }),
  projects: Object.freeze({
    key: "projects",
    folder: "pulso-projects",
    nxProject: "projects",
    e2eProject: "projects-e2e",
    port: 4202,
    repository: "https://github.com/pulso-web-app/pulso-projects.git",
  }),
});

export const PROJECT_LIST = Object.freeze(Object.values(PROJECTS));

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
