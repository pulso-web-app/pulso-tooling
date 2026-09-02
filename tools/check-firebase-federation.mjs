import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createContext, SourceTextModule } from "node:vm";

const { values } = parseArgs({
  options: { host: { type: "string" }, remote: { type: "string" } },
});
const directoryUrl = (input) => {
  const url = /^https?:/.test(input)
    ? new URL(input)
    : pathToFileURL(`${resolve(input)}/`);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
};
const read = async (url) => {
  if (url.protocol === "file:") return readFile(url, "utf8");
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok)
    throw new Error(`Cannot read build artifact: ${url} (${response.status})`);
  return response.text();
};

async function verify(origins, label) {
  const imports = new Map();
  const entries = [];
  for (const origin of origins) {
    const metadata = JSON.parse(
      await read(new URL("remoteEntry.json", origin)),
    );
    const shared = new Map(
      metadata.shared.map((item) => [
        item.packageName,
        new URL(item.outFileName, origin),
      ]),
    );
    entries.push(shared);
    for (const [name, url] of shared)
      if (!imports.has(name)) imports.set(name, url);
    for (const chunks of Object.values(metadata.chunks ?? {})) {
      for (const chunk of chunks) {
        const key = `@nf-internal/${basename(chunk, ".js")}`;
        if (!imports.has(key)) imports.set(key, new URL(chunk, origin));
      }
    }
  }
  // Force the real failure boundary: App/Auth from Shell, Firestore from CRM.
  for (const name of ["firebase/app", "firebase/auth"])
    assert.ok(entries[0].has(name), `Missing ${name}`);
  const firestoreUrl = entries.at(-1).get("firebase/firestore");
  assert.ok(firestoreUrl, "Missing remote firebase/firestore");
  const context = createContext({
    console,
    URL,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch: () => {
      throw new Error(
        "Firebase network calls are forbidden in this initialization check.",
      );
    },
  });
  context.global = context;
  const modules = new Map();
  const getModule = (url) => {
    const key = url.href;
    if (!modules.has(key))
      modules.set(
        key,
        read(url).then(
          (source) =>
            new SourceTextModule(source, {
              context,
              identifier: key,
              initializeImportMeta: (meta) => {
                meta.url = key;
              },
            }),
        ),
      );
    return modules.get(key);
  };
  const load = async (url) => {
    const module = await getModule(url);
    if (module.status === "unlinked")
      await module.link((specifier, parent) => {
        const target =
          imports.get(specifier) ??
          (specifier.startsWith(".")
            ? new URL(specifier, parent.identifier)
            : null);
        if (!target)
          throw new Error(`Unmapped artifact dependency: ${specifier}`);
        return getModule(target);
      });
    if (module.status !== "evaluated") await module.evaluate();
    return module.namespace;
  };
  const appSdk = await load(entries[0].get("firebase/app"));
  const authSdk = await load(entries[0].get("firebase/auth"));
  const app = appSdk.initializeApp(
    { projectId: "demo-federation-check", apiKey: "unit-test-key" },
    label,
  );
  try {
    const auth = authSdk.getAuth(app);
    const firestoreSdk = await load(firestoreUrl);
    const firestore = firestoreSdk.getFirestore(app);
    assert.equal(auth.app, app);
    assert.equal(firestore.app, app);
    assert.equal(
      firestoreSdk.collection(firestore, "contacts").path,
      "contacts",
    );
    await firestoreSdk.terminate(firestore);
    console.log(
      `${label}: Firebase App, Auth, and Firestore share the same application.`,
    );
  } finally {
    await appSdk.deleteApp(app);
  }
}

const host = directoryUrl(
  values.host ?? "../pulso-shell/dist/apps/shell/browser",
);
const remote = directoryUrl(
  values.remote ?? "../pulso-crm/dist/apps/crm/browser",
);
await verify([host, remote], "Shell + CRM");
await verify([remote], "Standalone CRM");
