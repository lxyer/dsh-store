import type { IncomingMessage, ServerResponse } from "node:http";
import { spawnRunner } from "../core/exec.js";
import { handleStoreRequest, type HostContext } from "../core/http.js";
import { ROUTE_PREFIX } from "../core/ids.js";
import { defaultUserDshHome, storeStateDir } from "../core/isolate.js";
import { readProfileSnapshot } from "../core/profile-fs.js";
import { processLocalStore } from "../core/store.js";
import { registerAgentTools } from "../core/tools.js";

interface CordisContext {
  webServer?: {
    register(route: {
      kind: "prefix" | "exact";
      path: string;
      handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
    }): () => void;
  };
  tools?: { register(definition: unknown): () => void };
  get?(name: string): { register(definition: unknown): () => void } | undefined;
  effect?(dispose: () => void, name?: string): void;
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      if (!chunks.length) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function hostContext(): HostContext {
  const dshHome = process.env.DSH_HOME || defaultUserDshHome();
  const profileName = process.env.DSH_PROFILE || "web";
  const live = process.env.DSH_STORE_LIVE !== "0";
  const snapshot = readProfileSnapshot(dshHome, profileName);
  const profile = {
    ...snapshot,
    desktopProfiles: Boolean(process.env.DSH_DESKTOP_PROFILES),
  };
  return {
    loopback: true,
    profile,
    store: processLocalStore(profile, {
      dshHome,
      stateDir: storeStateDir(dshHome, profileName),
      allowExec: live,
      allowUserHome: live,
      allowWeb: live && profileName === "web",
      runner: spawnRunner(),
    }),
  };
}

function sameOrigin(req: IncomingMessage): boolean {
  const host = req.headers.host ?? "";
  const origin = req.headers.origin;
  if (!origin) return host.startsWith("127.0.0.1") || host.startsWith("localhost");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url ?? "/";
  const method = (req.method === "POST" ? "POST" : "GET") as "GET" | "POST";
  const body = method === "POST" ? await readBody(req) : undefined;
  const response = await handleStoreRequest(
    {
      method,
      path: url.split("?")[0] ?? url,
      url,
      host: req.headers.host,
      origin: req.headers.origin,
      sameOrigin: sameOrigin(req),
      body,
    },
    hostContext(),
  );
  res.statusCode = response.status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(response.body));
}

export const name = "@dsh-store/plugin";
export const inject = ["webServer"];

export function apply(ctx: CordisContext): void {
  const webServer = ctx.webServer;
  if (!webServer) return;
  // effect() collects the function *returned* by the factory. Passing
  // register() directly would run the disposer immediately and drop the route.
  ctx.effect?.(
    () => webServer.register({
      kind: "prefix",
      path: ROUTE_PREFIX,
      handler: (req, res) => {
        void route(req, res).catch((error) => {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: (error as Error).message }));
        });
      },
    }),
    "dsh-store: routes",
  );

  // Cordis throws on undeclared ctx.tools. tools is optional: only ctx.get().
  const tools = ctx.get?.("tools");
  if (tools) {
    const local = hostContext();
    ctx.effect?.(() => registerAgentTools(tools, local.profile.profile, local.profile.bundles), "dsh-store: agent tools");
  }
}

export default { name, inject, apply };
