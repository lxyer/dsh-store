import { loadCatalog, loadRankingSnapshot, type LoadedRegistry, type RankingSnapshot } from "@dsh-store/registry";

let registryOverride: LoadedRegistry | undefined;
let rankingOverride: Record<string, RankingSnapshot> | undefined;

export function setSiteRuntime(input: { registry: LoadedRegistry; rankings?: Record<string, RankingSnapshot> }): void {
  registryOverride = input.registry;
  rankingOverride = input.rankings;
}

export function siteRegistry(): LoadedRegistry {
  return registryOverride ?? loadCatalog();
}

export function siteRanking(board: string): RankingSnapshot | undefined {
  if (rankingOverride) return rankingOverride[board];
  return loadRankingSnapshot(board);
}
