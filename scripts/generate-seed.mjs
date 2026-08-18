import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fetchedAt = "2026-08-17T05:03:06Z";
const scanner = 2;

const seams = [
  ["attachments", "Durable binary attachment storage", "持久化二进制附件存储"],
  ["llm", "LLM adapter registry", "大模型适配器注册表"],
  ["tokenMeter", "Replay token measurement", "回放 token 计量"],
  ["toolResultPruner", "Model-free tool-result pruning", "无模型工具结果裁剪"],
  ["sessions", "In-memory session store", "内存会话存储"],
  ["invariants", "Package-owned invariant registry", "包所属不变量注册表"],
  ["typert", "Runtime type registry", "运行时类型注册表"],
  ["typertGateway", "Typert Host invocation gateway", "Typert Host 调用网关"],
  ["sessionPersistence", "Durable session persistence seam", "会话持久化 seam"],
  ["settings", "User-settings seam", "用户设置 seam"],
  ["credentials", "Credential seam", "凭据 seam"],
  ["sessionTelemetry", "Session telemetry seam", "会话遥测 seam"],
  ["storage", "Non-session storage hub", "非会话存储枢纽"],
  ["storageDomain", "Domain data facility", "领域数据设施"],
  ["messageFeedback", "Lifecycle-bound message feedback", "生命周期绑定的消息反馈"],
  ["workspaceRegistry", "Workspace entity registry", "工作区实体注册表"],
  ["sessionQuery", "Session reads, traces, filters, and search", "会话读取、追踪、过滤与搜索"],
  ["sessionReferenceResolver", "Cross-session snapshot preparation", "跨会话快照准备"],
  ["sessionTitle", "Log-backed session titles", "基于日志的会话标题"],
  ["systemPrompt", "System prompt assembly registry", "系统提示词装配注册表"],
  ["tools", "Tool registry and guarded execution pipeline", "工具注册表与受保护执行管线"],
  ["userQuestions", "Human question/answer seam", "人工问答 seam"],
  ["planMode", "Plan collaboration state", "计划协作状态"],
  ["agentPresets", "Per-session agent composition", "按会话的 agent 组合"],
  ["commands", "Human command registry", "面向人的命令注册表"],
  ["sessionProjections", "Session projection units", "会话投影单元"],
  ["sessionProjectionCache", "Persisted projection cache", "持久化投影缓存"],
  ["skills", "Skill provider registry", "技能提供方注册表"],
  ["agents", "Agent service", "Agent 服务"],
  ["agentDefaultModel", "Default Agent model selection", "默认 Agent 模型选择"],
  ["agentLoop", "Concrete loop driver", "具体循环驱动"],
  ["goals", "Same-session goal domain", "同会话目标域"],
  ["e2b", "E2B sandbox lifecycle owner", "E2B 沙箱生命周期所有者"],
  ["subprocess", "Subprocess seam", "子进程 seam"],
  ["shell", "Bash executor seam", "Bash 执行器 seam"],
  ["shellEnv", "Managed bash environment registry", "受管 bash 环境注册表"],
  ["terminals", "Persistent PTY session registry", "持久 PTY 会话注册表"],
  ["sandbox", "Process-sandbox seam", "进程沙箱 seam"],
  ["sandboxPolicy", "Sandbox policy home", "沙箱策略中心"],
  ["approval", "Approval seam", "审批 seam"],
  ["permissionPresets", "Permission presets", "权限预设"],
  ["codeRuntime", "Code-execution seam", "代码执行 seam"],
  ["fs", "Filesystem provider seam", "文件系统提供方 seam"],
  ["compaction", "Compaction seam", "压缩 seam"],
  ["subagents", "Subagent provider and continuation service", "子代理提供方与延续服务"],
  ["jobs", "Background job registry", "后台任务注册表"],
  ["web", "Web access provider registry", "Web 访问提供方注册表"],
  ["spillStore", "Spill storage seam", "溢出存储 seam"],
  ["directoryPicker", "Workspace-directory picking seam", "工作区目录选择 seam"],
  ["webServer", "HTTP route registration", "HTTP 路由注册"],
  ["clientModules", "Client plugin graph host", "客户端插件图宿主"],
  ["workflowEngine", "Workflow script engine", "工作流脚本引擎"],
  ["lsp", "Language-server navigation seam", "语言服务器导航 seam"],
  ["apiProxy", "Host API dispatch", "Host API 分发"],
  ["dynamicCordisRunner", "Dynamic Cordis package host runner", "动态 Cordis 包宿主运行器"],
  ["cordisInspect", "Dynamic Cordis inspect registry", "动态 Cordis 检查注册表"],
];

const products = [
  ["vision", "Vision / image understanding", "视觉识图"],
  ["notify", "Notifications and outbound messaging", "通知与外发消息"],
  ["memory", "Long-term memory", "长期记忆"],
  ["workflow", "Workflow orchestration", "工作流编排"],
  ["browser", "Browser publishing and automation", "浏览器发布与自动化"],
  ["theme", "Themes and appearance", "主题与外观"],
  ["multi-model", "Multi-model routing", "多模型路由"],
  ["terminal", "Terminal / TUI clients", "终端 / TUI 客户端"],
  ["market", "Plugin markets and managers", "插件市场与管理"],
  ["materials", "Media asset libraries", "素材库"],
  ["security", "Security audit and policy", "安全审计与策略"],
];

const scenes = [
  ["we-media", "We-media / creator workflows", "自媒体创作"],
  ["research", "Research workflows", "研究"],
  ["office", "Office productivity", "办公"],
  ["devops", "Development and operations", "开发运维"],
  ["education", "Education", "教育"],
  ["enterprise-kb", "Enterprise knowledge bases", "企业知识库"],
];

function yamlQuote(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  const text = String(value);
  if (/[:#{}[\],&*?|<>=!%@`]/.test(text) || text.includes("\n") || text.includes('"')) {
    return JSON.stringify(text);
  }
  return text;
}

function dump(value, indent = 0) {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]\n`;
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          const [first, ...rest] = dump(item, indent + 1).split("\n");
          return `${pad}- ${first.trim()}\n${rest.filter(Boolean).map((line) => line).join("\n")}${rest.filter(Boolean).length ? "\n" : ""}`;
        }
        return `${pad}- ${yamlQuote(item)}\n`;
      })
      .join("");
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([key, v]) => {
        if (Array.isArray(v)) {
          if (!v.length) return `${pad}${key}: []\n`;
          if (v.every((item) => typeof item !== "object" || item === null)) {
            return `${pad}${key}:\n${v.map((item) => `${pad}  - ${yamlQuote(item)}\n`).join("")}`;
          }
          return `${pad}${key}:\n${dump(v, indent + 1)}`;
        }
        if (v && typeof v === "object") return `${pad}${key}:\n${dump(v, indent + 1)}`;
        return `${pad}${key}: ${yamlQuote(v)}\n`;
      })
      .join("");
  }
  return `${pad}${yamlQuote(value)}\n`;
}

function fileSafe(id) {
  return id.replace(/^github:/, "").replace(/^pack:/, "").replace(/^passport:/, "").replace(/[/:#@]/g, "__");
}

function versionRecord(plugin, extra) {
  const {
    versionId,
    packageName,
    subpath = null,
    integrity,
    profile = "web",
    requiresBuildPermission = false,
    expectedBundle = true,
    hasBundle = true,
    hasClient = false,
    lifecycleScripts = [],
    capabilityClaims = [],
    profiles = [profile],
    desktop = "unknown",
    lockedSpec,
    releasedAt = fetchedAt,
    dshRange = ">=0.1.0-rc.1 <0.2.0-0",
  } = extra;
  const passportId = `passport:${versionId}:scanner-${scanner}`;
  return {
    id: versionId,
    pluginId: plugin,
    releasedAt,
    yanked: false,
    hasBundle,
    hasClient,
    lifecycleScripts,
    passportId,
    capabilityClaims,
    compatibility: {
      dshRange,
      profiles,
      desktop,
      testedDsh: extra.testedDsh ?? ["untested"],
    },
    installTarget: {
      pluginId: plugin,
      versionId,
      packageName,
      subpath,
      integrity,
      profile,
      requiresBuildPermission,
      expectedBundle,
      passportId,
      lockedSpec: lockedSpec ?? (versionId.startsWith("npm:") ? versionId.slice(4) : versionId.replace(/^git:github.com\//, "github:").replace("@", "#")),
    },
  };
}

function pluginDoc(fields) {
  return {
    schemaVersion: 1,
    ...fields,
  };
}

function passportFromVersion(plugin, version, extra = {}) {
  return {
    id: version.passportId,
    pluginId: plugin.id,
    versionId: version.id,
    scannerVersion: scanner,
    checkedAt: fetchedAt,
    trustState: extra.trustState ?? plugin.trustState,
    manifest: {
      hasBundle: version.hasBundle,
      hasClient: version.hasClient,
      packageName: version.installTarget.packageName,
      subpath: version.installTarget.subpath,
    },
    license: { spdx: extra.spdx ?? plugin.license ?? null, file: extra.licenseFile ?? "LICENSE" },
    lifecycleScripts: version.lifecycleScripts,
    signals: {
      network: extra.network ?? [],
      fs: extra.fs ?? [],
      credentials: extra.credentials ?? [],
      dynamicEval: extra.dynamicEval ?? [],
      uiHijack: extra.uiHijack ?? [],
    },
    compatibility: {
      dshRange: version.compatibility.dshRange,
      profiles: version.compatibility.profiles,
      desktop: version.compatibility.desktop,
    },
    filesInspected: extra.filesInspected ?? ["package.json", "cordis.patch.yml"],
    findings: extra.findings ?? [],
    disclaimer: "Static evidence is not a complete audit and not a runtime sandbox.",
  };
}

const plugins = [];

function add(plugin, versionExtra, passportExtra) {
  const version = versionRecord(plugin.id, versionExtra);
  plugin.versions = [version];
  plugin.defaultVersionId = version.id;
  plugins.push({ plugin, passport: passportFromVersion(plugin, version, passportExtra) });
}

add(
  pluginDoc({
    id: "github:Anionex/dsh-vision-toolkit",
    publisher: "Anionex",
    npmName: "@anionex/dsh-vision-toolkit",
    title: { zh: "Vision Toolkit", en: "Vision Toolkit" },
    description: {
      zh: "让纯文本模型更好地做视觉任务：带意图的图片问答、长截图 OCR、UI 还原等。",
      en: "Vision tasks for text-only models: intent-aware image Q&A, long-screenshot OCR, UI reproduction, grounding, and pixel diff.",
    },
    fetchedAt,
    awesomeCategory: "vision",
    scenes: ["cap.scene.we-media"],
    trustState: "featured",
    sources: ["curated"],
    stars: { count: 560, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/Anionex/dsh-vision-toolkit",
    license: "MIT",
  }),
  {
    versionId: "npm:@anionex/dsh-vision-toolkit@0.1.18",
    packageName: "@anionex/dsh-vision-toolkit",
    integrity: "sha512-BHCKRbUVlASegV8W1AFX+QuSRGp+xDZIF4foJR63o4o920WUAYgbpI1kfksUq6IGvN1NjGOLpmYs6Wj57fPNCw==",
    hasClient: true,
    capabilityClaims: ["cap.product.vision", "cap.seam.skills", "cap.seam.tools"],
    testedDsh: ["0.1.0-rc.5"],
  },
  { filesInspected: ["package.json", "cordis.patch.yml", "lib/index.js"] },
);

add(
  pluginDoc({
    id: "github:54xkeee/dsh-vision",
    publisher: "54xkeee",
    npmName: "dsh-vision-web",
    title: { zh: "dsh-vision", en: "dsh-vision" },
    description: {
      zh: "另一款视觉插件。本机已覆盖视觉能力时不得作为默认推荐。",
      en: "Another vision plugin. Must not be the default recommendation when vision is already covered.",
    },
    fetchedAt,
    awesomeCategory: "vision",
    trustState: "screened",
    sources: ["curated"],
    stars: { count: 4, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/54xkeee/dsh-vision",
    license: "MIT",
  }),
  {
    versionId: "npm:dsh-vision-web@0.0.1",
    packageName: "dsh-vision-web",
    capabilityClaims: ["cap.product.vision"],
  },
);

add(
  pluginDoc({
    id: "github:lussey820/dsh-http-tools",
    publisher: "lussey820",
    npmName: "dsh-http-tools",
    title: { zh: "HTTP Tools", en: "HTTP Tools" },
    description: {
      zh: "HTTP/API 调试工具集：请求、curl 解析与会话内历史。",
      en: "HTTP/API debugging toolset: requests, curl parsing, and in-session history.",
    },
    fetchedAt,
    sourceCommit: "fdc1b71738ac40a9fae0a5f6c02c81f7107f0a41",
    awesomeCategory: "tools",
    trustState: "installable",
    sources: ["discovered", "curated"],
    stars: { count: 0, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/lussey820/dsh-http-tools",
    license: "MIT",
  }),
  {
    versionId: "git:github.com/lussey820/dsh-http-tools@fdc1b71738ac40a9fae0a5f6c02c81f7107f0a41",
    packageName: "dsh-http-tools",
    integrity: "sha512-4JAxEcKk+s5/ZYmRD2jckHj8FosZdNo6M2jhAVFg2Eh5D1i8Ha+AimJJyi/HZ5EAOqZiHMnApL/5LlB2jgafSA==",
    capabilityClaims: ["cap.product.browser", "cap.seam.tools", "cap.seam.web"],
    lockedSpec: "github:lussey820/dsh-http-tools#fdc1b71738ac40a9fae0a5f6c02c81f7107f0a41",
  },
  { filesInspected: ["package.json", "cordis.patch.yml", "src/index.ts"] },
);

add(
  pluginDoc({
    id: "github:renpengfei1027/dsh-web-notify",
    publisher: "renpengfei1027",
    npmName: "dsh-web-notify",
    title: { zh: "Web Notify", en: "Web Notify" },
    description: {
      zh: "Web 通知插件，补上本机 web profile 的通知缺口。",
      en: "Web notification plugin that can fill a notify gap on the local web profile.",
    },
    fetchedAt,
    sourceCommit: "63498d970df877584b20f1462e96fe92016c5f16",
    awesomeCategory: "notify",
    scenes: ["cap.scene.we-media"],
    trustState: "installable",
    sources: ["discovered"],
    stars: { count: 0, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/renpengfei1027/dsh-web-notify",
    license: "MIT",
  }),
  {
    versionId: "npm:dsh-web-notify@0.1.4",
    packageName: "dsh-web-notify",
    hasClient: true,
    capabilityClaims: ["cap.product.notify"],
    lockedSpec: "dsh-web-notify@0.1.4",
  },
);

add(
  pluginDoc({
    id: "github:Aik358/dsh-auto-memory",
    publisher: "Aik358",
    npmName: "@a9i5k4/dsh-auto-memory",
    title: { zh: "Auto Memory", en: "Auto Memory" },
    description: {
      zh: "三层记忆自动注入与检索。存在文件系统与凭据静态信号，需人工复核。",
      en: "Three-layer auto memory. Filesystem and credential static signals require review.",
    },
    fetchedAt,
    awesomeCategory: "memory",
    trustState: "review_required",
    sources: ["discovered"],
    stars: { count: 11, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/Aik358/dsh-auto-memory",
    license: "BSD-3-Clause",
  }),
  {
    versionId: "npm:@a9i5k4/dsh-auto-memory@0.1.7",
    packageName: "@a9i5k4/dsh-auto-memory",
    hasClient: true,
    capabilityClaims: ["cap.product.memory"],
  },
  {
    fs: ["lib/index.js"],
    credentials: ["lib/index.js"],
    network: ["lib/client.js"],
    findings: [
      {
        id: "filesystem-write",
        severity: "medium",
        label: { zh: "发现本地文件写入能力", en: "Local filesystem write capability signal found" },
        files: ["lib/index.js"],
      },
    ],
  },
);

add(
  pluginDoc({
    id: "github:dsh-market/dsh-market",
    publisher: "dsh-market",
    npmName: "dshmarket",
    title: { zh: "dsh-market", en: "dsh-market" },
    description: {
      zh: "设置页内市场。另开 settings.section id=market，不是 DSH Store 要抄的路。",
      en: "In-settings market. Registers a separate settings.section id=market; DSH Store must not copy that path.",
    },
    fetchedAt,
    awesomeCategory: "market",
    trustState: "review_required",
    sources: ["curated"],
    stars: { count: 654, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/dsh-market/dsh-market",
  }),
  {
    versionId: "npm:dshmarket@1.10.1",
    packageName: "dshmarket",
    hasClient: true,
    lifecycleScripts: ["prepare"],
    requiresBuildPermission: true,
    capabilityClaims: ["cap.product.market"],
  },
  {
    spdx: null,
    network: ["client/client.js"],
    findings: [
      {
        id: "lifecycle-script",
        severity: "medium",
        label: { zh: "发现安装生命周期脚本：prepare", en: "Install lifecycle scripts found: prepare" },
        files: ["package.json"],
      },
    ],
  },
);

add(
  pluginDoc({
    id: "github:awesome-dsh-plugin/dsh-find-plugin",
    publisher: "awesome-dsh-plugin",
    npmName: "dsh-find-plugin",
    title: { zh: "Find Plugin", en: "Find Plugin" },
    description: {
      zh: "会话内按精选列表搜插件。Agent 可直接装是反面教材。",
      en: "In-session search of the curated list. Agent-direct install is the anti-pattern.",
    },
    fetchedAt,
    awesomeCategory: "tools",
    trustState: "screened",
    sources: ["curated"],
    stars: { count: 40, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/awesome-dsh-plugin/dsh-find-plugin",
    license: "MIT",
  }),
  {
    versionId: "npm:dsh-find-plugin@0.3.5",
    packageName: "dsh-find-plugin",
    capabilityClaims: ["cap.product.market"],
  },
);

add(
  pluginDoc({
    id: "github:openma-ai/deepseek-harness-tui",
    publisher: "openma-ai",
    title: { zh: "deepseek-harness-tui", en: "deepseek-harness-tui" },
    description: {
      zh: "Rust/ratatui 终端客户端。hub 因无有效 dsh manifest 标 blocked。",
      en: "Rust/ratatui terminal client. Hub blocked it for a missing dsh manifest.",
    },
    fetchedAt,
    awesomeCategory: "ui",
    trustState: "blocked",
    blockedReason: {
      zh: "未识别到有效的 dsh manifest，不能给出安装命令。",
      en: "No valid dsh manifest found; no install command may be emitted.",
    },
    sources: ["curated"],
    stars: { count: 34, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/openma-ai/deepseek-harness-tui",
    license: "MIT",
  }),
  {
    versionId: "git:github.com/openma-ai/deepseek-harness-tui@0000000000000000000000000000000000000001",
    packageName: "deepseek-harness-tui",
    hasBundle: false,
    expectedBundle: false,
    profile: "headless",
    profiles: ["headless"],
    capabilityClaims: ["cap.product.terminal"],
    lockedSpec: "github:openma-ai/deepseek-harness-tui#0000000000000000000000000000000000000001",
  },
  {
    findings: [
      {
        id: "manifest-missing",
        severity: "high",
        label: { zh: "未识别到有效的 dsh manifest", en: "No valid dsh manifest found" },
        files: ["package.json"],
      },
    ],
    filesInspected: ["package.json"],
  },
);

add(
  pluginDoc({
    id: "github:zhu1090093659/dsh-web-ui",
    publisher: "zhu1090093659",
    npmName: "dsh-web-ui",
    title: { zh: "dsh-web-ui monorepo 根", en: "dsh-web-ui monorepo root" },
    description: {
      zh: "皮肤合集 monorepo 根目录。不能把根目录当成可安装目标。",
      en: "Skin-collection monorepo root. The root must never be an install target.",
    },
    fetchedAt,
    awesomeCategory: "ui",
    trustState: "blocked",
    blockedReason: {
      zh: "monorepo 根没有有效 dsh.bundle，装根会装错子包。",
      en: "Monorepo root has no valid dsh.bundle; installing the root installs the wrong package.",
    },
    sources: ["curated"],
    stars: { count: 1312, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/zhu1090093659/dsh-web-ui",
  }),
  {
    versionId: "npm:dsh-web-ui@0.1.1",
    packageName: "dsh-web-ui",
    hasBundle: false,
    expectedBundle: false,
    capabilityClaims: ["cap.product.theme"],
  },
  {
    findings: [
      {
        id: "manifest-missing",
        severity: "high",
        label: { zh: "未识别到有效的 dsh manifest", en: "No valid dsh manifest found" },
        files: ["package.json"],
      },
    ],
  },
);

add(
  pluginDoc({
    id: "github:linxin666/dsh-web-ui-all",
    publisher: "linxin666",
    npmName: "@linxin666/dsh-web-ui-all",
    aliases: ["github:zhu1090093659/dsh-web-ui#packages/dsh-web-ui-all"],
    title: { zh: "侵入式 Web UI 合集", en: "Invasive Web UI pack" },
    description: {
      zh: "会遮挡官方设置的侵入式 Web UI。本机已清理，默认 blocked。",
      en: "Invasive Web UI that occludes official Settings. Removed locally; default blocked.",
    },
    fetchedAt,
    awesomeCategory: "ui",
    trustState: "blocked",
    blockedReason: {
      zh: "侵入式 Web UI 会遮挡官方设置，禁止一键安装。",
      en: "Invasive Web UI occludes official Settings; one-click install is forbidden.",
    },
    sources: ["discovered"],
    stars: { count: 0, fetchedAt, source: "local-observation@2026-08-17" },
    repository: "https://github.com/linxin666/dsh-web-ui-all",
  }),
  {
    versionId: "npm:@linxin666/dsh-web-ui-all@0.0.0",
    packageName: "@linxin666/dsh-web-ui-all",
    hasClient: true,
    capabilityClaims: ["cap.product.theme"],
  },
  {
    uiHijack: ["settings.section", "global-css"],
    findings: [
      {
        id: "ui-hijack",
        severity: "high",
        label: { zh: "劫持官方设置外壳", en: "Hijacks the official Settings chrome" },
      },
    ],
  },
);

add(
  pluginDoc({
    id: "github:huiliyi37/dsh-tianshu-tui",
    publisher: "huiliyi37",
    npmName: "@huiliyi37/dsh-tianshu-tui",
    title: { zh: "天枢 TUI", en: "Tianshu TUI" },
    description: {
      zh: "DeepSeek Harness 的终端 UI。默认目标是 headless，不偷偷装进 web。",
      en: "A terminal UI for DeepSeek Harness. Default target is headless, never silently installed into web.",
    },
    fetchedAt,
    awesomeCategory: "ui",
    trustState: "screened",
    sources: ["curated"],
    stars: { count: 104, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/huiliyi37/dsh-tianshu-tui",
    license: "Apache-2.0",
  }),
  {
    versionId: "npm:@huiliyi37/dsh-tianshu-tui@0.1.1-rc.6",
    packageName: "@huiliyi37/dsh-tianshu-tui",
    profile: "headless",
    profiles: ["headless"],
    capabilityClaims: ["cap.product.terminal"],
  },
);

add(
  pluginDoc({
    id: "github:slywalker2006/dsh-passwords",
    publisher: "slywalker2006",
    npmName: "dsh-passwords",
    title: { zh: "Passwords", en: "Passwords" },
    description: {
      zh: "hub 给出锁定 commit 安装命令的 clear 插件之一。",
      en: "One of the few hub-clear plugins with a locked-commit install command.",
    },
    fetchedAt,
    sourceCommit: "90493d3b1a22d24326480180eac753cbf91ac817",
    awesomeCategory: "tools",
    trustState: "installable",
    sources: ["discovered"],
    stars: { count: 0, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/slywalker2006/dsh-passwords",
    license: "MIT",
  }),
  {
    versionId: "git:github.com/slywalker2006/dsh-passwords@90493d3b1a22d24326480180eac753cbf91ac817",
    packageName: "dsh-passwords",
    capabilityClaims: ["cap.product.security"],
    lockedSpec: "github:slywalker2006/dsh-passwords#90493d3b1a22d24326480180eac753cbf91ac817",
  },
);

add(
  pluginDoc({
    id: "github:dfkai/dsh-board",
    publisher: "dfkai",
    npmName: "dsh-board",
    title: { zh: "dsh-board", en: "dsh-board" },
    description: {
      zh: "hub clear + 锁定 commit 的看板插件。",
      en: "Hub-clear board plugin with a locked commit.",
    },
    fetchedAt,
    sourceCommit: "5375c0920f8a04a3208f4d70719656455113da5d",
    awesomeCategory: "workflow",
    trustState: "installable",
    sources: ["discovered"],
    stars: { count: 0, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/dfkai/dsh-board",
    license: "MIT",
  }),
  {
    versionId: "git:github.com/dfkai/dsh-board@5375c0920f8a04a3208f4d70719656455113da5d",
    packageName: "dsh-board",
    capabilityClaims: ["cap.product.workflow", "cap.scene.office"],
    lockedSpec: "github:dfkai/dsh-board#5375c0920f8a04a3208f4d70719656455113da5d",
  },
);

add(
  pluginDoc({
    id: "github:Jamailar/beav-deepseek-harness",
    publisher: "Jamailar",
    npmName: "beav-creator-dsh",
    title: { zh: "Beav Creator", en: "Beav Creator" },
    description: {
      zh: "hub clear 插件，可作为创作者工作流候选，但不是官方场景认证。",
      en: "Hub-clear plugin that may help creator workflows; not an official scene certification.",
    },
    fetchedAt,
    sourceCommit: "05f947af0d18f348a6c282ae976b0affddf522a1",
    awesomeCategory: "workflow",
    scenes: ["cap.scene.we-media"],
    trustState: "installable",
    sources: ["discovered"],
    stars: { count: 0, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/Jamailar/beav-deepseek-harness",
    license: "MIT",
  }),
  {
    versionId: "git:github.com/Jamailar/beav-deepseek-harness@05f947af0d18f348a6c282ae976b0affddf522a1",
    packageName: "beav-creator-dsh",
    capabilityClaims: ["cap.product.workflow"],
    lockedSpec: "github:Jamailar/beav-deepseek-harness#05f947af0d18f348a6c282ae976b0affddf522a1",
  },
);

add(
  pluginDoc({
    id: "github:AKS1st/dsh-cyber-particle",
    publisher: "AKS1st",
    title: { zh: "Cyber Particle 主题", en: "Cyber Particle theme" },
    description: {
      zh: "主题插件，自动发现进入候选，无安装按钮。主题默认互斥。",
      en: "Theme plugin admitted as a candidate. No install button. Themes are mutually exclusive.",
    },
    fetchedAt,
    awesomeCategory: "theme",
    trustState: "candidate",
    sources: ["discovered"],
    stars: { count: 5, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/AKS1st/dsh-cyber-particle",
    license: "MIT",
  }),
  {
    versionId: "git:github.com/AKS1st/dsh-cyber-particle@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    packageName: "dsh-cyber-particle",
    hasBundle: true,
    capabilityClaims: ["cap.product.theme"],
    lockedSpec: "github:AKS1st/dsh-cyber-particle#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
);

add(
  pluginDoc({
    id: "github:Tommy00748/dsh-theme-cyberpunk2077",
    publisher: "Tommy00748",
    title: { zh: "赛博朋克主题", en: "Cyberpunk theme" },
    description: {
      zh: "另一款主题，用于互斥检测。仍是候选。",
      en: "Another theme used for mutex detection. Still a candidate.",
    },
    fetchedAt,
    awesomeCategory: "theme",
    trustState: "candidate",
    sources: ["discovered"],
    stars: { count: 0, fetchedAt, source: "plugin-hub topic scan@2026-08-17" },
    repository: "https://github.com/Tommy00748/dsh-theme-cyberpunk2077",
  }),
  {
    versionId: "git:github.com/Tommy00748/dsh-theme-cyberpunk2077@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    packageName: "dsh-theme-cyberpunk2077",
    capabilityClaims: ["cap.product.theme"],
    lockedSpec: "github:Tommy00748/dsh-theme-cyberpunk2077#bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
);

add(
  pluginDoc({
    id: "github:omdsh-dev/ex-setting",
    publisher: "omdsh-dev",
    npmName: "@deepseek-ai/dsh-ex-setting",
    title: { zh: "ex-setting", en: "ex-setting" },
    description: {
      zh: "hub 给出锁定 commit 但仍标 review 的设置扩展。",
      en: "Settings extension with a locked commit that hub still marks as review.",
    },
    fetchedAt,
    sourceCommit: "46130b8d5f0c3784cb1325412fea0b116b37e9ae",
    awesomeCategory: "dev",
    trustState: "review_required",
    sources: ["discovered"],
    stars: { count: 0, fetchedAt, source: "plugin-hub /api/plugins@2026-08-17T00:00:55.669Z" },
    repository: "https://github.com/omdsh-dev/ex-setting",
  }),
  {
    versionId: "git:github.com/omdsh-dev/ex-setting@46130b8d5f0c3784cb1325412fea0b116b37e9ae",
    packageName: "@deepseek-ai/dsh-ex-setting",
    capabilityClaims: ["cap.seam.settings"],
    lockedSpec: "github:omdsh-dev/ex-setting#46130b8d5f0c3784cb1325412fea0b116b37e9ae",
  },
);

add(
  pluginDoc({
    id: "github:AbcdefgXW/dsh-msg-hub",
    publisher: "AbcdefgXW",
    npmName: "dsh-msg-hub",
    title: { zh: "消息中枢", en: "Message Hub" },
    description: {
      zh: "通知/集成向的消息中枢，精选列表收录，尚未晋升到可安装。",
      en: "Notification/integration message hub. Curated, not yet promoted to installable.",
    },
    fetchedAt,
    awesomeCategory: "notify",
    scenes: ["cap.scene.we-media"],
    trustState: "screened",
    sources: ["curated"],
    stars: { count: 0, fetchedAt, source: "awesome-dsh-plugin.com/plugins.json@2026-08-17" },
    repository: "https://github.com/AbcdefgXW/dsh-msg-hub",
    license: "MIT",
  }),
  {
    versionId: "npm:dsh-msg-hub@0.0.1",
    packageName: "dsh-msg-hub",
    capabilityClaims: ["cap.product.notify"],
  },
);

add(
  pluginDoc({
    id: "github:dsh-store/fixture-client-only",
    publisher: "dsh-store",
    npmName: "@dsh-store/fixture-client-only",
    title: { zh: "仅 client 反例", en: "Client-only fixture" },
    description: {
      zh: "只有 dsh.client、没有 dsh.bundle。装进 profile 只能标 inert。",
      en: "Has dsh.client only, no dsh.bundle. Installing it into a profile must yield inert.",
    },
    fetchedAt,
    awesomeCategory: "dev",
    trustState: "screened",
    sources: ["author_pr"],
    stars: { count: 0, fetchedAt, source: "fixture" },
    repository: "https://github.com/dsh-store/fixture-client-only",
    license: "MIT",
  }),
  {
    versionId: "npm:@dsh-store/fixture-client-only@0.0.1",
    packageName: "@dsh-store/fixture-client-only",
    hasBundle: false,
    hasClient: true,
    expectedBundle: false,
    capabilityClaims: ["cap.seam.clientModules"],
    lockedSpec: "@dsh-store/fixture-client-only@0.0.1",
  },
  { filesInspected: ["package.json"] },
);

add(
  pluginDoc({
    id: "github:dsh-store/fixture-monorepo#packages/real-plugin",
    publisher: "dsh-store",
    npmName: "@dsh-store/fixture-real-plugin",
    title: { zh: "monorepo 子包正例", en: "Monorepo subpath fixture" },
    description: {
      zh: "必须按 subpath 安装，不能装 monorepo 根。",
      en: "Must install the subpath package, never the monorepo root.",
    },
    fetchedAt,
    awesomeCategory: "dev",
    trustState: "installable",
    sources: ["author_pr"],
    stars: { count: 0, fetchedAt, source: "fixture" },
    repository: "https://github.com/dsh-store/fixture-monorepo",
    license: "MIT",
  }),
  {
    versionId: "npm:@dsh-store/fixture-real-plugin@0.0.1",
    packageName: "@dsh-store/fixture-real-plugin",
    subpath: "packages/real-plugin",
    hasClient: false,
    capabilityClaims: ["cap.seam.tools"],
    lockedSpec: "@dsh-store/fixture-real-plugin@0.0.1",
  },
);

if (plugins.length !== 20) {
  throw new Error(`expected 20 plugins, got ${plugins.length}`);
}

const pluginDir = join(root, "registry/plugins");
const passportDir = join(root, "registry/passports");
mkdirSync(pluginDir, { recursive: true });
mkdirSync(passportDir, { recursive: true });

for (const { plugin, passport } of plugins) {
  writeFileSync(join(pluginDir, `${fileSafe(plugin.id)}.yml`), dump(plugin));
  writeFileSync(join(passportDir, `${fileSafe(passport.id)}.json`), `${JSON.stringify(passport, null, 2)}\n`);
}

const capabilities = [
  ...seams.map(([name, en, zh]) => ({
    id: `cap.seam.${name}`,
    layer: "seam",
    officialSeam: `ctx.${name}`,
    title: { zh, en },
    description: {
      zh: `官方能力 seam ctx.${name}。词典版本化，不手抄死后不再更新。`,
      en: `Official capability seam ctx.${name}. Versioned dictionary; do not hand-copy and freeze.`,
    },
    taxonomyVersion: 1,
    annotators: ["scanner", "author"],
  })),
  ...products.map(([name, en, zh]) => ({
    id: `cap.product.${name}`,
    layer: "product",
    title: { zh, en },
    description: { zh: `产品能力：${zh}`, en: `Product capability: ${en}` },
    taxonomyVersion: 1,
    annotators: ["scanner", "maintainer"],
  })),
  ...scenes.map(([name, en, zh]) => ({
    id: `cap.scene.${name}`,
    layer: "scene",
    title: { zh, en },
    description: { zh: `场景能力：${zh}。只有插件包或维护者可标注。`, en: `Scene capability: ${en}. Packs or maintainers only.` },
    taxonomyVersion: 1,
    annotators: ["maintainer", "pack"],
  })),
];

writeFileSync(join(root, "registry/capabilities/taxonomy.v1.yml"), dump(capabilities));
writeFileSync(
  join(root, "registry/rules/taxonomy-source.yml"),
  dump({
    taxonomyVersion: 1,
    fetchedAt,
    officialSeams: {
      count: 56,
      source: "https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.zh.md",
      capturedAt: "2026-08-17",
    },
    note: "Do not treat this snapshot as the last official list. Refresh from capability-seams.zh.md.",
  }),
);

const pack = {
  id: "pack:dsh-store/we-media-starter",
  version: "0.1.0",
  title: { zh: "自媒体起步包", en: "We-media starter pack" },
  description: {
    zh: "保留已装视觉工具，不重复安装；只补已经 installable 的通知能力。工作流条目不足时标 partial。",
    en: "Keep the installed vision toolkit, do not reinstall it, and only add installable notify coverage. Mark partial when workflow is still missing.",
  },
  kind: "official",
  profileTarget: "web",
  entries: [
    { ref: "github:Anionex/dsh-vision-toolkit", version: "npm:@anionex/dsh-vision-toolkit@0.1.18", role: "alreadyCovered" },
    { ref: "github:renpengfei1027/dsh-web-notify", version: "npm:dsh-web-notify@0.1.4", role: "required" },
  ],
  mutexGroups: [{ id: "theme", policy: "single" }],
  conflicts: [{ plugin: "github:linxin666/dsh-web-ui-all", reason: "侵入式 Web UI 会遮挡官方设置" }],
  capabilityCoverage: ["cap.scene.we-media", "cap.product.vision", "cap.product.notify"],
  installPolicy: { stopOnBlocked: true, requirePassport: true, allowCandidate: false },
  completeness: "partial",
};
writeFileSync(join(root, "registry/packs/dsh-store__we-media-starter.yml"), dump(pack));

const blockedPack = {
  id: "pack:dsh-store/blocked-ui-demo",
  version: "0.0.1",
  title: { zh: "含 blocked 条目的反例包", en: "Pack with a blocked entry" },
  kind: "official",
  profileTarget: "web",
  entries: [
    { ref: "github:linxin666/dsh-web-ui-all", version: "npm:@linxin666/dsh-web-ui-all@0.0.0", role: "required" },
  ],
  installPolicy: { stopOnBlocked: true, requirePassport: true, allowCandidate: false },
  completeness: "partial",
};
writeFileSync(join(root, "registry/packs/dsh-store__blocked-ui-demo.yml"), dump(blockedPack));

writeFileSync(
  join(root, "registry/rules/trust.yml"),
  dump({
    scannerVersion: 2,
    cannotPromoteTo: ["installable", "featured"],
    states: {
      candidate: ["public repo", "parseable id", "not obvious spam"],
      screened: ["dsh.bundle present", "license readable", "immutable version", "passport written"],
      review_required: ["lifecycle scripts", "credential/network/fs high signal", "insufficient evidence"],
      installable: ["human or high-confidence rule", "subpath resolved", "immutable version", "passport exists", "not blocked"],
      featured: ["maintainer willing to recommend", "still not a safety guarantee"],
      blocked: ["no valid manifest", "malicious signal", "official UI hijack", "unusable license", "explicit takedown"],
    },
  }),
);

const catalogPath = join(root, "plugin/data/catalog.json");
mkdirSync(join(root, "plugin/data"), { recursive: true });
writeFileSync(
  catalogPath,
  `${JSON.stringify(
    {
      root: "registry",
      plugins: plugins.map((item) => item.plugin),
      packs: [pack, blockedPack],
      passports: plugins.map((item) => item.passport),
      capabilities,
      candidates: plugins.filter((item) => item.plugin.trustState === "candidate").map((item) => item.plugin),
    },
    null,
    2,
  )}\n`,
);

console.log(`wrote ${plugins.length} plugins, ${capabilities.length} capabilities`);
