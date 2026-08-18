import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { passportFor, publicDownload, type LoadedRegistry, type PluginRecord } from "@dsh-store/registry";

export function writeDownloadPack(outputRoot: string, plugin: PluginRecord, registry?: LoadedRegistry) {
  const manifest = publicDownload(plugin);
  const dir = join(outputRoot, `${plugin.id.replace(/[/:]/g, "__")}@${manifest.versionId.replace(/[/:]/g, "__")}`);
  mkdirSync(dir, { recursive: true });
  const files: Record<string, string> = {
    "install-command.txt": manifest.installCommand ?? "no locked install command",
    "passport.json": JSON.stringify(registry ? (passportFor(registry, manifest.versionId) ?? { missing: true }) : { missing: true }, null, 2),
    "release-notes.md": plugin.versions[0]?.releaseNotes?.zh ?? "No release notes.",
    "sbom.json": JSON.stringify({ missing: true, note: "SBOM not generated in this slice" }, null, 2),
    "install.sh": `#!/bin/sh\n# default: print only, do not execute\necho ${JSON.stringify(manifest.installCommand ?? "")}\n`,
  };
  const written: string[] = [];
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body.endsWith("\n") ? body : `${body}\n`);
    written.push(name);
  }
  const sums = written
    .map((name) => {
      const hash = createHash("sha256").update(files[name] ?? "").digest("hex");
      return `${hash}  ${name}`;
    })
    .join("\n");
  writeFileSync(join(dir, "SHA256SUMS"), `${sums}\n`);
  return {
    dir,
    files: [...written, "SHA256SUMS"],
    installCommand: manifest.installCommand,
    mutatesHome: false as const,
  };
}
