import { join } from "node:path";
import { canOneClickInstall, isMutableSpec, parseSearchParams } from "@dsh-store/protocol";
import {
  catalogCounts,
  exportUserPack,
  loadRankingSnapshot,
  previewPackApply,
  publicCountsCopy,
  publicDownload,
  search,
} from "@dsh-store/registry";
import { classifyActivation, compareImmutableVersions, restartAllowed, type ProfileSnapshot } from "./activation.js";
import { createBackup, planRestore } from "./backup.js";
import { loadCatalog } from "./catalog.js";
import { diagnose, recommend, stripSecrets } from "./diagnose.js";
import { planInstall, planUninstall, planUpdate } from "./install-plan.js";
import { listInstalled, listUpdates } from "./installed.js";
import { writeDownloadPack } from "./download-files.js";
import { executeIsolatedCommand } from "./exec.js";
import { canExec } from "./isolate.js";
import { applySnapshot, latestJournal, snapshotProfile, writeJournal } from "./journal.js";
import { advanceJob, cancelJob, createJob, jobStatus } from "./jobs.js";
import { addLocalReview, listLocalReviews } from "./reviews.js";
import { sanitizeUnknown } from "./sanitize.js";
import { createLocalStore, type LocalStore } from "./store.js";

export interface StoreRequest {
  method: "GET" | "POST";
  path: string;
  url: string;
  host?: string;
  origin?: string;
  sameOrigin?: boolean;
  body?: unknown;
}

export interface StoreResponse {
  status: number;
  body: unknown;
}

export interface HostContext {
  profile: ProfileSnapshot;
  loopback: boolean;
  store?: LocalStore;
}

function storeOf(ctx: HostContext): LocalStore {
  ctx.store ??= createLocalStore(ctx.profile);
  return ctx.store;
}

function bodyOf(req: StoreRequest): Record<string, unknown> {
  return req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
}

function findPlugin(pluginId: string) {
  return loadCatalog().plugins.find((item) => item.id === pluginId);
}

async function acceptMutation(
  ctx: HostContext,
  input: {
    action: "install" | "uninstall" | "update" | "rollback" | "restore";
    pluginId?: string;
    packageName?: string;
    command?: string;
    spec?: string;
    requiresBuildPermission?: boolean;
    after: { bundles: string[]; dependencies: Record<string, string> };
    activation?: string;
    passportId?: string;
    target?: string;
  },
): Promise<StoreResponse> {
  const store = storeOf(ctx);
  const job = createJob(store, input);
  if (input.requiresBuildPermission && input.packageName && !store.allowBuilds.has(input.packageName)) {
    advanceJob(store, job, "build_blocked", `lifecycle scripts blocked for ${input.packageName}`);
    advanceJob(store, job, "awaiting_build_approval", "explicit package key required before retry");
    return {
      status: 202,
      body: {
        accepted: false,
        job,
        stage: job.stage,
        note: "git/npm prepare is blocked until /dsh-store/approve-builds names this package key",
        mutatesHome: false,
      },
    };
  }
  for (const stage of ["fetching", "integrity_checked", "installing", "verifying"] as const) {
    advanceJob(store, job, stage, `${stage} ${input.target ?? input.packageName ?? ""}`);
  }
  const before = snapshotProfile(store.profile);
  const execGate = canExec({
    dshHome: store.dshHome,
    profile: store.profile.profile,
    allowExec: store.allowExec,
    allowUserHome: store.allowUserHome,
    allowWeb: store.allowWeb,
  });
  if (store.allowExec && store.dshHome && store.runner) {
    if (!execGate.allowed) {
      return { status: 403, body: { error: execGate.reason, mutatesHome: false } };
    }
    const executed = await executeIsolatedCommand({
      dshHome: store.dshHome,
      profile: store.profile.profile,
      action: input.action === "restore" ? "rollback" : input.action,
      spec: input.spec,
      packageName: input.packageName,
      restore: input.action === "rollback" ? { profile: store.profile.profile, ...input.after } : undefined,
      runner: store.runner,
      allowUserHome: store.allowUserHome,
      allowWeb: store.allowWeb,
    });
    if (!executed.ok) {
      advanceJob(store, job, "broken", executed.error ?? "isolated dsh plugin command failed");
      const journal = writeJournal(store, {
        profile: store.profile.profile,
        action: input.action,
        target: input.target,
        before,
        after: snapshotProfile(store.profile),
        activation: "broken",
        passportId: input.passportId,
      });
      return { status: 202, body: { accepted: false, job, journal, result: executed.result, mutatesHome: journal.mutatesHome } };
    }
    applySnapshot(store, { bundles: executed.snapshot.bundles, dependencies: executed.snapshot.dependencies });
  } else {
    applySnapshot(store, input.after);
  }
  const journal = writeJournal(store, {
    profile: store.profile.profile,
    action: input.action,
    target: input.target,
    before,
    after: snapshotProfile(store.profile),
    activation: input.activation,
    passportId: input.passportId,
  });
  const terminal = (input.activation as typeof job.stage | undefined) ?? "live";
  advanceJob(
    store,
    job,
    terminal,
    store.allowExec
      ? `executed isolated dsh plugin ${input.action}; journal persisted=${journal.persisted}`
      : `planned ${terminal}; journal persisted=${journal.persisted}; did not execute against the user's $DSH_HOME`,
  );
  return {
    status: 202,
    body: {
      accepted: true,
      job,
      journal,
      command: input.command,
      persisted: journal.persisted,
      mutatesHome: journal.mutatesHome,
      note: store.allowExec
        ? "Isolated profile execution. User web / $DSH_HOME were refused unless explicitly allowed."
        : "Fake profile. Journal may persist to an isolated state dir. This handler does not mutate the user's $DSH_HOME.",
    },
  };
}

export async function handleStoreRequest(req: StoreRequest, ctx: HostContext): Promise<StoreResponse> {
  const url = new URL(req.url, "http://127.0.0.1");
  const registry = loadCatalog();
  const store = storeOf(ctx);
  const path = url.pathname.replace(/\/$/, "") || "/";
  const body = bodyOf(req);

  if (req.method === "POST" && req.sameOrigin === false) {
    return { status: 403, body: { error: "same-origin required" } };
  }

  if (path === "/dsh-store/health" && req.method === "GET") {
    return {
      status: 200,
      body: {
        ok: true,
        plugin: "@dsh-store/plugin",
        profile: store.profile.profile,
        desktop: Boolean(store.profile.desktopProfiles),
        allowRestart: restartAllowed(store.profile, ctx.loopback),
        isolated: Boolean(store.dshHome && store.profile.profile !== "web" && !store.allowWeb),
        allowExec: Boolean(store.allowExec),
        persisted: Boolean(store.stateDir),
        live: Boolean(store.allowExec && store.allowWeb && store.profile.profile === "web"),
      },
    };
  }

  if ((path === "/dsh-store/registry" || path === "/dsh-store/search") && req.method === "GET") {
    const counts = catalogCounts(registry);
    return {
      status: 200,
      body: {
        generatedAt: counts.generatedAt,
        schemaVersion: 1,
        counts,
        countsCopy: publicCountsCopy(counts),
        plugins: search(registry, parseSearchParams(url.searchParams)).map((document) => ({
          id: document.plugin.id,
          title: document.plugin.title,
          description: document.plugin.description,
          awesomeCategory: document.plugin.awesomeCategory,
          trustState: document.plugin.trustState,
          versionId: document.version?.id,
          canInstall: canOneClickInstall(document.plugin.trustState),
        })),
      },
    };
  }

  if (path === "/dsh-store/installed" && req.method === "GET") {
    return {
      status: 200,
      body: {
        profile: store.profile.profile,
        items: listInstalled(registry, store.profile),
        journal: store.journal,
        mutatesHome: false,
      },
    };
  }

  if (path === "/dsh-store/updates" && req.method === "GET") {
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    if (before !== null && after !== null) {
      return { status: 200, body: { result: compareImmutableVersions(before, after) } };
    }
    return { status: 200, body: { items: listUpdates(registry, store.profile) } };
  }

  if (path === "/dsh-store/diagnose" && req.method === "GET") {
    return {
      status: 200,
      body: stripSecrets({
        ...diagnose({ profile: store.profile.profile, bundles: store.profile.bundles }),
      }),
    };
  }

  if (path === "/dsh-store/recommend" && req.method === "GET") {
    return { status: 200, body: recommend({ profile: store.profile.profile, bundles: store.profile.bundles }) };
  }

  if (path === "/dsh-store/open" && req.method === "GET") {
    return {
      status: 200,
      body: {
        target: url.searchParams.get("target"),
        version: url.searchParams.get("version"),
        installed: false,
        action: "open-detail",
      },
    };
  }

  if (path === "/dsh-store/preview" && req.method === "POST") {
    const plugin = findPlugin(String(body.pluginId ?? ""));
    if (!plugin) return { status: 404, body: { error: "not found" } };
    return {
      status: 200,
      body: planInstall(plugin, store.profile.profile, {
        forceWeb: Boolean(body.forceWeb),
        installedPluginIds: listInstalled(registry, store.profile).map((item) => item.pluginId).filter((id): id is string => Boolean(id)),
        registry,
      }),
    };
  }

  if (path === "/dsh-store/download" && req.method === "POST") {
    const plugin = findPlugin(String(body.pluginId ?? ""));
    if (!plugin) return { status: 404, body: { error: "not found" } };
    const written = store.stateDir ? writeDownloadPack(join(store.stateDir, "downloads"), plugin, registry) : undefined;
    return { status: 200, body: { ...publicDownload(plugin), written } };
  }

  if (path === "/dsh-store/install" && req.method === "POST") {
    const plugin = findPlugin(String(body.pluginId ?? ""));
    if (!plugin) return { status: 404, body: { error: "not found" } };
    const plan = planInstall(plugin, store.profile.profile, {
      forceWeb: Boolean(body.forceWeb),
      installedPluginIds: listInstalled(registry, store.profile).map((item) => item.pluginId).filter((id): id is string => Boolean(id)),
      registry,
    });
    if (!plan.allowed || !plan.packageName) return { status: 409, body: plan };
    const afterBundles = plan.expectedBundle && plan.hasBundle
      ? [...new Set([...store.profile.bundles, plan.packageName])]
      : store.profile.bundles;
    return acceptMutation(ctx, {
      action: "install",
      pluginId: plugin.id,
      packageName: plan.packageName,
      command: plan.command,
      spec: plan.spec,
      requiresBuildPermission: plan.requiresBuildPermission,
      target: plan.versionId,
      activation: plan.expectedBundle && !plan.hasBundle ? "inert" : "live",
      passportId: plugin.versions[0]?.passportId,
      after: {
        bundles: afterBundles,
        dependencies: { ...store.profile.dependencies, [plan.packageName]: plan.versionId ?? "" },
      },
    });
  }

  if (path === "/dsh-store/uninstall" && req.method === "POST") {
    const packageName = String(body.packageName ?? body.pluginId ?? "");
    const plugin = registry.plugins.find((item) => item.id === packageName || item.npmName === packageName);
    const name = plugin?.versions[0]?.installTarget.packageName ?? packageName;
    const plan = planUninstall(name, store.profile.profile, Boolean(body.confirm));
    if (!plan.allowed) return { status: 409, body: plan };
    const { [name]: _removed, ...dependencies } = store.profile.dependencies;
    return acceptMutation(ctx, {
      action: "uninstall",
      spec: name,
      pluginId: plugin?.id,
      packageName: name,
      command: plan.command,
      after: {
        bundles: store.profile.bundles.filter((item) => item !== name),
        dependencies,
      },
    });
  }

  if (path === "/dsh-store/update" && req.method === "POST") {
    const plugin = findPlugin(String(body.pluginId ?? ""));
    if (!plugin) return { status: 404, body: { error: "not found" } };
    const requested = body.versionId ? String(body.versionId) : undefined;
    if (requested && isMutableSpec(requested)) {
      return { status: 409, body: { allowed: false, reason: "update refuses @latest / branch / HEAD" } };
    }
    const plan = planUpdate(plugin, store.profile.profile, requested);
    if (!plan.allowed || !plan.packageName) return { status: 409, body: plan };
    const current = store.profile.dependencies[plan.packageName];
    if (current && plan.versionId && compareImmutableVersions(current, plan.versionId) === "unchanged") {
      return { status: 200, body: { result: "unchanged", versionId: plan.versionId } };
    }
    return acceptMutation(ctx, {
      action: "update",
      pluginId: plugin.id,
      packageName: plan.packageName,
      command: plan.command,
      spec: plan.spec,
      target: plan.versionId,
      after: {
        bundles: store.profile.bundles,
        dependencies: { ...store.profile.dependencies, [plan.packageName]: plan.versionId ?? "" },
      },
    });
  }

  if (path === "/dsh-store/rollback" && req.method === "POST") {
    if (!body.confirm) return { status: 409, body: { error: "rollback requires a second confirmation" } };
    const entry = latestJournal(store);
    if (!entry) return { status: 404, body: { error: "no journal to roll back" } };
    return acceptMutation(ctx, {
      action: "rollback",
      target: entry.journalId,
      after: entry.before,
    });
  }

  if (path === "/dsh-store/status" && req.method === "GET") {
    return { status: 200, body: jobStatus(store, url.searchParams.get("jobId") ?? undefined) };
  }

  if (path === "/dsh-store/cancel" && req.method === "POST") {
    const job = cancelJob(store, String(body.jobId ?? ""));
    return job ? { status: 200, body: { job, mutatesHome: false } } : { status: 404, body: { error: "job not found" } };
  }

  if (path === "/dsh-store/approve-builds" && req.method === "POST") {
    const packageName = String(body.packageName ?? "");
    if (!packageName) return { status: 400, body: { error: "explicit package key required; default deny" } };
    store.allowBuilds.add(packageName);
    return { status: 200, body: { allowed: true, packageName, note: "retry install after this approval; still does not write $DSH_HOME" } };
  }

  if (path === "/dsh-store/logs" && req.method === "GET") {
    const job = jobStatus(store, url.searchParams.get("jobId") ?? undefined).job;
    return {
      status: 200,
      body: sanitizeUnknown({
        lines: job?.stages.map((stage) => stage.log) ?? [],
        journal: store.journal,
        exported: false,
      }),
    };
  }

  if (path === "/dsh-store/backup" && req.method === "POST") {
    return {
      status: 200,
      body: createBackup(registry, store, {
        includeSettings: Boolean(body.includeSettings),
        confirmExportSettings: Boolean(body.confirmExportSettings),
      }),
    };
  }

  if (path === "/dsh-store/restore" && req.method === "POST") {
    const plan = planRestore(body.backup && typeof body.backup === "object" ? (body.backup as { plugins?: Array<{ pluginId?: string }> }) : body);
    return plan.allowed ? { status: 202, body: plan } : { status: 409, body: plan };
  }

  if (path === "/dsh-store/restart" && req.method === "POST") {
    if (!restartAllowed(store.profile, ctx.loopback)) {
      return { status: 403, body: { error: "restart hidden on Desktop / non-loopback" } };
    }
    return { status: 202, body: { accepted: true } };
  }

  if (path === "/dsh-store/reviews" && req.method === "GET") {
    return {
      status: 200,
      body: {
        reviews: listLocalReviews(store, url.searchParams.get("pluginId") ?? undefined),
        published: false,
        note: "local drafts only; public ratings stay closed",
      },
    };
  }

  if (path === "/dsh-store/reviews" && req.method === "POST") {
    const result = addLocalReview(store, {
      pluginId: body.pluginId ? String(body.pluginId) : undefined,
      versionId: body.versionId ? String(body.versionId) : undefined,
      dimensions: body.dimensions as Record<string, number> | undefined,
      body: body.body ? String(body.body) : undefined,
    });
    return { status: result.status, body: result.body };
  }

  if (path === "/dsh-store/pack/export" && req.method === "POST") {
    const installed = listInstalled(registry, store.profile).filter((item) => item.pluginId && item.versionId);
    const selected = Array.isArray(body.pluginIds) ? (body.pluginIds as string[]) : installed.map((item) => item.pluginId as string);
    const entries = installed
      .filter((item) => item.pluginId && selected.includes(item.pluginId))
      .map((item) => ({ pluginId: item.pluginId as string, versionId: item.versionId as string }));
    if (!entries.length) return { status: 409, body: { error: "no catalog-backed installed plugins to export" } };
    const share = exportUserPack({
      publisher: "user",
      slug: String(body.slug ?? `${store.profile.profile}-setup`),
      profile: store.profile.profile as "web",
      entries,
      registry,
      extras: (body.extras as Record<string, unknown>) ?? {},
    });
    return { status: 200, body: { ...share, mutatesHome: false } };
  }

  if (path === "/dsh-store/pack/apply" && req.method === "POST") {
    const pack = registry.packs.find((item) => item.id === String(body.packId ?? ""));
    if (!pack) return { status: 404, body: { error: "not found" } };
    const installedIds = listInstalled(registry, store.profile).map((item) => item.pluginId).filter((id): id is string => Boolean(id));
    return {
      status: 200,
      body: {
        ...previewPackApply(registry, pack, installedIds, store.profile.profile as "web" | "headless" | "desktop" | "any"),
        note: "expand every entry before confirming; this slice does not execute the pack",
      },
    };
  }

  if (path.startsWith("/dsh-store/rankings/") && req.method === "GET") {
    const board = path.slice("/dsh-store/rankings/".length);
    const snapshot = loadRankingSnapshot(board);
    return snapshot
      ? { status: 200, body: snapshot }
      : { status: 404, body: { error: "no materialized snapshot", board } };
  }

  return { status: 404, body: { error: `no route ${req.method} ${path}` } };
}

export { classifyActivation };
