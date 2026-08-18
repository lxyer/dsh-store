import { classifyActivation } from "./activation.js";
import { sanitizeLog } from "./sanitize.js";
import { nextId, type JobRecord, type JobStage, type LocalStore } from "./store.js";

const TERMINAL: JobStage[] = ["live", "restart", "inert", "broken", "cancelled", "unchanged"];
const STALL_MS = 15_000;

export function createJob(
  store: LocalStore,
  input: Pick<JobRecord, "action" | "pluginId" | "packageName" | "command">,
): JobRecord {
  const at = store.now();
  const job: JobRecord = {
    id: nextId("job", at),
    action: input.action,
    pluginId: input.pluginId,
    packageName: input.packageName,
    stage: "previewed",
    stages: [{ stage: "previewed", at, log: sanitizeLog(`preview ${input.action} ${input.pluginId ?? input.packageName ?? ""}`) }],
    lastStageAt: at,
    command: input.command,
    mutatesHome: false,
  };
  store.jobs.set(job.id, job);
  return job;
}

export function advanceJob(store: LocalStore, job: JobRecord, stage: JobStage, log: string): JobRecord {
  const at = store.now();
  job.stage = stage;
  job.lastStageAt = at;
  job.stages.push({ stage, at, log: sanitizeLog(log) });
  return job;
}

export function jobStatus(store: LocalStore, jobId?: string) {
  const job = jobId ? store.jobs.get(jobId) : [...store.jobs.values()].at(-1);
  if (!job) return { job: null, stalled: false };
  const stalled = !TERMINAL.includes(job.stage) && store.now() - job.lastStageAt >= STALL_MS;
  return {
    job,
    stalled,
    currentCommand: job.command,
    lastLogLine: job.stages.at(-1)?.log,
    cancel: stalled || !TERMINAL.includes(job.stage),
    mutatesHome: false,
  };
}

export function cancelJob(store: LocalStore, jobId: string): JobRecord | undefined {
  const job = store.jobs.get(jobId);
  if (!job || TERMINAL.includes(job.stage)) return job;
  job.cancelled = true;
  return advanceJob(store, job, "cancelled", "cancelled before host execution");
}

export function plannedActivation(profileBundles: string[], packageName: string, hasBundle: boolean, expectedBundle: boolean) {
  return classifyActivation(
    { profile: "web", bundles: profileBundles, dependencies: { [packageName]: "planned" } },
    {
      packageName,
      expectedPackageName: packageName,
      hasBundle,
      hasClient: false,
      expectedBundle,
    },
  );
}
