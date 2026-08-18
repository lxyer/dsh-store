export const IDENTITY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoreIdentity {
  id: string;
  kind: "github" | "journal";
  createdAt: string;
  login: string;
}

export function headerValue(headers: Record<string, string | undefined>, name: string): string | undefined {
  const direct = headers[name];
  if (direct) return direct;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

export function parseIdentity(headers: Record<string, string | undefined>): StoreIdentity | { error: string } {
  const raw =
    headerValue(headers, "x-dsh-identity") ??
    headerValue(headers, "authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) return { error: "public reviews require GitHub or install-journal identity" };
  const match = /^(github|journal):([A-Za-z0-9_.-]+)$/.exec(raw.trim());
  if (!match) return { error: "identity must be github:<login> or journal:<journalId>" };
  const createdAt = headerValue(headers, "x-dsh-identity-created-at");
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    return { error: "X-DSH-Identity-Created-At must be an ISO timestamp" };
  }
  return {
    id: `${match[1]}:${match[2]}`,
    kind: match[1] as "github" | "journal",
    createdAt,
    login: match[2] ?? "",
  };
}

export function identityCooledDown(identity: StoreIdentity, now: number): boolean {
  return now - Date.parse(identity.createdAt) >= IDENTITY_COOLDOWN_MS;
}
