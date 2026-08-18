import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fakeDshRunner } from "./fake-dsh.js";
import { handleStoreRequest } from "./http.js";
import { assertSafeExec, canExec, defaultUserDshHome, ISOLATED_PROFILE } from "./isolate.js";
import { loadJournalEntries } from "./persist.js";
import { readProfileSnapshot } from "./profile-fs.js";
import { createLocalStore } from "./store.js";

const isolatedProfile = { profile: ISOLATED_PROFILE, bundles: [] as string[], dependencies: {} as Record<string, string> };

test("refuses the user's current $DSH_HOME and web profile", () => {
  assert.throws(() => assertSafeExec({ dshHome: defaultUserDshHome(), profile: ISOLATED_PROFILE }), /user's current \$DSH_HOME/);
  assert.throws(() => assertSafeExec({ dshHome: join(tmpdir(), "dsh-store-isolated-home"), profile: "web" }), /current web profile/);
  assert.equal(canExec({ dshHome: defaultUserDshHome(), profile: ISOLATED_PROFILE, allowExec: true }).allowed, false);
});

test("journal and download packs persist outside the user home", async () => {
  const root = mkdtempSync(join(tmpdir(), "dsh-store-state-"));
  const store = createLocalStore(isolatedProfile, () => Date.now(), { stateDir: root });
  const install = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/install",
      url: "/dsh-store/install",
      sameOrigin: true,
      body: { pluginId: "github:renpengfei1027/dsh-web-notify" },
    },
    { profile: isolatedProfile, loopback: true, store },
  );
  assert.equal((install.body as { persisted: boolean }).persisted, true);
  assert.equal((install.body as { mutatesHome: boolean }).mutatesHome, false);
  const files = loadJournalEntries(root);
  assert.equal(files.length, 1);
  assert.equal(files[0]?.persisted, true);
  const download = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/download",
      url: "/dsh-store/download",
      sameOrigin: true,
      body: { pluginId: "github:Anionex/dsh-vision-toolkit" },
    },
    { profile: isolatedProfile, loopback: true, store },
  );
  const written = (download.body as { written: { dir: string; files: string[] } }).written;
  assert.ok(written.dir.startsWith(root));
  assert.ok(existsSync(join(written.dir, "install-command.txt")));
  assert.match(readFileSync(join(written.dir, "install-command.txt"), "utf8"), /@anionex\/dsh-vision-toolkit@0\.1\.18/);
  assert.doesNotMatch(written.dir, /\.dsh\/profiles\/web/);
});

test("isolated fake dsh plugin add writes the profile and rolls back from disk", async () => {
  const dshHome = mkdtempSync(join(tmpdir(), "dsh-store-home-"));
  const stateDir = join(dshHome, "profiles", ISOLATED_PROFILE, ".dsh-store");
  const runner = fakeDshRunner({
    "dsh-web-notify": { name: "dsh-web-notify", version: "0.1.4", hasBundle: true },
  });
  const store = createLocalStore(isolatedProfile, () => Date.now(), {
    stateDir,
    dshHome,
    allowExec: true,
    runner,
  });
  const install = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/install",
      url: "/dsh-store/install",
      sameOrigin: true,
      body: { pluginId: "github:renpengfei1027/dsh-web-notify" },
    },
    { profile: isolatedProfile, loopback: true, store },
  );
  assert.equal(install.status, 202);
  assert.equal((install.body as { accepted: boolean }).accepted, true);
  const after = readProfileSnapshot(dshHome, ISOLATED_PROFILE);
  assert.ok(after.bundles.includes("dsh-web-notify"));
  const rollback = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/rollback",
      url: "/dsh-store/rollback",
      sameOrigin: true,
      body: { confirm: true },
    },
    { profile: isolatedProfile, loopback: true, store },
  );
  assert.equal(rollback.status, 202);
  const restored = readProfileSnapshot(dshHome, ISOLATED_PROFILE);
  assert.ok(!restored.bundles.includes("dsh-web-notify"));
  assert.ok(loadJournalEntries(stateDir).length >= 2);
});

test("blocked plugins never reach the isolated executor", async () => {
  let ran = false;
  const store = createLocalStore(isolatedProfile, () => Date.now(), {
    dshHome: mkdtempSync(join(tmpdir(), "dsh-store-home-")),
    allowExec: true,
    runner: {
      async run(argv) {
        ran = true;
        return { code: 0, stdout: "", stderr: "", argv };
      },
    },
  });
  const response = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/install",
      url: "/dsh-store/install",
      sameOrigin: true,
      body: { pluginId: "github:linxin666/dsh-web-ui-all" },
    },
    { profile: isolatedProfile, loopback: true, store },
  );
  assert.equal(response.status, 409);
  assert.equal(ran, false);
});
