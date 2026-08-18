import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultDerivedRoot } from "./derived.js";
import { loadRegistry } from "./load.js";
import { annotateStarGrowth, loadStarDay, previousStarDate, utcDate } from "./stars.js";
import type { LoadedRegistry, PluginRecord } from "./types.js";

export function clampDiscoveredTrust(plugin: PluginRecord): PluginRecord {
  if (plugin.trustState === "installable" || plugin.trustState === "featured") {
    return { ...plugin, trustState: "screened" };
  }
  return plugin;
}

export function mergeCatalog(base: LoadedRegistry, extras: PluginRecord[]): LoadedRegistry {
  const map = new Map(base.plugins.map((plugin) => [plugin.id, plugin]));
  for (const raw of extras) {
    const plugin = clampDiscoveredTrust(raw);
    if (!plugin.id.startsWith("github:")) continue;
    if (map.has(plugin.id)) continue;
    map.set(plugin.id, plugin);
  }
  return { ...base, plugins: [...map.values()] };
}

export function loadDerivedPlugins(derivedRoot = defaultDerivedRoot()): PluginRecord[] {
  const file = join(derivedRoot, "catalog", "plugins.json");
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as PluginRecord[];
}

export function loadCatalog(root?: string): LoadedRegistry {
  const merged = mergeCatalog(loadRegistry(root), loadDerivedPlugins());
  const prior = previousStarDate(utcDate());
  return {
    ...merged,
    plugins: annotateStarGrowth(merged.plugins, prior ? loadStarDay(prior)?.counts : undefined),
  };
}
