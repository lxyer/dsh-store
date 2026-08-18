import assert from "node:assert/strict";
import test from "node:test";
import { classifyActivation, compareImmutableVersions, restartAllowed } from "./activation.js";
import { diagnose, recommend } from "./diagnose.js";
import { handleStoreRequest } from "./http.js";
import { assertNoSettingsSection, SETTINGS_TABS } from "./ids.js";
import { planInstall } from "./install-plan.js";
import { loadCatalog } from "./catalog.js";
import { createLocalStore } from "./store.js";

const webProfile = {
  profile: "web",
  bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@anionex/dsh-vision-toolkit"],
  dependencies: { "@anionex/dsh-vision-toolkit": "0.1.18" },
  loaderIds: ["@anionex/dsh-vision-toolkit"],
};

test("activation four-state matrix", () => {
  assert.equal(
    classifyActivation(webProfile, {
      packageName: "@anionex/dsh-vision-toolkit",
      expectedPackageName: "@anionex/dsh-vision-toolkit",
      hasBundle: true,
      hasClient: true,
      expectedBundle: true,
    }).state,
    "live",
  );
  assert.equal(
    classifyActivation(webProfile, {
      packageName: "@anionex/dsh-vision-toolkit",
      expectedPackageName: "@anionex/dsh-vision-toolkit",
      hasBundle: true,
      hasClient: true,
      expectedBundle: true,
      patchNeedsRestart: true,
    }).state,
    "restart",
  );
  assert.equal(
    classifyActivation(
      { ...webProfile, dependencies: { "@dsh-store/fixture-client-only": "0.0.1" } },
      {
        packageName: "@dsh-store/fixture-client-only",
        expectedPackageName: "@dsh-store/fixture-client-only",
        hasBundle: false,
        hasClient: true,
        expectedBundle: false,
      },
    ).state,
    "inert",
  );
  assert.equal(
    classifyActivation(webProfile, {
      packageName: "dsh-web-ui",
      expectedPackageName: "@dsh-store/fixture-real-plugin",
      hasBundle: true,
      hasClient: false,
      expectedBundle: true,
      packageNameMismatch: true,
    }).state,
    "broken",
  );
});

test("minimumReleaseAge same version is unchanged", () => {
  assert.equal(compareImmutableVersions("npm:dshmarket@1.10.1", "npm:dshmarket@1.10.1"), "unchanged");
});

test("desktop hides restart", () => {
  assert.equal(restartAllowed({ ...webProfile, desktopProfiles: true }, true), false);
  assert.equal(restartAllowed(webProfile, true), true);
});

test("local diagnosis does not recommend a second vision plugin", () => {
  const result = recommend({ profile: "web", bundles: webProfile.bundles, providerMisconfigured: ["xai"] });
  assert.ok(result.alreadyCovered.some((item) => item.capability === "cap.product.vision"));
  assert.ok(result.rejectedAlternatives.some((item) => item.reason === "capability_already_covered"));
  assert.ok(result.warnings.some((item) => item.includes("xai")));
  assert.ok(!result.items.some((item) => item.fills.includes("cap.product.vision")));
});

test("blocked plugin has no install plan", () => {
  const registry = loadCatalog();
  const blocked = registry.plugins.find((plugin) => plugin.id === "github:linxin666/dsh-web-ui-all");
  assert.ok(blocked);
  assert.equal(planInstall(blocked, "web").allowed, false);
});

test("UI contract registers only settings.plugins.tab", () => {
  assertNoSettingsSection(SETTINGS_TABS.map((tab) => ({ slot: "settings.plugins.tab", id: tab.id })));
  assert.throws(() => assertNoSettingsSection([{ slot: "settings.section", id: "store" }]));
});

test("open deep link does not install", async () => {
  const response = await handleStoreRequest(
    {
      method: "GET",
      path: "/dsh-store/open",
      url: "/dsh-store/open?target=plugin:github:Anionex/dsh-vision-toolkit&version=npm:@anionex/dsh-vision-toolkit@0.1.18",
    },
    { profile: webProfile, loopback: true },
  );
  assert.equal(response.status, 200);
  assert.equal((response.body as { installed: boolean }).installed, false);
});

test("local golden diagnosis matches the documented first honest recommendation", () => {
  const result = diagnose({ profile: "web", bundles: webProfile.bundles });
  assert.deepEqual(
    result.alreadyCovered.map((item) => item.capability),
    ["cap.product.vision"],
  );
  assert.ok(result.missing.includes("cap.product.notify"));
});

test("installed route reports four-state from a fake profile", async () => {
  const response = await handleStoreRequest(
    { method: "GET", path: "/dsh-store/installed", url: "/dsh-store/installed" },
    { profile: webProfile, loopback: true },
  );
  assert.equal(response.status, 200);
  const items = (response.body as { items: Array<{ packageName: string; activation: { state: string } }> }).items;
  const vision = items.find((item) => item.packageName === "@anionex/dsh-vision-toolkit");
  assert.equal(vision?.activation.state, "live");
});

test("install and rollback stay in-memory and never claim to write $DSH_HOME", async () => {
  const store = createLocalStore(webProfile);
  const install = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/install",
      url: "/dsh-store/install",
      sameOrigin: true,
      body: { pluginId: "github:renpengfei1027/dsh-web-notify" },
    },
    { profile: webProfile, loopback: true, store },
  );
  assert.equal(install.status, 202);
  assert.equal((install.body as { mutatesHome: boolean }).mutatesHome, false);
  assert.ok(store.profile.bundles.includes("dsh-web-notify"));
  const rollback = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/rollback",
      url: "/dsh-store/rollback",
      sameOrigin: true,
      body: { confirm: true },
    },
    { profile: webProfile, loopback: true, store },
  );
  assert.equal(rollback.status, 202);
  assert.ok(!store.profile.bundles.includes("dsh-web-notify"));
});

test("prepare package waits for an explicit allowBuilds key", async () => {
  const store = createLocalStore(webProfile);
  const first = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/install",
      url: "/dsh-store/install",
      sameOrigin: true,
      body: { pluginId: "github:dsh-store/fixture-monorepo#packages/real-plugin" },
    },
    { profile: webProfile, loopback: true, store },
  );
  assert.equal((first.body as { stage: string }).stage, "awaiting_build_approval");
  assert.ok(!store.profile.bundles.includes("@dsh-store/fixture-real-plugin"));
});

test("status reports a stall after 15 seconds without a new stage", async () => {
  let now = 1_000;
  const store = createLocalStore(webProfile, () => now);
  await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/install",
      url: "/dsh-store/install",
      sameOrigin: true,
      body: { pluginId: "github:dsh-store/fixture-monorepo#packages/real-plugin" },
    },
    { profile: webProfile, loopback: true, store },
  );
  now += 16_000;
  const status = await handleStoreRequest(
    { method: "GET", path: "/dsh-store/status", url: "/dsh-store/status" },
    { profile: webProfile, loopback: true, store },
  );
  assert.equal((status.body as { stalled: boolean }).stalled, true);
});

test("backup strips secrets and local reviews stay unpublished", async () => {
  const store = createLocalStore(webProfile);
  const backup = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/backup",
      url: "/dsh-store/backup",
      sameOrigin: true,
      body: { includeSettings: true },
    },
    { profile: webProfile, loopback: true, store },
  );
  assert.match(JSON.stringify(backup.body), /confirmExportSettings/);
  const rejected = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/reviews",
      url: "/dsh-store/reviews",
      sameOrigin: true,
      body: { pluginId: "github:Anionex/dsh-vision-toolkit", body: "great" },
    },
    { profile: webProfile, loopback: true, store },
  );
  assert.equal(rejected.status, 400);
  const draft = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/reviews",
      url: "/dsh-store/reviews",
      sameOrigin: true,
      body: {
        pluginId: "github:Anionex/dsh-vision-toolkit",
        versionId: "npm:@anionex/dsh-vision-toolkit@0.1.18",
        dimensions: { works: 5 },
        body: "live on web",
      },
    },
    { profile: webProfile, loopback: true, store },
  );
  assert.equal(draft.status, 201);
  assert.equal((draft.body as { published: boolean }).published, false);
});

test("TUI plugin refuses silent web install", () => {
  const registry = loadCatalog();
  const tui = registry.plugins.find((plugin) => plugin.id === "github:huiliyi37/dsh-tianshu-tui");
  assert.ok(tui);
  assert.equal(planInstall(tui, "web").allowed, false);
  assert.equal(planInstall(tui, "web").profile, "headless");
});

test("same-origin is required for mutating routes", async () => {
  const response = await handleStoreRequest(
    {
      method: "POST",
      path: "/dsh-store/install",
      url: "/dsh-store/install",
      sameOrigin: false,
      body: { pluginId: "github:renpengfei1027/dsh-web-notify" },
    },
    { profile: webProfile, loopback: true },
  );
  assert.equal(response.status, 403);
});
