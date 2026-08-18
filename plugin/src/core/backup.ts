import { publicDownload, type LoadedRegistry } from "@dsh-store/registry";
import { listInstalled } from "./installed.js";
import { sanitizeUnknown } from "./sanitize.js";
import type { LocalStore } from "./store.js";

const SECRET_FILE = /credentials|secrets|token|settings\.ya?ml/i;

export function createBackup(
  registry: LoadedRegistry,
  store: LocalStore,
  options: { includeSettings?: boolean; confirmExportSettings?: boolean; settingsFiles?: string[] } = {},
) {
  const installed = listInstalled(registry, store.profile);
  const secretFiles = (options.settingsFiles ?? ["settings.yaml", "credentials.json"]).filter((name) => SECRET_FILE.test(name));
  const includeSettings = Boolean(options.includeSettings && options.confirmExportSettings);
  return sanitizeUnknown({
    kind: "dsh-store-backup",
    profile: store.profile.profile,
    plugins: installed.map((item) => ({
      pluginId: item.pluginId,
      versionId: item.versionId,
      packageName: item.packageName,
      activation: item.activation.state,
    })),
    downloads: installed
      .map((item) => registry.plugins.find((plugin) => plugin.id === item.pluginId))
      .filter((plugin): plugin is NonNullable<typeof plugin> => Boolean(plugin))
      .map((plugin) => publicDownload(plugin)),
    strip: { secrets: true, localPaths: true, settingsValues: !includeSettings },
    secretFileCount: secretFiles.length,
    warning: options.includeSettings && !options.confirmExportSettings
      ? `exporting settings would include ${secretFiles.length} secret-bearing files; confirmExportSettings is required`
      : undefined,
    settings: includeSettings ? { exported: false, reason: "values stripped even after confirmation in this slice" } : undefined,
    mutatesHome: false,
  });
}

export function planRestore(backup: { plugins?: Array<{ pluginId?: string; versionId?: string; packageName?: string }> }) {
  const plugins = backup.plugins ?? [];
  if (!plugins.length) return { allowed: false, reason: "backup has no plugin list", mutatesHome: false };
  if (plugins.some((item) => !item.packageName && !item.pluginId)) {
    return { allowed: false, reason: "backup entries must name a package or plugin", mutatesHome: false };
  }
  return {
    allowed: true,
    reason: "restore is validated and planned only; this slice does not write $DSH_HOME",
    plugins,
    mutatesHome: false,
  };
}
