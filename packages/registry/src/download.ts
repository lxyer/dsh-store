import { canOneClickInstall } from "@dsh-store/protocol";
import { defaultVersion } from "./query.js";
import type { PluginRecord } from "./types.js";

export function publicDownload(plugin: PluginRecord) {
  const version = defaultVersion(plugin);
  const screenedOrAbove = !["discovered", "candidate"].includes(plugin.trustState);
  return {
    pluginId: plugin.id,
    versionId: version.id,
    trustState: plugin.trustState,
    files: screenedOrAbove
      ? ["package.tgz", "SHA256SUMS", "install.sh", "install-command.txt", "passport.json", "sbom.json", "release-notes.md"]
      : ["passport.json"],
    installCommand:
      canOneClickInstall(plugin.trustState) && version.installTarget.lockedSpec
        ? `dsh plugin --profile ${version.installTarget.profile} add ${version.installTarget.lockedSpec}`
        : null,
    executableInstaller: canOneClickInstall(plugin.trustState),
    mutatesHome: false,
    fetchedAt: plugin.fetchedAt,
    compatibility: version.compatibility,
  };
}
