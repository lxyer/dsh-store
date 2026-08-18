#!/usr/bin/env node
/**
 * Official DSH web loads plugin clients as classic scripts.
 * Executing the file must register a factory via window.__ModuleLoader__.load
 * with the boot-graph id (the package name, no /client suffix).
 * tsc emits ESM; this wrap is the served client half.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientPath = path.join(root, "dist/client/index.js");
const idsPath = path.join(root, "dist/core/ids.js");
const PACKAGE_ID = "@dsh-store/plugin";

if (!fs.existsSync(clientPath)) {
  throw new Error("wrap-client: missing dist/client/index.js; run tsc first");
}

const original = fs.readFileSync(clientPath, "utf8");
const alreadyWrapped =
  original.includes("window.__ModuleLoader__.load") && original.includes(`id: "${PACKAGE_ID}"`);
if (alreadyWrapped) {
  if (/^\s*import\s/m.test(original) || /^\s*export\s/m.test(original)) {
    throw new Error("wrap-client: existing ModuleLoader bundle still contains leftover ESM");
  }
  process.stdout.write("wrap-client: already a ModuleLoader bundle\n");
  process.exit(0);
}

const { SETTINGS_TABS } = await import(pathToFileURL(idsPath).href);

let body = original
  .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"react";\s*/m, "")
  .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"\.\.\/core\/ids\.js";\s*/m, "")
  .replace(/^\s*export const name = .+;\s*/m, "")
  .replace(/^\s*export const inject = /m, "const inject = ")
  .replace(/^\s*export function apply/m, "function apply")
  .replace(/^\s*export \{[^}]+\};\s*/m, "")
  .replace(/\n\/\/# sourceMappingURL=.*$/m, "")
  .trim();

if (/^\s*import\s/m.test(body) || /^\s*export\s/m.test(body)) {
  throw new Error("wrap-client: leftover ESM import/export in client body");
}
if (!body.includes("function apply") || !body.includes("const inject")) {
  throw new Error("wrap-client: expected apply() and inject in client body");
}

const bundle = [
  "window.__ModuleLoader__.load({",
  `\tid: "${PACKAGE_ID}",`,
  "\tfactory: (require) => {",
  "\t\tvar module = { exports: {} };",
  "\t\tvar exports = module.exports;",
  '\t\tconst { createElement, useEffect, useMemo, useState } = require("react");',
  `\t\tconst SETTINGS_TABS = ${JSON.stringify(SETTINGS_TABS)};`,
  body,
  "\t\texports.apply = apply;",
  "\t\texports.inject = inject;",
  "\t\treturn module.exports;",
  "\t}",
  "});",
  "",
].join("\n");

fs.writeFileSync(clientPath, bundle);
process.stdout.write(`wrap-client: wrote dist/client/index.js (${bundle.length} bytes)\n`);
