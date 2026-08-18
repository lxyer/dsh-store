import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const ISOLATED_PROFILE = "dsh-store-isolated";
export const USER_WEB_PROFILE = "web";

export function defaultUserDshHome(): string {
  return resolve(homedir(), ".dsh");
}

export function isUserDshHome(dshHome: string): boolean {
  return resolve(dshHome) === defaultUserDshHome();
}

export function isolatedHomeFrom(root: string): string {
  return join(root, ".tmp", "isolated-dsh-home");
}

export function profileDir(dshHome: string, profile: string): string {
  return join(dshHome, "profiles", profile);
}

export function storeStateDir(dshHome: string, profile: string): string {
  return join(profileDir(dshHome, profile), ".dsh-store");
}

export function assertSafeExec(input: {
  dshHome: string;
  profile: string;
  allowUserHome?: boolean;
  allowWeb?: boolean;
}): void {
  if (isUserDshHome(input.dshHome) && !input.allowUserHome) {
    throw new Error("refusing to execute against the user's current $DSH_HOME");
  }
  if (input.profile === USER_WEB_PROFILE && !input.allowWeb) {
    throw new Error("refusing to execute against the current web profile");
  }
}

export function canExec(input: {
  dshHome?: string;
  profile: string;
  allowExec?: boolean;
  allowUserHome?: boolean;
  allowWeb?: boolean;
}): { allowed: boolean; reason: string } {
  if (!input.allowExec) return { allowed: false, reason: "execution is opt-in for isolated profiles only" };
  if (!input.dshHome) return { allowed: false, reason: "isolated DSH_HOME is required before dsh plugin add" };
  try {
    assertSafeExec({
      dshHome: input.dshHome,
      profile: input.profile,
      allowUserHome: input.allowUserHome,
      allowWeb: input.allowWeb,
    });
  } catch (error) {
    return { allowed: false, reason: (error as Error).message };
  }
  return { allowed: true, reason: "isolated profile execution" };
}

export function dshAddArgv(profile: string, spec: string): string[] {
  return ["dsh", "plugin", "--profile", profile, "add", spec];
}

export function dshRemoveArgv(profile: string, spec: string): string[] {
  return ["dsh", "plugin", "--profile", profile, "remove", spec];
}
