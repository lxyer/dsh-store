import type { SourceKind, TrustState } from "@dsh-store/protocol";

export interface Bilingual {
  zh: string;
  en: string;
}

export interface RegistryStars {
  count: number;
  fetchedAt: string;
  source: string;
  previousCount?: number;
  delta?: number;
}

export interface InstallTargetRecord {
  pluginId: string;
  versionId: string;
  packageName: string;
  subpath: string | null;
  integrity?: string;
  profile: string;
  requiresBuildPermission: boolean;
  expectedBundle: boolean;
  passportId?: string;
  tarballUrl?: string;
  lockedSpec?: string;
}

export interface PluginVersionRecord {
  id: string;
  pluginId: string;
  releasedAt: string;
  yanked?: boolean;
  hasBundle?: boolean;
  hasClient?: boolean;
  lifecycleScripts?: string[];
  installTarget: InstallTargetRecord;
  passportId?: string;
  capabilityClaims?: string[];
  compatibility: {
    dshRange: string;
    profiles: Array<"web" | "headless" | "desktop" | "any">;
    desktop: "yes" | "no" | "unknown";
    testedDsh?: string[];
  };
  releaseNotes?: Bilingual;
}

export interface PluginRecord {
  schemaVersion: 1;
  id: string;
  publisher: string;
  npmName?: string;
  aliases?: string[];
  title: Bilingual;
  description: Bilingual;
  readmeExcerpt?: Bilingual;
  fetchedAt?: string;
  sourceCommit?: string;
  awesomeCategory?: string;
  scenes?: string[];
  trustState: TrustState;
  blockedReason?: Bilingual;
  sources: SourceKind[];
  stars?: RegistryStars;
  homepage?: string;
  repository?: string;
  license?: string;
  defaultVersionId?: string;
  versions: PluginVersionRecord[];
  promotion?: unknown;
}

export interface PackRecord {
  id: string;
  version: string;
  title: Bilingual;
  description?: Bilingual;
  kind: "official" | "community" | "user" | "solution";
  profileTarget: "web" | "headless" | "desktop" | "any";
  entries: Array<{ ref: string; version: string; role: "required" | "optional" | "alreadyCovered" }>;
  mutexGroups?: Array<{ id: string; policy: "single"; members?: string[] }>;
  conflicts?: Array<{ plugin: string; reason: string }>;
  capabilityCoverage?: string[];
  installPolicy: {
    stopOnBlocked: boolean;
    requirePassport: boolean;
    allowCandidate: boolean;
  };
  completeness?: "complete" | "partial";
}

export interface PackLock {
  id: string;
  version: string;
  lockVersion: 1;
  profileTarget: "web" | "headless" | "desktop" | "any";
  entries: Array<{
    pluginId: string;
    versionId: string;
    integrity?: string;
    role: "required" | "optional" | "alreadyCovered";
    fills?: string[];
  }>;
  mutexGroups?: Array<{ id: string; policy: "single" }>;
  conflicts?: Array<{ pluginId: string; reason: string }>;
  installPolicy: {
    stopOnBlocked: boolean;
    requirePassport: boolean;
    allowCandidate: boolean;
  };
  strip: {
    secrets: true;
    localPaths: true;
    settingsValues: true;
  };
}

export interface ReviewDimensions {
  works: number;
  docs: number;
  safety: number;
  maintenance: number;
  ux: number;
}

export interface PublicReview {
  id: string;
  pluginId: string;
  versionId: string;
  identity: string;
  identityKind: "github" | "journal";
  identityCreatedAt: string;
  dimensions: ReviewDimensions;
  body: string;
  installJournalId?: string;
  capabilityFills?: string[];
  createdAt: string;
  published: boolean;
  status: "published" | "moderation";
  reportHref?: string;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  reason: string;
  createdAt: string;
}

export interface RankingItem {
  id: string;
  title: Bilingual;
  trustState?: string;
  stars?: number;
  kind?: string;
  fetchedAt?: string;
  score?: number;
  reviewCount?: number;
  successRate?: number;
  fills?: number;
  installWeighted?: boolean;
  delta?: number;
  previousStars?: number;
  growthRate?: number;
}

export interface RankingSnapshot {
  generatedAt: string;
  schemaVersion: 1;
  board: string;
  materialized: true;
  closed?: boolean;
  reason?: string;
  items: RankingItem[];
}

export interface PassportRecord {
  id: string;
  pluginId: string;
  versionId: string;
  scannerVersion: number;
  checkedAt: string;
  trustState: TrustState;
  manifest: {
    hasBundle: boolean;
    hasClient: boolean;
    packageName: string | null;
    subpath: string | null;
  };
  license: { spdx: string | null; file?: string | null };
  lifecycleScripts: string[];
  signals: {
    network: string[];
    fs: string[];
    credentials: string[];
    dynamicEval: string[];
    uiHijack?: string[];
  };
  compatibility: {
    dshRange: string;
    profiles: Array<"web" | "headless" | "desktop" | "any">;
    desktop: "yes" | "no" | "unknown";
  };
  filesInspected: string[];
  findings: Array<{
    id: string;
    severity: "low" | "medium" | "high";
    label: Bilingual;
    files?: string[];
  }>;
  disclaimer?: string;
}

export interface CapabilityRecord {
  id: string;
  layer: "seam" | "product" | "scene";
  title: Bilingual;
  description: Bilingual;
  taxonomyVersion: number;
  officialSeam?: string;
  aliases?: string[];
  annotators?: Array<"scanner" | "maintainer" | "pack" | "author">;
}

export interface SearchDocument {
  plugin: PluginRecord;
  version: PluginVersionRecord;
  passport?: PassportRecord;
}

export interface CatalogCounts {
  generatedAt: string;
  schemaVersion: number;
  curated: number;
  autoDiscovered: number;
  authorPr: number;
  installable: number;
  featured: number;
  blocked: number;
  screened: number;
  candidate: number;
  reviewRequired: number;
  listed: number;
  byAwesomeCategory: Record<string, number>;
  byScene: Record<string, number>;
}

export interface LoadedRegistry {
  root: string;
  plugins: PluginRecord[];
  packs: PackRecord[];
  passports: PassportRecord[];
  capabilities: CapabilityRecord[];
  candidates: PluginRecord[];
}
