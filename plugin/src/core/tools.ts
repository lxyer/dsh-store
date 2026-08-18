import { canOneClickInstall } from "@dsh-store/protocol";
import { previewPackApply } from "@dsh-store/registry";
import { loadCatalog } from "./catalog.js";
import { diagnose, recommend } from "./diagnose.js";
import { planInstall } from "./install-plan.js";

interface ToolRuntimeLike {
  register(definition: unknown): () => void;
}

function jsonTool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  execute: (args: Record<string, unknown>) => Promise<unknown>,
) {
  return {
    name,
    description,
    parameters,
    output: {
      schema: { type: "object", additionalProperties: true },
      render(_args: unknown, value: unknown) {
        return [{ type: "text", text: JSON.stringify(value, null, 2) }];
      },
    },
    async execute(args: unknown) {
      return execute((args ?? {}) as Record<string, unknown>);
    },
  };
}

export function registerAgentTools(tools: ToolRuntimeLike, profile: string, bundles: string[]): () => void {
  const catalog = loadCatalog();
  const disposers = [
    tools.register(
      jsonTool(
        "dsh_store_search",
        "Search the DSH Store registry by text or capability. Never installs.",
        {
          type: "object",
          additionalProperties: false,
          properties: { q: { type: "string", description: "Free-text, npm name, repo, or capability id" } },
        },
        async (args) => {
          const q = String(args.q ?? "").toLowerCase();
          return {
            plugins: catalog.plugins
              .filter((plugin) => !q || JSON.stringify(plugin).toLowerCase().includes(q))
              .slice(0, 20)
              .map((plugin) => ({ id: plugin.id, trustState: plugin.trustState, title: plugin.title })),
          };
        },
      ),
    ),
    tools.register(
      jsonTool(
        "dsh_store_diagnose",
        "Diagnose capability gaps on the current profile. Output never includes secrets or chat.",
        { type: "object", additionalProperties: false, properties: {} },
        async () => diagnose({ profile, bundles }),
      ),
    ),
    tools.register(
      jsonTool(
        "dsh_store_recommend",
        "Return an explainable recommendation. Does not install.",
        { type: "object", additionalProperties: false, properties: {} },
        async () => recommend({ profile, bundles }),
      ),
    ),
    tools.register(
      jsonTool(
        "dsh_store_preview_install",
        "Preview the locked install command and files that would change. Requires confirmation before dsh_store_install.",
        {
          type: "object",
          additionalProperties: false,
          properties: { pluginId: { type: "string", description: "github:owner/repo" } },
          required: ["pluginId"],
        },
        async (args) => {
          const plugin = catalog.plugins.find((item) => item.id === args.pluginId);
          if (!plugin) return { allowed: false, reason: "not found" };
          return planInstall(plugin, profile);
        },
      ),
    ),
    tools.register(
      jsonTool(
        "dsh_store_install",
        "Install an already-promoted plugin on this machine. Blocked and candidate targets are rejected.",
        {
          type: "object",
          additionalProperties: false,
          properties: { pluginId: { type: "string", description: "github:owner/repo" } },
          required: ["pluginId"],
        },
        async (args) => {
          const plugin = catalog.plugins.find((item) => item.id === args.pluginId);
          if (!plugin || !canOneClickInstall(plugin.trustState)) {
            return { allowed: false, reason: "agent cannot install this trust state" };
          }
          return planInstall(plugin, profile);
        },
      ),
    ),
    tools.register(
      jsonTool(
        "dsh_store_pack_apply",
        "Preview applying a pack. Requires confirmation and expands every entry. Does not execute in this revision.",
        {
          type: "object",
          additionalProperties: false,
          properties: { packId: { type: "string" } },
          required: ["packId"],
        },
        async (args) => {
          const pack = catalog.packs.find((item) => item.id === args.packId);
          if (!pack) return { allowed: false, reason: "not found" };
          return {
            ...previewPackApply(catalog, pack, [], profile as "web" | "headless" | "desktop" | "any"),
            note: "expand every entry before confirming; agent cannot execute the pack in this slice",
          };
        },
      ),
    ),
  ];
  return () => {
    for (const dispose of disposers) dispose();
  };
}
