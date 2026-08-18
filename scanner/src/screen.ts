import { type TrustState } from "@dsh-store/protocol";

export const SCANNER_VERSION = 2;

export interface ManifestSignal {
  name?: string;
  version?: string;
  license?: string | null;
  hasBundle: boolean;
  hasClient: boolean;
  subpath?: string | null;
  lifecycleScripts: string[];
  filesInspected: string[];
}

export interface ScreenInput {
  repo: string;
  owner: string;
  name: string;
  source: "curated" | "topic" | "author_pr";
  manifest: ManifestSignal;
  findings?: Array<{ id: string; severity: "low" | "medium" | "high" }>;
  uiHijack?: boolean;
}

export function deriveTrustState(input: ScreenInput): TrustState {
  if (!input.manifest.hasBundle) return "blocked";
  if (input.uiHijack) return "blocked";
  if ((input.findings ?? []).some((finding) => finding.severity === "high")) return "blocked";
  if (input.manifest.lifecycleScripts.length) return "review_required";
  if ((input.findings ?? []).some((finding) => finding.severity === "medium")) return "review_required";
  if (input.source === "topic") return "candidate";
  return "screened";
}

export function assertNotInstallable(state: TrustState): void {
  if (state === "installable" || state === "featured") {
    throw new Error("scanner output cannot be installable or featured");
  }
}

export function pluginIdOf(input: ScreenInput): string {
  return input.manifest.subpath
    ? `github:${input.owner}/${input.name}#${input.manifest.subpath}`
    : `github:${input.owner}/${input.name}`;
}

export function inspectPackageJson(pkg: Record<string, unknown>, path = "package.json"): ManifestSignal {
  const dsh = (pkg.dsh ?? {}) as { bundle?: unknown; client?: unknown };
  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  const lifecycle = ["preinstall", "install", "prepare", "postinstall"].filter((key) => key in scripts);
  return {
    name: typeof pkg.name === "string" ? pkg.name : undefined,
    version: typeof pkg.version === "string" ? pkg.version : undefined,
    license: typeof pkg.license === "string" ? pkg.license : null,
    hasBundle: Boolean(dsh.bundle),
    hasClient: Boolean(dsh.client),
    subpath: null,
    lifecycleScripts: lifecycle,
    filesInspected: [path],
  };
}
