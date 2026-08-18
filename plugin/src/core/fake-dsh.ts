import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandRunner } from "./exec.js";
import { ISOLATED_PROFILE } from "./isolate.js";
import { ensureProfileDir, writeProfileSnapshot } from "./profile-fs.js";

export interface FakePackage {
  name: string;
  version: string;
  hasBundle: boolean;
  hasClient?: boolean;
}

export function fakeDshRunner(packages: Record<string, FakePackage>): CommandRunner {
  return {
    async run(argv, env, cwd) {
      if (argv[0] !== "dsh" || argv[1] !== "plugin") {
        return { code: 1, stdout: "", stderr: "expected dsh plugin", argv };
      }
      const profile = argv[argv.indexOf("--profile") + 1];
      if (profile !== ISOLATED_PROFILE) {
        return { code: 1, stdout: "", stderr: `refusing profile ${profile}`, argv };
      }
      if (env.DSH_HOME && /\/\.dsh$/.test(env.DSH_HOME) && !env.DSH_HOME.includes(".tmp")) {
        return { code: 1, stdout: "", stderr: "fake runner refused user $DSH_HOME", argv };
      }
      const action = argv[4];
      const spec = argv[5] ?? "";
      const pkg = Object.values(packages).find((item) => spec.includes(item.name) || spec === item.name) ?? packages[spec];
      const snapshot = ensureProfileDir(env.DSH_HOME ?? cwd, profile);
      if (action === "add" && pkg) {
        snapshot.dependencies = { ...snapshot.dependencies, [pkg.name]: pkg.version };
        if (pkg.hasBundle) {
          snapshot.dsh = { profile: { bundles: [...new Set([...(snapshot.dsh?.profile?.bundles ?? []), pkg.name])] } };
        }
        writeProfileSnapshot(env.DSH_HOME ?? cwd, {
          profile,
          bundles: snapshot.dsh?.profile?.bundles ?? [],
          dependencies: snapshot.dependencies ?? {},
        });
        const dest = join(cwd, "node_modules", ...pkg.name.split("/"));
        mkdirSync(dest, { recursive: true });
        writeFileSync(
          join(dest, "package.json"),
          `${JSON.stringify({ name: pkg.name, version: pkg.version, dsh: { bundle: pkg.hasBundle ? { patch: "./cordis.patch.yml" } : undefined, client: pkg.hasClient ? {} : undefined } }, null, 2)}\n`,
        );
        return { code: 0, stdout: `added ${pkg.name}`, stderr: "", argv };
      }
      if (action === "remove" && pkg) {
        const { [pkg.name]: _removed, ...dependencies } = snapshot.dependencies ?? {};
        writeProfileSnapshot(env.DSH_HOME ?? cwd, {
          profile,
          bundles: (snapshot.dsh?.profile?.bundles ?? []).filter((item) => item !== pkg.name),
          dependencies,
        });
        return { code: 0, stdout: `removed ${pkg.name}`, stderr: "", argv };
      }
      return { code: 1, stdout: "", stderr: `unknown spec ${spec}`, argv };
    },
  };
}
