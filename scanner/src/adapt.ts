import { SCANNER_VERSION, deriveTrustState, inspectPackageJson, pluginIdOf, type ScreenInput } from "./screen.js";

export interface AwesomePlugin {
  name: string;
  owner: string;
  url: string;
  category?: string;
  description?: { zh?: string; en?: string } | string;
  npm?: string | null;
  stars?: number;
  install?: string;
}

export interface HubPlugin {
  id: string;
  owner: string;
  name: string;
  repo: string;
  url?: string;
  curated?: boolean;
  topic?: boolean;
  stars?: number;
  installCommand?: string | null;
  license?: string | null;
  category?: string;
  description?: { zh?: string; en?: string };
  manifest?: {
    kinds?: string[];
    packageName?: string | null;
    version?: string | null;
    lifecycleScripts?: string[];
    state?: string;
  };
  screening?: {
    state?: string;
    findings?: Array<{ id: string; severity?: string }>;
  };
  discovery?: { source?: string };
}

export function fromAwesome(plugin: AwesomePlugin): ScreenInput {
  return {
    repo: `${plugin.owner}/${plugin.name}`,
    owner: plugin.owner,
    name: plugin.name,
    source: "curated",
    manifest: {
      name: plugin.npm ?? plugin.name,
      hasBundle: true,
      hasClient: false,
      lifecycleScripts: [],
      filesInspected: ["awesome/plugins.json"],
    },
  };
}

export function fromHub(plugin: HubPlugin): ScreenInput {
  const kinds = plugin.manifest?.kinds ?? [];
  const findings = (plugin.screening?.findings ?? []).map((finding) => ({
    id: finding.id,
    severity: (finding.severity as "low" | "medium" | "high") ?? "medium",
  }));
  return {
    repo: plugin.repo,
    owner: plugin.owner,
    name: plugin.name,
    source: plugin.curated ? "curated" : "topic",
    manifest: {
      name: plugin.manifest?.packageName ?? plugin.name,
      version: plugin.manifest?.version ?? undefined,
      license: plugin.license ?? null,
      hasBundle: kinds.includes("bundle") || plugin.manifest?.state === "verified",
      hasClient: kinds.includes("client"),
      lifecycleScripts: plugin.manifest?.lifecycleScripts ?? [],
      filesInspected: ["package.json"],
    },
    findings,
    uiHijack: findings.some((finding) => finding.id === "ui-hijack"),
  };
}

export function discoveryRecord(input: ScreenInput, fetchedAt: string) {
  const state = deriveTrustState(input);
  return {
    schemaVersion: 1,
    generatedAt: fetchedAt,
    scannerVersion: SCANNER_VERSION,
    pluginId: pluginIdOf(input),
    source: input.source,
    trustState: state,
    installable: false,
    featured: false,
    note: "Derived index only. Never a source of truth for one-click install.",
  };
}

export { inspectPackageJson };
