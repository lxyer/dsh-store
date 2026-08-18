import assert from "node:assert/strict";
import test from "node:test";
import { loadRegistry } from "@dsh-store/registry";
import { apiResponse } from "./api.js";
import { memoryReviewStore, reportPublicReview, submitPublicReview } from "./reviews.js";

const registry = loadRegistry();
const pluginId = "github:renpengfei1027/dsh-web-notify";
const versionId = "npm:dsh-web-notify@0.1.4";
const dimensions = { works: 5, docs: 4, safety: 4, maintenance: 3, ux: 4 };
const aged = {
  "x-dsh-identity": "github:alice",
  "x-dsh-identity-created-at": "2020-01-01T00:00:00.000Z",
};

function reviewBody(extra: Record<string, unknown> = {}) {
  return { pluginId, versionId, dimensions, body: "装进隔离 profile 后 live。", ...extra };
}

test("public reviews reject anonymous, new, and self identities", () => {
  const store = memoryReviewStore();
  const anonymous = submitPublicReview({ registry, headers: {}, body: reviewBody(), store });
  assert.equal(anonymous.status, 401);
  const fresh = submitPublicReview({
    registry,
    headers: { "x-dsh-identity": "github:newbie", "x-dsh-identity-created-at": new Date().toISOString() },
    body: reviewBody(),
    store,
  });
  assert.equal(fresh.status, 403);
  const author = submitPublicReview({
    registry,
    headers: { "x-dsh-identity": "github:renpengfei1027", "x-dsh-identity-created-at": "2020-01-01T00:00:00.000Z" },
    body: reviewBody(),
    store,
  });
  assert.equal(author.status, 403);
});

test("identity reviews bind a version, stay off passports, and expose a report entry", () => {
  const store = memoryReviewStore();
  const latest = submitPublicReview({
    registry,
    headers: aged,
    body: reviewBody({ versionId: "npm:dsh-web-notify@latest" }),
    store,
  });
  assert.equal(latest.status, 400);
  const created = submitPublicReview({
    registry,
    headers: aged,
    body: reviewBody({ installJournalId: "jrnl_01", capabilityFills: ["cap.product.notify"] }),
    store,
    now: Date.parse("2026-08-17T12:00:00.000Z"),
  });
  assert.equal(created.status, 201);
  const body = created.body as { review: { published: boolean; versionId: string }; trustState: string };
  assert.equal(body.review.published, true);
  assert.equal(body.review.versionId, versionId);
  assert.equal(body.trustState, registry.plugins.find((item) => item.id === pluginId)?.trustState);
  const duplicate = submitPublicReview({ registry, headers: aged, body: reviewBody(), store });
  assert.equal(duplicate.status, 409);
  const listed = apiResponse(`/api/v1/plugins/${pluginId}/reviews`, new URLSearchParams(), { reviewStore: store });
  assert.equal((listed?.body as { reviews: unknown[] }).reviews.length, 1);
  const report = reportPublicReview({ reviewId: (created.body as { review: { id: string } }).review.id, body: { reason: "spam" }, store });
  assert.equal(report.status, 201);
});
