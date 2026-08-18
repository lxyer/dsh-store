import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultDerivedRoot } from "./derived.js";
import type { PluginRecord } from "./types.js";

export interface StarDaySnapshot {
  date: string;
  generatedAt: string;
  schemaVersion: 1;
  counts: Record<string, number>;
}

export interface StarGrowth {
  pluginId: string;
  current: number;
  previous: number;
  delta: number;
  rate: number | null;
}

const KEEP_DAYS = 30;

export function utcDate(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}

export function starsDir(derivedRoot = defaultDerivedRoot()): string {
  return join(derivedRoot, "stars");
}

export function starCountsFrom(plugins: PluginRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const plugin of plugins) {
    if (typeof plugin.stars?.count === "number") counts[plugin.id] = plugin.stars.count;
  }
  return counts;
}

export function loadStarDay(date: string, derivedRoot = defaultDerivedRoot()): StarDaySnapshot | undefined {
  const file = join(starsDir(derivedRoot), `${date}.json`);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as StarDaySnapshot;
}

export function listStarDays(derivedRoot = defaultDerivedRoot()): string[] {
  const dir = starsDir(derivedRoot);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();
}

export function previousStarDate(date: string, derivedRoot = defaultDerivedRoot()): string | undefined {
  return listStarDays(derivedRoot).filter((item) => item < date).at(-1);
}

export function upsertStarLedger(
  days: Record<string, StarDaySnapshot>,
  plugins: PluginRecord[],
  generatedAt = new Date().toISOString(),
): { days: Record<string, StarDaySnapshot>; current: StarDaySnapshot; previous?: StarDaySnapshot } {
  const date = generatedAt.slice(0, 10);
  const current: StarDaySnapshot = {
    date,
    generatedAt,
    schemaVersion: 1,
    counts: starCountsFrom(plugins),
  };
  const merged = { ...days, [date]: current };
  const kept = Object.keys(merged)
    .sort()
    .slice(-KEEP_DAYS);
  const next: Record<string, StarDaySnapshot> = {};
  for (const key of kept) next[key] = merged[key]!;
  const previousDate = Object.keys(next)
    .filter((item) => item < date)
    .sort()
    .at(-1);
  return { days: next, current, previous: previousDate ? next[previousDate] : undefined };
}

export function recordDailyStars(
  plugins: PluginRecord[],
  generatedAt = new Date().toISOString(),
  derivedRoot = defaultDerivedRoot(),
): StarDaySnapshot {
  const existing: Record<string, StarDaySnapshot> = {};
  for (const day of listStarDays(derivedRoot)) {
    const snapshot = loadStarDay(day, derivedRoot);
    if (snapshot) existing[day] = snapshot;
  }
  const { days, current } = upsertStarLedger(existing, plugins, generatedAt);
  const dir = starsDir(derivedRoot);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${current.date}.json`), `${JSON.stringify(current)}\n`);
  for (const day of listStarDays(derivedRoot)) {
    if (!days[day]) unlinkSync(join(dir, `${day}.json`));
  }
  return current;
}

export function computeStarGrowth(
  current: Record<string, number>,
  previous?: Record<string, number>,
): StarGrowth[] {
  if (!previous) return [];
  return Object.entries(current)
    .map(([pluginId, count]) => {
      const before = previous[pluginId];
      if (typeof before !== "number") return undefined;
      const delta = count - before;
      return {
        pluginId,
        current: count,
        previous: before,
        delta,
        rate: before > 0 ? Number((delta / before).toFixed(4)) : null,
      };
    })
    .filter((item): item is StarGrowth => item != null && item.delta > 0)
    .sort((left, right) => right.delta - left.delta || (right.rate ?? 0) - (left.rate ?? 0));
}

export function annotateStarGrowth(plugins: PluginRecord[], previous?: Record<string, number>): PluginRecord[] {
  if (!previous) return plugins;
  return plugins.map((plugin) => {
    const current = plugin.stars?.count;
    const before = previous[plugin.id];
    if (typeof current !== "number" || typeof before !== "number") return plugin;
    return {
      ...plugin,
      stars: {
        ...plugin.stars,
        count: current,
        fetchedAt: plugin.stars?.fetchedAt ?? new Date().toISOString(),
        source: plugin.stars?.source ?? "daily-star-ledger",
        previousCount: before,
        delta: current - before,
      },
    };
  });
}

export function loadStarGrowth(date = utcDate(), derivedRoot = defaultDerivedRoot()): StarGrowth[] {
  const current = loadStarDay(date, derivedRoot);
  const previousDate = previousStarDate(date, derivedRoot);
  const previous = previousDate ? loadStarDay(previousDate, derivedRoot) : undefined;
  return computeStarGrowth(current?.counts ?? {}, previous?.counts);
}
