#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "../../registry");
const dest = join(root, "data/registry");
if (!existsSync(join(source, "plugins"))) {
  throw new Error(`bundle-registry: missing ${source}`);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
cpSync(source, dest, { recursive: true });
process.stdout.write(`bundle-registry: copied ${source} -> ${dest}\n`);
