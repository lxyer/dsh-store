import { parseSearchParams } from "@dsh-store/protocol";
import { catalogCounts, lockPack, publicCountsCopy, publicDownload, search } from "@dsh-store/registry";
import { renderBadge } from "./render.js";
import { fileReviewStore, listPublicReviews, type ReviewStore } from "./reviews.js";
import { siteRanking, siteRegistry } from "./runtime.js";

function pluginPath(pathname: string): { id: string; leaf?: string } | undefined {
  if (!pathname.startsWith("/api/v1/plugins/")) return undefined;
  const rest = decodeURIComponent(pathname.slice("/api/v1/plugins/".length));
  const parts = rest.split("/");
  if (parts.length >= 3 && ["versions", "reviews", "download"].includes(parts[parts.length - 1] ?? "")) {
    return { id: parts.slice(0, -1).join("/"), leaf: parts[parts.length - 1] };
  }
  return { id: rest };
}

function packPath(pathname: string): { id: string; leaf?: string } | undefined {
  if (!pathname.startsWith("/api/v1/packs/")) return undefined;
  const rest = decodeURIComponent(pathname.slice("/api/v1/packs/".length));
  const parts = rest.split("/");
  if (parts[parts.length - 1] === "lock") return { id: parts.slice(0, -1).join("/"), leaf: "lock" };
  return { id: rest };
}

export function apiResponse(
  pathname: string,
  searchParams: URLSearchParams,
  options: { reviewStore?: ReviewStore } = {},
): { status: number; body: unknown; type?: string } | null {
  const registry = siteRegistry();
  const generatedAt = catalogCounts(registry).generatedAt;
  const reviewStore = options.reviewStore ?? fileReviewStore();

  if (pathname === "/api/v1/status" || pathname === "/api/v1/status/") {
    const counts = catalogCounts(registry);
    return {
      status: 200,
      body: {
        generatedAt,
        schemaVersion: 1,
        scannerVersion: 2,
        counts,
        countsCopy: publicCountsCopy(counts),
        note: "Do not add curated + autoDiscovered + listed together.",
      },
    };
  }

  if (pathname === "/api/v1/plugins" || pathname === "/plugins.json") {
    const results = search(registry, parseSearchParams(searchParams));
    return {
      status: 200,
      body: {
        generatedAt,
        schemaVersion: 1,
        count: results.length,
        plugins: results.map((item) => ({
          id: item.plugin.id,
          title: item.plugin.title,
          trustState: item.plugin.trustState,
          sources: item.plugin.sources,
          awesomeCategory: item.plugin.awesomeCategory ?? null,
          scenes: item.plugin.scenes ?? [],
          versionId: item.version?.id ?? null,
          stars: item.plugin.stars ?? null,
        })),
      },
    };
  }

  const pluginRoute = pluginPath(pathname);
  if (pluginRoute) {
    const plugin = registry.plugins.find((item) => item.id === pluginRoute.id);
    if (!plugin) return { status: 404, body: { error: "not found" } };
    if (pluginRoute.leaf === "versions") return { status: 200, body: { generatedAt, schemaVersion: 1, versions: plugin.versions } };
    if (pluginRoute.leaf === "reviews") {
      const versionId = searchParams.get("versionId") ?? undefined;
      return {
        status: 200,
        body: {
          generatedAt,
          schemaVersion: 1,
          reviews: listPublicReviews(reviewStore, pluginRoute.id, versionId),
          note: "public reviews require identity; they never change passports",
        },
      };
    }
    if (pluginRoute.leaf === "download") return { status: 200, body: publicDownload(plugin) };
    return { status: 200, body: { generatedAt, schemaVersion: 1, plugin } };
  }

  if (pathname === "/api/v1/packs") {
    return { status: 200, body: { generatedAt, schemaVersion: 1, packs: registry.packs } };
  }

  const packRoute = packPath(pathname);
  if (packRoute) {
    const pack = registry.packs.find((item) => item.id === packRoute.id);
    if (!pack) return { status: 404, body: { error: "not found" } };
    if (packRoute.leaf === "lock") return { status: 200, body: { generatedAt, schemaVersion: 1, lock: lockPack(registry, pack) } };
    return { status: 200, body: { generatedAt, schemaVersion: 1, pack, lock: lockPack(registry, pack) } };
  }

  if (pathname.startsWith("/api/v1/passports/")) {
    const id = decodeURIComponent(pathname.slice("/api/v1/passports/".length));
    const passport = registry.passports.find((item) => item.id === id);
    return passport ? { status: 200, body: { generatedAt, schemaVersion: 1, passport } } : { status: 404, body: { error: "not found" } };
  }

  if (pathname === "/api/v1/capabilities") {
    return { status: 200, body: { generatedAt, schemaVersion: 1, capabilities: registry.capabilities } };
  }

  if (pathname === "/api/v1/reviews" || pathname === "/api/v1/reviews/") {
    return {
      status: 200,
      body: {
        generatedAt,
        schemaVersion: 1,
        reviews: listPublicReviews(reviewStore, searchParams.get("pluginId") ?? undefined, searchParams.get("versionId") ?? undefined),
        note: "public reviews require identity; they never change passports",
      },
    };
  }

  if (pathname.startsWith("/api/v1/rankings/")) {
    const board = pathname.slice("/api/v1/rankings/".length);
    const snapshot = siteRanking(board);
    return snapshot
      ? { status: 200, body: snapshot }
      : { status: 404, body: { error: "no materialized snapshot", board } };
  }

  if (pathname === "/api/v1/badge") {
    const id = searchParams.get("id") ?? "";
    const plugin = registry.plugins.find((item) => item.id === id);
    if (!plugin) return { status: 404, body: { error: "not found" } };
    return { status: 200, body: renderBadge(plugin), type: "image/svg+xml; charset=utf-8" };
  }

  return null;
}
