import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fakeDshRunner } from "../core/fake-dsh.js";
import { handleStoreRequest } from "../core/http.js";
import { ISOLATED_PROFILE, isolatedHomeFrom, storeStateDir } from "../core/isolate.js";
import { ensureProfileDir } from "../core/profile-fs.js";
import { createLocalStore } from "../core/store.js";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (dir !== "/") {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

async function main(): Promise<void> {
  const [command, pluginId] = process.argv.slice(2).filter((arg) => arg !== "--");
  const root = repoRoot();
  const dshHome = isolatedHomeFrom(root);
  const profile = ISOLATED_PROFILE;
  ensureProfileDir(dshHome, profile);
  const store = createLocalStore(
    { profile, bundles: [], dependencies: {} },
    () => Date.now(),
    {
      dshHome,
      stateDir: storeStateDir(dshHome, profile),
      allowExec: true,
      runner: fakeDshRunner({
        "dsh-web-notify": { name: "dsh-web-notify", version: "0.1.4", hasBundle: true },
        "@dsh-store/fixture-real-plugin": { name: "@dsh-store/fixture-real-plugin", version: "0.0.1", hasBundle: true },
      }),
    },
  );
  if (command === "init") {
    console.log(JSON.stringify({ dshHome, profile, note: "isolated home only; user ~/.dsh was not used" }, null, 2));
    return;
  }
  if (command === "add") {
    const response = await handleStoreRequest(
      {
        method: "POST",
        path: "/dsh-store/install",
        url: "/dsh-store/install",
        sameOrigin: true,
        body: { pluginId: pluginId ?? "github:renpengfei1027/dsh-web-notify" },
      },
      { profile: store.profile, loopback: true, store },
    );
    console.log(JSON.stringify(response.body, null, 2));
    return;
  }
  if (command === "rollback") {
    const response = await handleStoreRequest(
      {
        method: "POST",
        path: "/dsh-store/rollback",
        url: "/dsh-store/rollback",
        sameOrigin: true,
        body: { confirm: true },
      },
      { profile: store.profile, loopback: true, store },
    );
    console.log(JSON.stringify(response.body, null, 2));
    return;
  }
  console.error("usage: isolate <init|add|rollback> [pluginId]");
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
