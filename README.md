# DSH Store

[中文](README.zh.md) | English

**DSH Store is the trusted app store, capability operating system, and scene-pack platform for DeepSeek Harness.**

It is not a third plugin catalog, and not a second settings-page market that only installs a curated list.

## Install

```bash
dsh plugin --profile web add @tech2077/dsh-store-plugin@0.1.1
```

Then restart `dsh web`. Open **Settings → Plugins**. You should see official `configurable` / `all`, plus:

- **DSH Store**
- **Installed**
- **Gaps**

Do not use `latest` or a git branch.

| Target | Command |
| --- | --- |
| npm, locked | `dsh plugin --profile web add @tech2077/dsh-store-plugin@0.1.1` |
| GitHub Release tarball | `dsh plugin --profile web add https://github.com/lxyer/dsh-store/releases/download/v0.1.1/dsh-store-plugin-0.1.1.tgz` |

Package: [npmjs.com/package/@tech2077/dsh-store-plugin](https://www.npmjs.com/package/@tech2077/dsh-store-plugin)

The website never installs onto a remote machine. After the host plugin is installed, one-click install runs on the local machine only.

## What it does

| Surface | Role |
| --- | --- |
| Git registry | Source of truth for plugins, packs, passports, and the capability dictionary |
| Public site / `/api/v1` | Discovery, search, rankings, author submission |
| `@tech2077/dsh-store-plugin` | Local install, activation four-state, diagnosis, rollback |

- Plugin ids are `github:owner/repo` (plus `#subpath` for monorepos). npm names are attributes.
- Versions are `npm:name@version` or `git:host/owner/repo@sha`.
- Trust states: `discovered → candidate → screened → installable / featured / blocked`.
- After a local install the UI returns `live | restart | inert | broken`.
- Auto-discovery never becomes one-click install. Blocked cards have no install button.

## Develop this repo

```bash
pnpm install
pnpm test
pnpm --filter @dsh-store/site start
```

Open `http://127.0.0.1:4173`. English: `http://127.0.0.1:4173/?lang=en`.

Search queries stay in the URL:

```text
/search?q=&category=vision&scene=cap.scene.we-media&trustState=installable&sort=capability_fill
```

## Layout

```text
protocol/     JSON Schema and validators
registry/     Git source of truth
scanner/      discovery + passports, never executes plugins
site/         public catalog and /api/v1
plugin/       in-app host
docs/         product contract and author/self-host guides
```

Product contract: [`docs/DSH-Store-开发文档.md`](docs/DSH-Store-开发文档.md).
