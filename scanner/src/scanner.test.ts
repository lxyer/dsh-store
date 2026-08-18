import assert from "node:assert/strict";
import test from "node:test";
import { deriveTrustState, inspectPackageJson } from "./screen.js";
import { fromHub } from "./adapt.js";

test("missing bundle is blocked", () => {
  const state = deriveTrustState({
    repo: "openma-ai/deepseek-harness-tui",
    owner: "openma-ai",
    name: "deepseek-harness-tui",
    source: "curated",
    manifest: {
      hasBundle: false,
      hasClient: false,
      lifecycleScripts: [],
      filesInspected: ["package.json"],
    },
  });
  assert.equal(state, "blocked");
});

test("topic discovery stays candidate", () => {
  const state = deriveTrustState({
    repo: "AKS1st/dsh-cyber-particle",
    owner: "AKS1st",
    name: "dsh-cyber-particle",
    source: "topic",
    manifest: {
      hasBundle: true,
      hasClient: true,
      lifecycleScripts: [],
      filesInspected: ["package.json"],
    },
  });
  assert.equal(state, "candidate");
});

test("prepare script requires review", () => {
  const manifest = inspectPackageJson({
    name: "dshmarket",
    dsh: { bundle: { patch: "./cordis.patch.yml" }, client: {} },
    scripts: { prepare: "pnpm build" },
  });
  assert.deepEqual(manifest.lifecycleScripts, ["prepare"]);
  assert.equal(
    deriveTrustState({
      repo: "dsh-market/dsh-market",
      owner: "dsh-market",
      name: "dsh-market",
      source: "curated",
      manifest,
    }),
    "review_required",
  );
});

test("client-only fixture cannot become a profile layer", () => {
  const manifest = inspectPackageJson({
    name: "@dsh-store/fixture-client-only",
    dsh: { client: { platform: "web" } },
  });
  assert.equal(manifest.hasBundle, false);
  assert.equal(manifest.hasClient, true);
  assert.equal(
    deriveTrustState({
      repo: "dsh-store/fixture-client-only",
      owner: "dsh-store",
      name: "fixture-client-only",
      source: "author_pr",
      manifest,
    }),
    "blocked",
  );
});

test("hub blocked plugin stays non-installable", () => {
  const input = fromHub({
    id: "openma-ai/deepseek-harness-tui",
    owner: "openma-ai",
    name: "deepseek-harness-tui",
    repo: "openma-ai/deepseek-harness-tui",
    curated: true,
    manifest: { kinds: [], state: "missing" },
    screening: { state: "blocked", findings: [{ id: "manifest-missing", severity: "high" }] },
  });
  assert.equal(deriveTrustState(input), "blocked");
});
