import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultRegistryRoot } from "./load.js";

export function defaultDerivedRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../data/derived"),
    join(process.cwd(), "data/derived"),
    join(process.cwd(), "../../data/derived"),
  ];
  for (const candidate of candidates) {
    if (
      existsSync(join(candidate, "rankings")) ||
      existsSync(join(candidate, "reviews")) ||
      existsSync(join(candidate, "stars"))
    ) {
      return candidate;
    }
  }
  return join(defaultRegistryRoot(), "../data/derived");
}
