export const HOST_ID = "dsh-store";
export const ROUTE_PREFIX = "/dsh-store";
export const SETTINGS_TABS = [
  { id: "store", order: 20 },
  { id: "installed", order: 25 },
  { id: "gaps", order: 30 },
] as const;

export function assertNoSettingsSection(registrations: Array<{ slot: string; id?: string }>): void {
  const hijack = registrations.find((item) => item.slot === "settings.section");
  if (hijack) {
    throw new Error("DSH Store must not register settings.section");
  }
}
