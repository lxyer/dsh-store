# DSH Store 开发文档

| 字段 | 取值 |
| --- | --- |
| 对外产品名 | DSH Store |
| 内部标识 | `dsh-store` |
| 文档版本 | `0.2.1-spec` |
| 文档日期 | 2026-08-17 |
| 文档性质 | 可执行的产品 / 技术开发合同，不是调研笔记 |
| 本轮交付 | **只交付完整开发合同**。本仓库当前不实现商店代码、不发 npm、不注册域名 |
| 建议开源协议 | MIT |
| 建议默认语言 | 中文界面优先，数据与文档中英双语 |
| 建议源真相 | GitHub 仓库 + 开放注册表；数据库只做索引与派生指标 |
| 占位组织 / 域名 | GitHub org `dsh-store`，站点 `store.dsh.dev`。未申请，可改 |

本文回答三件事：DSH Store 要做成什么、为什么现有社区产品还不够、以及下一阶段按什么顺序把它做出来。

---

## 目录

1. 文档地位与证据边界
2. 产品定位
3. 用户与关键场景
4. 信息架构
5. 双表面与官方 slot 合同
6. 安装协议、激活校验与只下载不安装
7. 发现、注册表、护照与作者提交
8. 能力诊断与可解释推荐
9. 插件包、分享与场景方案
10. 评分、反作弊与榜单
11. 架构、开放 API 与数据模型
12. 安全、隐私与治理
13. 分阶段交付与可测试验收
14. 商业化边界：不污染开源核
15. 必须补上的功能、风险与下一步实现顺序

---

## 1. 文档地位与证据边界

### 1.1 本轮范围

本轮只确定产品边界、信息架构、安装协议、安全治理、数据模型和分阶段验收。**不创建商店实现、不发布 npm 包、不注册域名、不向社区仓库提 PR、不修改用户本机 `$DSH_HOME`。**

后续任何实现必须以本文第 6、8、10、13 章的验收门为准，而不是以“页面能打开”或“子代理说做完了”为准。第 5–15 章是同一份合同的后半段，不是另一份调研。

### 1.2 证据分层

后文凡标注抓取时间的数字，都只代表当时公开快照，不能写成永久事实。

| 层级 | 含义 | 本文用法 |
| --- | --- | --- |
| **事实** | 官方文档、本机文件、公开 API / 仓库在指定时间点读到的内容 | 可直接作为实现约束 |
| **推断** | 从事实推出的产品决策或架构选择 | 写成默认决策，允许以后改，但改之前要说明原因 |
| **未验证现状** | 需要以后再测的运行时、账号、域名、商标或商业主体 | 不得写成已经上线 |

### 1.3 已核实事实

1. DeepSeek 官方站点将产品定位为开发者预览版，标题为“DeepSeek Harness 开发者预览版：一切皆插件”。来源：[deepseek.com/harness](https://www.deepseek.com/harness/)，2026-08-17 抓取。
2. 官方仓库 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 在 2026-08-17 抓取为 **137,261** star（GitHub 页面 `stargazerCount`），默认分支 `master`，根包 `@deepseek-ai/dsh-root` 版本 `0.1.0-rc.5`，协议 MIT。徽章接口同期显示 `137k`，ungh 接口同期为 `137,265`。对外引用必须写清抓取时间和口径，禁止把约数写成精确值。
3. 社区入口指向 GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)。
4. 官方安装模型把“组合包 / bundle”和“profile”分开：
   - bundle 在 `package.json` 声明 `dsh.bundle.patch`，贡献一层 `cordis.patch.yml`。
   - profile 位于 `$DSH_HOME/profiles/<name>`，`dsh.profile.bundles` 是有序列表。
   - `dsh plugin --profile <name> add <spec>` 是 pnpm 薄转发器；成功后按“已安装包是否声明 `dsh.bundle`” reconcile 进 bundles。
   - 没有 `dsh.bundle` 的包可以装成普通依赖，但不会成为 profile 层。
   - **只有 `dsh.client`、没有 `dsh.bundle` 的包不能被 `dsh plugin add` 激活为 profile 层。** 这是 awesome-dsh-plugin 最常见的拒稿原因。
5. 加载顺序是：bundles → profile `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch`。后层整行替换 `config`，不深度合并。
6. git 安装拉的是源码，不跑 `build`。作者需要自包含 `prepare`；pnpm ≥10 默认拦截生命周期脚本，用户必须把包写进 `allowBuilds` / `onlyBuiltDependencies`。更安全的分发是 npm 预构建或 `pnpm pack` tarball。
7. 官方 `pluginInventory/list` 只读当前 Loader 树，不识别来源，不能装 / 卸 / 启用 / 停用插件。DSH Store 必须自建安装与来源模型。
8. Settings 的正确接入点是官方 `settings.plugins.tab` slot，而不是再抢一条顶层“插件”导航，更不是覆盖整站皮肤。
9. 用户本机在 2026-08-17 的 web profile 已核实：
   - `$DSH_HOME` = `/Users/lxyer/.dsh`
   - bundles = `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`@anionex/dsh-vision-toolkit`
   - Vision Toolkit `0.1.18` 走本地 OpenCodex：`http://127.0.0.1:10100/v1`，模型 `grok-4.6`
   - 全局 `$DSH_HOME/cordis.patch.yml` 在清理 `@linxin666/dsh-web-ui-all` 后为空数组
   - `describe-image.mjs` 仍保留在 profile `plugins/`，但未加载
10. 社区对照在 2026-08-17 的公开快照：

| 项目 | star | 角色 | 关键缺口 |
| --- | ---: | --- | --- |
| [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | 5890 | 人工精选列表，一插件一 yml | 只要 `dsh.bundle`；创建满 1 天且提交 ≥10；加 topic `dsh-plugin`；本身不是商店 |
| [dsh-market](https://github.com/dsh-market/dsh-market) / npm `dshmarket` **1.10.1** | 642 | 设置页内一键安装市场 | 只装 awesome 精选；无评分评价；无能力图谱；无用户插件包；无全网自动发现；**自己另开 `settings.section` id `market`** |
| [cclank/dsh-plugin-hub](https://github.com/cclank/dsh-plugin-hub) | 16 | 证据目录 + 静态筛查 + 护照，站 [dsh.lanshuagent.com](https://dsh.lanshuagent.com/) | **不安装、不执行插件**；无评分；无推荐；无插件包 |
| [dsh-find-plugin](https://github.com/awesome-dsh-plugin/dsh-find-plugin) | 40 | 会话内按 topic 搜 | 只按 star；无安全证据；agent 可直接装 |
| [dshget.com](https://www.dshget.com/) | — | 网页检索目录 | 目录站，不是商店运行时 |

11. plugin-hub 公开状态接口在 `2026-08-17T00:00:55.669Z`：listed **454**，autoDiscovered **251**，Codex picks **7**，screeningClear **5** / review **429** / blocked **20**，curated **203**，topic 总量 **5638**，证据覆盖约 **9.5%**，Cron `0 */12 * * *`。`installCommand` 当时只有 7 条，说明“能安全给出安装命令”远少于“被列出来”。站点明确不安装、不构建、不执行被收录插件。
12. [awesome-dsh-plugin.com/plugins.json](https://awesome-dsh-plugin.com/plugins.json) 在 2026-08-17 的 `count=1124`，分类口径含 `ui/usage/theme/model/session/memory/tools/vision/skill/workflow/notify/dev/market/fun`。这和 hub listed 454、hub curated 203、dshget-data README 自称 2,460 条不是同一口径。DSH Store 必须同时保存“精选列表口径”和“自动发现口径”，禁止把不同来源的数字加总后对外宣传。
13. 官方 Settings 合同在 2026-08-17 已核实：
    - `@deepseek-ai/dsh-client-ui-settings-plugins` 拥有唯一 `settings.section`，id `plugins`，order `15`，并声明根级 list slot `settings.plugins.tab`。
    - 它自己贡献 `configurable` 标签页，order `0`。
    - `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` 贡献 `all` 标签页，order `10`；`pluginInventory/list` 只读当前 Loader 快照。
    - dsh-market 实际注册的是**另一条** `settings.section`，id `market`，order `40`，外加 `shell.overlay` toast。DSH Store **不得抄这条路**。
14. dsh-market 宿主安装面在 2026-08-17 已核实：host 注入 `webServer` + `loader`，只接受同源 POST `/dsh-market/*`。Desktop 走 `desktopProfiles` / `desktopPnpm` 并强制 `allowRestart: false`。现有路由包括 registry、installed、install、uninstall、update、updates、status、cancel、logs、approve-builds、setup-pnpm、restart、backup、restore、webdav、toggle、groups、use-skin、check。DSH Store 可以复用这个安全边界，但路由前缀必须换成 `/dsh-store/*`，且不得在 Desktop 上打开重启按钮。
15. dsh-market 自己的 [IMPROVEMENT-PLAN.md](https://github.com/dsh-market/dsh-market/blob/main/IMPROVEMENT-PLAN.md) 已承认这些事故，DSH Store 必须当成 P0，不得重踩：
    - 装错 monorepo 子包
    - 装完不知道有没有进 `dsh.profile.bundles`
    - `minimumReleaseAge` 造成假更新
    - git `prepare` / 构建脚本被 pnpm 拦截
    - 进度条假死
16. 安装插件 = 以用户权限跑第三方代码。DSH / agent 审批管不到插件自身代码。

17. 同日验收复核不得回写覆盖上午快照。2026-08-17 下午用 GitHub API、awesome `plugins.json`、hub `/api/registry/status` 再读到：
    - `deepseek-ai/deepseek-harness` GitHub API `stargazers_count=137573`，与上午页面 `stargazerCount=137261`、ungh `137265` 不是同一接口。
    - awesome `plugins.json` 的 `count=1134`，上午对照是 `1124`。
    - awesome 仓库 star `5940`，dsh-market star `647`；hub 仓库 star 仍为 `16`。
    - hub `/api/registry/status` 仍是 `generatedAt=2026-08-17T00:00:55.669Z`：listed `454` / autoDiscovered `251` / screeningClear `5` / screeningBlocked `20`；`/api/plugins` 里 `installCommand` 仍只有 7 条。
    - 官方 [capability-seams.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.zh.md) 的 `ctx.*` 服务名仍为 **56**。
    实现与对外文案必须同时写抓取时间和口径；禁止把下午数字改回上午表格后假装只有一个“当前值”，也禁止把 API / 页面 / ungh / README 自称条数加总。

### 1.4 来自本机的可复用经验

这些是观察记录，用来约束产品，不证明当前任何第三方插件“现在安全”或“现在可用”。

- 侵入式 Web UI / 皮肤插件会挡住官方设置。DSH Store 自己禁止做全局皮肤劫持。
- `Provider is not configured: xai` 只说明选了内置未配置 provider，不等于本地 OpenCodex 路由坏了。能力推荐不得把“配置选错”误判成“缺少插件”。
- 审查插件风险后再装。目录里的 blocked / 证据不足条目，不得给出直接安装按钮。

### 1.5 默认决策，不再空转

| 决策 | 默认 | 以后才能改的条件 |
| --- | --- | --- |
| 开源节奏 | 先开源核，后商业化层 | 只有在开源核可自托管、可审计后，才允许接认证/企业目录 |
| 源真相 | GitHub 为源，数据库为索引 | 若官方以后提供签名注册表，再升为更高权威 |
| 自动发现 | 只进候选，不自动信任安装 | 人工或规则晋升后才出现一键安装 |
| 协议 | MIT | 若需要专利防御再评估 Apache-2.0 |
| 站点形态 | 先 SSR / 静态快照 + 开放 JSON API | 需要账号体系后再加动态后端 |
| 语言 | 中英双语 | 第三语言等社区出现稳定译者 |
| 安装执行面 | 只在用户本机、只接受同源 / loopback | 永不做“云端替用户安装” |
| 商标 / 公司主体 | 文档用占位，不在本轮申请 | 需要对外商务合作时再单独决策 |

现在还不需要用户拍板的只有：最终 GitHub org 名、生产域名、是否立刻申请商标或成立公司。文档继续用占位。

---

## 2. 产品定位

### 2.1 一句话

**DSH Store 是 DeepSeek Harness 的可信应用商店、能力操作系统和场景解决方案分发平台。**

它不是第三个插件目录，也不是第二个只装精选列表的设置页市场。它同时做四件事：

1. **发现**：从 awesome、GitHub topic、作者 PR、自动扫描里找出插件和插件包。
2. **信任**：给每个可安装目标发 commit / npm 版本级护照，区分收录、候选、可安装、高风险。
3. **补全**：扫描当前 profile 的能力缺口，解释“缺什么、为什么推荐、装完补上什么”。
4. **组合**：官方场景包、社区包、用户包一次安装一组插件，并处理冲突、互斥和目标 profile。

### 2.2 双表面

```text
用户 / 作者 / Agent
        │
        ├─ DSH 插件（应用内商店）
        │    设置页商店 / 已装 / 能力诊断三个 `settings.plugins.tab` + agent 工具
        │    本机安装 / 更新 / 卸载 / 回滚 / 验证
        │
        └─ 聚合网站（hao123 式发现层）
             搜索 / 分类 / 榜单 / 护照 / 作者主页 / 插件包广场
             开放 API，供其他市场、桌面客户端、解决方案商复用
```

两个表面共用同一套注册表、护照、能力词典和插件包契约。网站负责发现与治理，插件负责本机执行与验证。任何一方单独上线都不算 DSH Store 完成。

### 2.3 必须赢的差异

| 维度 | awesome | dsh-market | plugin-hub | dsh-find-plugin | **DSH Store 必须做到** |
| --- | --- | --- | --- | --- | --- |
| 覆盖 | 精选 | 只消费精选 | 精选 + 自动发现 | topic 搜索 | 精选 + 自动发现 + 作者申请 + 用户插件包 |
| 安装 | 复制命令 | 一键装精选 | 不安装 | 让 agent 装 | 一键装**已晋升**目标，并做装后校验 |
| 信任 | 免责声明 | 精选即白名单 | commit 护照 + 筛查 | 几乎无 | 护照接到真实安装；blocked 无安装按钮 |
| 能力 | 人工分类 | 分类 + 主题 | 有限能力信号 | 无 | 官方 seam + 场景能力图谱 + 可解释推荐 |
| 组合 | 无 | 备份/恢复清单 | 无 | 无 | 一等公民插件包，可分享、可复现 |
| 评价 | 无 | 无 | 无 | 无 | 多维评分 + 反作弊 + 安装成功率 |
| 商业化预留 | 无 | 无 | 无 | 无 | 开源核可自托管；解决方案包 / 企业私有目录可后接 |

### 2.4 非目标

DSH Store **不做**：

- 官方 DeepSeek 的替代品或“更好的 DSH 内核”
- 远程代用户在其机器上安装插件
- 通过执行第三方插件源码来“验证功能”
- 把本地 settings、密钥、会话、聊天上传到云
- 用全局皮肤 / 宠物 / 悬浮层劫持官方设置
- 把自动发现直接等同于可安装
- 只做五星评分、只做 Star 榜
- 把目录数字、仪表盘或本地预览当成端到端完成证明

### 2.5 成功定义

社区影响力最大，不等于 star 最多。DSH Store 的成功按下面四层衡量：

1. **作者愿意来**：提交插件 / 插件包的路径比 awesome 单文件 PR 更完整，但不制造第二套互相打架的精选政治。
2. **用户敢装**：每次一键安装都能解释来源、护照、目标 profile、构建脚本风险，以及装完到底有没有生效。
3. **Agent 会用**：会话里能问“我缺什么”“装哪个包能做自媒体”，并得到可解释、可拒绝的推荐。
4. **后来者能站在这上面赚钱**：场景解决方案、企业私有目录、认证作者都可以复用同一套注册表和安装协议，而不污染开源核。

---

## 3. 用户与关键场景

### 3.1 角色

| 角色 | 要完成的事 | 失败时的损失 |
| --- | --- | --- |
| 日常用户 | 搜索、比较、一键安装、看评价、装场景包 | 装错、装了不生效、装了高风险插件、官方设置被劫持 |
| 进阶用户 / 创作者 | 看能力缺口、组自己的插件包、分享给同事 | 包不可复现、冲突未声明、密钥被打进分享文件 |
| Agent | 代表用户发现和安装，但必须可审批 | 静默执行高风险安装，或把配置错误当成缺插件 |
| 插件作者 | 提交、更新介绍、看安装失败原因、回应评价 | 被冒名、被错装 monorepo 根、被不公平差评 |
| 解决方案商 | 发布领域插件包，而不是重新做一套商店 | 被平台锁死、无法自托管、无法审计 |
| 审查员 / 维护者 | 晋升候选、处理举报、下架、复现护照 | 自动发现噪声淹没人工，或误伤正常插件 |

### 3.2 P0 场景

1. **新用户装商店本身**：`dsh plugin --profile web add <store-package>`，重启后在 **设置 → 插件 → DSH Store** 看到商店，官方设置仍可打开。
2. **按能力补全**：用户说“我要做自媒体拆条/封面/评论”，商店扫描当前 web profile，指出已有视觉工具、缺少通知 / 浏览器 / 素材工作流，并给出一个可解释的插件包。
3. **按名字或场景搜索**：支持中英文、npm 名、GitHub repo、能力标签、风险等级、目标 profile。
4. **一键安装已晋升插件**：绑定不可变 npm 版本或 git commit；装后读取 `dsh.profile.bundles` 与 Loader 状态，展示 live / restart / inert / broken。
5. **下载但不安装**：导出锁定 commit 的 tarball / 安装命令 / 护照 JSON，供离线或审计。
6. **看榜单**：Star、Star 增长最快、新发现、评分、安装成功率、能力补全、安全通过、官方/社区插件包。
7. **打分和写评价**：多维分数 + 短评；必须有反作弊，且评价不能替代护照。
8. **组合并分享插件包**：用户勾选当前已装插件或目录插件，生成可分享包；他人打开后看到冲突、风险和目标 profile，再决定是否安装。
9. **作者提交**：GitHub PR / Issue 申请入库；CI 检查 `dsh.bundle`、subpath、许可证、最低仓库成熟度。
10. **自动发现新插件**：定时扫描 `topic:dsh-plugin` 和已知列表，进入候选，不自动给安装按钮。

### 3.3 本机应能演示的第一条推荐

用户当前 web profile 已有 `@anionex/dsh-vision-toolkit`。能力诊断的第一条诚实结论应类似：

- 已覆盖：视觉 / 识图（第三方 toolkit，本机已改走 OpenCodex Grok，不走其默认免费端点）
- 可能仍缺：通知、浏览器发布、素材库、记忆、工作流编排、多模型路由
- 不得因为默认模型或 provider 选错，就推荐“再装一个视觉插件”

这条演示用来防止推荐引擎一上来就变成“再给你堆插件”。

---

## 4. 信息架构

### 4.1 核心对象

```text
Publisher（作者 / 组织）
  └─ Plugin（逻辑插件，跨版本稳定 ID）
        └─ PluginVersion（npm version 或 git commit，不可变）
              └─ Passport（扫描器版本 + 证据）
              └─ CapabilityClaim（宣称覆盖的能力）
              └─ InstallTarget（npm / git+subpath / tarball）

Pack（插件包）
  └─ PackVersion
        ├─ entries[] → PluginVersion
        ├─ profileTarget（web / headless / any）
        ├─ conflicts / mutex / requires
        └─ capabilityCoverage

Review / Rating
  └─ 绑定 PluginVersion，而不是只绑 Plugin

LeaderboardSnapshot
  └─ 按日/周物化，禁止每次请求现场重算“最强榜”
```

### 4.2 稳定 ID 规则

| 对象 | ID 规则 | 禁止 |
| --- | --- | --- |
| Plugin | `github:<owner>/<repo>`；monorepo 子包用 `github:<owner>/<repo>#<subpath>` | 用会变的 npm 名当唯一主键 |
| PluginVersion | `npm:<name>@<version>` 或 `git:<host>/<owner>/<repo>@<sha>` | 用 branch / `latest` / `HEAD` 当可安装版本 |
| Pack | `pack:<publisher>/<slug>` | 用展示名当 ID |
| Capability | `cap:<taxonomy>.<name>`，例如 `cap.seam.llm`、`cap.scene.we-media` | 作者自由输入一堆不可聚合的标签 |
| Passport | `passport:<pluginVersion>:<scannerVersion>` | 用最新扫描覆盖历史证据 |

npm 名、展示名、中文名都是属性，不是主键。插件改名后必须保留别名。

### 4.3 信任状态机

```text
discovered ─▶ candidate ─▶ screened ─┬▶ installable ─▶ featured
                                     ├▶ review_required
                                     └▶ blocked
```

| 状态 | 网站 | 应用内商店 | Agent |
| --- | --- | --- | --- |
| `discovered` | 可出现在“新发现” | 只读卡片 | 可提及，不可装 |
| `candidate` | 可检索，标“候选” | 只提供护照 / 只读介绍；无安装器、无“可执行下载包” | 不可装 |
| `screened` | 显示护照 | 显示风险，无安装按钮 | 不可装 |
| `review_required` | 显示待审原因 | 无安装按钮 | 不可装 |
| `installable` | 给出锁定安装命令 | 一键安装 | 需用户确认后可装 |
| `featured` | 可进官方包/首页 | 可进推荐默认集 | 可优先推荐 |
| `blocked` | 公开原因和下架信息 | **禁止安装按钮** | **禁止安装工具** |

**收录 ≠ 背书。** `featured` 也只表示“通过当前规则且维护者愿意推荐”，不是安全保证。

### 4.4 安装激活状态

任何安装 / 更新 / 卸载结束后，UI 必须返回四态之一：

| 状态 | 含义 | 用户下一步 |
| --- | --- | --- |
| `live` | 已在 `dsh.profile.bundles`，当前 Loader 可热挂或已激活 | 无需重启 |
| `restart` | 已进入 bundles，但 patch 含 config / disable / 复杂行，或 client 图需要重启 | 显示原因 + 可选本机重启 |
| `inert` | 依赖写进去了，但没有 `dsh.bundle`，未成为 profile 层 | 说明可能只是 client / 普通库，并提示正确 profile |
| `broken` | CLI 失败、包不存在、校验失败、装错 subpath | 展示结构化错误 + 导出日志 |

禁止再使用“重启后生效”一刀切文案。

### 4.5 能力对象

能力分三层，推荐时必须同时给出：

1. **官方 seam**：`ctx.llm`、`ctx.web`、`ctx.skills`、`ctx.tools`、`ctx.fs`、`ctx.subagents`、`ctx.workflowEngine`、`ctx.attachments`、`ctx.settings`、`ctx.credentials` 等。完整清单以官方 [capability-seams.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.zh.md) 为准，DSH Store 做成版本化词典，不手抄死后不再更新。
2. **产品能力**：视觉识图、多模型路由、通知、记忆、工作流、浏览器、终端 TUI、主题、安全审计。
3. **场景能力**：自媒体、研究、办公、开发运维、教育、企业知识库。场景能力只能由插件包或维护者标注，作者不能单方面给自己贴“官方场景”标签。

### 4.6 插件包

插件包是一等公民，不是收藏夹。

最低字段：

```yaml
id: pack:dsh-store/we-media-starter
version: 0.1.0
title:
  zh: 自媒体起步包
  en: We-media starter pack
profileTarget: web
entries:
  - ref: github:Anionex/dsh-vision-toolkit
    version: npm:@anionex/dsh-vision-toolkit@0.1.18
    role: required
mutexGroups:
  - id: theme
    policy: single
conflicts:
  - plugin: github:linxin666/dsh-web-ui-all
    reason: 侵入式 Web UI 会遮挡官方设置
capabilityCoverage:
  - cap.scene.we-media
  - cap.product.vision
installPolicy:
  stopOnBlocked: true
  requirePassport: true
  allowCandidate: false
```

规则：

- 包内每个条目都必须解析到不可变 `PluginVersion`。
- 任一 `blocked` 条目都会让整个包不可一键安装。
- 主题类默认互斥。
- 终端 / TUI 默认提示改走 `headless` profile，不偷偷装进 web。
- 用户分享包时必须剥离 settings 里的密钥、token、本机路径。


---

## 5. 双表面与官方 slot 合同

本章把“插件 + 好123 式网站”落成可实现的界面合同。任何实现如果改导航、改皮肤、或让网站替用户安装，都算违约。

### 5.1 事实：官方已经把“插件”导航占住了

2026-08-17 已核实：

| 贡献方 | slot | id | order | 职责 |
| --- | --- | --- | ---: | --- |
| `@deepseek-ai/dsh-client-ui-settings-plugins` | `settings.section` | `plugins` | 15 | 唯一“插件”导航，声明 `settings.plugins.tab` |
| 同上 | `settings.plugins.tab` | `configurable` | 0 | 插件配置卡片 |
| `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | `settings.plugins.tab` | `all` | 10 | 只读 Loader 清单；`pluginInventory/list` 无来源、无安装、无启停 |

官方决策记录：[2026-08-11 plugin settings tabs](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/architecture/2026-08-11-plugin-settings-tabs.zh.md)。新的插件视图必须注册 `settings.plugins.tab`，不得再开一条顶层“插件”导航。

对照事实：`dshmarket@1.10.1` 注册的是另一条 `settings.section`，id `market`，order `40`，并额外挂 `shell.overlay` toast。这能快速做出独立市场页，但会和官方“插件”分区抢导航。DSH Store 的目标是成为官方插件体系里的默认发现层，所以**不抄这条路**。

### 5.2 推断：应用内必须占的官方位置

DSH Store 宿主插件内部 id 固定为 `dsh-store`。

| 表面 | slot / 位置 | 建议 id | 建议 order | 职责 |
| --- | --- | --- | ---: | --- |
| 商店主界面 | `settings.plugins.tab` | `store` | `20` | 搜索、详情、安装、下载、护照、评价入口 |
| 已装与回滚 | `settings.plugins.tab` | `installed` | `25` | 本机安装日志、激活四态、冲突、回滚 |
| 能力诊断 | `settings.plugins.tab` | `gaps` | `30` | 当前 profile 缺口、可解释推荐、插件包建议 |
| 轻量进度 | `shell.overlay`，仅安装进行中 | `dsh-store-progress` | — | 进度、取消、结构化错误；默认不常驻 |
| Agent | 需审批的 tools | `dsh_store_*` | — | 搜索 / 诊断 / 推荐 / 安装预览；高风险动作必须确认 |

禁止：

- 再注册 `settings.section` 抢“插件 / 市场 / Store”顶层导航。
- 用主题、宠物、全局 CSS、悬浮层改官方设置外壳。
- 把商店做成唯一能打开设置的入口。
- 在 Desktop / supervisor 管理模式显示“一键重启”。

验收：

1. 安装 DSH Store 后，设置里仍然只有一行“插件”。
2. “插件”里至少能看到官方 `configurable`、`all`，以及 DSH Store 的 `store`。
3. 关闭商店标签页后，官方配置草稿和清单搜索状态不被破坏。
4. 卸载 DSH Store 后，官方设置完整恢复，不残留导航或皮肤。

### 5.3 网站必须先于“能装”而存在

网站不是宣传页，是开放注册表的人机界面。最低信息架构：

```text
/                         好123 首页：搜索框 + 能力入口 + 场景包 + 今日新发现
/search                   多维检索
/plugins/:id              插件详情 / 版本 / 护照 / 评价 / 兼容矩阵
/packs                    插件包广场
/packs/:id                包详情、冲突、能力覆盖、可复现 lockfile
/rankings/:board          榜单快照
/publishers/:id           作者主页
/submit                   作者申请 / PR 说明
/docs/protocol            开放协议与自托管
/api/*                    稳定 JSON API
```

首页必须同时提供这些检索维度，而不是只有一个搜索框：

- 文本：中英文、npm 名、GitHub `owner/repo`、能力 id
- 分类：awesome 分类 + DSH Store 场景分类，两者分开显示
- 信任：`candidate` / `screened` / `installable` / `featured` / `blocked`
- 风险：许可证、构建脚本、网络 / 文件系统 / 凭据静态信号
- 兼容：DSH 版本、web / headless / Desktop
- 来源：精选、自动发现、作者 PR、官方包、社区包、用户包
- 排序：相关度、新发现、Star、评分、安装成功率、能力补全

网站和应用内商店共用同一套可复现检索合同。`/search` 与商店搜索框都必须接受这些 query，缺省值写进 URL，刷新后结果不变：

```text
/search
  ?q=
  &category=            # awesome 分类，可多值
  &scene=               # DSH Store 场景分类，与 category 分开
  &capability=          # cap.seam.* / cap.product.* / cap.scene.*
  &trustState=
  &risk=
  &profile=             # web / headless / desktop / any
  &source=              # curated / discovered / author_pr / official_pack / community_pack / user_pack
  &sort=                # relevance | new | stars | rating | install_success | capability_fill
  &page=
```

验收：同一组 query 在网站和应用内商店返回同一批 `Plugin` id 和同一信任状态；不得把 `scene` 和 awesome `category` 合成一个筛选项。

验收：

1. 同一插件在网站和应用内商店显示同一 `Plugin` id、同一信任状态、同一护照版本。
2. 网站任何页面都不会出现“云端替你安装到某台机器”的按钮。
3. 网站的“安装”只生成锁定命令、tarball 和深链，真正执行发生在本机插件里。深链合同如下，禁止发明第二种 scheme：

```text
dsh-store://plugin/<pluginId>?version=<versionId>&profile=<name>
dsh-store://pack/<packId>?version=<packVersion>&profile=<name>
https://store.dsh.dev/open?target=plugin:<pluginId>&version=<versionId>
本机宿主：GET /dsh-store/open?target=plugin:<pluginId>&version=<versionId>
```

规则：

- `version` 必须是不可变 `PluginVersion` / `PackVersion`；没有 version 时只打开详情，不预填安装。
- 网站先探测本机 `/dsh-store/health`；探测失败就只展示锁定命令和下载包，并提示先安装 DSH Store 宿主插件。
- 深链不得携带密钥、settings 值、本机绝对路径。
- 占位域名 `store.dsh.dev` 未申请前，https 深链可先用相对路径 `/open?...`。

### 5.4 宿主插件自己的包合同

DSH Store 作为 DSH 插件分发时，必须满足：

```json
{
  "name": "@dsh-store/plugin",
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-connection",
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-settings"
      ]
    }
  }
}
```

规则：

- 必须同时有 `dsh.bundle` 和 `dsh.client`。只有 client 不能进 profile 层。
- `cordis.patch.yml` 只 insert 自己，不 disable 官方插件，不改主题。
- 官方 `@deepseek-ai/*` 必须是 `peerDependencies`，并且带显式 prerelease 分支，避免静默排除 `0.1.0-rc.*`。
- 预构建发布到 npm；git 安装必须自包含 `prepare`，不得假设 monorepo checkout。
- 默认安装命令：`dsh plugin --profile web add @dsh-store/plugin`。包名未发布前用 git + commit，不得用 `latest` / 分支。

**未验证现状：** npm 名 `@dsh-store/plugin`、GitHub org `dsh-store`、域名 `store.dsh.dev` 都未申请。实现阶段先用仓库占位名，上线前再替换。

---

## 6. 安装协议、激活校验与只下载不安装

本章是商店能不能赢过 dsh-market 的核心。页面能点“安装”不算完成；必须证明装的是哪个不可变版本、装进了哪个 profile、装完四态是什么。

### 6.1 事实：官方安装模型

来源：[打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)，2026-08-17。

1. 可激活的分发物是声明了 `dsh.bundle.patch` 的 npm 包。
2. `dsh plugin --profile <name> add <spec>` 在 `$DSH_HOME/profiles/<name>` 里转发给 pnpm，成功后按是否声明 `dsh.bundle` reconcile 进 `dsh.profile.bundles`。
3. 只有 `dsh.client`、没有 `dsh.bundle` 的包会变成普通依赖，状态必须标 `inert`。
4. git 安装拉源码，不跑 `build`；pnpm ≥10 默认拦截生命周期脚本。
5. 更安全的分发是 npm 预构建或 `pnpm pack` tarball。
6. 后层整行替换 `config`，不深度合并。
7. 安装插件 = 以用户权限跑第三方代码；tool 审批不构成沙箱。

### 6.2 安装目标必须不可变

| 允许 | 禁止 |
| --- | --- |
| `npm:@scope/name@1.2.3` | `name@latest`、`name@next`、裸包名当版本 |
| `git:github.com/owner/repo@<full-sha>` | `github:owner/repo`、分支、`HEAD` |
| `github:owner/repo#<full-sha>` 且已解析 subpath | 只写 monorepo 根目录 |
| GitHub Release 的 `https` `.tgz`，校验 sha256 | 任意第三方下载盘、短链、网盘 |

每个可安装目标在执行前必须解析成：

```yaml
installTarget:
  pluginId: github:Anionex/dsh-vision-toolkit
  versionId: npm:@anionex/dsh-vision-toolkit@0.1.18
  packageName: "@anionex/dsh-vision-toolkit"
  subpath: null
  integrity: sha256-...
  profile: web
  requiresBuildPermission: false
  expectedBundle: true
  passportId: passport:npm:@anionex/dsh-vision-toolkit@0.1.18:scanner-2
```

### 6.3 本机执行面

推断默认：宿主插件注入 `webServer` + `loader`，只在用户机器上挂同源路由。

| 路由 | 方法 | 作用 | 高风险门 |
| --- | --- | --- | --- |
| `/dsh-store/health` | GET | 插件、profile、Desktop 模式 | 只读 |
| `/dsh-store/registry` | GET | 本地缓存的可安装目录 | 只读 |
| `/dsh-store/installed` | GET | 本机已装、来源、四态 | 只读 |
| `/dsh-store/updates` | GET | 已装版本 vs 注册表最新 `installable`/`featured` 不可变版本 | 只读；禁止返回 `@latest` / 分支 |
| `/dsh-store/open` | GET | 解析网站深链，打开对应插件 / 包详情 | 只读；不安装 |
| `/dsh-store/diagnose` | GET | 能力缺口，不读聊天和密钥值 | 只读 |
| `/dsh-store/preview` | POST | 预览将改哪些文件 | 不执行 |
| `/dsh-store/download` | POST | 导出锁定 tarball + 护照 | 不改 profile |
| `/dsh-store/install` | POST | 安装已晋升目标 | 同源；目标必须 `installable`/`featured` |
| `/dsh-store/uninstall` | POST | 卸载并写回滚点 | 同源；二次确认 |
| `/dsh-store/update` | POST | 更新到指定不可变版本 | 禁止 `@latest` |
| `/dsh-store/rollback` | POST | 回到安装日志中的上一个快照 | 同源 |
| `/dsh-store/status` | GET | 分阶段进度 | 不得假死 |
| `/dsh-store/cancel` | POST | 取消未完成任务 | 同源 |
| `/dsh-store/approve-builds` | POST | 写 `allowBuilds` 后重试 | 显式包键；默认拒绝 |
| `/dsh-store/logs` | GET | 脱敏日志 | 不外传 |
| `/dsh-store/backup` | POST | 导出插件清单，剥离密钥 | 警告后才可含配置 |
| `/dsh-store/restore` | POST | 校验后再写，失败回滚 | 同源 |
| `/dsh-store/restart` | POST | 仅 loopback，且非 Desktop | Desktop / supervisor 必须隐藏 |

安全边界：

- 只接受 same-origin POST；安装 / 重启再加 loopback 限制。
- 永不接受云端回调来安装。
- 不把 `$DSH_HOME/settings.yaml`、credential 值、会话、聊天上传到商店服务器。
- Desktop 检测到 `desktopProfiles` 后，`allowRestart` 必须为 `false`。
- 备份默认为“插件清单 + 包版本 + 护照”，不含密钥；若用户坚持导出配置，必须先计数 secret 文件并警告。

### 6.4 安装状态机

```text
previewed → fetching → integrity_checked → installing
        → build_blocked → awaiting_build_approval
        → verifying → live | restart | inert | broken
        → cancelled
```

进度必须按阶段显示，而不是一条“安装中…”：

1. 解析目标 / subpath
2. 拉取 npm / git / tarball
3. 校验 integrity 与护照
4. 调用 `dsh plugin --profile <name> add <locked-spec>`
5. 读回 `package.json`、`dsh.profile.bundles`、Loader
6. 计算四态
7. 写安装日志

dsh-market 已承认、这里升为验收门的 P0：

| 事故 | DSH Store 必须怎么验 |
| --- | --- |
| 装错 monorepo 子包 | 预览和装后都核对 `packageName`、`subpath`、`dsh.bundle` |
| 装完不进 bundles | `expectedBundle=true` 但 bundles 无此包，只能返回 `inert` 或 `broken`，不得标成功 |
| `minimumReleaseAge` 假更新 | before/after 版本相同则返回 `unchanged`，不显示“已更新” |
| git `prepare` 被 pnpm 拦截 | 进入 `awaiting_build_approval`，给出包键和风险，不假装成功 |
| 进度条假死 | 15 秒无新阶段必须显示当前命令、最后一行脱敏日志和取消按钮 |

### 6.5 激活四态，禁止一刀切“重启后生效”

沿用第 4.4 节：`live` / `restart` / `inert` / `broken`。

补充判定：

| 证据 | 四态 |
| --- | --- |
| 包在 bundles 中，Loader 已挂上，无需新 config | `live` |
| 包在 bundles 中，但 patch 含 config / disable / 复杂行，或 client 图未刷新 | `restart`，并写明原因 |
| 依赖写进去了，但无 `dsh.bundle` | `inert` |
| CLI 失败、integrity 失败、subpath 错、包名不一致 | `broken` |

官方 `pluginInventory/list` 只能当 Loader 旁证，不能当来源真相。来源真相是 DSH Store 自己的安装日志。

### 6.6 只下载不安装

每个 `installable` / `featured` / `screened` 插件都必须提供下载包，候选插件可以下载护照，但不能提供“可执行安装器”。

下载包最低内容：

```text
<plugin-id>@<version>/
  package.tgz
  SHA256SUMS
  install.sh                 # 只打印并可选执行锁定命令，默认不执行
  install-command.txt
  passport.json
  sbom.json                  # 能生成就给，不能生成就显式标缺失
  release-notes.md
```

验收：

1. 下载过程不修改 `$DSH_HOME`。
2. `install-command.txt` 里没有分支名或 `latest`。
3. 用户可以把该目录拷到离线机器，按命令安装出同一 `PluginVersion`。

### 6.7 安装日志、回滚、冲突

每次安装 / 更新 / 卸载写一条不可变 journal：

```yaml
journalId: jrnl_01H...
at: 2026-08-17T12:00:00Z
profile: web
action: install
target: npm:@anionex/dsh-vision-toolkit@0.1.18
before:
  bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]
after:
  bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@anionex/dsh-vision-toolkit"]
activation: live
passportId: passport:...
rollbackRef: <previous journal or backup hash>
```

冲突规则：

- 主题 / 皮肤默认互斥，安装新主题前提示将停用旧主题。
- 侵入式 Web UI，例如本机已清理的 `github:linxin666/dsh-web-ui-all`，默认 `blocked` 或强警告，不得静默安装。
- 终端 / TUI 默认目标是 `headless` profile。若用户坚持装进 `web`，必须二次确认。
- 同一能力的多个 provider 可以共存，但推荐引擎一次只建议一个默认。

验收：任意一次成功安装都能一键回滚到 before 快照；回滚后再读 bundles，不得残留半安装状态。

---

## 7. 发现、注册表、护照与作者提交

DSH Store 要成为社区入口，但不能变成第二个互相打架的精选政治，也不能把自动发现直接变成可安装。

### 7.1 数据源，分开计量

| 来源 | 2026-08-17 快照 | 进入状态 | 用途 |
| --- | --- | --- | --- |
| awesome-dsh-plugin `plugins.json` | `count=1124` | 精选，仍要过护照才能一键安装 | 分类、双语介绍、截图、tarball 提示 |
| GitHub topic `dsh-plugin` | hub 记 topicTotal **5638** | `discovered` / `candidate` | 自动发现 |
| plugin-hub API | listed **454** / autoDiscovered **251** / clear **5** / blocked **20** | 证据与护照候选 | 复用筛查，不复制政治标签 |
| 作者 PR / Issue | 无 | CI 通过后 `screened` 或 `review_required` | 正规提交 |
| 用户 / 解决方案包 | 无 | 包级审核 | 场景分发 |

禁止对外说“我们有 1124+454+2460 个插件”。三个数字口径不同。dshget-data README 自称 2,460 条，只当对照，不当权威。

### 7.2 自动发现合同

扫描器默认每 12 小时一轮，可自托管改频率。

发现规则：

1. 搜 GitHub topic `dsh-plugin`、已知 awesome / hub 列表、以及仓库名/描述含 `dsh-plugin` 且声明了 `dsh.bundle` 的公开仓库。
2. 新仓库只进 `discovered`，再进 `candidate`。用户说的“自动提交到仓库或数据库”，只允许写派生索引，不允许写成可安装源真相。
3. 自动发现**永远不能**把条目推到 `installable`，也不能自动合并进 `registry/plugins/`。
4. 不 clone 后执行其 `prepare` / `test` / 插件代码。只读公开文件：`package.json`、`cordis.patch.yml`、README、LICENSE、锁文件、有限入口源码。
5. monorepo 必须拆成 `github:owner/repo#subpath`，不能把根目录当成可安装目标。
6. 仓库改名保留别名；archived / yanked 进入下架队列，不从历史上消失。

自动提交的合法落点：

```text
data/derived/discovered/<date>/<owner>__<repo>.json   # 派生索引 / 数据库，可自动写
registry/candidates/<owner>__<repo>.yml               # 候选 YAML，可自动生成
DiscoveryEvent                                        # 每次扫描一条，公开可审计
可选：自动开 Issue / draft PR，标签必须是 candidate
禁止：自动开/合并会把 trustState 设为 installable / featured 的 PR
禁止：自动改 registry/plugins/*.yml 的信任状态
```

对照消费路径必须写准确：awesome 用 `https://awesome-dsh-plugin.com/plugins.json`；plugin-hub 用 `GET /api/plugins` 与 `GET /api/registry/status`。不要打不存在的 `/api/status`。hub 的筛查标签只当证据，不当 DSH Store 自己的主键或精选政治。

晋升门槛（推断，可调，但必须写在规则文件里）：

| 到 | 最低条件 |
| --- | --- |
| `candidate` | 公开仓库、能解析到 repo、未明确垃圾 |
| `screened` | 读到 `dsh.bundle`、许可证、锁定 commit、完成当前扫描器版本 |
| `review_required` | 有构建脚本、凭据/网络/fs 高风险信号、或证据不足 |
| `installable` | 人工或高置信规则确认 subpath、不可变版本、护照存在、非 `blocked` |
| `featured` | 维护者愿意推荐；仍不是安全保证 |
| `blocked` | 无有效 manifest、恶意信号、劫持官方 UI、许可证不可用、明确下架 |

复用 plugin-hub 的护照思想：每个 `PluginVersion + scannerVersion` 一张不可变护照。新扫描器只追加，不覆盖旧护照。

### 7.3 护照最低字段

```json
{
  "id": "passport:git:github.com/lussey820/dsh-http-tools@fdc1b7...:scanner-2",
  "pluginId": "github:lussey820/dsh-http-tools",
  "versionId": "git:github.com/lussey820/dsh-http-tools@fdc1b71738ac40a9fae0a5f6c02c81f7107f0a41",
  "scannerVersion": 2,
  "checkedAt": "2026-08-16T11:32:00.175Z",
  "trustState": "screened",
  "manifest": {
    "hasBundle": true,
    "hasClient": false,
    "packageName": "dsh-http-tools",
    "subpath": null
  },
  "license": { "spdx": "MIT", "file": "LICENSE" },
  "lifecycleScripts": [],
  "signals": {
    "network": [],
    "fs": [],
    "credentials": [],
    "dynamicEval": []
  },
  "compatibility": {
    "dshRange": ">=0.1.0-rc.1 <0.2.0-0",
    "profiles": ["web"],
    "desktop": "unknown"
  },
  "filesInspected": ["package.json", "cordis.patch.yml", "src/index.ts"],
  "findings": []
}
```

对照事实：hub 在 2026-08-17 对 `lussey820/dsh-http-tools` 给出了 `clear` + 锁定 commit 安装命令；对 `openma-ai/deepseek-harness-tui` 因无有效 manifest 给出 `blocked` 且 `installCommand=null`。DSH Store 必须保持这个区分。

### 7.4 作者提交路径

开源仓库提供两条正规入口，都比“再做一个互斥精选榜”更重要：

1. **PR 入库**：`registry/plugins/<owner>__<repo>.yml`，一个插件一个文件，避免撞 PR。
2. **Issue / 申请表**：给不熟悉 Git 的作者；机器人生成同一 YAML 草稿，再人工或 CI 转 PR。

CI 最低检查，直接吸收 awesome 已验证规则：

- 必须有 `dsh.bundle`；只有 `dsh.client` 立即失败。
- 仓库创建满 1 天，提交 ≥ 10。
- 必须有 topic `dsh-plugin`，或 PR 里说明补上。
- monorepo 必须写 subpath。
- 描述中英双语，不写“最强 / 官方指定”等营销词。
- SPDX 许可证可识别。
- 若不能从源码安装，必须提供 GitHub Release 的 `https` `.tgz`。
- peerDependencies 若声明 `@deepseek-ai/*`，必须带 prerelease 分支。

作者控制台（推断必做，可后置到第二阶段，但数据模型第一阶段就要留）：

- 每个版本的安装失败原因聚合，不含用户机器路径和密钥。
- 护照 findings 的申诉与回复。
- 改名后的别名。
- README / 介绍刷新时间；商店显示“介绍抓取于何时”，并提供手动刷新。

### 7.5 介绍刷新

“拉取最新插件介绍”不是每次打开页面现场抓 GitHub。

规则：

- 注册表存 `description.zh` / `description.en` / `readmeExcerpt` / `fetchedAt` / `sourceCommit`。
- 扫描器刷新 README 和 release notes；失败时保留上一份并标 stale。
- 应用内和网站都显示抓取时间。
- 作者 PR 可以覆盖展示文案，但必须能一键看上游 README 原文。

---

## 8. 能力诊断与可解释推荐

这是 DSH Store 相对目录站和 dsh-market 的主差异。推荐必须能解释，且不能把配置错误当成缺插件。

### 8.1 能力词典版本化

官方 seam 以 [capability-seams.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.zh.md) 为准，做成版本化词典，不手抄死后不再更新。

2026-08-17 从该文档抽出的 `ctx.*` 服务名共 56 个，包括但不限于：

`ctx.llm`、`ctx.web`、`ctx.skills`、`ctx.tools`、`ctx.fs`、`ctx.subagents`、`ctx.workflowEngine`、`ctx.attachments`、`ctx.settings`、`ctx.credentials`、`ctx.sessions`、`ctx.sandbox`、`ctx.shell`、`ctx.approval`、`ctx.webServer`、`ctx.agents`、`ctx.agentPresets`。

DSH Store 另维护两层，不和官方 seam 混名：

| 层 | id 前缀 | 谁能标注 |
| --- | --- | --- |
| 官方 seam | `cap.seam.<name>` | 扫描器从 patch / 源码证据推断，作者可建议 |
| 产品能力 | `cap.product.<name>` | 扫描器 + 维护者 |
| 场景能力 | `cap.scene.<name>` | 只有插件包或维护者 |

作者不能给自己贴 `cap.scene.we-media` 或“官方认证”。

### 8.2 本机诊断读什么、不读什么

允许扫描：

- 当前 profile 名，默认取实际启动的 `--profile` / Desktop `desktopProfiles.current`，禁止写死 `web`
- `dsh.profile.bundles`
- 已装包名、版本、是否声明 `dsh.bundle` / `dsh.client`
- Loader 只读快照
- 已启用 / 已 disable 的 patch 行 id
- 本机 DSH Store 安装日志
- 公开能力词典

禁止扫描或上传：

- 聊天、会话正文、附件内容
- `settings.yaml` 里的密钥、token、cookie
- credential 的值
- 本机绝对路径以外的用户文件
- 未授权的浏览器 Cookie / 账号界面

诊断输出只保留“有没有这项能力 / 哪个插件提供 / 配置是否选错”，不保留密钥。

### 8.3 本机第一条诚实推荐

2026-08-17 本机 web profile 已核实：

- bundles：`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`@anionex/dsh-vision-toolkit`
- Vision Toolkit `0.1.18` 已改走 `http://127.0.0.1:10100/v1`，模型 `grok-4.6`
- 全局 overlay 在移除 `@linxin666/dsh-web-ui-all` 后为空数组
- `describe-image.mjs` 仍在 profile `plugins/`，但未加载
- 默认模型当时是 `vision-toolkit-opencode-go / deepseek-v4-flash`

因此诊断的第一条结论必须类似：

```text
已覆盖：cap.product.vision（github:Anionex/dsh-vision-toolkit，本机已改走 OpenCodex）
不要推荐：再装一个视觉插件
可能缺口：notify / browser publishing / materials / memory / workflow / multi-model routing
若用户选了未配置的内置 xai，只提示“当前 provider 未配置”，不提示“缺少 Grok 插件”
```

这条演示失败，推荐引擎就不能上线。

### 8.4 推荐必须带证据面板

每次推荐返回：

```yaml
recommendationId: rec_...
problem:
  - cap.product.notify: missing
  - cap.scene.we-media: partial
alreadyCovered:
  - cap.product.vision: github:Anionex/dsh-vision-toolkit
rejectedAlternatives:
  - plugin: github:example/another-vision
    reason: capability_already_covered
items:
  - pluginId: github:owner/wechat-notify
    versionId: npm:@owner/wechat-notify@1.0.2
    fills: [cap.product.notify]
    trustState: installable
    why:
      - 当前 bundles 无 notify seam / product.notify
      - 护照无凭据泄露信号
      - 目标 profile=web
warnings: []
```

排序权重（推断，必须可调且公开）：

1. 能补上用户当前缺口
2. 护照与信任状态
3. 目标 profile 兼容
4. 安装成功率
5. 安装加权评分
6. Star 只作为弱信号

Star 不得成为第一排序，否则会退化成 dsh-find-plugin。

### 8.5 Agent 工具

会话里的最低工具集：

| 工具 | 作用 | 审批 |
| --- | --- | --- |
| `dsh_store_search` | 按能力 / 文本搜 | 自动允许 |
| `dsh_store_diagnose` | 扫描当前 profile 缺口 | 自动允许，但输出不含密钥 |
| `dsh_store_recommend` | 返回可解释推荐 | 自动允许 |
| `dsh_store_preview_install` | 预览将改的 bundles | 需确认 |
| `dsh_store_install` | 安装已晋升目标 | 必须确认；`blocked` / `candidate` 直接拒绝 |
| `dsh_store_pack_apply` | 安装插件包 | 必须确认，并展开全部条目 |

Agent 不得绕过信任状态机。dsh-find-plugin 那种“搜到就能让 agent 装”是反面教材。

---

## 9. 插件包、分享与场景方案

插件包是一等公民，也是以后商业化场景方案的复用面。用户要的“自媒体装一套就齐”走这里，而不是让推荐引擎一次塞 20 个互不相关的插件。

### 9.1 包类型

| 类型 | 发布者 | 默认信任 | 例子 |
| --- | --- | --- | --- |
| 官方包 | DSH Store 维护者 | 仍要每条护照 | `pack:dsh-store/we-media-starter` |
| 社区包 | 认证或普通作者 | 包级审核 | `pack:alice/research` |
| 用户包 | 终端用户 | 仅分享，不自动上首页 | `pack:user/lxyer-web-setup` |
| 解决方案包 | 以后的商业层 | 开源核只认同一 lockfile | `pack:vendor/gov-kb` |

### 9.2 不可变 lockfile

第 4.6 节的 YAML 是人读合同。真正安装和分享必须再生成 lockfile：

```yaml
id: pack:dsh-store/we-media-starter
version: 0.1.0
lockVersion: 1
profileTarget: web
entries:
  - pluginId: github:Anionex/dsh-vision-toolkit
    versionId: npm:@anionex/dsh-vision-toolkit@0.1.18
    integrity: sha256-...
    role: required
    fills: [cap.product.vision]
mutexGroups:
  - id: theme
    policy: single
conflicts:
  - pluginId: github:linxin666/dsh-web-ui-all
    reason: 侵入式 Web UI 会遮挡官方设置
installPolicy:
  stopOnBlocked: true
  requirePassport: true
  allowCandidate: false
strip:
  secrets: true
  localPaths: true
  settingsValues: true
```

规则：

- 每个条目都必须是不可变 `PluginVersion`。
- 任一 `blocked` 条目让整个包不可一键安装。
- 主题默认互斥。
- TUI 默认改走 `headless`。
- 分享前剥离密钥、token、本机路径、settings 值。
- 用户从已装列表组包时，只导出包名、版本、护照 id，不导出 OpenCodex 地址里的凭据。
- 包可以声明“已覆盖能力”，但必须由条目聚合而来，不能只写广告语。

### 9.3 自媒体起步包的验收样本

本机已有视觉工具，因此官方示例包不能再把“缺视觉”当卖点。

`pack:dsh-store/we-media-starter` 的诚实描述应是：

- 保留已装视觉工具，不重复安装
- 补通知、素材/拆条工作流、发布或浏览器能力中已经 `installable` 的条目
- 若某项还没有 `installable` 插件，包必须标 `partial`，不能假装完整
- 安装后诊断应显示 `cap.product.vision=covered`，并列出新补上的能力

### 9.4 分享

分享通道：

- 网站短链：`/packs/:id@version`
- 文件：`*.dshpack`（YAML + lock + 签名可选）
- 以后再做二维码；二维码不得承载密钥

- 无账号用户也可从本机已装列表导出 `.dshpack`；网站可预览该文件，但不把匿名用户包送上首页或插件包榜
- 把用户包发布到公共广场必须登录；未登录只允许文件 / 短时分享链

他人打开分享包时，先看差异：已有哪些、将新装哪些、冲突、风险、目标 profile，再决定安装。

---

## 10. 评分、反作弊与榜单

用户明确要求打分、评价和各种榜。这一层必须后置于身份，否则一上线就会被刷。

### 10.1 评价绑版本，不绑逻辑插件

```yaml
review:
  id: rev_...
  pluginId: github:owner/repo
  versionId: npm:@owner/repo@1.2.3
  dimensions:
    works: 5          # 能不能用
    docs: 4           # 介绍和文档
    safety: 4         # 用户感知的安全/权限克制
    maintenance: 3    # 更新是否跟得上 DSH
    ux: 4             # 是否劫持 UI / 是否好用
  body: "装进 web 后 live，没有改官方设置。"
  installJournalId: jrnl_...   # 可选，有则加权
  createdAt: 2026-08-17
```

规则：

- 没有 `versionId` 的评价不允许发。
- 插件大版本更新后，旧评价仍可见，但默认按当前版本过滤。
- 评价不能改变护照，也不能把 `blocked` 变 `installable`。
- 商店展示“安装加权分”和“普通分”两列；有本机安装日志的评价权重大。

### 10.2 反作弊

第一阶段可以先做本地/匿名草稿，但公开排行必须等到最小身份：

- GitHub 登录，或
- 本机安装日志签名（只证明“这台机器装过这个版本”，不上传机器指纹到公开网）

硬规则：

- 同一身份对同一 `PluginVersion` 只能有一条有效评价。
- 新账号 / 新身份有冷却期。
- 短时间大量同词评价进审核。
- 作者不能给自己的包刷满分；可回复，不可删差评。
- 禁止买量、禁止把付费位置折算进评分。
- 举报入口必须有；恶意插件和下架走第 12 章，不走删差评。

### 10.3 榜单必须物化

禁止每次请求现场算“最强榜”。按日/周生成 `LeaderboardSnapshot`。

| 榜单 | 计算口径 | 不得混入 |
| --- | --- | --- |
| Star 榜 | GitHub star，标明抓取时间 | 评分、精选 |
| Star 增长榜 | 相邻两日 star 绝对增量；每日记账，保留 30 天 | 百分比刷榜、当天现场重算、伪造昨日快照 |
| 新发现榜 | 首次进入 `candidate` 的时间 | 自动变成可安装 |
| 评分榜 | 安装加权分，最低评价数门槛 | 没有安装证据的五星 |
| 安装成功榜 | `live`+`restart` / 全部安装尝试 | 只点了下载 |
| 能力补全榜 | 诊断后实际补上的能力数 | 作者自称 |
| 安全通过榜 | 当前扫描器下 `clear`/`installable` 且无高危信号 | 付费置顶 |
| 插件包榜 | 官方包 / 社区包分开 | 用户私有包 |

首页可以同时放这些榜，但必须写清口径。任何“编辑推荐”都单独标记，不得改分数。

验收：改一个插件的 star 或刷一条无安装评价，不会让安全榜或安装成功榜立刻变化。

---

## 11. 架构、开放 API 与数据模型

### 11.1 系统切分

```text
[GitHub / awesome / hub / PR]
            │
            ▼
     Discovery Worker          只读扫描，写候选和护照
            │
            ▼
   Open Registry (Git)         源真相：插件 YAML、包、词典、规则
            │
            ├─ Static / SSR Site
            ├─ Public JSON API
            └─ Snapshot CDN
                    │
                    ▼
           In-app DSH plugin   本机安装、校验、诊断、日志
                    │
                    ▼
         Ratings / Identity    第二阶段才上公共评价
```

原则：

- Git 注册表是源真相；数据库只做索引、护照、榜单快照、评价。
- 网站负责发现和治理，插件负责本机执行。
- 开源核必须可自托管：企业可以只跑注册表 + 扫描器 + 私有目录，不连公共评价。
- 复用 awesome 与 plugin-hub，不复制一套敌对精选政治。

建议仓库拆分（实现阶段可先 monorepo，但逻辑边界现在就要切开）：

| 包 / 目录 | 职责 |
| --- | --- |
| `registry/` | 插件、包、能力词典、信任规则 |
| `scanner/` | 发现、护照、版本雷达 |
| `web/` | 好123 站点 |
| `api/` | 公共 JSON |
| `plugin/` | DSH 宿主插件 |
| `protocol/` | JSON Schema / typings，供第三方复用 |
| `docs/` | 本文与作者指南 |

### 11.2 公共 API

稳定前缀：`/api/v1`。兼容 plugin-hub 已有路径作为只读适配，但不把 hub 的字段当自己的主键。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/v1/plugins` | 列表；可按信任状态、能力、分类、profile 过滤 |
| GET | `/api/v1/plugins/:id` | 逻辑插件 |
| GET | `/api/v1/plugins/:id/versions` | 不可变版本 |
| GET | `/api/v1/plugins/:id/reviews` | 按版本过滤的评价；无身份也可读已发布评价 |
| GET | `/api/v1/passports/:id` | 护照 |
| GET | `/api/v1/packs` | 插件包 |
| GET | `/api/v1/packs/:id` | 包详情 + lockfile |
| GET | `/api/v1/rankings/:board` | 物化榜单 |
| GET | `/api/v1/capabilities` | 版本化能力词典 |
| GET | `/api/v1/status` | 扫描器时间、各状态计数 |
| GET | `/plugins.json` | 静态快照回退 |
| POST | `/api/v1/reviews` | 第二阶段；需身份 |
| POST | `/api/v1/install-telemetry` | 可选、匿名、最小字段；默认关 |

API 合同：

- 跨域只开放 GET。
- 写接口默认关闭或仅登录。
- 所有列表带 `generatedAt`、`schemaVersion`、分页。
- 计数必须带口径：`curated`、`autoDiscovered`、`installable`、`blocked` 分开。
- 第三方解决方案商可以只消费 API 和 protocol，不嵌入 DSH Store UI。

### 11.3 核心表 / 对象

逻辑模型沿用第 4.1 节，落库时至少这些实体：

`Publisher`、`Plugin`、`PluginAlias`、`PluginVersion`、`InstallTarget`、`Passport`、`Capability`、`CapabilityClaim`、`Pack`、`PackVersion`、`PackLock`、`Review`、`LeaderboardSnapshot`、`DiscoveryEvent`、`ModerationAction`。

本机另有、默认不上云：

`InstallJournal`、`LocalBackup`、`LocalDiagnosis`、`PendingBuildApproval`。

### 11.4 兼容矩阵

每个 `PluginVersion` 显式记录：

- 声明的 DSH / `@deepseek-ai/*` 范围
- 实际测过的 DSH 版本，若未测标 `untested`
- `web` / `headless` / `Desktop` 适配
- 是否需要 `allowBuilds`
- 是否需要网络、fs、凭据

未测不得写成“已兼容最新 DSH”。

---

## 12. 安全、隐私与治理

### 12.1 威胁模型

| 威胁 | 默认对策 |
| --- | --- |
| 自动发现把恶意仓库变成可安装 | 发现只进候选；无护照无一键安装 |
| 装错 monorepo 根 / 名称抢注 | 锁定 packageName + subpath + integrity |
| 生命周期脚本在用户机器执行 | 默认拒绝；显式批准单个包键 |
| 商店自己劫持官方设置 | 禁止全局皮肤；只进 `settings.plugins.tab` |
| Agent 静默安装 | 高风险工具必须确认；blocked 拒绝 |
| 评价被刷 | 绑版本、安装加权、身份冷却 |
| 备份带出密钥 | 默认剥离；导出配置先警告 |
| 云端代装 / 远程控制用户机器 | 不做这条产品 |
| 付费覆盖风险 | 商业层不能覆盖 `blocked` |

### 12.2 静态信号，不是沙箱

扫描器可以标记：

- SPDX 缺失或不可用许可证
- `preinstall` / `install` / `prepare` / `postinstall`
- 网络请求、`child_process`、任意 fs、凭据 API、动态 `eval`
- 修改官方 `settings.section`、全局 CSS、注入到非自身 id 的 overlay
- 申请过宽的凭据或浏览器权限

扫描器**不能**宣称“已证明安全”。护照页必须写：静态证据 ≠ 完整审计 ≠ 运行时沙箱。

### 12.3 治理动作

维护者可执行：

- 晋升 / 退回信任状态
- `blocked` 并公开原因
- yanked 某个 `PluginVersion`
- 下架插件包
- 隐藏违法或滥用评价
- 复现护照

所有治理动作写 `ModerationAction`，公开可审计。作者能看到原因和申诉入口。

### 12.4 隐私

开源核默认：

- 不采集聊天
- 不采集 settings 密钥
- 不采集本机文件内容
- 访问统计若做，只记总量，不记 IP / UA / Cookie
- 安装成功率若上报，必须匿名、最小字段、默认关闭、可自托管关闭

本机日志可以保留路径，导出时脱敏 home 路径和凭据形态。

---

## 13. 分阶段交付与可测试验收

本轮只交文档。实现必须按阶段关门，不允许用“页面能打开”换阶段。

### 13.1 阶段 0 — 协议与空壳

交付：

- 开源仓库骨架、MIT、中英 README
- `protocol/` JSON Schema
- 注册表目录约定
- 本文落地为 `docs/DSH-Store-开发文档.md`

验收：

- 不改用户 `$DSH_HOME`
- 不发 npm、不注册域名
- Schema 能校验第 4.6 节示例包和第 6.2 节安装目标

### 13.2 阶段 1 — 可信目录网站

交付：hao123 式站点 + 静态/SSR + `/api/v1` + 扫描器。

验收：

1. 同时展示精选口径和自动发现口径，数字不混加。
2. 自动发现条目默认无安装按钮。
3. `blocked` 条目公开原因，无安装按钮。
4. 每个 screened 以上版本有护照页。
5. 消费 awesome `plugins.json` 与 plugin-hub `/api/plugins` 不把两边 count 加总宣传。
6. 作者可用单文件 PR 提交插件。
7. `/search` 带齐第 5.3 节 query 时，刷新页面结果不变；`scene` 与 awesome `category` 分开计数。
8. 网站“安装”只产出锁定命令、tarball 和 `dsh-store://` / `/open` 深链，探测不到本机宿主时不得假装已安装。
9. 扫描器可以把新仓库写进 `data/derived/` 或 `registry/candidates/`，但 CI 必须拒绝任何把自动发现条目直接标成 `installable` 的提交。

### 13.3 阶段 2 — 本机商店插件

交付：`dsh-store` 宿主插件。

验收：

1. `dsh plugin --profile web add <locked-store-spec>` 后，设置 → 插件 → DSH Store 可见。
2. 官方 `configurable` / `all` 仍在，官方设置可打开。
3. 不注册独立 `settings.section`。
4. 对一个 `installable` npm 预构建插件：预览 → 安装 → 四态为 `live` 或 `restart`，且 bundles 含该包。
5. 对一个只有 `dsh.client` 的包：结果为 `inert`，UI 不显示成功。
6. 对一个 monorepo 子包：装的是 subpath 对应 packageName，不是根。
7. 对一个需要 `prepare` 的 git 包：先 `build_blocked`，批准后才重试。
8. 对 `blocked` 插件：无安装按钮，agent 工具拒绝。
9. 下载包不改 `$DSH_HOME`。
10. 进度 15 秒无新阶段不假死。
11. Desktop 模式无重启按钮。
12. 卸载商店后无皮肤/导航残留。
13. `/dsh-store/open` 能打开对应插件 / 包详情，且不触发安装。
14. `/dsh-store/updates` 只比较不可变版本；before/after 相同返回 `unchanged`，UI 不显示“已更新”。

### 13.4 阶段 3 — 能力诊断与推荐

验收：

1. 在本机 web profile 上，不推荐第二个视觉插件。
2. 若默认 provider 指向未配置的 `xai`，只报配置问题。
3. 每条推荐都有 why / alreadyCovered / rejectedAlternatives。
4. Agent 可以诊断和推荐，不能静默安装。
5. 诊断输出不含密钥和聊天。

### 13.5 阶段 4 — 插件包

验收：

1. 官方示例包、社区包、用户包使用同一 lockfile。
2. 含 `blocked` 条目的包不能一键安装。
3. 从本机已装列表生成的分享包不含密钥和本机路径。
4. 主题互斥生效。
5. TUI 包默认指向 `headless`。
6. 自媒体示例包对已覆盖视觉能力显示 `alreadyCovered`。

### 13.6 阶段 5 — 评价、榜单、作者控制台

验收：

1. 评价必须带 `PluginVersion`。
2. 无身份的公开评分不能进榜。
3. 榜单来自快照，不现场重算。
4. 作者能看到聚合后的安装失败原因。
5. 付费或精选标记不能改评分和护照。

### 13.7 阶段 6 — 开放生态与自托管

验收：

1. 第三方只用 API + protocol 能做出只读目录。
2. 企业可自托管注册表和扫描器，关闭公共评价。
3. 商业层若出现，必须独立包，不编译进开源核。

### 13.8 跨阶段回归

每个实现 PR 至少跑：

- schema / 注册表 lint
- 信任状态机单测
- 安装预览与四态单测（可用 Fake profile 目录）
- 扫描器正例 / 反例：无 `dsh.bundle`、错误 subpath、生命周期脚本、blocked manifest
- 网站数字口径测试：禁止混加
- 插件 UI 合同测试：只注册 `settings.plugins.tab`

没有 Fake profile 的端到端、也没有真实 `dsh plugin add` 的验证，不得宣称“安装完成”。

---

## 14. 商业化边界：不污染开源核

用户要求以后各种商业化和场景方案都能用这套平台。能做到这一点的前提，是现在就把付费和信任拆开。

### 14.1 开源核永远保留

MIT 开源核必须始终提供：

- 注册表与护照
- 自动发现（只进候选）
- 网站检索与榜单口径
- 本机安装 / 下载 / 回滚
- 能力诊断与推荐
- 插件包协议
- 公共只读 API
- 自托管能力

任何人都能 fork 出自己的商店，而不必经过 DSH Store 公司主体。**公司主体本轮不成立，域名和商标仍是占位。**

### 14.2 以后才允许出现的商业层

| 层 | 可以卖什么 | 不可以做什么 |
| --- | --- | --- |
| 认证作者 | 身份审核、主页徽章 | 把失败护照改成通过 |
| 精选展位 | 首页时段、搜索关键词广告 | 覆盖 `blocked`、隐藏风险、改评分 |
| 场景方案包 | 自媒体、教育、企业知识库等交付 | 强制收集用户机器 settings |
| 企业私有目录 | 内网注册表、只允许白名单 | 要求把私有插件回传到公共库 |
| 支持服务 | SLA、代审、私有扫描器规则 | 云端代装到客户机器 |

### 14.3 商业化验收

1. 付费展位在 API 里是独立字段 `promotion`，与 `trustState`、`rating`、`passport` 分离。
2. 关闭商业层后，开源核功能完整。
3. 解决方案包仍然是第 9 章的 lockfile，不另发明闭源安装器。
4. 不出现“把你的 DSH 交给云端代管安装”的默认路径。

---

## 15. 必须补上的功能、风险与下一步实现顺序

### 15.1 用户已点名、本文已收口的能力

- 应用内商店：搜索、最新介绍、多维打分、一键安装、只下载不安装
- 好123 式聚合站：多维检索、可复现 query、分类、榜单、深链回本机安装
- GitHub 开源；作者 PR / 申请入库
- GitHub 自动发现，进入候选库 / 派生索引，而不是直接可装
- 能力缺口分析与可解释推荐
- 官方 / 社区 / 用户插件包，可分享；无账号也可导出 `.dshpack`
- 评分、评价、Star 榜、新发现榜、打分榜，以及安装成功 / 能力补全 / 安全榜
- 开放协议，供后来的商业化场景复用

### 15.2 为了成为社区默认入口，还必须加上的功能

以下为**推断产品补充**，不是官方 DSH 已有功能，但缺了就做不成“最强商店”：

1. **兼容矩阵**：DSH 版本、web / headless / Desktop，未测就标未测。
2. **安装日志与回滚**：每次改动可复现、可撤销。
3. **冲突 / 互斥检测**：主题互斥、侵入式 UI 拦截、TUI 走 headless。
4. **作者控制台**：失败原因、护照申诉、改名别名、介绍刷新。
5. **评价反作弊**：绑版本、安装加权、身份冷却。
6. **静态风险信号**：许可证、构建脚本、网络 / fs / 凭据。
7. **签名 / 不可变 pack lockfile**。
8. **版本雷达 / changelog**：复用 hub 已有思路，接到安装目标。
9. **Agent 工具带审批**，禁止静默高风险安装。
10. **可自托管开源核**，企业私有目录后接。
11. **Why this recommendation 证据面板**。
12. **徽章**：README 用的安装状态 / 护照 / 兼容徽章。
13. **不刮取、不持久化本地聊天和密钥**。

### 15.3 明确不做

- 不做官方 DSH 内核替代品
- 不云端代装
- 不靠执行第三方插件来“验证功能”
- 不上传 settings / 密钥 / 会话
- 不全局换肤
- 不把自动发现当可安装
- 不把目录数字当完成证明
- 不另开一条顶层“市场”导航去抢官方插件页

### 15.4 主要风险

| 风险 | 为什么危险 | 现在怎么锁 |
| --- | --- | --- |
| 变成第三个目录 | 社区已经有 awesome / hub / dshget / market | 用护照 + 本机校验 + 能力图谱差异化 |
| 变成第二个精选政治 | 作者不愿来 | 自动发现进候选；精选只是来源之一 |
| 重踩 dsh-market P0 | 用户不敢装 | 第 6、13 章写成验收门 |
| 推荐误判 | 把 provider 配错当成缺插件 | 本机视觉工具作为反例验收 |
| 评价被刷 | 榜单失去信任 | 评价后置，绑版本 |
| 商业化污染信任 | 社区认为商店被买断 | 付费字段与护照分离 |
| 官方 slot 变更 | DSH 仍是开发者预览 | slot 合同写成适配层，不写死私有 DOM |

### 15.5 仍是占位、本轮不拍板的事项

- GitHub org 最终名
- 生产域名
- 商标与公司主体
- 是否立刻做 GitHub App 登录
- 公共安装遥测默认开还是关（文档默认关）

### 15.6 给下一阶段编码 AI 的实现顺序

不要重新调研官方安装模型。直接按这个顺序开工，并只改实现仓库，不改用户 `$DSH_HOME`，除非用户明确要求在本机装商店插件本身。

1. 把本文冻结为 `docs/DSH-Store-开发文档.md`，另写 `protocol/` Schema：`Plugin`、`PluginVersion`、`Passport`、`Pack`、`InstallTarget`、`Capability`。
2. 搭 `registry/`：先手工收 20 个条目，必须同时包含精选、自动发现、blocked、monorepo 子包、仅 client 的反例。
3. 做扫描器：消费 awesome `plugins.json` 和 plugin-hub `/api/plugins`，输出候选 + 护照，不执行插件。
4. 做网站：搜索 query、详情、护照、数字口径分离、`/open` 深链。
5. 做宿主插件：只注册 `settings.plugins.tab` id `store`；同源 `/dsh-store/*`，含 `open` / `updates`；Fake profile 测四态。
6. 用真实 `dsh plugin add` 在隔离 profile（不是用户当前 web，除非用户要求）验证 npm 预构建、git prepare、错误 subpath、blocked 无按钮。
7. 做诊断：先写死本机视觉已覆盖这条黄金反例，再扩展词典。
8. 做官方示例插件包和用户分享包剥离逻辑。
9. 身份就绪后再开放公共评价和榜单。
10. API 文档与自托管指南齐套后，才允许谈商业层。

完成定义仍然是第 2.5 节：作者愿意来、用户敢装、Agent 会用、后来者能站在这套协议上做场景方案。不是 star 超过 dsh-market，也不是目录条数超过 awesome。
