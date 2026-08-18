import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.js";
import type {
  CapabilityRecord,
  LoadedRegistry,
  PackRecord,
  PassportRecord,
  PluginRecord,
} from "./types.js";

export function defaultRegistryRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../data/registry"),
    join(here, "../../../registry"),
    join(process.cwd(), "registry"),
    join(process.cwd(), "../../registry"),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "plugins"))) return candidate;
  }
  throw new Error("cannot locate registry/ directory");
}

function readYamlDir<T>(dir: string): T[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".json"))
    .sort()
    .flatMap((name) => {
      const text = readFileSync(join(dir, name), "utf8");
      const parsed = name.endsWith(".json") ? JSON.parse(text) : parseYaml(text);
      return (Array.isArray(parsed) ? parsed : [parsed]) as T[];
    });
}

export function loadRegistry(root = defaultRegistryRoot()): LoadedRegistry {
  return {
    root,
    plugins: readYamlDir<PluginRecord>(join(root, "plugins")),
    packs: readYamlDir<PackRecord>(join(root, "packs")),
    passports: readYamlDir<PassportRecord>(join(root, "passports")),
    capabilities: readYamlDir<CapabilityRecord>(join(root, "capabilities")),
    candidates: readYamlDir<PluginRecord>(join(root, "candidates")),
  };
}
