import { type TrustState, canOneClickInstall } from "./ids.js";

export const TRUST_TRANSITIONS: Record<TrustState, readonly TrustState[]> = {
  discovered: ["candidate", "blocked"],
  candidate: ["screened", "review_required", "blocked"],
  screened: ["review_required", "installable", "blocked"],
  review_required: ["screened", "installable", "blocked"],
  installable: ["featured", "review_required", "blocked", "screened"],
  featured: ["installable", "review_required", "blocked"],
  blocked: ["review_required", "candidate"],
};

export function canTransition(from: TrustState, to: TrustState): boolean {
  if (from === to) return true;
  return TRUST_TRANSITIONS[from].includes(to);
}

export function assertManualPromotion(from: TrustState, to: TrustState, actor: "scanner" | "maintainer"): void {
  if (actor === "scanner" && (to === "installable" || to === "featured")) {
    throw new Error("scanner cannot promote to installable or featured");
  }
  if (!canTransition(from, to)) {
    throw new Error(`illegal trust transition ${from} -> ${to}`);
  }
}

export function installActionAllowed(trustState: TrustState, surface: "site" | "plugin" | "agent"): {
  allowed: boolean;
  reason: string;
} {
  if (trustState === "blocked") {
    return { allowed: false, reason: "blocked plugins have no install action" };
  }
  if (!canOneClickInstall(trustState)) {
    return { allowed: false, reason: `${trustState} is not an installable trust state` };
  }
  if (surface === "site") {
    return { allowed: false, reason: "site may only emit locked commands, tarballs, and deep links" };
  }
  return { allowed: true, reason: "installable on the local host after confirmation" };
}

export function countsMustStaySeparate(input: {
  curated?: number;
  autoDiscovered?: number;
  installable?: number;
  blocked?: number;
  listed?: number;
}): string[] {
  const keys = Object.entries(input).filter(([, value]) => typeof value === "number");
  if (keys.length < 2) return [];
  return keys.map(([key, value]) => `${key}=${value}`);
}
