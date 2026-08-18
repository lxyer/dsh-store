import { spawn } from "node:child_process";
import type { ProfileSnapshot } from "./activation.js";
import { assertSafeExec, dshAddArgv, dshRemoveArgv, profileDir } from "./isolate.js";
import { readProfileSnapshot, writeProfileSnapshot } from "./profile-fs.js";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
  argv: string[];
}

export interface CommandRunner {
  run(argv: string[], env: NodeJS.ProcessEnv, cwd: string): Promise<CommandResult>;
}

export function spawnRunner(): CommandRunner {
  return {
    run(argv, env, cwd) {
      return new Promise((resolve, reject) => {
        const child = spawn(argv[0] ?? "dsh", argv.slice(1), {
          cwd,
          env: { ...process.env, ...env },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += String(chunk);
        });
        child.stderr.on("data", (chunk) => {
          stderr += String(chunk);
        });
        child.on("error", reject);
        child.on("close", (code) => {
          resolve({ code: code ?? 1, stdout, stderr, argv });
        });
      });
    },
  };
}

export async function executeIsolatedCommand(input: {
  dshHome: string;
  profile: string;
  action: "install" | "uninstall" | "update" | "rollback";
  spec?: string;
  packageName?: string;
  restore?: ProfileSnapshot;
  runner: CommandRunner;
  allowUserHome?: boolean;
  allowWeb?: boolean;
}): Promise<{ ok: boolean; result?: CommandResult; snapshot: ProfileSnapshot; error?: string }> {
  assertSafeExec(input);
  const cwd = profileDir(input.dshHome, input.profile);
  const env = { DSH_HOME: input.dshHome, DSH_PROFILE: input.profile };
  if (input.action === "rollback" && input.restore) {
    writeProfileSnapshot(input.dshHome, input.restore);
    return { ok: true, snapshot: readProfileSnapshot(input.dshHome, input.profile) };
  }
  const argv =
    input.action === "uninstall"
      ? dshRemoveArgv(input.profile, input.packageName ?? input.spec ?? "")
      : dshAddArgv(input.profile, input.spec ?? input.packageName ?? "");
  const result = await input.runner.run(argv, env, cwd);
  const snapshot = readProfileSnapshot(input.dshHome, input.profile);
  if (result.code !== 0) {
    return { ok: false, result, snapshot, error: result.stderr || result.stdout || `exit ${result.code}` };
  }
  return { ok: true, result, snapshot };
}
