import assert from "node:assert/strict";
import test from "node:test";
import { assertValid, canOneClickInstall } from "@dsh-store/protocol";
import { lintRegistry } from "./lint.js";
import { mergeCatalog } from "./catalog.js";
import { loadRegistry } from "./load.js";
import { exportUserPack, lockPack, packInstallAllowed, themeMutexWarning } from "./pack.js";
import { catalogCounts, publicCountsCopy, search } from "./query.js";
import { generateRanking, loadRankingSnapshot, SNAPSHOT_GENERATED_AT } from "./rankings.js";
import { annotateStarGrowth, computeStarGrowth, recordDailyStars } from "./stars.js";

const registry = loadRegistry();

test("seed registry has the required 20-plugin mix", () => {
  assert.equal(registry.plugins.length, 20);
  const states = new Set(registry.plugins.map((plugin) => plugin.trustState));
  for (const required of ["featured", "installable", "screened", "candidate", "review_required", "blocked"]) {
    assert.ok(states.has(required as never), `missing ${required}`);
  }
  assert.ok(registry.plugins.some((plugin) => plugin.sources.includes("curated")));
  assert.ok(registry.plugins.some((plugin) => plugin.sources.includes("discovered")));
  assert.ok(registry.plugins.some((plugin) => plugin.id.includes("#")));
  assert.ok(registry.plugins.some((plugin) => plugin.versions.some((version) => version.hasClient && !version.hasBundle)));
  assert.ok(registry.plugins.some((plugin) => plugin.trustState === "blocked"));
});

test("derived catalog cannot overwrite seed trust or become installable", () => {
  const featured = registry.plugins.find((plugin) => plugin.trustState === "featured");
  assert.ok(featured);
  const merged = mergeCatalog(registry, [
    { ...featured, trustState: "blocked" },
    {
      ...featured,
      id: "github:example/new-discovered",
      trustState: "installable",
      sources: ["discovered"],
    },
  ]);
  assert.equal(merged.plugins.find((plugin) => plugin.id === featured.id)?.trustState, "featured");
  const discovered = merged.plugins.find((plugin) => plugin.id === "github:example/new-discovered");
  assert.equal(discovered?.trustState, "screened");
  assert.equal(canOneClickInstall(discovered?.trustState ?? "blocked"), false);
});

test("registry lint is clean", () => {
  const issues = lintRegistry(registry).filter((issue) => issue.level === "error");
  assert.deepEqual(issues, []);
});

test("capability dictionary keeps official seams versioned and separate from scenes", () => {
  const seams = registry.capabilities.filter((item) => item.layer === "seam");
  assert.equal(seams.length, 56);
  assert.ok(registry.capabilities.some((item) => item.id === "cap.product.vision"));
  assert.ok(registry.capabilities.every((item) => item.layer !== "scene" || !item.annotators?.includes("author")));
});

test("public counts stay disaggregated", () => {
  const counts = catalogCounts(registry, "2026-08-17T05:03:06Z");
  const copy = publicCountsCopy(counts);
  assert.match(copy, /curated=/);
  assert.match(copy, /autoDiscovered=/);
  assert.doesNotMatch(copy, /total=\d+/);
  assert.notEqual(counts.curated + counts.autoDiscovered, counts.listed);
});

test("search keeps scene and awesome category independent", () => {
  const byCategory = search(registry, { category: ["vision"] });
  const byScene = search(registry, { scene: ["cap.scene.we-media"] });
  assert.ok(byCategory.some((item) => item.plugin.id === "github:Anionex/dsh-vision-toolkit"));
  assert.ok(byScene.some((item) => item.plugin.id === "github:renpengfei1027/dsh-web-notify"));
  assert.notDeepEqual(
    byCategory.map((item) => item.plugin.id).sort(),
    byScene.map((item) => item.plugin.id).sort(),
  );
});

test("blocked and candidate plugins never become one-click targets", () => {
  for (const plugin of registry.plugins) {
    if (plugin.trustState === "blocked" || plugin.trustState === "candidate") {
      assert.equal(canOneClickInstall(plugin.trustState), false);
    }
  }
});

test("official community and user packs share the same lockfile schema", () => {
  const official = registry.packs.find((pack) => pack.id === "pack:dsh-store/we-media-starter");
  const community = registry.packs.find((pack) => pack.id === "pack:alice/notify-kit");
  assert.ok(official && community);
  const officialLock = lockPack(registry, official);
  const communityLock = lockPack(registry, community);
  assertValid("pack-lock", officialLock);
  assertValid("pack-lock", communityLock);
  assert.equal(officialLock.entries.find((entry) => entry.pluginId === "github:Anionex/dsh-vision-toolkit")?.role, "alreadyCovered");
  assert.equal(packInstallAllowed(registry, official).allowed, true);
  assert.equal(packInstallAllowed(registry, community).allowed, true);
  const blocked = registry.packs.find((pack) => pack.id === "pack:dsh-store/blocked-ui-demo");
  assert.ok(blocked);
  assert.equal(packInstallAllowed(registry, blocked).allowed, false);
  const tui = registry.packs.find((pack) => pack.id === "pack:dsh-store/terminal-starter");
  assert.ok(tui);
  assert.equal(tui.profileTarget, "headless");
});

test("user share pack strips secrets and local paths", () => {
  const share = exportUserPack({
    publisher: "user",
    slug: "lxyer-web-setup",
    profile: "web",
    entries: [{ pluginId: "github:Anionex/dsh-vision-toolkit", versionId: "npm:@anionex/dsh-vision-toolkit@0.1.18" }],
    registry,
    extras: {
      OPENAI_API_KEY: "sk-test",
      home: "/Users/lxyer/.dsh",
      settings: { token: "abc" },
    },
  });
  assert.equal(share.pack.kind, "user");
  assertValid("pack-lock", share.lock);
  assert.ok(share.strippedKeys.includes("OPENAI_API_KEY"));
  assert.doesNotMatch(JSON.stringify(share.pack), /sk-test|\/Users\/lxyer/);
});

test("theme mutex warns when another theme is already installed", () => {
  const warning = themeMutexWarning(
    registry,
    ["github:AKS1st/dsh-cyber-particle"],
    "github:Tommy00748/dsh-theme-cyberpunk2077",
  );
  assert.match(warning ?? "", /theme mutex/);
});

test("ranking snapshots are materialized and ignore live star edits", () => {
  const snapshot = loadRankingSnapshot("security") ?? generateRanking(registry, "security", SNAPSHOT_GENERATED_AT);
  assert.equal(snapshot.materialized, true);
  const mutated = structuredClone(registry);
  const first = mutated.plugins[0];
  if (first) first.stars = { count: 999999, fetchedAt: "2099-01-01T00:00:00Z", source: "fake" };
  const live = generateRanking(mutated, "stars", "2099-01-01T00:00:00Z");
  const frozen = loadRankingSnapshot("stars");
  if (frozen) {
    assert.equal(frozen.generatedAt, SNAPSHOT_GENERATED_AT);
    assert.notEqual(frozen.items[0]?.stars, 999999);
  }
  assert.equal(live.generatedAt, "2099-01-01T00:00:00Z");
  const rating = generateRanking(registry, "rating");
  assert.equal(rating.closed, true);
  assert.deepEqual(rating.items, []);
});

test("identity boards ignore no-install five-stars and stay materialized", () => {
  const pluginId = "github:renpengfei1027/dsh-web-notify";
  const versionId = "npm:dsh-web-notify@0.1.4";
  const spam = {
    id: "rev_spam",
    pluginId,
    versionId,
    identity: "github:spam",
    identityKind: "github" as const,
    identityCreatedAt: "2020-01-01T00:00:00.000Z",
    dimensions: { works: 5, docs: 5, safety: 5, maintenance: 5, ux: 5 },
    body: "five stars without install",
    createdAt: "2026-08-17T05:03:06.000Z",
    published: true,
    status: "published" as const,
  };
  const evidenced = [1, 2].map((index) => ({
    ...spam,
    id: `rev_ok_${index}`,
    identity: `github:user${index}`,
    installJournalId: `jrnl_0${index}`,
    capabilityFills: ["cap.product.notify"],
    dimensions: { works: 4, docs: 4, safety: 4, maintenance: 4, ux: 4 },
  }));
  const closed = generateRanking(registry, "rating", "2026-08-17T12:00:00Z", { reviews: [spam] });
  assert.equal(closed.closed, true);
  assert.deepEqual(closed.items, []);
  const security = generateRanking(registry, "security", SNAPSHOT_GENERATED_AT, { reviews: [spam, ...evidenced] });
  assert.ok(security.items.every((item) => item.id !== "paid-pin"));
  const rating = generateRanking(registry, "rating", "2026-08-17T12:00:00Z", { reviews: [spam, ...evidenced] });
  assert.equal(rating.closed, undefined);
  assert.equal(rating.materialized, true);
  assert.equal(rating.items[0]?.id, pluginId);
  assert.equal(rating.items[0]?.installWeighted, true);
  const success = generateRanking(registry, "install_success", "2026-08-17T12:00:00Z", { reviews: [spam] });
  assert.equal(success.closed, true);
});

test("star growth ranks absolute daily delta and stays closed without two days", () => {
  const plugin = registry.plugins.find((item) => item.stars?.count != null) ?? registry.plugins[0];
  assert.ok(plugin);
  const closed = generateRanking(registry, "star_growth", "2026-08-17T00:00:00Z", {
    starDays: { current: { [plugin.id]: plugin.stars?.count ?? 10 } },
  });
  assert.equal(closed.closed, true);
  assert.deepEqual(closed.items, []);
  const board = generateRanking(registry, "star_growth", "2026-08-18T00:00:00Z", {
    starDays: {
      current: { [plugin.id]: 120 },
      previous: { [plugin.id]: 100 },
    },
  });
  assert.equal(board.closed, undefined);
  assert.equal(board.items[0]?.id, plugin.id);
  assert.equal(board.items[0]?.delta, 20);
  assert.equal(board.items[0]?.previousStars, 100);
  const growth = computeStarGrowth({ a: 12, b: 5, c: 3 }, { a: 10, b: 5, c: 8 });
  assert.deepEqual(
    growth.map((item) => item.pluginId),
    ["a"],
  );
});

test("search sort star_growth uses the daily ledger delta", () => {
  const withStars = registry.plugins.filter((plugin) => typeof plugin.stars?.count === "number");
  const fastest = withStars[0];
  assert.ok(fastest);
  const previous = Object.fromEntries(withStars.map((plugin) => [plugin.id, plugin.stars?.count ?? 0]));
  previous[fastest.id] = (fastest.stars?.count ?? 0) - 50;
  const plugins = annotateStarGrowth(registry.plugins, previous);
  const results = search({ ...registry, plugins }, { sort: "star_growth" });
  assert.equal(results[0]?.plugin.id, fastest.id);
  assert.equal(results[0]?.plugin.stars?.delta, 50);
});

test("daily star ledger keeps thirty days and overwrites the same date", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "dsh-stars-"));
  try {
    const plugin = registry.plugins[0];
    assert.ok(plugin);
    recordDailyStars([{ ...plugin, stars: { count: 1, fetchedAt: "2026-07-01T00:00:00Z", source: "test" } }], "2026-07-01T00:00:00Z", root);
    recordDailyStars([{ ...plugin, stars: { count: 3, fetchedAt: "2026-08-17T00:00:00Z", source: "test" } }], "2026-08-17T00:00:00Z", root);
    const again = recordDailyStars([{ ...plugin, stars: { count: 4, fetchedAt: "2026-08-17T12:00:00Z", source: "test" } }], "2026-08-17T12:00:00Z", root);
    assert.equal(again.counts[plugin.id], 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
