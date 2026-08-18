import type { ActivationState } from "@dsh-store/protocol";

export interface ProfileSnapshot {
  profile: string;
  bundles: string[];
  dependencies: Record<string, string>;
  loaderIds?: string[];
  desktopProfiles?: boolean;
}

export interface InstalledPackageInspection {
  packageName: string;
  expectedPackageName: string;
  subpath?: string | null;
  hasBundle: boolean;
  hasClient: boolean;
  expectedBundle: boolean;
  patchNeedsRestart?: boolean;
  cliFailed?: boolean;
  integrityFailed?: boolean;
  packageNameMismatch?: boolean;
}

export interface ActivationResult {
  state: ActivationState;
  reason: string;
}

export function classifyActivation(profile: ProfileSnapshot, inspection: InstalledPackageInspection): ActivationResult {
  if (inspection.cliFailed || inspection.integrityFailed || inspection.packageNameMismatch) {
    return { state: "broken", reason: "CLI, integrity, or packageName/subpath check failed" };
  }
  if (inspection.expectedPackageName !== inspection.packageName) {
    return { state: "broken", reason: `expected package ${inspection.expectedPackageName}, found ${inspection.packageName}` };
  }
  const inBundles = profile.bundles.includes(inspection.packageName);
  if (inspection.expectedBundle && !inspection.hasBundle) {
    return { state: "inert", reason: "dependency written but package declares no dsh.bundle" };
  }
  if (!inspection.hasBundle) {
    return { state: "inert", reason: "no dsh.bundle; this is a client-only or ordinary library" };
  }
  if (!inBundles) {
    return { state: "inert", reason: "expectedBundle=true but dsh.profile.bundles does not contain the package" };
  }
  if (inspection.patchNeedsRestart || (profile.loaderIds && !profile.loaderIds.includes(inspection.packageName))) {
    return { state: "restart", reason: "in bundles, but config/disable/client graph needs a restart" };
  }
  return { state: "live", reason: "in bundles and loader can activate without a new config row" };
}

export function compareImmutableVersions(before: string, after: string): "updated" | "unchanged" {
  return before === after ? "unchanged" : "updated";
}

export function restartAllowed(profile: ProfileSnapshot, loopback: boolean): boolean {
  return loopback && !profile.desktopProfiles;
}
