import { assertValid, canOneClickInstall } from "@dsh-store/protocol";
import { defaultVersion, passportFor } from "./query.js";
import type { LoadedRegistry, PackLock, PackRecord, PluginRecord } from "./types.js";

const SECRET_KEY = /token|secret|password|credential|api[_-]?key|cookie|authorization/i;
const LOCAL_PATH = /(\/Users\/|\/home\/|[A-Za-z]:\\)/;

export function isThemePlugin(plugin?: PluginRecord): boolean {
  if (!plugin) return false;
  if (plugin.awesomeCategory === "theme") return true;
  return plugin.versions.some((version) => version.capabilityClaims?.includes("cap.product.theme"));
}

export function isHeadlessOnly(plugin?: PluginRecord): boolean {
  if (!plugin) return false;
  const version = defaultVersion(plugin);
  const profiles = version.compatibility.profiles;
  return profiles.includes("headless") && !profiles.includes("web") && !profiles.includes("any");
}

export function lockPack(registry: LoadedRegistry, pack: PackRecord): PackLock {
  const lock: PackLock = {
    id: pack.id,
    version: pack.version,
    lockVersion: 1,
    profileTarget: pack.profileTarget,
    entries: pack.entries.map((entry) => {
      const plugin = registry.plugins.find((item) => item.id === entry.ref);
      const version = plugin?.versions.find((item) => item.id === entry.version) ?? (plugin ? defaultVersion(plugin) : undefined);
      return {
        pluginId: entry.ref,
        versionId: entry.version,
        integrity: version?.installTarget.integrity,
        role: entry.role,
        fills: version?.capabilityClaims,
      };
    }),
    mutexGroups: pack.mutexGroups?.map((group) => ({ id: group.id, policy: group.policy })),
    conflicts: pack.conflicts?.map((item) => ({ pluginId: item.plugin, reason: item.reason })),
    installPolicy: pack.installPolicy,
    strip: { secrets: true, localPaths: true, settingsValues: true },
  };
  assertValid("pack-lock", lock);
  return lock;
}

export function packInstallAllowed(
  registry: LoadedRegistry,
  pack: PackRecord,
  profile = pack.profileTarget,
): { allowed: boolean; reason: string; lock: PackLock } {
  const lock = lockPack(registry, pack);
  for (const entry of pack.entries) {
    const plugin = registry.plugins.find((item) => item.id === entry.ref);
    if (!plugin) return { allowed: false, reason: `missing plugin ${entry.ref}`, lock };
    if (plugin.trustState === "blocked" && pack.installPolicy.stopOnBlocked) {
      return { allowed: false, reason: `pack contains a blocked entry: ${plugin.id}`, lock };
    }
    if (entry.role !== "alreadyCovered" && !canOneClickInstall(plugin.trustState)) {
      if (plugin.trustState === "candidate" && !pack.installPolicy.allowCandidate) {
        return { allowed: false, reason: `candidate entry ${plugin.id} is not allowed`, lock };
      }
      if (!canOneClickInstall(plugin.trustState)) {
        return { allowed: false, reason: `${plugin.id} is ${plugin.trustState} and cannot one-click install`, lock };
      }
    }
    if (pack.installPolicy.requirePassport && !passportFor(registry, entry.version)) {
      return { allowed: false, reason: `missing passport for ${entry.version}`, lock };
    }
  }
  if (pack.profileTarget === "headless" && profile === "web") {
    return {
      allowed: false,
      reason: "TUI/headless pack defaults to the headless profile; require a second confirmation to force web",
      lock,
    };
  }
  return { allowed: true, reason: "locked pack with no blocked entries", lock };
}

export function themeMutexWarning(
  registry: LoadedRegistry,
  installedPluginIds: string[],
  incomingPluginId: string,
): string | undefined {
  const incoming = registry.plugins.find((item) => item.id === incomingPluginId);
  if (!isThemePlugin(incoming)) return undefined;
  const existing = installedPluginIds.filter((id) => id !== incomingPluginId && isThemePlugin(registry.plugins.find((item) => item.id === id)));
  if (!existing.length) return undefined;
  return `theme mutex: installing ${incomingPluginId} will disable ${existing.join(", ")}`;
}

export function previewPackApply(
  registry: LoadedRegistry,
  pack: PackRecord,
  installedPluginIds: string[],
  profile = pack.profileTarget,
): {
  allowed: boolean;
  reason: string;
  lock: PackLock;
  alreadyCovered: string[];
  toInstall: string[];
  conflicts: Array<{ pluginId: string; reason: string }>;
  mutexWarnings: string[];
  profileTarget: string;
} {
  const decision = packInstallAllowed(registry, pack, profile);
  const alreadyCovered = pack.entries.filter((entry) => entry.role === "alreadyCovered" || installedPluginIds.includes(entry.ref)).map((entry) => entry.ref);
  const toInstall = pack.entries.filter((entry) => entry.role !== "alreadyCovered" && !installedPluginIds.includes(entry.ref)).map((entry) => entry.ref);
  const mutexWarnings = toInstall
    .map((pluginId) => themeMutexWarning(registry, [...installedPluginIds, ...toInstall], pluginId))
    .filter((item): item is string => Boolean(item));
  return {
    ...decision,
    alreadyCovered,
    toInstall,
    conflicts: decision.lock.conflicts ?? [],
    mutexWarnings,
    profileTarget: pack.profileTarget,
  };
}

export function exportUserPack(input: {
  publisher: string;
  slug: string;
  profile: "web" | "headless" | "desktop" | "any";
  entries: Array<{ pluginId: string; versionId: string }>;
  registry: LoadedRegistry;
  extras?: Record<string, unknown>;
}): { pack: PackRecord; lock: PackLock; filename: string; strippedKeys: string[] } {
  const strippedKeys = Object.keys(input.extras ?? {}).filter((key) => SECRET_KEY.test(key) || LOCAL_PATH.test(key) || /settings|path|home/i.test(key));
  const pack: PackRecord = {
    id: `pack:user/${input.slug}`,
    version: "0.0.1",
    title: { zh: `${input.slug} 本机分享包`, en: `${input.slug} local share pack` },
    kind: "user",
    profileTarget: input.profile,
    entries: input.entries.map((entry) => ({
      ref: entry.pluginId,
      version: entry.versionId,
      role: "required",
    })),
    installPolicy: {
      stopOnBlocked: true,
      requirePassport: true,
      allowCandidate: false,
    },
    completeness: "partial",
  };
  const lock = lockPack(input.registry, pack);
  return {
    pack,
    lock,
    filename: `${input.slug}.dshpack`,
    strippedKeys,
  };
}

export function assertSharePayloadClean(payload: unknown): void {
  const text = JSON.stringify(payload);
  if (SECRET_KEY.test(text) || LOCAL_PATH.test(text)) {
    throw new Error("share payload still contains secrets or local paths");
  }
}
