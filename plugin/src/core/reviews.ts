import { isVersionId } from "@dsh-store/protocol";
import { persistReviews } from "./persist.js";
import { nextId, type LocalReview, type LocalStore } from "./store.js";

export function addLocalReview(
  store: LocalStore,
  input: { pluginId?: string; versionId?: string; dimensions?: Record<string, number>; body?: string },
): { ok: boolean; status: number; body: unknown } {
  if (!input.pluginId || !input.versionId || !isVersionId(input.versionId)) {
    return { ok: false, status: 400, body: { error: "reviews must bind a PluginVersion; latest/branch are rejected" } };
  }
  const existing = store.reviews.find((item) => item.pluginId === input.pluginId && item.versionId === input.versionId);
  if (existing) {
    return { ok: false, status: 409, body: { error: "one local draft per PluginVersion", review: existing } };
  }
  const review: LocalReview = {
    id: nextId("rev", store.now()),
    pluginId: input.pluginId,
    versionId: input.versionId,
    dimensions: input.dimensions ?? {},
    body: input.body ?? "",
    createdAt: new Date(store.now()).toISOString(),
    identity: "anonymous-local",
    published: false,
    note: "local anonymous draft only; publish via POST /api/v1/reviews with GitHub or journal identity",
  };
  store.reviews.push(review);
  if (store.stateDir) persistReviews(store.stateDir, store.reviews);
  return { ok: true, status: 201, body: review };
}

export function listLocalReviews(store: LocalStore, pluginId?: string): LocalReview[] {
  return store.reviews.filter((item) => !pluginId || item.pluginId === pluginId);
}
