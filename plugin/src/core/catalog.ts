import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry, type LoadedRegistry } from "@dsh-store/registry";

export function loadCatalog(): LoadedRegistry {
  try {
    return loadRegistry();
  } catch {
    const snapshot = join(dirname(fileURLToPath(import.meta.url)), "../../data/catalog.json");
    if (!existsSync(snapshot)) throw new Error("DSH Store catalog snapshot is missing");
    return JSON.parse(readFileSync(snapshot, "utf8")) as LoadedRegistry;
  }
}
