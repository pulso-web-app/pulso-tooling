import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeFileExclusive(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const handle = await open(filePath, "wx");
  try {
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }
}

export async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
