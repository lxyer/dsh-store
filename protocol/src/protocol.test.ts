import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertValid,
  canOneClickInstall,
  canTransition,
  installActionAllowed,
  isMutableSpec,
  isPluginId,
  isVersionId,
  parseSearchParams,
  searchHref,
  validate,
} from "./index.js";

const examplesDir = join(dirname(fileURLToPath(import.meta.url)), "../examples");

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(examplesDir, name), "utf8"));
}

const section46Pack = {
  id: "pack:dsh-store/we-media-starter",
  version: "0.1.0",
  title: { zh: "自媒体起步包", en: "We-media starter pack" },
  kind: "official",
  profileTarget: "web",
  entries: [
    {
      ref: "github:Anionex/dsh-vision-toolkit",
      version: "npm:@anionex/dsh-vision-toolkit@0.1.18",
      role: "alreadyCovered",
    },
    {
      ref: "github:renpengfei1027/dsh-web-notify",
      version: "npm:dsh-web-notify@0.1.4",
      role: "required",
    },
  ],
  mutexGroups: [{ id: "theme", policy: "single" }],
  conflicts: [
    {
      plugin: "github:linxin666/dsh-web-ui-all",
      reason: "侵入式 Web UI 会遮挡官方设置",
    },
  ],
  capabilityCoverage: ["cap.scene.we-media", "cap.product.vision", "cap.product.notify"],
  installPolicy: {
    stopOnBlocked: true,
    requirePassport: true,
    allowCandidate: false,
  },
  completeness: "partial",
};

test("stable ids reject mutable names", () => {
  assert.equal(isPluginId("github:Anionex/dsh-vision-toolkit"), true);
  assert.equal(isPluginId("github:owner/repo#packages/sub"), true);
  assert.equal(isPluginId("@anionex/dsh-vision-toolkit"), false);
  assert.equal(isVersionId("npm:@anionex/dsh-vision-toolkit@0.1.18"), true);
  assert.equal(
    isVersionId("git:github.com/lussey820/dsh-http-tools@fdc1b71738ac40a9fae0a5f6c02c81f7107f0a41"),
    true,
  );
  assert.equal(isVersionId("npm:@anionex/dsh-vision-toolkit@latest"), false);
  assert.equal(isMutableSpec("dshmarket@latest"), true);
  assert.equal(isMutableSpec("github:owner/repo#main"), true);
});

test("trust state machine blocks automatic installable promotion", () => {
  assert.equal(canTransition("discovered", "candidate"), true);
  assert.equal(canTransition("candidate", "installable"), false);
  assert.equal(canOneClickInstall("candidate"), false);
  assert.equal(canOneClickInstall("blocked"), false);
  assert.equal(canOneClickInstall("featured"), true);
  assert.equal(installActionAllowed("installable", "site").allowed, false);
  assert.equal(installActionAllowed("blocked", "plugin").allowed, false);
  assert.equal(installActionAllowed("installable", "plugin").allowed, true);
});

test("section 6.2 install target example validates", () => {
  assertValid("install-target", loadJson("install-target.vision.json"));
});

test("section 10 identity review example validates", () => {
  assertValid("review", loadJson("review.identity.json"));
  assert.equal(validate("review", { ...loadJson("review.identity.json") as object, versionId: "latest" }).ok, false);
});

test("section 4.6 pack example validates", () => {
  assertValid("pack", section46Pack);
  assertValid("pack-lock", loadJson("pack-lock.we-media-starter.json"));
  const yaml = readFileSync(join(examplesDir, "pack.we-media-starter.yaml"), "utf8");
  assert.match(yaml, /id: pack:dsh-store\/we-media-starter/);
  assert.match(yaml, /allowCandidate: false/);
});

test("mutable install targets are rejected", () => {
  const bad = {
    pluginId: "github:Anionex/dsh-vision-toolkit",
    versionId: "npm:@anionex/dsh-vision-toolkit@latest",
    packageName: "@anionex/dsh-vision-toolkit",
    profile: "web",
    expectedBundle: true,
    requiresBuildPermission: false,
  };
  assert.equal(validate("install-target", bad).ok, false);
});

test("search query round-trips without mixing scene and category", () => {
  const href = searchHref({
    q: "notify",
    category: ["tools"],
    scene: ["cap.scene.we-media"],
    trustState: ["installable"],
    sort: "capability_fill",
  });
  assert.match(href, /category=tools/);
  assert.match(href, /scene=cap.scene.we-media/);
  const parsed = parseSearchParams(new URL(href, "https://store.dsh.dev").searchParams);
  assert.deepEqual(parsed.category, ["tools"]);
  assert.deepEqual(parsed.scene, ["cap.scene.we-media"]);
  assert.notEqual(parsed.category?.[0], parsed.scene?.[0]);
  assert.equal(validate("search-query", { sort: "star_growth" }).ok, true);
  assert.equal(parseSearchParams(new URL("/search?lang=en", "https://store.dsh.dev").searchParams).lang, "en");
});
