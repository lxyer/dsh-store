import { canOneClickInstall, type SearchQuery } from "@dsh-store/protocol";
import type {
  CatalogCounts,
  LoadedRegistry,
  PassportRecord,
  PluginRecord,
  SearchDocument,
} from "./types.js";

export function defaultVersion(plugin: PluginRecord) {
  const match = plugin.versions.find((version) => version.id === plugin.defaultVersionId);
  const version = match ?? plugin.versions[0];
  if (!version) {
    throw new Error(`plugin ${plugin.id} has no versions`);
  }
  return version;
}

export function passportFor(registry: LoadedRegistry, versionId: string): PassportRecord | undefined {
  return registry.passports.find((passport) => passport.versionId === versionId);
}

export function search(registry: LoadedRegistry, query: SearchQuery): SearchDocument[] {
  const documents = registry.plugins.map((plugin) => {
    const version = defaultVersion(plugin);
    return {
      plugin,
      version,
      passport: version ? passportFor(registry, version.id) : undefined,
    } satisfies SearchDocument;
  });

  return documents
    .filter((document) => matches(document, query))
    .sort((left, right) => compare(left, right, query.sort ?? "relevance"));
}

function matches(document: SearchDocument, query: SearchQuery): boolean {
  const { plugin, version, passport } = document;
  if (query.q) {
    const haystack = [
      plugin.id,
      plugin.npmName ?? "",
      plugin.title.zh,
      plugin.title.en,
      plugin.description.zh,
      plugin.description.en,
      plugin.publisher,
      ...(plugin.aliases ?? []),
      ...(version?.capabilityClaims ?? []),
    ]
      .join("\n")
      .toLowerCase();
    if (!haystack.includes(query.q.toLowerCase())) return false;
  }
  if (query.category?.length && !query.category.includes(plugin.awesomeCategory ?? "")) return false;
  if (query.scene?.length && !query.scene.some((scene) => plugin.scenes?.includes(scene))) return false;
  if (query.capability?.length) {
    const claims = version?.capabilityClaims ?? [];
    if (!query.capability.some((capability) => claims.includes(capability))) return false;
  }
  if (query.trustState?.length && !query.trustState.includes(plugin.trustState)) return false;
  if (query.profile && query.profile !== "any") {
    const profiles = version?.compatibility.profiles ?? [];
    if (!profiles.includes(query.profile as never) && !profiles.includes("any")) return false;
  }
  if (query.source?.length && !query.source.some((source) => plugin.sources.includes(source as never))) {
    return false;
  }
  if (query.risk?.length) {
    const risk = riskOf(passport);
    if (!query.risk.includes(risk)) return false;
  }
  return true;
}

function riskOf(passport?: PassportRecord): "low" | "medium" | "high" | "unknown" {
  if (!passport) return "unknown";
  if (passport.findings.some((finding) => finding.severity === "high") || passport.trustState === "blocked") {
    return "high";
  }
  if (passport.findings.some((finding) => finding.severity === "medium") || passport.lifecycleScripts.length) {
    return "medium";
  }
  return "low";
}

function compare(left: SearchDocument, right: SearchDocument, sort: string): number {
  if (sort === "stars") return (right.plugin.stars?.count ?? 0) - (left.plugin.stars?.count ?? 0);
  if (sort === "star_growth") return (right.plugin.stars?.delta ?? 0) - (left.plugin.stars?.delta ?? 0);
  if (sort === "new") return (right.plugin.fetchedAt ?? "").localeCompare(left.plugin.fetchedAt ?? "");
  if (sort === "capability_fill") {
    return (right.version?.capabilityClaims?.length ?? 0) - (left.version?.capabilityClaims?.length ?? 0);
  }
  const rank = (plugin: PluginRecord) => {
    if (plugin.trustState === "featured") return 0;
    if (canOneClickInstall(plugin.trustState)) return 1;
    if (plugin.trustState === "blocked") return 9;
    return 5;
  };
  return rank(left.plugin) - rank(right.plugin) || (right.plugin.stars?.count ?? 0) - (left.plugin.stars?.count ?? 0);
}

export function catalogCounts(registry: LoadedRegistry, generatedAt = new Date().toISOString()): CatalogCounts {
  const byAwesomeCategory: Record<string, number> = {};
  const byScene: Record<string, number> = {};
  for (const plugin of registry.plugins) {
    if (plugin.awesomeCategory) {
      byAwesomeCategory[plugin.awesomeCategory] = (byAwesomeCategory[plugin.awesomeCategory] ?? 0) + 1;
    }
    for (const scene of plugin.scenes ?? []) {
      byScene[scene] = (byScene[scene] ?? 0) + 1;
    }
  }
  const count = (state: PluginRecord["trustState"]) =>
    registry.plugins.filter((plugin) => plugin.trustState === state).length;
  return {
    generatedAt,
    schemaVersion: 1,
    curated: registry.plugins.filter((plugin) => plugin.sources.includes("curated")).length,
    autoDiscovered: registry.plugins.filter((plugin) => plugin.sources.includes("discovered")).length,
    authorPr: registry.plugins.filter((plugin) => plugin.sources.includes("author_pr")).length,
    installable: count("installable"),
    featured: count("featured"),
    blocked: count("blocked"),
    screened: count("screened"),
    candidate: count("candidate") + registry.candidates.length,
    reviewRequired: count("review_required"),
    listed: registry.plugins.length,
    byAwesomeCategory,
    byScene,
  };
}

export function publicCountsCopy(counts: CatalogCounts): string {
  return [
    `curated=${counts.curated}`,
    `autoDiscovered=${counts.autoDiscovered}`,
    `installable=${counts.installable}`,
    `blocked=${counts.blocked}`,
    `listed=${counts.listed}`,
  ].join(" · ");
}
