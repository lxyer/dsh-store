# DSH Store

[English](README.md) | 中文

**DSH Store 是 DeepSeek Harness 的可信应用商店、能力操作系统和场景解决方案分发平台。**

它不是第三个插件目录，也不是第二个只装精选列表的设置页市场。

## 安装

```bash
dsh plugin --profile web add @tech2077/dsh-store-plugin@0.1.1
```

然后重启 `dsh web`。打开 **设置 → 插件**。官方 `configurable` / `all` 还在，另外会看到：

- **DSH Store**
- **已装**
- **能力诊断**

不要用 `latest`，也不要用 git 分支。

| 目标 | 命令 |
| --- | --- |
| npm，锁定版本 | `dsh plugin --profile web add @tech2077/dsh-store-plugin@0.1.1` |
| GitHub Release tarball | `dsh plugin --profile web add https://github.com/lxyer/dsh-store/releases/download/v0.1.1/dsh-store-plugin-0.1.1.tgz` |

包地址：[npmjs.com/package/@tech2077/dsh-store-plugin](https://www.npmjs.com/package/@tech2077/dsh-store-plugin)

网站不会替任何人远程安装。装上宿主插件后，一键安装只发生在用户本机。

## 它做什么

| 表面 | 职责 |
| --- | --- |
| Git 注册表 | 插件、插件包、护照、能力词典的源真相 |
| 公共网站 / `/api/v1` | 发现、检索、榜单、作者提交 |
| `@tech2077/dsh-store-plugin` | 本机安装、激活四态、诊断、回滚 |

- 插件稳定 id 是 `github:owner/repo`（monorepo 加 `#subpath`）。npm 名只是属性。
- 版本是 `npm:name@version` 或 `git:host/owner/repo@sha`。
- 信任状态：`discovered → candidate → screened → installable / featured / blocked`。
- 本机装完四态：`live | restart | inert | broken`。
- 自动发现不会变成一键安装。`blocked` 没有安装按钮。

## 开发本仓库

```bash
pnpm install
pnpm test
pnpm --filter @dsh-store/site start
```

打开 `http://127.0.0.1:4173`。英文：`http://127.0.0.1:4173/?lang=en`。

检索条件写在 URL 里，刷新结果不变：

```text
/search?q=&category=vision&scene=cap.scene.we-media&trustState=installable&sort=capability_fill
```

## 目录

```text
protocol/     JSON Schema 与校验
registry/     Git 源真相
scanner/      发现 + 护照，不执行插件
site/         公共目录和 /api/v1
plugin/       应用内宿主
docs/         产品合同与作者 / 自托管指南
```

产品合同见 [`docs/DSH-Store-开发文档.md`](docs/DSH-Store-开发文档.md)。
