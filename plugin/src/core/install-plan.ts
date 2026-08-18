import { canOneClickInstall, isMutableSpec, isVersionId, type TrustState } from "@dsh-store/protocol";
import { publicDownload, themeMutexWarning, type LoadedRegistry, type PluginRecord } from "@dsh-store/registry";

export interface InstallPlan {
  allowed: boolean;
  command?: string;
  reason: string;
  profile: string;
  packageName?: string;
  versionId?: string;
  requiresBuildPermission?: boolean;
  expectedBundle?: boolean;
  hasBundle?: boolean;
  mutexWarning?: string;
  subpath?: string | null;
  spec?: string;
}

export function planInstall(
  plugin: PluginRecord,
  profile: string,
  options: { forceWeb?: boolean; installedPluginIds?: string[]; registry?: LoadedRegistry } = {},
): InstallPlan {
  const version = plugin.versions.find((item) => item.id === plugin.defaultVersionId) ?? plugin.versions[0];
  if (!version) return { allowed: false, reason: "no immutable version", profile };
  if (version.compatibility.profiles.includes("headless") && !version.compatibility.profiles.includes("web") && profile === "web" && !options.forceWeb) {
    return {
      allowed: false,
      reason: "TUI/headless package defaults to the headless profile; require a second confirmation to force web",
      profile: "headless",
      packageName: version.installTarget.packageName,
      versionId: version.id,
    };
  }
  if (!canOneClickInstall(plugin.trustState as TrustState)) {
    return { allowed: false, reason: `${plugin.trustState} has no install button`, profile };
  }
  const spec = version.installTarget.lockedSpec ?? "";
  if (!spec || isMutableSpec(spec) || !isVersionId(version.id)) {
    return { allowed: false, reason: "refusing mutable install spec", profile };
  }
  return {
    allowed: true,
    command: `dsh plugin --profile ${profile} add ${spec}`,
    spec,
    reason: "locked installable target",
    profile,
    packageName: version.installTarget.packageName,
    versionId: version.id,
    requiresBuildPermission: version.installTarget.requiresBuildPermission,
    expectedBundle: version.installTarget.expectedBundle,
    hasBundle: version.hasBundle,
    mutexWarning: options.registry
      ? themeMutexWarning(options.registry, options.installedPluginIds ?? [], plugin.id)
      : undefined,
    subpath: version.installTarget.subpath,
  };
}

export function planUpdate(plugin: PluginRecord, profile: string, versionId?: string): InstallPlan {
  if (versionId && (isMutableSpec(versionId) || !isVersionId(versionId))) {
    return { allowed: false, reason: "update refuses @latest / branch / HEAD", profile };
  }
  const version = plugin.versions.find((item) => item.id === (versionId ?? plugin.defaultVersionId)) ?? plugin.versions[0];
  if (!version) return { allowed: false, reason: "no immutable version", profile };
  return planInstall({ ...plugin, defaultVersionId: version.id }, profile);
}

export function planUninstall(packageName: string, profile: string, confirm: boolean): InstallPlan {
  if (!confirm) return { allowed: false, reason: "uninstall requires a second confirmation", profile, packageName };
  return {
    allowed: true,
    command: `dsh plugin --profile ${profile} remove ${packageName}`,
    reason: "uninstall planned; host does not write $DSH_HOME in this slice",
    profile,
    packageName,
  };
}

export function downloadManifest(plugin: PluginRecord) {
  return publicDownload(plugin);
}
