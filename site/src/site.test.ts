import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchParams, searchHref } from "@dsh-store/protocol";
import { loadRegistry, search } from "@dsh-store/registry";
import { apiResponse } from "./api.js";
import { renderHome, renderOpen, renderPlugin, renderSearch } from "./render.js";

const registry = loadRegistry();

test("API status keeps source counts separate", () => {
  const response = apiResponse("/api/v1/status", new URLSearchParams());
  assert.ok(response);
  const body = response.body as { counts: { curated: number; autoDiscovered: number; listed: number }; note: string };
  assert.match(body.note, /Do not add/);
  assert.notEqual(body.counts.curated + body.counts.autoDiscovered, body.counts.listed);
});

test("blocked plugin pages have no install button", () => {
  const blocked = registry.plugins.find((plugin) => plugin.id === "github:openma-ai/deepseek-harness-tui");
  assert.ok(blocked);
  const html = renderPlugin(registry, blocked);
  assert.match(html, /没有安装按钮/);
  assert.doesNotMatch(html, /一键安装/);
});

test("search query is reproducible and does not mix scene with category", () => {
  const href = searchHref({ category: ["vision"], scene: ["cap.scene.we-media"], sort: "stars" });
  const query = parseSearchParams(new URL(href, "https://store.dsh.dev").searchParams);
  const html = renderSearch(registry, query);
  assert.match(html, /category=vision/);
  assert.match(html, /scene=cap.scene.we-media/);
  const categoryHits = search(registry, { category: ["vision"] }).map((item) => item.plugin.id);
  const sceneHits = search(registry, { scene: ["cap.scene.we-media"] }).map((item) => item.plugin.id);
  assert.notDeepEqual([...categoryHits].sort(), [...sceneHits].sort());
});

test("featured vision plugin exposes a locked command rather than cloud install", () => {
  const plugin = registry.plugins.find((item) => item.id === "github:Anionex/dsh-vision-toolkit");
  assert.ok(plugin);
  const html = renderPlugin(registry, plugin);
  assert.match(html, /网站不会替你安装/);
  assert.match(html, /@anionex\/dsh-vision-toolkit@0\.1\.18/);
  assert.match(html, /兼容矩阵/);
  assert.doesNotMatch(html, /云端替你安装/);
});

test("open page never pretends the plugin is already installed", () => {
  const html = renderOpen("plugin:github:Anionex/dsh-vision-toolkit", "npm:@anionex/dsh-vision-toolkit@0.1.18");
  assert.match(html, /不安装/);
  assert.match(html, /不会假装已安装/);
  assert.doesNotMatch(html, /假装已经装好|安装成功/);
});

test("search form and home expose the star growth board", () => {
  assert.match(renderHome(registry), /value="star_growth"/);
  const html = renderSearch(registry, { sort: "star_growth" });
  assert.match(html, /name="sort"/);
  assert.match(html, /value="star_growth" selected/);
  assert.match(html, /data-search-panel/);
  assert.match(html, /class="search-query"/);
  assert.match(html, /class="search-filters"/);
});

test("home regions stay visually distinct and language can switch", () => {
  const zh = renderHome(registry, "zh");
  const en = renderHome(registry, "en");
  assert.match(zh, /data-region="search"/);
  assert.match(zh, /data-region="counts"/);
  assert.match(zh, /data-region="featured"/);
  assert.match(zh, /lang="zh-CN"/);
  assert.match(en, /lang="en"/);
  assert.match(en, /The site discovers/);
  assert.match(en, /href="\/\?lang=en"/);
  assert.match(en, />EN<\/a>/);
  assert.match(zh, /data-lang-switch/);
});

test("rankings and reviews stay snapshot-only on the public API", () => {
  const ranking = apiResponse("/api/v1/rankings/security", new URLSearchParams());
  assert.ok(ranking);
  assert.equal((ranking.body as { materialized: boolean }).materialized, true);
  const growth = apiResponse("/api/v1/rankings/star_growth", new URLSearchParams());
  if (growth) {
    assert.equal((growth.body as { board: string; materialized: boolean }).board, "star_growth");
    assert.equal((growth.body as { materialized: boolean }).materialized, true);
  }
  const reviews = apiResponse("/api/v1/plugins/github:Anionex/dsh-vision-toolkit/reviews", new URLSearchParams());
  assert.ok(reviews);
  assert.deepEqual((reviews.body as { reviews: unknown[] }).reviews, []);
  assert.match((reviews.body as { note: string }).note, /identity/);
  const pack = apiResponse("/api/v1/packs/pack:dsh-store/we-media-starter", new URLSearchParams());
  assert.ok(pack);
  assert.equal((pack.body as { lock: { lockVersion: number } }).lock.lockVersion, 1);
});
