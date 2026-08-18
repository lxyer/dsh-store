import { clampDiscoveredTrust, type PluginRecord } from "@dsh-store/registry";
import { assertNotInstallable, deriveTrustState } from "./screen.js";
import { fromAwesome, fromHub, type AwesomePlugin, type HubPlugin } from "./adapt.js";

export interface DiscoverySources {
  awesome: { url: string; count: number };
  hub: { url: string; listed: number; topicTotal: number | null };
  npm: { url: string; count: number };
  githubTopic: { query: string; count: number; skipped?: string };
}

export interface DiscoveryResult {
  generatedAt: string;
  plugins: PluginRecord[];
  sources: DiscoverySources;
  note: string;
}

interface NpmPackage {
  name: string;
  version?: string;
  description?: string;
  license?: string;
  date?: string;
  links?: { repository?: string; homepage?: string; npm?: string };
}

interface GithubRepo {
  full_name: string;
  name: string;
  description?: string | null;
  html_url: string;
  stargazers_count?: number;
  created_at?: string;
  archived?: boolean;
  license?: { spdx_id?: string } | null;
  owner?: { login?: string };
}

const AWESOME_URL = "https://awesome-dsh-plugin.com/plugins.json";
const HUB_URL = "https://dsh.lanshuagent.com/api/plugins";
const NPM_URL = "https://registry.npmjs.org/-/v1/search?text=keywords:dsh-plugin";

function bilingual(value: { zh?: string; en?: string } | string | undefined, fallback: string) {
  if (!value) return { zh: fallback, en: fallback };
  if (typeof value === "string") return { zh: value, en: value };
  return { zh: value.zh || value.en || fallback, en: value.en || value.zh || fallback };
}

function githubId(owner: string, name: string): string {
  return `github:${owner}/${name}`;
}

function parseGithubUrl(url?: string): { owner: string; name: string } | undefined {
  if (!url) return undefined;
  const match = /github\.com[:/](?<owner>[A-Za-z0-9_.-]+)\/(?<name>[A-Za-z0-9_.-]+)/i.exec(url.replace(/\.git$/, ""));
  if (!match?.groups?.owner || !match.groups.name) return undefined;
  return { owner: match.groups.owner, name: match.groups.name };
}

function stubVersion(pluginId: string, npmName: string | undefined, version: string | undefined, releasedAt: string): PluginRecord["versions"][number] {
  const ver = version && /^\d+\.\d+\.\d+/.test(version) ? version : "0.0.0-discovered";
  const packageName = npmName || pluginId.replace(/^github:[^/]+\//, "");
  const versionId = `npm:${packageName}@${ver}`;
  return {
    id: versionId,
    pluginId,
    releasedAt,
    yanked: false,
    hasBundle: false,
    hasClient: false,
    lifecycleScripts: [],
    capabilityClaims: [],
    compatibility: { dshRange: "unknown", profiles: ["any"], desktop: "unknown", testedDsh: ["untested"] },
    installTarget: {
      pluginId,
      versionId,
      packageName,
      subpath: null,
      profile: "web",
      requiresBuildPermission: false,
      expectedBundle: false,
    },
  };
}

function record(input: {
  owner: string;
  name: string;
  title?: string;
  description?: { zh?: string; en?: string } | string;
  category?: string;
  npmName?: string | null;
  stars?: number;
  fetchedAt: string;
  source: PluginRecord["sources"][number];
  starsSource: string;
  trustState: PluginRecord["trustState"];
  license?: string | null;
  homepage?: string;
  repository?: string;
  version?: string;
  blockedReason?: string;
}): PluginRecord {
  const id = githubId(input.owner, input.name);
  const title = input.title || input.name;
  const description = bilingual(input.description, title);
  const version = stubVersion(id, input.npmName ?? undefined, input.version, input.fetchedAt);
  const plugin = clampDiscoveredTrust({
    schemaVersion: 1,
    id,
    publisher: input.owner,
    npmName: input.npmName ?? undefined,
    title: { zh: title, en: title },
    description,
    fetchedAt: input.fetchedAt,
    awesomeCategory: input.category,
    trustState: input.trustState,
    blockedReason: input.blockedReason ? { zh: input.blockedReason, en: input.blockedReason } : undefined,
    sources: [input.source],
    stars:
      typeof input.stars === "number"
        ? { count: input.stars, fetchedAt: input.fetchedAt, source: input.starsSource }
        : undefined,
    homepage: input.homepage,
    repository: input.repository ?? `https://github.com/${input.owner}/${input.name}`,
    license: input.license ?? undefined,
    defaultVersionId: version.id,
    versions: [version],
  });
  assertNotInstallable(plugin.trustState);
  return plugin;
}

async function readJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(url, { headers: { "user-agent": "dsh-store-discover/0.1", ...headers } });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

export async function fetchAwesome(): Promise<{ count: number; plugins: AwesomePlugin[] }> {
  const body = (await readJson(AWESOME_URL)) as { count?: number; plugins?: AwesomePlugin[] };
  return { count: body.count ?? body.plugins?.length ?? 0, plugins: body.plugins ?? [] };
}

export async function fetchHub(): Promise<{ listed: number; topicTotal: number | null; plugins: HubPlugin[] }> {
  const body = (await readJson(HUB_URL)) as {
    summary?: { listed?: number; topicTotal?: number };
    plugins?: HubPlugin[];
  };
  return {
    listed: body.summary?.listed ?? body.plugins?.length ?? 0,
    topicTotal: body.summary?.topicTotal ?? null,
    plugins: body.plugins ?? [],
  };
}

export async function fetchNpm(): Promise<{ count: number; packages: NpmPackage[] }> {
  const packages: NpmPackage[] = [];
  let total = 0;
  for (const from of [0, 250, 500, 750, 1000]) {
    const body = (await readJson(`${NPM_URL}&size=250&from=${from}`)) as { total?: number; objects?: Array<{ package: NpmPackage }> };
    total = body.total ?? total;
    for (const item of body.objects ?? []) packages.push(item.package);
    if (packages.length >= total) break;
  }
  return { count: total || packages.length, packages };
}

function githubStamp(date: Date): string {
  return date.toISOString().replace(/\.\d+Z$/, "Z");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubSearch(query: string, page: number, token: string, attempt = 0): Promise<{ total_count: number; items: GithubRepo[] }> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=100&page=${page}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "dsh-store-discover/0.1",
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
    },
  });
  if ((response.status === 403 || response.status === 429) && attempt < 6) {
    await sleep(1500 * (attempt + 1));
    return githubSearch(query, page, token, attempt + 1);
  }
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return (await response.json()) as { total_count: number; items: GithubRepo[] };
}

async function githubRange(start: Date, end: Date, token: string): Promise<GithubRepo[]> {
  const query = `topic:dsh-plugin created:${githubStamp(start)}..${githubStamp(end)}`;
  const first = await githubSearch(query, 1, token);
  console.log(`github ${query} -> ${first.total_count}`);
  const span = end.getTime() - start.getTime();
  if (first.total_count > 1000 && span > 60 * 60 * 1000) {
    const mid = new Date(start.getTime() + span / 2);
    const left = await githubRange(start, mid, token);
    const right = await githubRange(mid, end, token);
    return [...left, ...right];
  }
  const items = [...(first.items ?? [])];
  const pages = Math.min(10, Math.ceil((first.total_count || items.length) / 100));
  for (let page = 2; page <= pages; page += 1) {
    await sleep(200);
    const next = await githubSearch(query, page, token);
    items.push(...(next.items ?? []));
  }
  return items;
}

export async function fetchGithubTopic(token?: string): Promise<{ count: number; repos: GithubRepo[]; skipped?: string }> {
  if (!token) return { count: 0, repos: [], skipped: "no GitHub token; topic crawl skipped on this run" };
  try {
    const repos = await githubRange(new Date("2023-01-01T00:00:00.000Z"), new Date(), token);
    const unique = new Map<string, GithubRepo>();
    for (const repo of repos) unique.set(repo.full_name.toLowerCase(), repo);
    return { count: unique.size, repos: [...unique.values()] };
  } catch (error) {
    return { count: 0, repos: [], skipped: error instanceof Error ? error.message : "github topic crawl failed" };
  }
}

function fromAwesomeRecord(plugin: AwesomePlugin, fetchedAt: string): PluginRecord {
  const input = fromAwesome(plugin);
  const state = deriveTrustState(input);
  assertNotInstallable(state);
  return record({
    owner: plugin.owner,
    name: plugin.name,
    description: plugin.description,
    category: plugin.category,
    npmName: plugin.npm,
    stars: plugin.stars,
    fetchedAt,
    source: "curated",
    starsSource: AWESOME_URL,
    trustState: state === "blocked" ? "blocked" : "screened",
    repository: plugin.url,
  });
}

function fromHubRecord(plugin: HubPlugin, fetchedAt: string): PluginRecord {
  const input = fromHub(plugin);
  const screening = plugin.screening?.state;
  let trustState = deriveTrustState(input);
  if (screening === "blocked") trustState = "blocked";
  else if (!input.manifest.hasBundle && trustState === "blocked") trustState = plugin.curated ? "candidate" : "discovered";
  assertNotInstallable(trustState);
  return record({
    owner: plugin.owner,
    name: plugin.name,
    description: plugin.description,
    category: plugin.category,
    npmName: plugin.manifest?.packageName,
    stars: plugin.stars,
    fetchedAt,
    source: plugin.curated ? "curated" : "discovered",
    starsSource: HUB_URL,
    trustState,
    license: plugin.license,
    homepage: plugin.url,
    repository: `https://github.com/${plugin.repo}`,
    version: plugin.manifest?.version ?? undefined,
    blockedReason: trustState === "blocked" ? "hub screening blocked or high-risk findings" : undefined,
  });
}

function fromNpmRecord(pkg: NpmPackage, fetchedAt: string): PluginRecord | undefined {
  const repo = parseGithubUrl(pkg.links?.repository) ?? parseGithubUrl(pkg.links?.homepage);
  if (!repo) return undefined;
  return record({
    owner: repo.owner,
    name: repo.name,
    title: pkg.name,
    description: pkg.description,
    npmName: pkg.name,
    fetchedAt: pkg.date ?? fetchedAt,
    source: "discovered",
    starsSource: "registry.npmjs.org keywords:dsh-plugin",
    trustState: "candidate",
    license: pkg.license,
    homepage: pkg.links?.homepage ?? pkg.links?.npm,
    repository: pkg.links?.repository,
    version: pkg.version,
  });
}

function fromGithubRecord(repo: GithubRepo, fetchedAt: string): PluginRecord | undefined {
  const [owner, name] = repo.full_name.split("/");
  if (!owner || !name) return undefined;
  return record({
    owner: repo.owner?.login ?? owner,
    name: repo.name || name,
    description: repo.description ?? undefined,
    stars: repo.stargazers_count,
    fetchedAt: repo.created_at ?? fetchedAt,
    source: "discovered",
    starsSource: "github topic:dsh-plugin",
    trustState: "discovered",
    license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : undefined,
    homepage: repo.html_url,
    repository: repo.html_url,
  });
}

export function mergeDiscovered(groups: PluginRecord[][]): PluginRecord[] {
  const map = new Map<string, PluginRecord>();
  for (const group of groups) {
    for (const plugin of group) {
      const current = map.get(plugin.id);
      if (!current) {
        map.set(plugin.id, plugin);
        continue;
      }
      const sources = [...new Set([...current.sources, ...plugin.sources])];
      const richer =
        (plugin.stars?.count ?? 0) > (current.stars?.count ?? 0) ||
        (plugin.npmName && !current.npmName) ||
        (plugin.trustState === "blocked" && current.trustState !== "blocked");
      const next = richer ? { ...current, ...plugin, sources, id: current.id } : { ...current, sources };
      if (plugin.trustState === "blocked" || current.trustState === "blocked") next.trustState = "blocked";
      map.set(plugin.id, clampDiscoveredTrust(next));
    }
  }
  return [...map.values()].map((plugin) => {
    assertNotInstallable(plugin.trustState);
    return plugin;
  });
}

export async function collectPublicPlugins(options: { githubToken?: string; now?: string } = {}): Promise<DiscoveryResult> {
  const generatedAt = options.now ?? new Date().toISOString();
  const [awesome, hub, npm] = await Promise.all([fetchAwesome(), fetchHub(), fetchNpm()]);
  const github = await fetchGithubTopic(options.githubToken);
  const plugins = mergeDiscovered([
    awesome.plugins.map((item) => fromAwesomeRecord(item, generatedAt)),
    hub.plugins.map((item) => fromHubRecord(item, generatedAt)),
    npm.packages.map((item) => fromNpmRecord(item, generatedAt)).filter((item): item is PluginRecord => Boolean(item)),
    github.repos.map((item) => fromGithubRecord(item, generatedAt)).filter((item): item is PluginRecord => Boolean(item)),
  ]);
  return {
    generatedAt,
    plugins,
    sources: {
      awesome: { url: AWESOME_URL, count: awesome.count },
      hub: { url: HUB_URL, listed: hub.listed, topicTotal: hub.topicTotal },
      npm: { url: NPM_URL, count: npm.count },
      githubTopic: { query: "topic:dsh-plugin", count: github.count, skipped: github.skipped },
    },
    note: "Do not add source counts together. Derived index only; never auto-promoted to installable.",
  };
}
