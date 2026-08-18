#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staging = join(root, ".tmp/plugin-release");
const outDir = join(root, ".tmp/dist");

function stripTests(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      stripTests(full);
      continue;
    }
    if (/\.test\.(js|d\.ts|js\.map)$/.test(name) || name.endsWith(".map")) {
      rmSync(full);
    }
  }
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
mkdirSync(outDir, { recursive: true });

run("pnpm", ["--filter", "@dsh-store/protocol", "build"]);
run("pnpm", ["--filter", "@dsh-store/registry", "build"]);
run("pnpm", ["--filter", "@dsh-store/plugin", "build"]);

const pluginPkg = JSON.parse(readFileSync(join(root, "plugin/package.json"), "utf8"));
const protocolPkg = JSON.parse(readFileSync(join(root, "protocol/package.json"), "utf8"));
const registryPkg = JSON.parse(readFileSync(join(root, "packages/registry/package.json"), "utf8"));

cpSync(join(root, "plugin/dist"), join(staging, "dist"), { recursive: true });
stripTests(join(staging, "dist"));
cpSync(join(root, "plugin/data"), join(staging, "data"), { recursive: true });
cpSync(join(root, "plugin/cordis.patch.yml"), join(staging, "cordis.patch.yml"));
cpSync(join(root, "plugin/README.md"), join(staging, "README.md"));
cpSync(join(root, "LICENSE"), join(staging, "LICENSE"));

mkdirSync(join(staging, "vendor/@dsh-store/protocol"), { recursive: true });
mkdirSync(join(staging, "vendor/@dsh-store/registry"), { recursive: true });
cpSync(join(root, "protocol/dist"), join(staging, "vendor/@dsh-store/protocol/dist"), { recursive: true });
stripTests(join(staging, "vendor/@dsh-store/protocol/dist"));
cpSync(join(root, "protocol/schemas"), join(staging, "vendor/@dsh-store/protocol/schemas"), { recursive: true });
writeFileSync(
  join(staging, "vendor/@dsh-store/protocol/package.json"),
  `${JSON.stringify({ ...protocolPkg, scripts: undefined, devDependencies: undefined }, null, 2)}\n`,
);
cpSync(join(root, "packages/registry/dist"), join(staging, "vendor/@dsh-store/registry/dist"), { recursive: true });
stripTests(join(staging, "vendor/@dsh-store/registry/dist"));
if (existsSync(join(root, "packages/registry/data"))) {
  cpSync(join(root, "packages/registry/data"), join(staging, "vendor/@dsh-store/registry/data"), { recursive: true });
}
writeFileSync(
  join(staging, "vendor/@dsh-store/registry/package.json"),
  `${JSON.stringify(
    {
      ...registryPkg,
      scripts: undefined,
      devDependencies: undefined,
      dependencies: { "@dsh-store/protocol": "0.1.0", yaml: registryPkg.dependencies.yaml },
    },
    null,
    2,
  )}\n`,
);

const releasePkg = {
  name: pluginPkg.name,
  version: pluginPkg.version,
  license: pluginPkg.license,
  type: pluginPkg.type,
  description: pluginPkg.description,
  main: pluginPkg.main,
  exports: pluginPkg.exports,
  files: ["dist", "data", "vendor", "cordis.patch.yml", "README.md", "LICENSE"],
  publishConfig: pluginPkg.publishConfig,
  dsh: pluginPkg.dsh,
  dependencies: {
    "@dsh-store/protocol": "file:./vendor/@dsh-store/protocol",
    "@dsh-store/registry": "file:./vendor/@dsh-store/registry",
    yaml: registryPkg.dependencies.yaml,
    ajv: protocolPkg.dependencies.ajv,
    "ajv-formats": protocolPkg.dependencies["ajv-formats"],
  },
  peerDependencies: pluginPkg.peerDependencies,
  peerDependenciesMeta: pluginPkg.peerDependenciesMeta,
};
writeFileSync(join(staging, "package.json"), `${JSON.stringify(releasePkg, null, 2)}\n`);

run("pnpm", ["pack", "--pack-destination", outDir], staging);
const tarball = join(outDir, `dsh-store-plugin-${pluginPkg.version}.tgz`);
if (!existsSync(tarball)) {
  throw new Error(`expected ${tarball}`);
}
process.stdout.write(`packed ${tarball}\n`);
