import { withLang, type SearchQuery, type SiteLang } from "@dsh-store/protocol";

export type { SiteLang };

interface Copy {
  navDiscover: string;
  navSearch: string;
  navPacks: string;
  navRankings: string;
  navSubmit: string;
  navDocs: string;
  brandSub: string;
  eyebrowCatalog: string;
  eyebrowSearch: string;
  eyebrowPacks: string;
  lede: string;
  searchPlaceholder: string;
  searchSubmit: string;
  searchHint: string;
  filterCategory: string;
  filterScene: string;
  filterTrust: string;
  filterRisk: string;
  filterProfile: string;
  filterSource: string;
  filterSort: string;
  capabilityEntry: string;
  capabilityHint: string;
  featured: string;
  featuredHint: string;
  catalog: string;
  catalogHint: string;
  viewAllNew: string;
  countsNote: string;
  noMatch: string;
  currentResults: string;
  pagePrev: string;
  pageNext: string;
  installTitle: string;
  noInstall: string;
  siteNeverInstalls: string;
  copyCommand: string;
  copied: string;
  copyFailed: string;
  passport: string;
  reviews: string;
  compatibility: string;
  packsTitle: string;
  packsLede: string;
  submitTitle: string;
  submitLede: string;
  docsTitle: string;
  docsLede: string;
  footer: string;
  langZh: string;
  langEn: string;
  searchLead: string;
  searchRowQuery: string;
  searchRowScope: string;
  searchRowSafety: string;
}

const ZH: Copy = {
  navDiscover: "发现",
  navSearch: "搜索",
  navPacks: "插件包",
  navRankings: "榜单",
  navSubmit: "提交",
  navDocs: "协议",
  brandSub: "可信目录",
  eyebrowCatalog: "DeepSeek Harness 目录",
  eyebrowSearch: "检索",
  eyebrowPacks: "插件包",
  lede: "DeepSeek Harness 的可信应用商店、能力操作系统和场景解决方案分发平台。网站只发现，不代装。",
  searchPlaceholder: "中文 / English / npm / owner/repo / cap.*",
  searchSubmit: "搜索",
  searchHint: "同一组 query 刷新后结果不变。awesome 分类和场景能力分开计数。",
  filterCategory: "awesome 分类",
  filterScene: "场景",
  filterTrust: "信任状态",
  filterRisk: "风险",
  filterProfile: "目标 profile",
  filterSource: "来源",
  filterSort: "排序",
  capabilityEntry: "能力入口",
  capabilityHint: "按官方能力标签检索，不和 awesome 分类混算。",
  featured: "可安装精选",
  featuredHint: "只有过护照的种子条目才有锁定安装命令。",
  catalog: "新发现",
  catalogHint: "自动发现进入 listed，不会自动变成可安装。",
  viewAllNew: "查看全部新发现",
  countsNote: "这些数字口径不同，禁止加总宣传。",
  noMatch: "没有匹配的插件。",
  currentResults: "当前结果",
  pagePrev: "上一页",
  pageNext: "下一页",
  installTitle: "安装",
  noInstall: "当前信任状态没有安装按钮，也没有可执行安装器。",
  siteNeverInstalls: "网站不会替你安装。锁定命令：",
  copyCommand: "复制命令",
  copied: "已复制",
  copyFailed: "复制失败",
  passport: "护照",
  reviews: "评价",
  compatibility: "兼容矩阵",
  packsTitle: "插件包广场",
  packsLede: "官方与社区组合包。打开后先看冲突、风险和目标 profile，再决定是否在本机安装。",
  submitTitle: "作者提交",
  submitLede: "打开 PR，新增 registry/plugins/<owner>__<repo>.yml。必须有 dsh.bundle，必须写不可变版本。",
  docsTitle: "开放协议",
  docsLede: "源真相是 Git 注册表。稳定 API 前缀 /api/v1。跨域只开放 GET。",
  footer: "网站只负责发现与治理。真正安装只发生在本机宿主插件。",
  langZh: "中文",
  langEn: "EN",
  searchLead: "搜索",
  searchRowQuery: "关键词",
  searchRowScope: "分类与场景",
  searchRowSafety: "信任与兼容",
};

const EN: Copy = {
  navDiscover: "Discover",
  navSearch: "Search",
  navPacks: "Packs",
  navRankings: "Rankings",
  navSubmit: "Submit",
  navDocs: "Protocol",
  brandSub: "Trusted catalog",
  eyebrowCatalog: "DeepSeek Harness catalog",
  eyebrowSearch: "Search",
  eyebrowPacks: "Packs",
  lede: "The trusted app store, capability OS, and scene-pack platform for DeepSeek Harness. The site discovers. It never installs for you.",
  searchPlaceholder: "Chinese / English / npm / owner/repo / cap.*",
  searchSubmit: "Search",
  searchHint: "The same query reproduces after refresh. awesome category and scene stay separate.",
  filterCategory: "awesome category",
  filterScene: "scene",
  filterTrust: "trust",
  filterRisk: "risk",
  filterProfile: "profile",
  filterSource: "source",
  filterSort: "sort",
  capabilityEntry: "Capabilities",
  capabilityHint: "Search by official capability ids. Do not mix them with awesome categories.",
  featured: "Installable picks",
  featuredHint: "Only passport-backed seed entries expose a locked install command.",
  catalog: "Newly listed",
  catalogHint: "Auto-discovery becomes listed, never one-click installable by itself.",
  viewAllNew: "See all new listings",
  countsNote: "These counts use different denominators. Do not add them together.",
  noMatch: "No plugins match this query.",
  currentResults: "Results",
  pagePrev: "Previous",
  pageNext: "Next",
  installTitle: "Install",
  noInstall: "This trust state has no install button and no executable installer.",
  siteNeverInstalls: "The site will not install for you. Locked command:",
  copyCommand: "Copy command",
  copied: "Copied",
  copyFailed: "Copy failed",
  passport: "Passport",
  reviews: "Reviews",
  compatibility: "Compatibility",
  packsTitle: "Pack plaza",
  packsLede: "Official and community packs. Inspect conflicts, risk, and the target profile before installing locally.",
  submitTitle: "Author submission",
  submitLede: "Open a PR adding registry/plugins/<owner>__<repo>.yml. dsh.bundle and an immutable version are required.",
  docsTitle: "Open protocol",
  docsLede: "Git is the source of truth. Stable API prefix /api/v1. CORS is GET-only.",
  footer: "The site discovers and governs. Real installs happen only in the local host plugin.",
  langZh: "中文",
  langEn: "EN",
  searchLead: "Search",
  searchRowQuery: "Query",
  searchRowScope: "Category & scene",
  searchRowSafety: "Trust & compatibility",
};

export function copyFor(lang: SiteLang): Copy {
  return lang === "en" ? EN : ZH;
}

export function pickText(value: { zh: string; en?: string } | undefined, lang: SiteLang, fallback = ""): string {
  if (!value) return fallback;
  if (lang === "en") return value.en || value.zh || fallback;
  return value.zh || value.en || fallback;
}

export function langHref(path: string, lang: SiteLang): string {
  return withLang(path, lang);
}

export function queryWithLang(query: SearchQuery, lang: SiteLang): SearchQuery {
  return { ...query, lang };
}
