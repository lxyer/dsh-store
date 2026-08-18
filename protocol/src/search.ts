export type SiteLang = "zh" | "en";

export interface SearchQuery {
  q?: string;
  category?: string[];
  scene?: string[];
  capability?: string[];
  trustState?: string[];
  risk?: string[];
  profile?: string;
  source?: string[];
  sort?: string;
  page?: number;
  lang?: SiteLang;
}

const LIST_KEYS = ["category", "scene", "capability", "trustState", "risk", "source"] as const;

export function parseSearchParams(params: URLSearchParams): SearchQuery {
  const query: SearchQuery = {};
  const q = params.get("q");
  if (q) query.q = q;
  for (const key of LIST_KEYS) {
    const values = params.getAll(key).flatMap((value) => value.split(",")).filter(Boolean);
    if (values.length) query[key] = values;
  }
  const profile = params.get("profile");
  if (profile) query.profile = profile;
  const sort = params.get("sort");
  if (sort) query.sort = sort;
  const page = params.get("page");
  if (page) query.page = Number(page);
  const lang = params.get("lang");
  if (lang === "en" || lang === "zh") query.lang = lang;
  return query;
}

export function serializeSearchQuery(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  for (const key of LIST_KEYS) {
    for (const value of query[key] ?? []) params.append(key, value);
  }
  if (query.profile) params.set("profile", query.profile);
  if (query.sort) params.set("sort", query.sort);
  if (query.page && query.page !== 1) params.set("page", String(query.page));
  if (query.lang && query.lang !== "zh") params.set("lang", query.lang);
  return params;
}

export function searchHref(query: SearchQuery): string {
  const params = serializeSearchQuery(query);
  const encoded = params.toString();
  return encoded ? `/search?${encoded}` : "/search";
}

export function parseLang(value: string | null | undefined): SiteLang {
  return value === "en" ? "en" : "zh";
}

export function withLang(path: string, lang: SiteLang): string {
  const url = new URL(path, "https://store.dsh.dev");
  if (lang === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  const search = url.searchParams.toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
}
