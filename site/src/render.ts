import { canOneClickInstall, searchHref, type SearchQuery, type SiteLang } from "@dsh-store/protocol";
import { copyFor, langHref, pickText, queryWithLang } from "./i18n.js";
import {
  catalogCounts,
  loadRankingSnapshot as loadDiskRankingSnapshot,
  lockPack,
  passportFor,
  publicCountsCopy,
  search,
  type LoadedRegistry,
  type PluginRecord,
} from "@dsh-store/registry";
import { fileReviewStore, listPublicReviews, type ReviewStore } from "./reviews.js";
import { siteRanking } from "./runtime.js";
import { SITE_STYLES } from "./styles.js";

const PAGE_SIZE = 24;

const BOARDS = [
  ["stars", "Star"],
  ["star_growth", "Star 增长"],
  ["new", "新发现"],
  ["security", "安全通过"],
  ["packs", "插件包"],
  ["rating", "评分"],
  ["install_success", "安装成功"],
  ["capability_fill", "能力补全"],
] as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );
}

function navClass(href: string, active: string): string {
  return active === href ? "active" : "";
}

function layout(title: string, body: string, active = "/", lang: SiteLang = "zh", currentPath = active): string {
  const t = copyFor(lang);
  const href = (path: string) => langHref(path, lang);
  return `<!doctype html>
<html lang="${lang === "en" ? "en" : "zh-CN"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · DSH Store</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,620;1,9..144,500&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>${SITE_STYLES}</style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="${href("/")}">
        <div class="brand-mark">DSH <span>Store</span></div>
        <div class="brand-sub">${escapeHtml(t.brandSub)}</div>
      </a>
      <nav class="nav">
        <a class="${navClass("/", active)}" href="${href("/")}">${escapeHtml(t.navDiscover)}</a>
        <a class="${navClass("/search", active)}" href="${href("/search")}">${escapeHtml(t.navSearch)}</a>
        <a class="${navClass("/packs", active)}" href="${href("/packs")}">${escapeHtml(t.navPacks)}</a>
        <a class="${navClass("/rankings/star_growth", active)}" href="${href("/rankings/star_growth")}">${escapeHtml(t.navRankings)}</a>
        <a class="${navClass("/submit", active)}" href="${href("/submit")}">${escapeHtml(t.navSubmit)}</a>
        <a class="${navClass("/docs/protocol", active)}" href="${href("/docs/protocol")}">${escapeHtml(t.navDocs)}</a>
        <a href="/api/v1/status">API</a>
        <span class="lang-switch" data-lang-switch>
          <a class="${lang === "zh" ? "active" : ""}" href="${langHref(currentPath, "zh")}">${escapeHtml(t.langZh)}</a>
          <a class="${lang === "en" ? "active" : ""}" href="${langHref(currentPath, "en")}">${escapeHtml(t.langEn)}</a>
        </span>
      </nav>
    </header>
    ${body}
    <footer class="site-foot muted"><p>${escapeHtml(t.footer)} <a href="https://dsh.yibishe.com">dsh.yibishe.com</a></p></footer>
  </div>
  <script>
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const text = button.getAttribute("data-copy") || "";
        try { await navigator.clipboard.writeText(text); button.textContent = ${JSON.stringify(t.copied)}; }
        catch { button.textContent = ${JSON.stringify(t.copyFailed)}; }
      });
    });
  </script>
</body>
</html>`;
}

function selected(current: string | undefined, value: string): string {
  return current === value ? " selected" : "";
}

function field(label: string, control: string): string {
  return `<label class="search-field"><span>${escapeHtml(label)}</span>${control}</label>`;
}

function searchForm(query: SearchQuery = {}, lang: SiteLang = "zh"): string {
  const t = copyFor(lang);
  return `
    <form action="/search" method="get" class="search-panel" data-search-panel>
      ${lang === "en" ? `<input type="hidden" name="lang" value="en" />` : ""}
      <div class="search-query">
        ${field(t.searchRowQuery, `<input name="q" placeholder="${escapeHtml(t.searchPlaceholder)}" value="${escapeHtml(query.q ?? "")}" />`)}
        <button type="submit">${escapeHtml(t.searchSubmit)}</button>
      </div>
      <div class="search-filters">
        ${field(t.filterCategory, `<select name="category"><option value="">${escapeHtml(t.filterCategory)}</option><option${selected(query.category?.[0], "vision")}>vision</option><option${selected(query.category?.[0], "notify")}>notify</option><option${selected(query.category?.[0], "tools")}>tools</option><option${selected(query.category?.[0], "theme")}>theme</option></select>`)}
        ${field(t.filterScene, `<select name="scene"><option value="">${escapeHtml(t.filterScene)}</option><option value="cap.scene.we-media"${selected(query.scene?.[0], "cap.scene.we-media")}>we-media</option></select>`)}
        ${field(t.filterSort, `<select name="sort"><option value="relevance"${selected(query.sort, "relevance")}>relevance</option><option value="new"${selected(query.sort, "new")}>new</option><option value="stars"${selected(query.sort, "stars")}>stars</option><option value="star_growth"${selected(query.sort, "star_growth")}>star_growth</option><option value="capability_fill"${selected(query.sort, "capability_fill")}>capability_fill</option></select>`)}
        ${field(t.filterTrust, `<select name="trustState"><option value="">${escapeHtml(t.filterTrust)}</option><option${selected(query.trustState?.[0], "installable")}>installable</option><option${selected(query.trustState?.[0], "featured")}>featured</option><option${selected(query.trustState?.[0], "screened")}>screened</option><option${selected(query.trustState?.[0], "candidate")}>candidate</option><option${selected(query.trustState?.[0], "discovered")}>discovered</option><option${selected(query.trustState?.[0], "blocked")}>blocked</option></select>`)}
        ${field(t.filterRisk, `<select name="risk"><option value="">${escapeHtml(t.filterRisk)}</option><option${selected(query.risk?.[0], "low")}>low</option><option${selected(query.risk?.[0], "medium")}>medium</option><option${selected(query.risk?.[0], "high")}>high</option></select>`)}
        ${field(t.filterProfile, `<select name="profile"><option value="">${escapeHtml(t.filterProfile)}</option><option${selected(query.profile, "web")}>web</option><option${selected(query.profile, "headless")}>headless</option><option${selected(query.profile, "desktop")}>desktop</option></select>`)}
        ${field(t.filterSource, `<select name="source"><option value="">${escapeHtml(t.filterSource)}</option><option${selected(query.source?.[0], "curated")}>curated</option><option${selected(query.source?.[0], "discovered")}>discovered</option><option${selected(query.source?.[0], "author_pr")}>author_pr</option></select>`)}
      </div>
    </form>`;
}

function trustPill(state: string): string {
  const kind = state === "blocked" ? "blocked" : "";
  return `<span class="pill ${kind} trust-${escapeHtml(state)}">${escapeHtml(state)}</span>`;
}

function pluginCard(plugin: PluginRecord, lang: SiteLang = "zh"): string {
  const delta = plugin.stars?.delta != null && plugin.stars.delta > 0 ? ` · +${plugin.stars.delta}` : "";
  return `
    <a class="card ${plugin.trustState === "blocked" ? "blocked" : ""}" href="${langHref(`/plugins/${encodeURIComponent(plugin.id)}`, lang)}">
      <div class="meta">${trustPill(plugin.trustState)}<span>${escapeHtml(plugin.awesomeCategory ?? "uncategorized")}</span><span>★${plugin.stars?.count ?? 0}${delta}</span></div>
      <strong>${escapeHtml(pickText(plugin.title, lang))}</strong>
      <p>${escapeHtml(pickText(plugin.description, lang))}</p>
    </a>
  `;
}

function pager(query: SearchQuery, total: number, lang: SiteLang): string {
  const t = copyFor(lang);
  const page = query.page && query.page > 0 ? query.page : 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return "";
  const prev = page > 1 ? `<a href="${searchHref(queryWithLang({ ...query, page: page - 1 }, lang))}">${escapeHtml(t.pagePrev)}</a>` : `<span>${escapeHtml(t.pagePrev)}</span>`;
  const next = page < pages ? `<a href="${searchHref(queryWithLang({ ...query, page: page + 1 }, lang))}">${escapeHtml(t.pageNext)}</a>` : `<span>${escapeHtml(t.pageNext)}</span>`;
  return `<div class="pager">${prev}<span>${page} / ${pages}</span>${next}</div>`;
}

export function renderHome(registry: LoadedRegistry, lang: SiteLang = "zh"): string {
  const t = copyFor(lang);
  const counts = catalogCounts(registry);
  const newest = search(registry, { sort: "new" }).slice(0, 6);
  const featured = registry.plugins.filter((plugin) => plugin.trustState === "featured" || plugin.trustState === "installable").slice(0, 3);
  return layout(
    t.navDiscover,
    `
    <section class="hero">
      <p class="eyebrow">${escapeHtml(t.eyebrowCatalog)}</p>
      <h1>DSH Store</h1>
      <p class="lede">${escapeHtml(t.lede)}</p>
    </section>
    <section class="band band-search" data-region="search">
      ${searchForm({ lang }, lang)}
    </section>
    <section class="band band-stats" data-region="counts">
      <div class="stats">
        <div class="stat"><b>${counts.curated}</b><span>curated</span></div>
        <div class="stat"><b>${counts.autoDiscovered}</b><span>auto discovered</span></div>
        <div class="stat"><b>${counts.listed}</b><span>listed</span></div>
      </div>
      <p class="muted">${escapeHtml(publicCountsCopy(counts))} · ${escapeHtml(t.countsNote)}</p>
    </section>
    <section class="band band-caps" data-region="capabilities">
      <div class="section-head"><h2>${escapeHtml(t.capabilityEntry)}</h2><p class="muted">${escapeHtml(t.capabilityHint)}</p></div>
      <div class="row">
        ${["cap.product.vision", "cap.product.notify", "cap.product.memory", "cap.scene.we-media"]
          .map((id) => `<a class="chip" href="${searchHref(queryWithLang({ capability: [id] }, lang))}">${id}</a>`)
          .join("")}
      </div>
    </section>
    ${
      featured.length
        ? `<section class="band band-featured" data-region="featured">
             <div class="section-head"><h2>${escapeHtml(t.featured)}</h2><p class="muted">${escapeHtml(t.featuredHint)}</p></div>
             <div class="grid">${featured.map((plugin) => pluginCard(plugin, lang)).join("")}</div>
           </section>`
        : ""
    }
    <section class="band band-catalog" data-region="catalog">
      <div class="section-head"><h2>${escapeHtml(t.catalog)}</h2><a class="chip" href="${searchHref(queryWithLang({ sort: "new" }, lang))}">${escapeHtml(t.viewAllNew)}</a></div>
      <p class="muted">${escapeHtml(t.catalogHint)}</p>
      <div class="grid">${newest.map((item) => pluginCard(item.plugin, lang)).join("")}</div>
    </section>
    `,
    "/",
    lang,
    langHref("/", lang),
  );
}

export function renderSearch(registry: LoadedRegistry, query: SearchQuery, lang: SiteLang = query.lang ?? "zh"): string {
  const t = copyFor(lang);
  const localized = queryWithLang(query, lang);
  const results = search(registry, localized);
  const page = localized.page && localized.page > 0 ? localized.page : 1;
  const slice = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const href = searchHref(localized);
  return layout(
    t.searchLead,
    `
    <section class="hero">
      <p class="eyebrow">${escapeHtml(t.eyebrowSearch)}</p>
      <h1>${escapeHtml(t.searchLead)}</h1>
      <p class="muted">${escapeHtml(t.searchHint)}</p>
    </section>
    <section class="band band-search" data-region="search">${searchForm(localized, lang)}</section>
    <section class="band band-catalog" data-region="results">
      <p>${escapeHtml(t.currentResults)} ${results.length} · <code>${escapeHtml(href)}</code></p>
      ${slice.length ? `<div class="grid">${slice.map((item) => pluginCard(item.plugin, lang)).join("")}</div>` : `<p class="empty">${escapeHtml(t.noMatch)}</p>`}
      ${pager(localized, results.length, lang)}
    </section>
    `,
    "/search",
    lang,
    href,
  );
}

export function renderPlugin(
  registry: LoadedRegistry,
  plugin: PluginRecord,
  reviewStore: ReviewStore = fileReviewStore(),
  lang: SiteLang = "zh",
): string {
  const t = copyFor(lang);
  const version = plugin.versions[0];
  const passport = version ? passportFor(registry, version.id) : undefined;
  const installable = canOneClickInstall(plugin.trustState);
  const locked = version?.installTarget.lockedSpec
    ? `dsh plugin --profile ${version.installTarget.profile} add ${version.installTarget.lockedSpec}`
    : lang === "en" ? "No locked install command" : "无锁定安装命令";
  const path = langHref(`/plugins/${encodeURIComponent(plugin.id)}`, lang);
  return layout(
    pickText(plugin.title, lang),
    `
    <section class="hero">
      <p class="eyebrow">${escapeHtml(plugin.awesomeCategory ?? "plugin")} · ${escapeHtml(plugin.publisher)}</p>
      <h1>${escapeHtml(pickText(plugin.title, lang))}</h1>
      <p class="lede">${escapeHtml(pickText(plugin.description, lang))}</p>
      <div class="meta">${trustPill(plugin.trustState)}<span>${escapeHtml(plugin.id)}</span><span>awesome/${plugin.awesomeCategory ?? "—"}</span></div>
      <p><a href="${langHref(`/publishers/${encodeURIComponent(plugin.publisher)}`, lang)}">${escapeHtml(plugin.publisher)}</a> · <a href="/api/v1/badge?id=${encodeURIComponent(plugin.id)}">badge</a></p>
    </section>
    ${plugin.blockedReason ? `<p class="notice danger blocked">blocked: ${escapeHtml(pickText(plugin.blockedReason, lang))}</p>` : ""}
    <section class="band band-detail" data-region="compat">
      <div class="section-head"><h2>${escapeHtml(t.compatibility)}</h2></div>
      <div class="matrix">
        <div><small>DSH</small>${escapeHtml(version?.compatibility.dshRange ?? "unknown")}</div>
        <div><small>profiles</small>${escapeHtml((version?.compatibility.profiles ?? []).join("/"))}</div>
        <div><small>Desktop</small>${version?.compatibility.desktop ?? "unknown"}</div>
        <div><small>tested</small>${escapeHtml((version?.compatibility.testedDsh ?? ["untested"]).join(", "))}</div>
      </div>
    </section>
    <section class="band band-featured" data-region="install">
      <div class="section-head"><h2>${escapeHtml(t.installTitle)}</h2></div>
    ${
      installable
        ? `<div class="install-box">
             <p>${escapeHtml(t.siteNeverInstalls)}</p>
             <pre><code>${escapeHtml(locked)}</code></pre>
             <p class="row" style="margin-top:12px"><button class="copy" type="button" data-copy="${escapeHtml(locked)}" style="width:auto">${escapeHtml(t.copyCommand)}</button></p>
             <p class="muted">deep link: <code>/open?target=plugin:${escapeHtml(plugin.id)}&version=${escapeHtml(version?.id ?? "")}</code></p>
           </div>`
        : `<p>${escapeHtml(t.noInstall)} <strong>${plugin.trustState}</strong></p>`
    }
    </section>
    <section class="band band-catalog" data-region="passport">
      <div class="section-head"><h2>${escapeHtml(t.passport)}</h2></div>
    ${
      passport
        ? `<p><a href="${langHref(`/passports/${encodeURIComponent(passport.id)}`, lang)}">${escapeHtml(passport.id)}</a> · scanner ${passport.scannerVersion}</p>
           <p class="muted">Static evidence ≠ complete audit ≠ runtime sandbox.</p>`
        : `<p>—</p>`
    }
      <h2>${escapeHtml(t.reviews)}</h2>
      ${renderReviews(reviewStore, plugin.id, plugin.versions[0]?.id)}
    </section>
    `,
    "/search",
    lang,
    path,
  );
}

export function renderPassport(registry: LoadedRegistry, id: string, lang: SiteLang = "zh"): string {
  const t = copyFor(lang);
  const passport = registry.passports.find((item) => item.id === id);
  if (!passport) return layout(t.passport, "<h1>404</h1>", "/", lang);
  return layout(
    t.passport,
    `
    <p class="eyebrow">Passport</p>
    <h1>${escapeHtml(t.passport)}</h1>
    <div class="install-box"><pre>${escapeHtml(JSON.stringify(passport, null, 2))}</pre></div>
    `,
    "/",
    lang,
    langHref(`/passports/${encodeURIComponent(id)}`, lang),
  );
}

export function renderPacks(registry: LoadedRegistry, lang: SiteLang = "zh"): string {
  const t = copyFor(lang);
  return layout(
    t.packsTitle,
    `
    <section class="hero">
      <p class="eyebrow">${escapeHtml(t.eyebrowPacks)}</p>
      <h1>${escapeHtml(t.packsTitle)}</h1>
      <p class="lede">${escapeHtml(t.packsLede)}</p>
    </section>
    <section class="band band-featured" data-region="packs">
    <div class="grid">
      ${registry.packs
        .map(
          (pack) => `
        <a class="card" href="${langHref(`/packs/${encodeURIComponent(pack.id)}`, lang)}">
          <div class="meta"><span class="pill">${escapeHtml(pack.kind)}</span><span>${escapeHtml(pack.completeness ?? "partial")}</span></div>
          <strong>${escapeHtml(pickText(pack.title, lang))}</strong>
          <p>${escapeHtml(pickText(pack.description, lang, pack.id))}</p>
        </a>`,
        )
        .join("")}
    </div>
    </section>
    `,
    "/packs",
    lang,
    langHref("/packs", lang),
  );
}

export function renderPack(registry: LoadedRegistry, id: string, lang: SiteLang = "zh"): string {
  const pack = registry.packs.find((item) => item.id === id);
  if (!pack) return layout("pack", "<h1>404</h1>", "/packs", lang);
  const blocked = pack.entries.some((entry) => registry.plugins.find((plugin) => plugin.id === entry.ref)?.trustState === "blocked");
  return layout(
    pickText(pack.title, lang),
    `
    <section class="hero">
      <p class="eyebrow">${escapeHtml(pack.kind)} · ${escapeHtml(pack.id)}</p>
      <h1>${escapeHtml(pickText(pack.title, lang))}</h1>
      <p class="lede">${escapeHtml(pickText(pack.description, lang))}</p>
      <p>profile: ${pack.profileTarget} · ${blocked ? "blocked entry present" : "no blocked entries"}</p>
    </section>
    <section class="band band-catalog"><ul>${pack.entries.map((entry) => `<li><code>${escapeHtml(entry.ref)}</code> · ${entry.role} · ${escapeHtml(entry.version)}</li>`).join("")}</ul>
    <p><a class="chip" href="/api/v1/packs/${encodeURIComponent(pack.id)}/lock">lockfile</a></p></section>
    `,
    "/packs",
    lang,
    langHref(`/packs/${encodeURIComponent(id)}`, lang),
  );
}

export function renderRankings(_registry: LoadedRegistry, board: string, lang: SiteLang = "zh"): string {
  const snapshot = siteRanking(board) ?? loadDiskRankingSnapshot(board);
  if (!snapshot) {
    return layout(`rankings ${board}`, `<h1>${escapeHtml(board)}</h1><p>No materialized snapshot.</p>`, "/rankings/star_growth", lang);
  }
  return layout(
    `rankings ${board}`,
    `
    <section class="hero">
      <p class="eyebrow">Rankings</p>
      <h1>榜单 · ${escapeHtml(board)}</h1>
      <p class="muted">物化快照 generatedAt=${escapeHtml(snapshot.generatedAt)}。Star 榜不混入评分；Star 增长榜按相邻两日绝对增量排序，当天记账、次日开榜；安全榜不混入付费置顶。${snapshot.closed ? ` ${escapeHtml(snapshot.reason ?? "")}` : ""}</p>
    </section>
    <p class="board-switch">
      ${BOARDS.map(([id, label]) => `<a class="${id === board ? "active" : ""}" href="${langHref(`/rankings/${id}`, lang)}">${label}</a>`).join("")}
    </p>
    ${
      snapshot.items.length
        ? `<ol class="rank-list">${snapshot.items
            .map(
              (item, index) => `<li>
                <b>${String(index + 1).padStart(2, "0")}</b>
                <a href="${langHref(`${item.id.startsWith("pack:") ? "/packs/" : "/plugins/"}${encodeURIComponent(item.id)}`, lang)}">${escapeHtml(pickText(item.title, lang))}</a>
                <span>${item.delta != null ? `+${item.delta} ★` : item.stars ?? item.kind ?? item.trustState ?? ""}</span>
              </li>`,
            )
            .join("")}</ol>`
        : `<p class="empty">这个榜单当前没有条目。</p>`
    }
    `,
    "/rankings/star_growth",
    lang,
    langHref(`/rankings/${board}`, lang),
  );
}

export function renderPublisher(registry: LoadedRegistry, id: string, lang: SiteLang = "zh"): string {
  const plugins = registry.plugins.filter((plugin) => plugin.publisher === id);
  return layout(
    id,
    `
    <p class="eyebrow">Publisher</p>
    <h1>${escapeHtml(id)}</h1>
    <p class="muted">${plugins.length}</p>
    <div class="grid">${plugins.map((plugin) => pluginCard(plugin, lang)).join("")}</div>
    `,
    "/",
    lang,
    langHref(`/publishers/${encodeURIComponent(id)}`, lang),
  );
}

export function renderOpen(target: string | null, version: string | null, lang: SiteLang = "zh"): string {
  return layout(
    "open",
    `
    <p class="eyebrow">Deep link</p>
    <h1>${lang === "en" ? "Open local store" : "打开本机商店"}</h1>
    <p>target=${escapeHtml(target ?? "")} · version=${escapeHtml(version ?? "")}</p>
    <p>${lang === "en" ? "This page only opens the detail. It does not install. If local /dsh-store/health is missing it will not pretend the plugin is already installed." : "本页只打开详情，不安装。探测不到本机 /dsh-store/health 时不会假装已安装。"}</p>
    <p><code>dsh-store://${escapeHtml(target ?? "")}${version ? `?version=${escapeHtml(version)}` : ""}</code></p>
    `,
    "/",
    lang,
    langHref("/open", lang),
  );
}

export function renderBadge(plugin: PluginRecord): string {
  const label = plugin.trustState;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20" role="img" aria-label="DSH Store: ${escapeHtml(label)}">
  <title>DSH Store: ${escapeHtml(label)}</title>
  <rect width="80" height="20" fill="#555"/>
  <rect x="80" width="80" height="20" fill="${plugin.trustState === "blocked" ? "#e05d44" : "#4c1"}"/>
  <text x="40" y="14" fill="#fff" text-anchor="middle" font-size="11">DSH Store</text>
  <text x="120" y="14" fill="#fff" text-anchor="middle" font-size="11">${escapeHtml(label)}</text>
</svg>`;
}

export function renderPackLock(registry: LoadedRegistry, id: string): string {
  const pack = registry.packs.find((item) => item.id === id);
  if (!pack) return layout("lockfile", "<h1>未找到插件包</h1>");
  return layout(pack.id, `<h1>lockfile</h1><pre>${escapeHtml(JSON.stringify(lockPack(registry, pack), null, 2))}</pre>`);
}

export function renderSubmit(lang: SiteLang = "zh"): string {
  const t = copyFor(lang);
  return layout(
    t.submitTitle,
    `
    <section class="hero">
      <p class="eyebrow">Authors</p>
      <h1>${escapeHtml(t.submitTitle)}</h1>
      <p class="lede">${escapeHtml(t.submitLede)}</p>
    </section>
    `,
    "/submit",
    lang,
    langHref("/submit", lang),
  );
}

export function renderDocs(lang: SiteLang = "zh"): string {
  const t = copyFor(lang);
  return layout(
    t.docsTitle,
    `
    <section class="hero">
      <p class="eyebrow">Protocol</p>
      <h1>${escapeHtml(t.docsTitle)}</h1>
      <p class="lede">${escapeHtml(t.docsLede)}</p>
    </section>
    <div class="grid">
      ${["/api/v1/plugins", "/api/v1/packs", "/api/v1/capabilities", "/api/v1/status", "/api/v1/reviews", "/plugins.json"]
        .map((href) => `<a class="card" href="${href}"><strong>${href}</strong><p>GET</p></a>`)
        .join("")}
    </div>
    `,
    "/docs/protocol",
    lang,
    langHref("/docs/protocol", lang),
  );
}

function renderReviews(store: ReviewStore, pluginId: string, versionId?: string): string {
  const reviews = listPublicReviews(store, pluginId, versionId);
  if (!reviews.length) {
    return `<p class="muted">公开评价需要 GitHub 或安装日志身份。当前这个版本还没有已发布评价。评价不能改变护照。</p>
            <p class="muted">提交：<code>POST /api/v1/reviews</code>，举报：<code>POST /api/v1/reviews/:id/report</code></p>`;
  }
  const ordinary =
    reviews.reduce((sum, review) => sum + Object.values(review.dimensions).reduce((a, b) => a + b, 0) / 5, 0) / reviews.length;
  const weightedReviews = reviews.filter((review) => review.installJournalId);
  const weighted = weightedReviews.length
    ? weightedReviews.reduce((sum, review) => sum + Object.values(review.dimensions).reduce((a, b) => a + b, 0) / 5, 0) /
      weightedReviews.length
    : ordinary;
  return `
    <p>普通分 ${ordinary.toFixed(2)} · 安装加权分 ${weighted.toFixed(2)} · ${reviews.length} 条。评价不能改变护照。</p>
    <ul>${reviews
      .map(
        (review) =>
          `<li><code>${escapeHtml(review.identity)}</code> · works ${review.dimensions.works} · ${escapeHtml(review.body)} · <a href="${escapeHtml(review.reportHref ?? `/api/v1/reviews/${review.id}/report`)}">举报</a></li>`,
      )
      .join("")}</ul>`;
}
