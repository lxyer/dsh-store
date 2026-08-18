import { createElement, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { SETTINGS_TABS } from "../core/ids.js";

interface ClientContext {
  slots: {
    inject(name: string, factory: () => unknown): void;
    register(options: Record<string, unknown>, component: unknown): unknown;
  };
  locale?: {
    getLocale(): { active: "zh" | "en" };
    register?(ns: string, dicts: Record<string, Record<string, string>>): () => void;
  };
  effect?(dispose: () => void, name?: string): void;
}

interface CatalogPlugin {
  id: string;
  title: { zh: string; en?: string };
  description?: { zh: string; en?: string };
  awesomeCategory?: string;
  trustState: string;
  canInstall: boolean;
  versionId?: string;
}

type Lang = "zh" | "en";

const NS = "dsh.store";

const DICTS: Record<Lang, Record<string, string>> = {
  zh: {
    storeTab: "DSH Store",
    installedTab: "已装",
    gapsTab: "能力诊断",
    storeTitle: "DSH Store",
    storeLead: "搜索、护照、锁定安装。本页直接改当前 web profile。",
    search: "搜索",
    searchPlaceholder: "中文 / English / npm / owner/repo",
    category: "分类",
    trust: "信任",
    preview: "预览",
    download: "只下载",
    install: "本机安装",
    noInstall: "无安装按钮",
    installedTitle: "已装与回滚",
    installedLead: "live / restart / inert / broken。回滚读 journal 快照。",
    rollback: "回滚上一笔",
    restartHidden: "重启按钮已隐藏",
    restart: "本机重启",
    gapsTitle: "能力诊断",
    gapsLead: "先看已经覆盖什么，再解释为什么推荐。",
    covered: "已覆盖",
    rejected: "拒绝",
    recommend: "推荐",
    liveHint: "当前是本机 web profile。安装会写入 $DSH_HOME/profiles/web。",
    zh: "中文",
    en: "EN",
  },
  en: {
    storeTab: "DSH Store",
    installedTab: "Installed",
    gapsTab: "Gaps",
    storeTitle: "DSH Store",
    storeLead: "Search, passports, locked installs. This tab writes the current web profile.",
    search: "Search",
    searchPlaceholder: "Chinese / English / npm / owner/repo",
    category: "Category",
    trust: "Trust",
    preview: "Preview",
    download: "Download only",
    install: "Install locally",
    noInstall: "No install button",
    installedTitle: "Installed & rollback",
    installedLead: "live / restart / inert / broken. Rollback reads the journal snapshot.",
    rollback: "Roll back last change",
    restartHidden: "Restart is hidden",
    restart: "Restart locally",
    gapsTitle: "Capability gaps",
    gapsLead: "Show what is already covered before recommending anything.",
    covered: "Covered",
    rejected: "Rejected",
    recommend: "Recommend",
    liveHint: "This is the live web profile. Install writes $DSH_HOME/profiles/web.",
    zh: "中文",
    en: "EN",
  },
};

const page: CSSProperties = { width: "100%", maxWidth: 860, display: "flex", flexDirection: "column", gap: 14 };
const band = (accent: string): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 16,
  borderRadius: 16,
  border: `1px solid color-mix(in oklab, ${accent} 38%, transparent)`,
  background: `color-mix(in oklab, ${accent} 10%, transparent)`,
});
const card: CSSProperties = {
  border: "1px solid color-mix(in oklab, currentColor 16%, transparent)",
  borderRadius: 12,
  padding: 12,
  background: "color-mix(in oklab, currentColor 4%, transparent)",
};
const row: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" };
const field: CSSProperties = {
  minWidth: 0,
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid color-mix(in oklab, currentColor 20%, transparent)",
  background: "transparent",
};
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 140, fontSize: 11, opacity: 0.7 };

function useJson<T>(path: string, refresh = 0): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(path)
      .then((response) => response.json())
      .then((value) => {
        if (!cancelled) setData(value as T);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path, refresh]);
  return data;
}

async function post(path: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

function pick(value: { zh: string; en?: string } | undefined, lang: Lang): string {
  if (!value) return "";
  return lang === "en" ? value.en || value.zh : value.zh || value.en || "";
}

function useLang(ctx: ClientContext): [Lang, (lang: Lang) => void, (key: string) => string] {
  const initial = ctx.locale?.getLocale().active === "en" ? "en" : "zh";
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    const current = ctx.locale?.getLocale().active;
    if (current === "en" || current === "zh") setLang(current);
  }, [ctx]);
  const t = useMemo(() => {
    const dict = DICTS[lang];
    return (key: string) => dict[key] ?? key;
  }, [lang]);
  return [lang, setLang, t];
}

function LangSwitch({ lang, setLang, t }: { lang: Lang; setLang: (lang: Lang) => void; t: (key: string) => string }): ReactNode {
  return createElement(
    "div",
    { style: { display: "inline-flex", gap: 4, padding: 3, borderRadius: 999, border: "1px solid color-mix(in oklab, currentColor 18%, transparent)" } },
    createElement("button", { type: "button", onClick: () => setLang("zh"), "aria-pressed": lang === "zh" }, t("zh")),
    createElement("button", { type: "button", onClick: () => setLang("en"), "aria-pressed": lang === "en" }, t("en")),
  );
}

function StoreView({ ctx }: { ctx: ClientContext }): ReactNode {
  const [lang, setLang, t] = useLang(ctx);
  const [refresh, setRefresh] = useState(0);
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState("");
  const [trustState, setTrustState] = useState("");
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (trustState) params.set("trustState", trustState);
  const registry = useJson<{ plugins: CatalogPlugin[]; countsCopy?: string }>(`/dsh-store/search?${params.toString()}`, refresh);
  const health = useJson<{ live?: boolean; profile?: string }>("/dsh-store/health", refresh);
  return createElement(
    "section",
    { "data-dsh-store-surface": "tab", style: page },
    createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } },
      createElement("h2", { style: { margin: 0, fontSize: 22 } }, t("storeTitle")),
      createElement(LangSwitch, { lang, setLang, t }),
    ),
    createElement("div", { style: band("#c9a66b"), "data-region": "search" },
      createElement("p", { style: { margin: 0 } }, t("storeLead")),
      health?.live ? createElement("p", { style: { margin: 0, opacity: 0.75 } }, t("liveHint")) : null,
      createElement(
        "form",
        {
          onSubmit: (event: { preventDefault(): void }) => {
            event.preventDefault();
            setQ(draft.trim());
          },
          style: { display: "flex", flexDirection: "column", gap: 10 },
        },
        createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 96px", gap: 8 } },
          createElement("label", { style: label }, t("search"),
            createElement("input", {
              style: field,
              value: draft,
              placeholder: t("searchPlaceholder"),
              onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
            }),
          ),
          createElement("button", { type: "submit", style: { height: 38 } }, t("search")),
        ),
        createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
          createElement("label", { style: label }, t("category"),
            createElement("select", { style: field, value: category, onChange: (event: { target: { value: string } }) => setCategory(event.target.value) },
              createElement("option", { value: "" }, t("category")),
              ...["vision", "notify", "tools", "theme", "memory"].map((item) => createElement("option", { key: item, value: item }, item)),
            ),
          ),
          createElement("label", { style: label }, t("trust"),
            createElement("select", { style: field, value: trustState, onChange: (event: { target: { value: string } }) => setTrustState(event.target.value) },
              createElement("option", { value: "" }, t("trust")),
              ...["featured", "installable", "screened", "candidate", "blocked"].map((item) => createElement("option", { key: item, value: item }, item)),
            ),
          ),
        ),
      ),
    ),
    createElement("div", { style: band("#8aa67a"), "data-region": "results" },
      registry?.countsCopy ? createElement("p", { style: { margin: 0, opacity: 0.75 } }, registry.countsCopy) : null,
      note ? createElement("pre", { style: { whiteSpace: "pre-wrap", fontSize: 12 } }, note) : null,
      ...(registry?.plugins ?? []).slice(0, 20).map((plugin) =>
        createElement(
          "div",
          { key: plugin.id, "data-plugin-id": plugin.id, style: card },
          createElement("strong", null, pick(plugin.title, lang)),
          createElement("div", { style: { opacity: 0.7, fontSize: 13 } }, `${plugin.trustState} · ${plugin.awesomeCategory ?? "—"}`),
          createElement("p", { style: { margin: "6px 0 0", opacity: 0.78 } }, pick(plugin.description, lang)),
          createElement(
            "div",
            { style: { ...row, marginTop: 8 } },
            createElement("button", { type: "button", onClick: () => { void post("/dsh-store/preview", { pluginId: plugin.id }).then((value) => setNote(JSON.stringify(value, null, 2))); } }, t("preview")),
            createElement("button", { type: "button", onClick: () => { void post("/dsh-store/download", { pluginId: plugin.id }).then((value) => setNote(JSON.stringify(value, null, 2))); } }, t("download")),
            plugin.canInstall
              ? createElement("button", {
                  type: "button",
                  onClick: () => {
                    void post("/dsh-store/install", { pluginId: plugin.id }).then((value) => {
                      setNote(JSON.stringify(value, null, 2));
                      setRefresh((count) => count + 1);
                    });
                  },
                }, t("install"))
              : createElement("span", null, t("noInstall")),
          ),
        ),
      ),
    ),
  );
}

function InstalledView({ ctx }: { ctx: ClientContext }): ReactNode {
  const [lang, setLang, t] = useLang(ctx);
  const [refresh, setRefresh] = useState(0);
  const health = useJson<{ allowRestart: boolean; desktop: boolean; live?: boolean }>("/dsh-store/health", refresh);
  const installed = useJson<{ items: Array<{ packageName: string; activation: { state: string; reason: string } }> }>(
    "/dsh-store/installed",
    refresh,
  );
  return createElement(
    "section",
    { "data-dsh-store-surface": "tab", style: page },
    createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12 } },
      createElement("h2", { style: { margin: 0, fontSize: 22 } }, t("installedTitle")),
      createElement(LangSwitch, { lang, setLang, t }),
    ),
    createElement("div", { style: band("#8aa67a") }, createElement("p", { style: { margin: 0 } }, t("installedLead"))),
    createElement("div", { style: band("#c9a66b"), "data-region": "installed" },
      ...(installed?.items ?? []).map((item) =>
        createElement("div", { key: item.packageName, "data-activation": item.activation.state, style: card },
          createElement("strong", null, item.packageName),
          createElement("div", null, `${item.activation.state} · ${item.activation.reason}`),
        ),
      ),
      createElement("div", { style: row },
        createElement("button", { type: "button", onClick: () => { void post("/dsh-store/rollback", { confirm: true }).then(() => setRefresh((count) => count + 1)); } }, t("rollback")),
        health?.allowRestart ? createElement("button", { type: "button" }, t("restart")) : createElement("span", null, t("restartHidden")),
      ),
    ),
  );
}

function GapsView({ ctx }: { ctx: ClientContext }): ReactNode {
  const [lang, setLang, t] = useLang(ctx);
  const diagnosis = useJson<{
    alreadyCovered: Array<{ capability: string; pluginId: string }>;
    missing: string[];
    rejectedAlternatives: Array<{ pluginId: string; reason: string }>;
  }>("/dsh-store/diagnose");
  const recommendation = useJson<{
    items: Array<{ pluginId: string; why: string[] }>;
    warnings: string[];
  }>("/dsh-store/recommend");
  return createElement(
    "section",
    { "data-dsh-store-surface": "tab", style: page },
    createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12 } },
      createElement("h2", { style: { margin: 0, fontSize: 22 } }, t("gapsTitle")),
      createElement(LangSwitch, { lang, setLang, t }),
    ),
    createElement("div", { style: band("#8c94b8") }, createElement("p", { style: { margin: 0 } }, t("gapsLead"))),
    createElement("div", { style: band("#8aa67a"), "data-region": "covered" },
      ...(diagnosis?.alreadyCovered ?? []).map((item) => createElement("p", { key: item.capability }, `${t("covered")} ${item.capability} · ${item.pluginId}`)),
    ),
    createElement("div", { style: band("#d4654f"), "data-region": "rejected" },
      ...(diagnosis?.rejectedAlternatives ?? []).map((item) => createElement("p", { key: item.pluginId }, `${t("rejected")} ${item.pluginId}: ${item.reason}`)),
    ),
    createElement("div", { style: band("#c9a66b"), "data-region": "recommend" },
      ...(recommendation?.items ?? []).map((item) => createElement("p", { key: item.pluginId }, `${t("recommend")} ${item.pluginId}: ${item.why.join(" / ")}`)),
      ...(recommendation?.warnings ?? []).map((warning) => createElement("p", { key: warning }, warning)),
    ),
  );
}

export const name = "@dsh-store/plugin";
export const inject = ["slots", "locale"];

export function apply(ctx: ClientContext): void {
  if (ctx.locale?.register) {
    ctx.effect?.(() => ctx.locale?.register?.(NS, DICTS) ?? (() => undefined), "dsh-store: locale");
  }

  const views = {
    store: () => createElement(StoreView, { ctx }),
    installed: () => createElement(InstalledView, { ctx }),
    gaps: () => createElement(GapsView, { ctx }),
  };

  for (const item of SETTINGS_TABS) {
    ctx.slots.inject("settings.plugins.tab", () =>
      ctx.slots.register(
        {
          name: "settings.plugins.tab",
          id: item.id,
          order: item.order,
          locale: NS,
          label: () => {
            const active = ctx.locale?.getLocale().active === "en" ? "en" : "zh";
            const key = item.id === "store" ? "storeTab" : item.id === "installed" ? "installedTab" : "gapsTab";
            return DICTS[active][key] ?? item.id;
          },
        },
        views[item.id],
      ),
    );
  }
}
