# DSH Store

[English](README.md) | 中文

**DSH Store 是 DeepSeek Harness 的可信应用商店、能力操作系统和场景解决方案分发平台。**

本仓库是 MIT 开源核。它不是第三个插件目录，也不是第二个只装精选列表的设置页市场。

| 表面 | 职责 |
| --- | --- |
| Git 注册表 | 插件、插件包、护照、能力词典的源真相 |
| 公共网站 / `/api/v1` | 发现、检索、榜单、作者提交 |
| `@dsh-store/plugin` | 本机安装、激活四态、诊断、回滚 |

网站永远不会替用户在某台机器上安装。自动发现永远不会变成一键安装。

## 当前进度

阶段 0–4 的可运行切片已经在本仓库：

- Plugin / PluginVersion / Passport / Pack / InstallTarget / Capability 的 JSON Schema
- 20 条种子注册表，覆盖精选、自动发现、blocked、monorepo 子包、仅 client 反例
- 版本化能力词典（官方 56 个 `ctx.*` seam + 产品/场景层）
- 只读扫描器，消费 awesome `plugins.json` 与 plugin-hub `/api/plugins`
- 好 123 式站点 + `/api/v1`，数字口径分开
- 宿主插件只注册 `settings.plugins.tab`
- 本机 `/dsh-store/*` 跑在 Fake profile 上（内存 journal，不写 `$DSH_HOME`）
- 官方 / 社区 / 用户包共用 lockfile；主题互斥；TUI 默认 headless
- 隔离 profile 执行 + journal/回滚写盘（`.tmp/isolated-dsh-home`）
- 身份公开评价（`POST /api/v1/reviews`）和物化身份榜
- 多源自动发现（`pnpm discover`）+ Worker 每 12 小时刷新；listed 不等于可安装

还没做，因为需要你的账号：

- 发 npm、注册 `store.dsh.dev`（见 `docs/publish.md`、`docs/domain.md`）
- 改用户 `$DSH_HOME`
- 对着用户当前 web profile / `$DSH_HOME` 跑真实 `dsh plugin add`

## 快速开始

```bash
pnpm install
pnpm validate
pnpm --filter @dsh-store/site start
```

打开 `http://127.0.0.1:4173`。检索条件写在 URL 里，刷新结果不变：

```text
/search?q=&category=vision&scene=cap.scene.we-media&trustState=installable&sort=capability_fill
```

## 安装宿主插件

```bash
dsh plugin --profile web add https://github.com/lxyer/dsh-store/releases/download/v0.1.1/dsh-store-plugin-0.1.1.tgz
```

然后重启 `dsh web`。不要用 `latest` 或分支。npm 发布后改成 `dsh plugin --profile web add @dsh-store/plugin@0.1.0`。

## 合同要点

- 插件稳定 id 是 `github:owner/repo`（monorepo 加 `#subpath`）。npm 名只是属性。
- 版本是 `npm:name@version` 或 `git:host/owner/repo@sha`。`latest` / 分支会被拒绝。
- 信任状态：`discovered → candidate → screened → installable / featured / blocked`。
- 本机装完四态：`live | restart | inert | broken`。
- 网站“安装”只产出锁定命令、下载包和 `dsh-store://` / `/open` 深链。
- `blocked` 没有安装按钮，Agent 工具直接拒绝。

产品合同见 [`docs/DSH-Store-开发文档.md`](docs/DSH-Store-开发文档.md)。
