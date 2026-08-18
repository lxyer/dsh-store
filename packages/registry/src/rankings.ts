import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canOneClickInstall } from "@dsh-store/protocol";
import { defaultDerivedRoot } from "./derived.js";
import { defaultVersion, passportFor } from "./query.js";
import { computeStarGrowth, loadStarDay, previousStarDate, utcDate } from "./stars.js";
import type { LoadedRegistry, PublicReview, RankingSnapshot } from "./types.js";

export { defaultDerivedRoot } from "./derived.js";

export const SNAPSHOT_GENERATED_AT = "2026-08-17T05:03:06Z";
export const IDENTITY_BOARDS = ["rating", "install_success", "capability_fill"] as const;
export const PUBLIC_BOARDS = ["stars", "star_growth", "new", "security", "packs"] as const;
export const RATING_MIN_REVIEWS = 2;
export const INSTALL_SUCCESS_MIN = 2;

export interface RankingOptions {
  reviews?: PublicReview[];
  starDays?: { current?: Record<string, number>; previous?: Record<string, number> };
}

function publishedReviews(reviews: PublicReview[]): PublicReview[] {
  return reviews.filter((review) => review.published && review.status === "published");
}

function dimensionAverage(review: PublicReview): number {
  const values = Object.values(review.dimensions);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function installWeightedScore(reviews: PublicReview[]): number {
  let sum = 0;
  let weight = 0;
  for (const review of reviews) {
    const next = review.installJournalId ? 2 : 1;
    sum += dimensionAverage(review) * next;
    weight += next;
  }
  return weight ? Number((sum / weight).toFixed(3)) : 0;
}

function identityBoard(
  registry: LoadedRegistry,
  board: string,
  generatedAt: string,
  reviews: PublicReview[],
): RankingSnapshot {
  const published = publishedReviews(reviews);
  const grouped = new Map<string, PublicReview[]>();
  for (const review of published) {
    const list = grouped.get(review.pluginId) ?? [];
    list.push(review);
    grouped.set(review.pluginId, list);
  }

  const items = [...grouped.entries()]
    .map(([pluginId, pluginReviews]) => {
      const plugin = registry.plugins.find((item) => item.id === pluginId);
      if (!plugin) return undefined;
      if (board === "rating") {
        const evidenced = pluginReviews.filter((review) => review.installJournalId);
        if (evidenced.length < RATING_MIN_REVIEWS) return undefined;
        return {
          id: plugin.id,
          title: plugin.title,
          trustState: plugin.trustState,
          score: installWeightedScore(evidenced),
          reviewCount: evidenced.length,
          installWeighted: true,
        };
      }
      if (board === "install_success") {
        const attempts = pluginReviews.filter((review) => review.installJournalId);
        if (attempts.length < INSTALL_SUCCESS_MIN) return undefined;
        const success = attempts.filter((review) => review.dimensions.works >= 4).length;
        return {
          id: plugin.id,
          title: plugin.title,
          trustState: plugin.trustState,
          reviewCount: attempts.length,
          successRate: Number((success / attempts.length).toFixed(3)),
        };
      }
      const fills = new Set(pluginReviews.flatMap((review) => review.capabilityFills ?? []));
      if (fills.size < 1) return undefined;
      return {
        id: plugin.id,
        title: plugin.title,
        trustState: plugin.trustState,
        fills: fills.size,
        reviewCount: pluginReviews.length,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      const leftScore = left.score ?? left.successRate ?? left.fills ?? 0;
      const rightScore = right.score ?? right.successRate ?? right.fills ?? 0;
      return rightScore - leftScore;
    });

  if (!items.length) {
    return {
      generatedAt,
      schemaVersion: 1,
      board,
      materialized: true,
      closed: true,
      reason: published.length
        ? "identity reviews exist but do not meet the board threshold (install evidence / minimum count)"
        : "public rating / install-success / capability-fill boards require identity",
      items: [],
    };
  }

  return {
    generatedAt,
    schemaVersion: 1,
    board,
    materialized: true,
    items,
  };
}

export function generateRanking(
  registry: LoadedRegistry,
  board: string,
  generatedAt = SNAPSHOT_GENERATED_AT,
  options: RankingOptions = {},
): RankingSnapshot {
  if ((IDENTITY_BOARDS as readonly string[]).includes(board)) {
    return identityBoard(registry, board, generatedAt, options.reviews ?? []);
  }

  if (board === "star_growth") {
    const current = options.starDays?.current ?? loadStarDay(utcDate())?.counts;
    const previous =
      options.starDays?.previous ??
      (() => {
        const prior = previousStarDate(utcDate());
        return prior ? loadStarDay(prior)?.counts : undefined;
      })();
    const growth = computeStarGrowth(current ?? {}, previous);
    const items = growth.slice(0, 20).flatMap((item) => {
      const plugin = registry.plugins.find((entry) => entry.id === item.pluginId);
      if (!plugin) return [];
      return [
        {
          id: plugin.id,
          title: plugin.title,
          trustState: plugin.trustState,
          stars: item.current,
          previousStars: item.previous,
          delta: item.delta,
          growthRate: item.rate ?? undefined,
        },
      ];
    });
    if (!previous || !items.length) {
      return {
        generatedAt,
        schemaVersion: 1,
        board,
        materialized: true,
        closed: true,
        reason: previous
          ? "no plugin with a recorded star count grew since the previous daily snapshot"
          : "star growth needs two daily star snapshots; today's count is recorded, the board opens after the next day",
        items: [],
      };
    }
    return {
      generatedAt,
      schemaVersion: 1,
      board,
      materialized: true,
      items,
    };
  }

  if (board === "packs") {
    return {
      generatedAt,
      schemaVersion: 1,
      board,
      materialized: true,
      items: registry.packs
        .filter((pack) => pack.kind !== "user")
        .map((pack) => ({
          id: pack.id,
          title: pack.title,
          kind: pack.kind,
        })),
    };
  }

  const plugins = [...registry.plugins];
  if (board === "stars") {
    plugins.sort((left, right) => (right.stars?.count ?? 0) - (left.stars?.count ?? 0));
  } else if (board === "new") {
    plugins.sort((left, right) => (right.fetchedAt ?? "").localeCompare(left.fetchedAt ?? "") || left.id.localeCompare(right.id));
  } else if (board === "security") {
    const secure = plugins.filter((plugin) => {
      if (!canOneClickInstall(plugin.trustState)) return false;
      const version = defaultVersion(plugin);
      const passport = passportFor(registry, version.id);
      return !passport?.findings.some((finding) => finding.severity === "high");
    });
    plugins.splice(0, plugins.length, ...secure);
  }

  return {
    generatedAt,
    schemaVersion: 1,
    board,
    materialized: true,
    items: plugins.slice(0, 20).map((plugin) => ({
      id: plugin.id,
      title: plugin.title,
      trustState: plugin.trustState,
      stars: plugin.stars?.count ?? 0,
      fetchedAt: plugin.fetchedAt,
    })),
  };
}

export function loadRankingSnapshot(board: string, derivedRoot = defaultDerivedRoot()): RankingSnapshot | undefined {
  const file = join(derivedRoot, "rankings", `${board}.json`);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as RankingSnapshot;
}

export function listRankingBoards(derivedRoot = defaultDerivedRoot()): string[] {
  const dir = join(derivedRoot, "rankings");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();
}

export function writeRankingSnapshots(
  registry: LoadedRegistry,
  boards: readonly string[],
  generatedAt = SNAPSHOT_GENERATED_AT,
  options: RankingOptions & { derivedRoot?: string } = {},
): void {
  const derivedRoot = options.derivedRoot ?? defaultDerivedRoot();
  const dir = join(derivedRoot, "rankings");
  mkdirSync(dir, { recursive: true });
  for (const board of boards) {
    const snapshot = generateRanking(registry, board, generatedAt, {
      reviews: options.reviews,
      starDays: options.starDays,
    });
    writeFileSync(join(dir, `${board}.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
  }
}
