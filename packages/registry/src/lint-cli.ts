import { assertLintClean, lintRegistry } from "./lint.js";
import { loadRegistry } from "./load.js";

const registry = loadRegistry();
const issues = lintRegistry(registry);
for (const issue of issues) {
  console[issue.level === "error" ? "error" : "warn"](`${issue.level.toUpperCase()} ${issue.file}: ${issue.message}`);
}
assertLintClean(issues);
console.log(
  `registry ok: ${registry.plugins.length} plugins, ${registry.packs.length} packs, ${registry.passports.length} passports, ${registry.capabilities.length} capabilities`,
);
