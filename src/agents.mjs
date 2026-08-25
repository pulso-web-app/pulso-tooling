import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

const SKILL_NAME = /^pulso-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHANGE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIRROR_ROOTS = [path.join(".claude", "skills"), path.join(".github", "skills")];

async function directories(root) {
  if (!existsSync(root)) return [];
  return (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function filesRecursively(root, relative = "") {
  const current = path.join(root, relative);
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await filesRecursively(root, child)));
    if (entry.isFile()) files.push(child.replaceAll("\\", "/"));
  }

  return files;
}

export async function directoryHash(root) {
  const hash = createHash("sha256");
  for (const relative of await filesRecursively(root)) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(path.join(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function discoverCanonicalSkills(repositoryRoot) {
  const skillsRoot = path.join(repositoryRoot, ".agents", "skills");
  const names = (await directories(skillsRoot)).filter((name) => SKILL_NAME.test(name));
  const result = [];

  for (const name of names) {
    const root = path.join(skillsRoot, name);
    if (!existsSync(path.join(root, "SKILL.md"))) {
      throw new Error(`${name} is missing SKILL.md`);
    }
    result.push({ name, root });
  }

  return result;
}

export async function syncRepositorySkills(repositoryRoot) {
  const canonical = await discoverCanonicalSkills(repositoryRoot);
  const canonicalNames = new Set(canonical.map((skill) => skill.name));

  for (const relativeMirror of MIRROR_ROOTS) {
    const mirrorRoot = path.join(repositoryRoot, relativeMirror);
    await mkdir(mirrorRoot, { recursive: true });

    for (const name of (await directories(mirrorRoot)).filter((entry) => SKILL_NAME.test(entry))) {
      if (!canonicalNames.has(name)) {
        await rm(path.join(mirrorRoot, name), { recursive: true, force: true });
      }
    }

    for (const skill of canonical) {
      const target = path.join(mirrorRoot, skill.name);
      await rm(target, { recursive: true, force: true });
      await cp(skill.root, target, { recursive: true });
    }
  }

  return canonical.map((skill) => skill.name);
}

export async function checkRepositoryAgentConfiguration(repositoryRoot) {
  const issues = [];
  for (const required of [
    "README.md",
    "AGENTS.md",
    "CLAUDE.md",
    "CONTRIBUTING.md",
    path.join("docs", "architecture.md"),
    path.join(".github", "copilot-instructions.md"),
    path.join(".github", "pull_request_template.md"),
  ]) {
    if (!existsSync(path.join(repositoryRoot, required))) issues.push(`missing ${required}`);
  }

  const canonical = await discoverCanonicalSkills(repositoryRoot);
  for (const skill of canonical) {
    const expectedHash = await directoryHash(skill.root);
    for (const relativeMirror of MIRROR_ROOTS) {
      const target = path.join(repositoryRoot, relativeMirror, skill.name);
      if (!existsSync(target)) {
        issues.push(`missing ${path.join(relativeMirror, skill.name)}`);
      } else if ((await stat(target)).isDirectory() && (await directoryHash(target)) !== expectedHash) {
        issues.push(`drift in ${path.join(relativeMirror, skill.name)}`);
      }
    }
  }

  for (const relativeMirror of MIRROR_ROOTS) {
    const canonicalNames = new Set(canonical.map((skill) => skill.name));
    for (const name of (await directories(path.join(repositoryRoot, relativeMirror))).filter((entry) => SKILL_NAME.test(entry))) {
      if (!canonicalNames.has(name)) issues.push(`orphan mirror ${path.join(relativeMirror, name)}`);
    }
  }

  return issues;
}

export function validateCrossRepositoryChangeId(changeId, repositoryRoots) {
  if (!CHANGE_ID.test(changeId)) {
    throw new Error(`Invalid change ID: ${changeId}. Use kebab-case.`);
  }

  const missing = repositoryRoots.filter(
    (root) => !existsSync(path.join(root, "openspec", "changes", changeId)),
  );
  if (missing.length) {
    throw new Error(`Change ${changeId} is missing from: ${missing.join(", ")}`);
  }
  return true;
}
