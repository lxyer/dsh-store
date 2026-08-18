import assert from "node:assert/strict";
import test from "node:test";
import { canOneClickInstall } from "@dsh-store/protocol";
import { mergeDiscovered } from "./discover.js";
import type { PluginRecord } from "@dsh-store/registry";

function fake(id: string, trustState: PluginRecord["trustState"], source: PluginRecord["sources"][number] = "discovered"): PluginRecord {
  return {
    schemaVersion: 1,
    id,
    publisher: "owner",
    title: { zh: id, en: id },
    description: { zh: id, en: id },
    trustState,
    sources: [source],
    versions: [
      {
        id: "npm:demo@0.0.0-discovered",
        pluginId: id,
        releasedAt: "2026-08-17T00:00:00.000Z",
        compatibility: { dshRange: "unknown", profiles: ["any"], desktop: "unknown" },
        installTarget: {
          pluginId: id,
          versionId: "npm:demo@0.0.0-discovered",
          packageName: "demo",
          subpath: null,
          profile: "web",
          requiresBuildPermission: false,
          expectedBundle: false,
        },
      },
    ],
  };
}

test("merged discovery never becomes one-click installable", () => {
  const merged = mergeDiscovered([
    [fake("github:acme/one", "screened", "curated"), fake("github:acme/two", "discovered")],
    [fake("github:acme/one", "featured", "curated")],
  ]);
  assert.equal(merged.length, 2);
  for (const plugin of merged) {
    assert.equal(canOneClickInstall(plugin.trustState), false);
    assert.notEqual(plugin.trustState, "featured");
    assert.notEqual(plugin.trustState, "installable");
  }
});
