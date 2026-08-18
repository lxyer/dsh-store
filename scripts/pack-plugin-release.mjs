#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staging = join(root, ".tmp/plugin-release");
const outDir = join(root, ".tmp/dist");

function rewriteSpecifiers(dir, replacements) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      rewriteSpecifiers(full, replacements);
      continue;
    }
    if (!name.endsWith(".js") && !name.endsWith(".d.ts")) continue;
    let text = readFileSync(full, "utf8");
    const before = text;
    for (const [from, to] of Object.entries(replacements)) {
      text = text.replaceAll(`from "${from}"`, `from "${to}"`);
      text = text.replaceAll(`from '${from}'`, `from '${to}'`);
    }
    if (text !== before) writeFileSync(full, text);
  }
}

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

mkdirSync(join(staging, "vendor/protocol"), { recursive: true });
mkdirSync(join(staging, "vendor/registry"), { recursive: true });
cpSync(join(root, "protocol/dist"), join(staging, "vendor/protocol"), { recursive: true });
stripTests(join(staging, "vendor/protocol"));
cpSync(join(root, "protocol/schemas"), join(staging, "vendor/protocol/schemas"), { recursive: true });
cpSync(join(root, "packages/registry/dist"), join(staging, "vendor/registry"), { recursive: true });
stripTests(join(staging, "vendor/registry"));
if (existsSync(join(root, "packages/registry/data"))) {
  cpSync(join(root, "packages/registry/data"), join(staging, "vendor/registry/data"), { recursive: true });
}

rewriteSpecifiers(join(staging, "dist/core"), {
  "@dsh-store/protocol": "../../vendor/protocol/index.js",
  "@dsh-store/registry": "../../vendor/registry/index.js",
});
rewriteSpecifiers(join(staging, "dist/host"), {
  "@dsh-store/protocol": "../../vendor/protocol/index.js",
  "@dsh-store/registry": "../../vendor/registry/index.js",
});
rewriteSpecifiers(join(staging, "dist/cli"), {
  "@dsh-store/protocol": "../../vendor/protocol/index.js",
  "@dsh-store/registry": "../../vendor/registry/index.js",
});
rewriteSpecifiers(join(staging, "vendor/registry"), {
  "@dsh-store/protocol": "../protocol/index.js",
});

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
