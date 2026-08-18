import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listRankingBoards, loadCatalog, loadRankingSnapshot, type PluginRecord } from "@dsh-store/registry";

function compactPlugin(plugin: PluginRecord): PluginRecord {
  const version = plugin.versions[0];
  return {
    schemaVersion: 1,
    id: plugin.id,
    publisher: plugin.publisher,
    npmName: plugin.npmName,
    title: plugin.title,
    description: {
      zh: plugin.description.zh.slice(0, 240),
      en: plugin.description.en.slice(0, 240),
    },
    fetchedAt: plugin.fetchedAt,
    awesomeCategory: plugin.awesomeCategory,
    trustState: plugin.trustState,
    sources: plugin.sources,
    stars: plugin.stars,
    repository: plugin.repository,
    license: plugin.license,
    defaultVersionId: version?.id,
    versions: version
      ? [
          {
            id: version.id,
            pluginId: plugin.id,
            releasedAt: version.releasedAt,
            compatibility: version.compatibility,
            installTarget: {
              pluginId: plugin.id,
              versionId: version.id,
              packageName: version.installTarget.packageName,
              subpath: null,
              profile: "web",
              requiresBuildPermission: false,
              expectedBundle: false,
            },
          },
        ]
      : [],
  };
}

const registry = loadCatalog();
const rankings = Object.fromEntries(
  listRankingBoards().map((board) => [board, loadRankingSnapshot(board)]).filter(([, snapshot]) => snapshot),
);
const out = join(dirname(fileURLToPath(import.meta.url)), "../src/generated/snapshot.json");
mkdirSync(dirname(out), { recursive: true });
const body = {
  registry: {
    plugins: registry.plugins.map(compactPlugin),
    packs: registry.packs,
    passports: registry.passports,
    capabilities: registry.capabilities,
    candidates: registry.candidates,
  },
  rankings,
};
writeFileSync(out, `${JSON.stringify(body)}\n`);
console.log(`wrote ${out} plugins=${body.registry.plugins.length}`);
