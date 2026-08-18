import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultDerivedRoot } from "./derived.js";
import type { PublicReview, ReviewReport } from "./types.js";

export function reviewsFile(derivedRoot = defaultDerivedRoot()): string {
  return join(derivedRoot, "reviews", "public.json");
}

export function reportsFile(derivedRoot = defaultDerivedRoot()): string {
  return join(derivedRoot, "reviews", "reports.json");
}

export function loadPublicReviews(derivedRoot = defaultDerivedRoot()): PublicReview[] {
  const file = reviewsFile(derivedRoot);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as PublicReview[];
}

export function savePublicReviews(reviews: PublicReview[], derivedRoot = defaultDerivedRoot()): void {
  const file = reviewsFile(derivedRoot);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, `${JSON.stringify(reviews, null, 2)}\n`);
}

export function loadReviewReports(derivedRoot = defaultDerivedRoot()): ReviewReport[] {
  const file = reportsFile(derivedRoot);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as ReviewReport[];
}

export function saveReviewReports(reports: ReviewReport[], derivedRoot = defaultDerivedRoot()): void {
  const file = reportsFile(derivedRoot);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, `${JSON.stringify(reports, null, 2)}\n`);
}

export function reviewsForPlugin(reviews: PublicReview[], pluginId: string, versionId?: string): PublicReview[] {
  return reviews.filter((review) => {
    if (review.pluginId !== pluginId) return false;
    if (versionId && review.versionId !== versionId) return false;
    return review.published && review.status === "published";
  });
}
