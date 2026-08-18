export const PLUGIN_ID = /^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(#[A-Za-z0-9_./-]+)?$/;
export const NPM_VERSION_ID = /^npm:(@?[A-Za-z0-9_.~/-]+)@([0-9]+\.[0-9]+\.[0-9]+[A-Za-z0-9_.+-]*)$/;
export const GIT_VERSION_ID = /^git:[A-Za-z0-9.-]+\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[a-f0-9]{40}$/;
export const PACK_ID = /^pack:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const CAPABILITY_ID = /^cap\.(seam|product|scene)\.[A-Za-z0-9_.-]+$/;
export const PASSPORT_ID = /^passport:(npm:.+|git:.+):scanner-[0-9]+$/;

export const TRUST_STATES = [
  "discovered",
  "candidate",
  "screened",
  "review_required",
  "installable",
  "featured",
  "blocked",
] as const;

export type TrustState = (typeof TRUST_STATES)[number];

export const INSTALLABLE_STATES: readonly TrustState[] = ["installable", "featured"];
export const NO_INSTALL_STATES: readonly TrustState[] = [
  "discovered",
  "candidate",
  "screened",
  "review_required",
  "blocked",
];

export const ACTIVATION_STATES = ["live", "restart", "inert", "broken"] as const;
export type ActivationState = (typeof ACTIVATION_STATES)[number];

export const SOURCE_KINDS = [
  "curated",
  "discovered",
  "author_pr",
  "official_pack",
  "community_pack",
  "user_pack",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export function isPluginId(value: string): boolean {
  return PLUGIN_ID.test(value);
}

export function isVersionId(value: string): boolean {
  return NPM_VERSION_ID.test(value) || GIT_VERSION_ID.test(value);
}

export function isMutableSpec(value: string): boolean {
  return /@(latest|next)(\s|$)/.test(value) || /#(main|master|HEAD)$/.test(value);
}

export function canOneClickInstall(trustState: TrustState): boolean {
  return INSTALLABLE_STATES.includes(trustState);
}

export function canAgentInstall(trustState: TrustState): boolean {
  return canOneClickInstall(trustState);
}
