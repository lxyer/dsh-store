import { assertValid, canOneClickInstall, isMutableSpec } from "@dsh-store/protocol";
import type { LoadedRegistry, PluginRecord } from "./types.js";

export interface LintIssue {
  file: string;
  level: "error" | "warning";
  message: string;
}

export function lintRegistry(registry: LoadedRegistry): LintIssue[] {
  const issues: LintIssue[] = [];
  const pluginIds = new Set<string>();

  for (const plugin of registry.plugins) {
    const file = `registry/plugins/${fileSafe(plugin.id)}.yml`;
    try {
      assertValid("plugin", plugin);
    } catch (error) {
      issues.push({ file, level: "error", message: (error as Error).message });
    }
    if (pluginIds.has(plugin.id)) {
      issues.push({ file, level: "error", message: `duplicate plugin id ${plugin.id}` });
    }
    pluginIds.add(plugin.id);
    lintPluginSemantics(plugin, file, issues, "committed");
  }

  for (const plugin of registry.candidates) {
    const file = `registry/candidates/${fileSafe(plugin.id)}.yml`;
    try {
      assertValid("plugin", plugin);
    } catch (error) {
      issues.push({ file, level: "error", message: (error as Error).message });
    }
    if (canOneClickInstall(plugin.trustState)) {
      issues.push({
        file,
        level: "error",
        message: "candidates cannot be installable or featured; scanner writes derived indexes only",
      });
    }
  }

  for (const pack of registry.packs) {
    const file = `registry/packs/${fileSafe(pack.id)}.yml`;
    try {
      assertValid("pack", pack);
    } catch (error) {
      issues.push({ file, level: "error", message: (error as Error).message });
    }
    for (const entry of pack.entries) {
      const plugin = registry.plugins.find((item) => item.id === entry.ref);
      if (!plugin) {
        issues.push({ file, level: "error", message: `pack entry missing plugin ${entry.ref}` });
        continue;
      }
      if (plugin.trustState === "blocked" && pack.installPolicy.stopOnBlocked) {
        issues.push({
          file,
          level: "warning",
          message: `pack ${pack.id} contains blocked entry ${entry.ref} and cannot one-click install`,
        });
      }
    }
  }

  for (const passport of registry.passports) {
    const file = `registry/passports/${fileSafe(passport.id)}.json`;
    try {
      assertValid("passport", passport);
    } catch (error) {
      issues.push({ file, level: "error", message: (error as Error).message });
    }
  }

  for (const capability of registry.capabilities) {
    const file = `registry/capabilities/${capability.id}.yml`;
    try {
      assertValid("capability", capability);
    } catch (error) {
      issues.push({ file, level: "error", message: (error as Error).message });
    }
    if (capability.layer === "scene" && capability.annotators?.includes("author")) {
      issues.push({ file, level: "error", message: "authors cannot annotate scene capabilities" });
    }
  }

  return issues;
}

function lintPluginSemantics(
  plugin: PluginRecord,
  file: string,
  issues: LintIssue[],
  origin: "committed" | "candidate",
): void {
  for (const version of plugin.versions) {
    if (isMutableSpec(version.id) || isMutableSpec(version.installTarget.lockedSpec ?? "")) {
      issues.push({ file, level: "error", message: `${version.id} is not an immutable version` });
    }
    if (version.installTarget.pluginId !== plugin.id) {
      issues.push({ file, level: "error", message: `installTarget.pluginId mismatch on ${version.id}` });
    }
    if (plugin.trustState === "blocked" && canOneClickInstall(plugin.trustState)) {
      issues.push({ file, level: "error", message: "blocked cannot also be installable" });
    }
  }
  if (origin === "candidate" && canOneClickInstall(plugin.trustState)) {
    issues.push({
      file,
      level: "error",
      message: "scanner-owned candidates cannot be installable or featured",
    });
  }
}

export function fileSafe(id: string): string {
  return id.replace(/^github:/, "").replace(/^pack:/, "").replace(/^passport:/, "").replace(/[/:#@]/g, "__");
}

export function assertLintClean(issues: LintIssue[]): void {
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) {
    throw new Error(errors.map((issue) => `${issue.file}: ${issue.message}`).join("\n"));
  }
}
