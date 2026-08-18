import {
  annotateStarGrowth,
  generateRanking,
  mergeCatalog,
  PUBLIC_BOARDS,
  upsertStarLedger,
  type PluginRecord,
  type RankingSnapshot,
  type StarDaySnapshot,
} from "@dsh-store/registry";
import { collectPublicPlugins, mergeDiscovered } from "@dsh-store/scanner";
import snapshot from "./generated/snapshot.json";
import { handleSite } from "./app.js";
import { memoryReviewStore } from "./reviews.js";
import { setSiteRuntime } from "./runtime.js";

const CATALOG_CACHE = "https://dsh.yibishe.com/__internal/catalog";
const STARS_CACHE = "https://dsh.yibishe.com/__internal/stars";
const RANKINGS_CACHE = "https://dsh.yibishe.com/__internal/rankings";
const reviewStore = memoryReviewStore();

interface StarLedger {
  schemaVersion: 1;
  days: Record<string, StarDaySnapshot>;
}

function headerMap(headers: Headers): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function seedRegistry() {
  return { root: "bundled", ...snapshot.registry };
}

function utcDate(value = new Date().toISOString()): string {
  return value.slice(0, 10);
}

async function cachedJson<T>(url: string): Promise<T | undefined> {
  const hit = await caches.default.match(url);
  if (!hit) return undefined;
  return (await hit.json()) as T;
}

async function putJson(url: string, body: unknown): Promise<void> {
  await caches.default.put(
    url,
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=43200" },
    }),
  );
}

async function cachedPlugins(): Promise<PluginRecord[]> {
  return (await cachedJson<PluginRecord[]>(CATALOG_CACHE)) ?? [];
}

async function cachedLedger(): Promise<StarLedger> {
  return (await cachedJson<StarLedger>(STARS_CACHE)) ?? { schemaVersion: 1, days: {} };
}

async function cachedRankings(): Promise<Record<string, RankingSnapshot>> {
  return (await cachedJson<Record<string, RankingSnapshot>>(RANKINGS_CACHE)) ?? {};
}

function hydrateRegistry(extras: PluginRecord[], ledger: StarLedger) {
  const merged = mergeCatalog(seedRegistry(), extras);
  const today = utcDate();
  const previousDate = Object.keys(ledger.days)
    .filter((day) => day < today)
    .sort()
    .at(-1);
  return {
    ...merged,
    plugins: annotateStarGrowth(merged.plugins, previousDate ? ledger.days[previousDate]?.counts : undefined),
  };
}

async function persistStarsAndRankings(extras: PluginRecord[]): Promise<StarLedger> {
  const now = new Date().toISOString();
  const merged = mergeCatalog(seedRegistry(), extras);
  const ledger = await cachedLedger();
  const updated = upsertStarLedger(ledger.days, merged.plugins, now);
  const nextLedger: StarLedger = { schemaVersion: 1, days: updated.days };
  await putJson(STARS_CACHE, nextLedger);
  const registry = hydrateRegistry(extras, nextLedger);
  const rankings: Record<string, RankingSnapshot> = {};
  for (const board of PUBLIC_BOARDS) {
    rankings[board] = generateRanking(registry, board, now, {
      starDays: {
        current: updated.current.counts,
        previous: updated.previous?.counts,
      },
    });
  }
  await putJson(RANKINGS_CACHE, rankings);
  return nextLedger;
}

async function refreshPublicCatalog(): Promise<PluginRecord[]> {
  const previous = await cachedPlugins();
  const fresh = await collectPublicPlugins();
  const plugins = mergeDiscovered([previous, fresh.plugins]);
  await putJson(CATALOG_CACHE, plugins);
  await persistStarsAndRankings(plugins);
  return plugins;
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    const extras = await cachedPlugins();
    const ledger = await cachedLedger();
    setSiteRuntime({
      registry: hydrateRegistry(extras, ledger),
      rankings: { ...snapshot.rankings, ...(await cachedRankings()) },
    });
    const url = new URL(request.url);
    let body: unknown;
    if (request.method === "POST") {
      const raw = await request.text();
      try {
        body = raw.trim() ? JSON.parse(raw) : {};
      } catch {
        body = { error: "invalid json" };
      }
    }
    const result = await handleSite({
      method: request.method,
      url,
      headers: headerMap(request.headers),
      body,
      reviewStore,
    });
    const today = utcDate();
    if (!extras.length || !ledger.days[today]) {
      ctx.waitUntil(refreshPublicCatalog().catch(() => undefined));
    }
    const payload = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
    return new Response(payload, {
      status: result.status,
      headers: { "content-type": result.type },
    });
  },

  async scheduled(): Promise<void> {
    await refreshPublicCatalog();
  },
};
