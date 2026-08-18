import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IDENTITY_BOARDS,
  PUBLIC_BOARDS,
  loadCatalog,
  loadPublicReviews,
  loadStarDay,
  previousStarDate,
  recordDailyStars,
  writeRankingSnapshots,
} from "@dsh-store/registry";
import { collectPublicPlugins, type DiscoveryResult } from "./discover.js";
import { discoveryRecord, fromAwesome } from "./adapt.js";
import { assertNotInstallable, deriveTrustState } from "./screen.js";

const fixtures = process.argv.includes("--fixtures");
const generatedAt = new Date().toISOString();

function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "../.."), join(process.cwd(), ".."), process.cwd()];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "registry/plugins"))) return candidate;
  }
  return join(here, "../..");
}

const root = repoRoot();

function githubToken(): string | undefined {
  const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (env) return env;
  try {
    const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

function writeDiscovery(result: DiscoveryResult): void {
  const dayDir = join(root, "data/derived/discovered", result.generatedAt.slice(0, 10));
  const catalogDir = join(root, "data/derived/catalog");
  mkdirSync(dayDir, { recursive: true });
  mkdirSync(catalogDir, { recursive: true });
  writeFileSync(join(catalogDir, "plugins.json"), `${JSON.stringify(result.plugins, null, 2)}\n`);
  writeFileSync(
    join(catalogDir, "meta.json"),
    `${JSON.stringify({ generatedAt: result.generatedAt, sources: result.sources, listed: result.plugins.length, note: result.note }, null, 2)}\n`,
  );
  writeFileSync(join(root, "data/derived/source-counts.json"), `${JSON.stringify({ generatedAt: result.generatedAt, sources: result.sources, note: result.note }, null, 2)}\n`);
  let events = 0;
  for (const plugin of result.plugins.slice(0, 200)) {
    const owner = plugin.id.replace(/^github:/, "").split("/")[0] ?? "unknown";
    const name = plugin.id.replace(/^github:[^/]+\//, "").replace(/#.*$/, "");
    writeFileSync(
      join(dayDir, `${owner}__${name}.json`.replace(/[^A-Za-z0-9._-]/g, "_")),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: result.generatedAt,
          pluginId: plugin.id,
          trustState: plugin.trustState,
          sources: plugin.sources,
          installable: false,
          note: "Derived index only. Never a source of truth for one-click install.",
        },
        null,
        2,
      )}\n`,
    );
    events += 1;
  }
  const recorded = recordDailyStars(loadCatalog().plugins, result.generatedAt);
  const previousDate = previousStarDate(recorded.date);
  writeRankingSnapshots(loadCatalog(), [...PUBLIC_BOARDS, ...IDENTITY_BOARDS], result.generatedAt, {
    reviews: loadPublicReviews(),
    starDays: {
      current: recorded.counts,
      previous: previousDate ? loadStarDay(previousDate)?.counts : undefined,
    },
  });
  console.log(
    `discovered listed=${result.plugins.length} awesome=${result.sources.awesome.count} hub=${result.sources.hub.listed} npm=${result.sources.npm.count} github=${result.sources.githubTopic.count} events=${events} stars=${Object.keys(recorded.counts).length}`,
  );
}

async function main(): Promise<void> {
  if (fixtures) {
    const sample = fromAwesome({
      name: "example-discovered",
      owner: "example",
      url: "https://github.com/example/example-discovered",
    });
    const state = deriveTrustState(sample);
    assertNotInstallable(state);
    const outDir = join(root, "data/derived/discovered", generatedAt.slice(0, 10));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "example__example-discovered.json"), `${JSON.stringify(discoveryRecord(sample, generatedAt), null, 2)}\n`);
    console.log(`wrote fixture discovery into ${outDir}`);
    return;
  }

  const result = await collectPublicPlugins({ githubToken: githubToken(), now: generatedAt });
  for (const plugin of result.plugins) assertNotInstallable(plugin.trustState);
  writeDiscovery(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
