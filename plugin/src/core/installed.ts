import { canOneClickInstall } from "@dsh-store/protocol";
import { defaultVersion, type LoadedRegistry } from "@dsh-store/registry";
import { classifyActivation, compareImmutableVersions, type ProfileSnapshot } from "./activation.js";

export interface InstalledItem {
  packageName: string;
  pluginId?: string;
  versionId?: string;
  installedSpec?: string;
  trustState?: string;
  activation: ReturnType<typeof classifyActivation>;
  source: "journal" | "profile";
  expectedBundle?: boolean;
  subpath?: string | null;
}

export function listInstalled(registry: LoadedRegistry, profile: ProfileSnapshot): InstalledItem[] {
  const names = new Set([...profile.bundles, ...Object.keys(profile.dependencies)]);
  return [...names].sort().map((packageName) => {
    const plugin = registry.plugins.find(
      (item) => item.npmName === packageName || item.versions.some((version) => version.installTarget.packageName === packageName),
    );
    const version = plugin?.versions.find((item) => item.installTarget.packageName === packageName) ?? (plugin ? defaultVersion(plugin) : undefined);
    const inspection = {
      packageName,
      expectedPackageName: version?.installTarget.packageName ?? packageName,
      subpath: version?.installTarget.subpath,
      hasBundle: version?.hasBundle ?? profile.bundles.includes(packageName),
      hasClient: version?.hasClient ?? false,
      expectedBundle: version?.installTarget.expectedBundle ?? true,
    };
    return {
      packageName,
      pluginId: plugin?.id,
      versionId: version?.id,
      installedSpec: profile.dependencies[packageName],
      trustState: plugin?.trustState,
      activation: classifyActivation(profile, inspection),
      source: "profile" as const,
      expectedBundle: inspection.expectedBundle,
      subpath: inspection.subpath,
    };
  });
}

export function listUpdates(registry: LoadedRegistry, profile: ProfileSnapshot) {
  return listInstalled(registry, profile).map((item) => {
    if (!item.pluginId) {
      return { ...item, result: "unknown" as const, latestVersionId: null };
    }
    const plugin = registry.plugins.find((entry) => entry.id === item.pluginId);
    if (!plugin || !canOneClickInstall(plugin.trustState)) {
      return { ...item, result: "no-promoted-update" as const, latestVersionId: item.versionId ?? null };
    }
    const latest = defaultVersion(plugin);
    return {
      ...item,
      latestVersionId: latest.id,
      result: compareImmutableVersions(item.versionId ?? "", latest.id),
    };
  });
}
