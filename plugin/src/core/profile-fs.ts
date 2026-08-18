import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ProfileSnapshot } from "./activation.js";
import { profileDir } from "./isolate.js";

export interface ProfilePackageJson {
  name: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  dsh?: {
    profile?: {
      bundles?: string[];
    };
  };
}

export function emptyProfilePackage(profile: string): ProfilePackageJson {
  return {
    name: `dsh-profile-${profile}`,
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: [] } },
  };
}

export function profilePackagePath(dshHome: string, profile: string): string {
  return join(profileDir(dshHome, profile), "package.json");
}

export function ensureProfileDir(dshHome: string, profile: string): ProfilePackageJson {
  const file = profilePackagePath(dshHome, profile);
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) {
    const created = emptyProfilePackage(profile);
    writeFileSync(file, `${JSON.stringify(created, null, 2)}\n`);
    return created;
  }
  return JSON.parse(readFileSync(file, "utf8")) as ProfilePackageJson;
}

export function readProfileSnapshot(dshHome: string, profile: string): ProfileSnapshot {
  const pkg = ensureProfileDir(dshHome, profile);
  return {
    profile,
    bundles: pkg.dsh?.profile?.bundles ?? [],
    dependencies: pkg.dependencies ?? {},
  };
}

export function writeProfileSnapshot(dshHome: string, snapshot: ProfileSnapshot): void {
  const pkg = ensureProfileDir(dshHome, snapshot.profile);
  pkg.dependencies = { ...snapshot.dependencies };
  pkg.dsh = { profile: { bundles: [...snapshot.bundles] } };
  writeFileSync(profilePackagePath(dshHome, snapshot.profile), `${JSON.stringify(pkg, null, 2)}\n`);
}

export function inspectInstalledManifest(dshHome: string, profile: string, packageName: string): {
  name: string;
  hasBundle: boolean;
  hasClient: boolean;
} | undefined {
  const file = join(profileDir(dshHome, profile), "node_modules", ...packageName.split("/"), "package.json");
  if (!existsSync(file)) return undefined;
  const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; dsh?: { bundle?: unknown; client?: unknown } };
  return {
    name: pkg.name ?? packageName,
    hasBundle: Boolean(pkg.dsh?.bundle),
    hasClient: Boolean(pkg.dsh?.client),
  };
}
