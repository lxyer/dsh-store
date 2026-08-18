import { isVersionId } from "@dsh-store/protocol";
import {
  generateRanking,
  IDENTITY_BOARDS,
  loadPublicReviews,
  loadReviewReports,
  savePublicReviews,
  saveReviewReports,
  writeRankingSnapshots,
  type LoadedRegistry,
  type PublicReview,
  type ReviewDimensions,
  type ReviewReport,
} from "@dsh-store/registry";
import { identityCooledDown, parseIdentity, type StoreIdentity } from "./identity.js";

const SPAM_WINDOW_MS = 60 * 60 * 1000;

export interface ReviewStore {
  list(): PublicReview[];
  save(reviews: PublicReview[]): void;
  reports(): ReviewReport[];
  saveReports(reports: ReviewReport[]): void;
}

export function memoryReviewStore(seed: PublicReview[] = []): ReviewStore {
  let reviews = [...seed];
  let reports: ReviewReport[] = [];
  return {
    list: () => reviews,
    save: (next) => {
      reviews = next;
    },
    reports: () => reports,
    saveReports: (next) => {
      reports = next;
    },
  };
}

export function fileReviewStore(): ReviewStore {
  return {
    list: () => loadPublicReviews(),
    save: (reviews) => savePublicReviews(reviews),
    reports: () => loadReviewReports(),
    saveReports: (reports) => saveReviewReports(reports),
  };
}

function nextId(prefix: string, now: number): string {
  return `${prefix}_${now.toString(36)}`;
}

function asDimensions(value: unknown): ReviewDimensions | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const keys = ["works", "docs", "safety", "maintenance", "ux"] as const;
  const dimensions = {} as ReviewDimensions;
  for (const key of keys) {
    const score = raw[key];
    if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) return undefined;
    dimensions[key] = score;
  }
  return dimensions;
}

function isAuthor(pluginPublisher: string, pluginId: string, identity: StoreIdentity): boolean {
  if (identity.kind !== "github") return false;
  const owner = pluginId.replace(/^github:/, "").split("/")[0] ?? "";
  const publisher = pluginPublisher.replace(/^github:/, "");
  const login = identity.login.toLowerCase();
  return login === owner.toLowerCase() || login === publisher.toLowerCase();
}

export function listPublicReviews(store: ReviewStore, pluginId?: string, versionId?: string): PublicReview[] {
  return store.list().filter((review) => {
    if (pluginId && review.pluginId !== pluginId) return false;
    if (versionId && review.versionId !== versionId) return false;
    return review.published && review.status === "published";
  });
}

export function rematerializeIdentityBoards(registry: LoadedRegistry, store: ReviewStore, generatedAt: string): void {
  writeRankingSnapshots(registry, IDENTITY_BOARDS, generatedAt, { reviews: store.list() });
}

export function submitPublicReview(input: {
  registry: LoadedRegistry;
  headers: Record<string, string | undefined>;
  body: unknown;
  store?: ReviewStore;
  now?: number;
  rematerialize?: boolean;
}): { status: number; body: unknown } {
  const store = input.store ?? fileReviewStore();
  const now = input.now ?? Date.now();
  const identity = parseIdentity(input.headers);
  if ("error" in identity) return { status: 401, body: { error: identity.error } };
  if (!identityCooledDown(identity, now)) {
    return { status: 403, body: { error: "new identities have a 7-day cooldown" } };
  }
  const payload = input.body && typeof input.body === "object" ? (input.body as Record<string, unknown>) : {};
  const pluginId = typeof payload.pluginId === "string" ? payload.pluginId : "";
  const versionId = typeof payload.versionId === "string" ? payload.versionId : "";
  const dimensions = asDimensions(payload.dimensions);
  const body = typeof payload.body === "string" ? payload.body : "";
  if (!pluginId || !versionId || !isVersionId(versionId) || !dimensions) {
    return { status: 400, body: { error: "reviews must bind a PluginVersion and 1-5 dimension scores" } };
  }
  const plugin = input.registry.plugins.find((item) => item.id === pluginId);
  if (!plugin) return { status: 404, body: { error: "plugin not found" } };
  if (!plugin.versions.some((version) => version.id === versionId)) {
    return { status: 400, body: { error: "versionId is not a published PluginVersion of this plugin" } };
  }
  if (isAuthor(plugin.publisher, plugin.id, identity)) {
    return { status: 403, body: { error: "authors cannot rate their own plugins; they may reply, not delete" } };
  }
  const existing = store.list();
  if (existing.some((item) => item.identity === identity.id && item.versionId === versionId && item.status === "published")) {
    return { status: 409, body: { error: "one published review per identity per PluginVersion" } };
  }
  const recentSameBody = existing.some(
    (item) => item.identity === identity.id && item.body === body && now - Date.parse(item.createdAt) < SPAM_WINDOW_MS,
  );
  const review: PublicReview = {
    id: nextId("rev", now),
    pluginId,
    versionId,
    identity: identity.id,
    identityKind: identity.kind,
    identityCreatedAt: identity.createdAt,
    dimensions,
    body,
    installJournalId: typeof payload.installJournalId === "string" ? payload.installJournalId : undefined,
    capabilityFills: Array.isArray(payload.capabilityFills)
      ? payload.capabilityFills.filter((item): item is string => typeof item === "string")
      : undefined,
    createdAt: new Date(now).toISOString(),
    published: !recentSameBody,
    status: recentSameBody ? "moderation" : "published",
    reportHref: "",
  };
  review.reportHref = `/api/v1/reviews/${review.id}/report`;
  store.save([...existing, review]);
  if (input.rematerialize) {
    rematerializeIdentityBoards(input.registry, store, new Date(now).toISOString());
  }
  const trustState = plugin.trustState;
  return {
    status: recentSameBody ? 202 : 201,
    body: {
      review,
      trustState,
      note: "reviews never change passports or trustState",
    },
  };
}

export function reportPublicReview(input: {
  reviewId: string;
  body: unknown;
  store?: ReviewStore;
  now?: number;
}): { status: number; body: unknown } {
  const store = input.store ?? fileReviewStore();
  const review = store.list().find((item) => item.id === input.reviewId);
  if (!review) return { status: 404, body: { error: "review not found" } };
  const reason =
    input.body && typeof input.body === "object" && typeof (input.body as { reason?: unknown }).reason === "string"
      ? (input.body as { reason: string }).reason
      : "";
  if (!reason.trim()) return { status: 400, body: { error: "report reason is required" } };
  const report: ReviewReport = {
    id: nextId("rpt", input.now ?? Date.now()),
    reviewId: review.id,
    reason: reason.trim(),
    createdAt: new Date(input.now ?? Date.now()).toISOString(),
  };
  store.saveReports([...store.reports(), report]);
  return { status: 201, body: { report, note: "malicious plugins are taken down in chapter 12, not by deleting reviews" } };
}

export function previewIdentityRanking(registry: LoadedRegistry, board: string, store: ReviewStore) {
  return generateRanking(registry, board, new Date().toISOString(), { reviews: store.list() });
}
