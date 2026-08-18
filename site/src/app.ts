import { parseLang, parseSearchParams } from "@dsh-store/protocol";
import { apiResponse } from "./api.js";
import {
  renderDocs,
  renderHome,
  renderOpen,
  renderPack,
  renderPacks,
  renderPassport,
  renderPlugin,
  renderPublisher,
  renderRankings,
  renderSearch,
  renderSubmit,
} from "./render.js";
import { fileReviewStore, reportPublicReview, submitPublicReview, type ReviewStore } from "./reviews.js";
import { siteRegistry } from "./runtime.js";

export interface SiteRequest {
  method: string;
  url: URL;
  headers: Record<string, string | undefined>;
  body?: unknown;
  reviewStore?: ReviewStore;
}

export interface SiteResponse {
  status: number;
  body: unknown;
  type: string;
}

export async function handleSite(req: SiteRequest): Promise<SiteResponse> {
  const reviewStore = req.reviewStore ?? fileReviewStore();
  const registry = siteRegistry();
  const lang = parseLang(req.url.searchParams.get("lang"));

  if (req.method === "POST" && req.url.pathname === "/api/v1/reviews") {
    if (req.body && typeof req.body === "object" && "error" in req.body && (req.body as { error: string }).error === "invalid json") {
      return { status: 400, body: { error: "invalid json" }, type: "application/json" };
    }
    const result = submitPublicReview({
      registry,
      headers: req.headers,
      body: req.body,
      store: reviewStore,
      rematerialize: reviewStore !== req.reviewStore,
    });
    return { status: result.status, body: result.body, type: "application/json; charset=utf-8" };
  }

  const reportMatch = /^\/api\/v1\/reviews\/([^/]+)\/report$/.exec(req.url.pathname);
  if (req.method === "POST" && reportMatch) {
    const result = reportPublicReview({
      reviewId: decodeURIComponent(reportMatch[1] ?? ""),
      body: req.body,
      store: reviewStore,
    });
    return { status: result.status, body: result.body, type: "application/json; charset=utf-8" };
  }

  if (req.method !== "GET") {
    return {
      status: 405,
      body: { error: "public write APIs are closed except identity reviews" },
      type: "application/json",
    };
  }

  const api = apiResponse(req.url.pathname, req.url.searchParams, { reviewStore });
  if (api) {
    return { status: api.status, body: api.body, type: api.type ?? "application/json; charset=utf-8" };
  }

  if (req.url.pathname === "/") return { status: 200, body: renderHome(registry, lang), type: "text/html; charset=utf-8" };
  if (req.url.pathname === "/search") {
    return { status: 200, body: renderSearch(registry, parseSearchParams(req.url.searchParams), lang), type: "text/html; charset=utf-8" };
  }
  if (req.url.pathname === "/packs") return { status: 200, body: renderPacks(registry, lang), type: "text/html; charset=utf-8" };
  if (req.url.pathname.startsWith("/packs/")) {
    return {
      status: 200,
      body: renderPack(registry, decodeURIComponent(req.url.pathname.slice("/packs/".length)), lang),
      type: "text/html; charset=utf-8",
    };
  }
  if (req.url.pathname.startsWith("/plugins/")) {
    const id = decodeURIComponent(req.url.pathname.slice("/plugins/".length));
    const plugin = registry.plugins.find((item) => item.id === id);
    return {
      status: plugin ? 200 : 404,
      body: plugin ? renderPlugin(registry, plugin, reviewStore, lang) : "<h1>not found</h1>",
      type: "text/html; charset=utf-8",
    };
  }
  if (req.url.pathname.startsWith("/passports/")) {
    return {
      status: 200,
      body: renderPassport(registry, decodeURIComponent(req.url.pathname.slice("/passports/".length)), lang),
      type: "text/html; charset=utf-8",
    };
  }
  if (req.url.pathname.startsWith("/rankings/")) {
    return {
      status: 200,
      body: renderRankings(registry, req.url.pathname.slice("/rankings/".length), lang),
      type: "text/html; charset=utf-8",
    };
  }
  if (req.url.pathname.startsWith("/publishers/")) {
    return {
      status: 200,
      body: renderPublisher(registry, decodeURIComponent(req.url.pathname.slice("/publishers/".length)), lang),
      type: "text/html; charset=utf-8",
    };
  }
  if (req.url.pathname === "/submit") return { status: 200, body: renderSubmit(lang), type: "text/html; charset=utf-8" };
  if (req.url.pathname === "/docs/protocol") return { status: 200, body: renderDocs(lang), type: "text/html; charset=utf-8" };
  if (req.url.pathname === "/open") {
    return {
      status: 200,
      body: renderOpen(req.url.searchParams.get("target"), req.url.searchParams.get("version"), lang),
      type: "text/html; charset=utf-8",
    };
  }
  return { status: 404, body: "not found", type: "text/plain" };
}
