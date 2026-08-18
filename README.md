# DSH Store

[中文](README.zh.md) | English

**DSH Store is the trusted app store, capability operating system, and scene-pack distribution platform for DeepSeek Harness.**

This repository is the MIT open core. It is not a third plugin catalog and not a second settings-page market that only installs a curated list.

| Surface | Role |
| --- | --- |
| Git registry | Source of truth for plugins, packs, passports, and the capability dictionary |
| Public site / `/api/v1` | Discovery, search, rankings, author submission |
| `@dsh-store/plugin` | Local install, activation four-state, diagnosis, rollback |

The website never installs onto a remote machine. Automatic discovery never becomes one-click install.

## Status

Phase 0–4 slices are in this repo:

- JSON Schema for Plugin / PluginVersion / Passport / Pack / InstallTarget / Capability
- 20-plugin seed registry covering curated, discovered, blocked, monorepo subpath, and client-only fixtures
- Versioned capability dictionary (56 official `ctx.*` seams + product/scene layers)
- Read-only scanner adapters for awesome `plugins.json` and plugin-hub `/api/plugins`
- Hao123-style site + `/api/v1` that keeps source counts separate
- Host plugin that registers only `settings.plugins.tab`
- Local `/dsh-store/*` surface on a Fake profile (in-memory journal, no `$DSH_HOME` writes)
- Official / community / user packs sharing one lockfile; theme mutex; TUI defaults to headless
- Isolated profile execution + on-disk journal/rollback under `.tmp/isolated-dsh-home`
- Identity-gated public reviews (`POST /api/v1/reviews`) and materialized identity boards
- Multi-source discovery (`pnpm discover`) plus a 12-hour Worker cron; listed ≠ installable

Not done, because they need your accounts:

- npm publish and registering `store.dsh.dev` (see `docs/publish.md` and `docs/domain.md`)
- mutating the user's `$DSH_HOME`
- a live `dsh plugin add` run against the current web profile / user `$DSH_HOME`

## Quick start

```bash
pnpm install
pnpm validate
pnpm --filter @dsh-store/site start
```

Open `http://127.0.0.1:4173`. Search queries are part of the URL:

```text
/search?q=&category=vision&scene=cap.scene.we-media&trustState=installable&sort=capability_fill
```

## Install the host plugin

```bash
dsh plugin --profile web add https://github.com/lxyer/dsh-store/releases/download/v0.1.1/dsh-store-plugin-0.1.1.tgz
```

Restart `dsh web` afterwards. Do not use `latest` or a branch. After npm publish, the command becomes `dsh plugin --profile web add @dsh-store/plugin@0.1.0`.

## Contract highlights

- Plugin ids are `github:owner/repo` (plus `#subpath` for monorepos). npm names are attributes.
- Versions are `npm:name@version` or `git:host/owner/repo@sha`. `latest` / branches are rejected.
- Trust states: `discovered → candidate → screened → installable / featured / blocked`.
- Activation states after a local install: `live | restart | inert | broken`.
- Site “install” emits a locked command, a tarball manifest, and a `dsh-store://` / `/open` deep link.
- Blocked cards have no install button. Agent tools refuse them.

## Layout

```text
protocol/     JSON Schema and validators
registry/     Git source of truth
scanner/      discovery + passports, never executes plugins
site/         public catalog and /api/v1
plugin/       in-app host
docs/         product contract and author/self-host guides
```

The product contract is [`docs/DSH-Store-开发文档.md`](docs/DSH-Store-开发文档.md).
