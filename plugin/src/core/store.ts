import type { ProfileSnapshot } from "./activation.js";
import type { CommandRunner } from "./exec.js";
import { loadJournalEntries, loadReviews } from "./persist.js";

export type JobStage =
  | "previewed"
  | "fetching"
  | "integrity_checked"
  | "installing"
  | "build_blocked"
  | "awaiting_build_approval"
  | "verifying"
  | "live"
  | "restart"
  | "inert"
  | "broken"
  | "cancelled"
  | "unchanged";

export interface JobRecord {
  id: string;
  action: "install" | "uninstall" | "update" | "rollback" | "restore" | "approve-builds";
  pluginId?: string;
  packageName?: string;
  stage: JobStage;
  stages: Array<{ stage: JobStage; at: number; log: string }>;
  lastStageAt: number;
  command?: string;
  mutatesHome: boolean;
  cancelled?: boolean;
}

export interface JournalEntry {
  journalId: string;
  at: string;
  profile: string;
  action: JobRecord["action"];
  target?: string;
  before: { bundles: string[]; dependencies: Record<string, string> };
  after: { bundles: string[]; dependencies: Record<string, string> };
  activation?: string;
  passportId?: string;
  rollbackRef?: string;
  persisted: boolean;
  mutatesHome: boolean;
}

export interface LocalReview {
  id: string;
  pluginId: string;
  versionId: string;
  dimensions: Record<string, number>;
  body: string;
  createdAt: string;
  identity: "anonymous-local";
  published: false;
  note: string;
}

export interface LocalStore {
  profile: ProfileSnapshot;
  jobs: Map<string, JobRecord>;
  journal: JournalEntry[];
  reviews: LocalReview[];
  allowBuilds: Set<string>;
  now: () => number;
  stateDir?: string;
  dshHome?: string;
  allowExec?: boolean;
  allowUserHome?: boolean;
  allowWeb?: boolean;
  runner?: CommandRunner;
}

export function createLocalStore(
  profile: ProfileSnapshot,
  now: () => number = () => Date.now(),
  options: Omit<LocalStore, "profile" | "jobs" | "journal" | "reviews" | "allowBuilds" | "now"> = {},
): LocalStore {
  const stateDir = options.stateDir;
  return {
    profile: {
      ...profile,
      bundles: [...profile.bundles],
      dependencies: { ...profile.dependencies },
      loaderIds: profile.loaderIds ? [...profile.loaderIds] : undefined,
    },
    jobs: new Map(),
    journal: stateDir ? loadJournalEntries(stateDir) : [],
    reviews: stateDir ? loadReviews(stateDir) : [],
    allowBuilds: new Set(),
    now,
    ...options,
    stateDir,
  };
}

let processStore: LocalStore | undefined;

export function processLocalStore(
  profile: ProfileSnapshot,
  options: Omit<LocalStore, "profile" | "jobs" | "journal" | "reviews" | "allowBuilds" | "now"> = {},
): LocalStore {
  if (!processStore) {
    processStore = createLocalStore(profile, () => Date.now(), options);
    return processStore;
  }
  processStore.profile = {
    ...profile,
    bundles: [...profile.bundles],
    dependencies: { ...profile.dependencies },
    loaderIds: profile.loaderIds ? [...profile.loaderIds] : undefined,
  };
  Object.assign(processStore, options);
  return processStore;
}

export function nextId(prefix: string, now: number): string {
  return `${prefix}_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
