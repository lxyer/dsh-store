export interface LocalCoverage {
  profile: string;
  bundles: string[];
  providerMisconfigured?: string[];
}

export interface Diagnosis {
  alreadyCovered: Array<{ capability: string; pluginId: string; note?: string }>;
  missing: string[];
  rejectedAlternatives: Array<{ pluginId: string; reason: string }>;
  warnings: string[];
}

const VISION_PLUGIN = "github:Anionex/dsh-vision-toolkit";

export function diagnose(local: LocalCoverage): Diagnosis {
  const covered: Diagnosis["alreadyCovered"] = [];
  const missing = [
    "cap.product.notify",
    "cap.product.browser",
    "cap.product.materials",
    "cap.product.memory",
    "cap.product.workflow",
    "cap.product.multi-model",
  ];
  const warnings: string[] = [];

  if (local.bundles.some((bundle) => bundle.includes("dsh-vision-toolkit"))) {
    covered.push({
      capability: "cap.product.vision",
      pluginId: VISION_PLUGIN,
      note: "local profile already remapped the toolkit onto OpenCodex; do not treat provider misconfig as a missing plugin",
    });
  } else {
    missing.unshift("cap.product.vision");
  }

  for (const provider of local.providerMisconfigured ?? []) {
    warnings.push(`current provider is not configured: ${provider}`);
  }

  const rejectedAlternatives = covered.some((item) => item.capability === "cap.product.vision")
    ? [{ pluginId: "github:54xkeee/dsh-vision", reason: "capability_already_covered" }]
    : [];

  return { alreadyCovered: covered, missing, rejectedAlternatives, warnings };
}

export function recommend(local: LocalCoverage) {
  const diagnosis = diagnose(local);
  return {
    recommendationId: "rec_local_web_profile",
    problem: diagnosis.missing.map((capability) => `${capability}: missing`),
    alreadyCovered: diagnosis.alreadyCovered,
    rejectedAlternatives: diagnosis.rejectedAlternatives,
    items: diagnosis.missing.includes("cap.product.notify")
      ? [
          {
            pluginId: "github:renpengfei1027/dsh-web-notify",
            versionId: "npm:dsh-web-notify@0.1.4",
            fills: ["cap.product.notify"],
            trustState: "installable",
            why: [
              "current bundles have no notify seam / product.notify",
              "passport has no credential-leak signal",
              "target profile=web",
            ],
          },
        ]
      : [],
    warnings: diagnosis.warnings,
  };
}

export function stripSecrets<T extends Record<string, unknown>>(input: T): T {
  const blocked = /token|secret|password|credential|api[_-]?key|cookie/i;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (blocked.test(key)) continue;
    if (typeof value === "string" && blocked.test(value)) continue;
    out[key] = value;
  }
  return out as T;
}
