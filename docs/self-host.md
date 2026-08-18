# 自托管

开源核可以只跑注册表 + 扫描器 + 本机插件，不接公共评价。

```text
pnpm install
pnpm validate
pnpm --filter @dsh-store/site start
```

- Git `registry/` 是源真相。
- `data/derived/` 只是派生索引。
- 本机安装永远走 `/dsh-store/*`，只接受同源 / loopback。
- 真实 `dsh plugin add` 默认只打隔离 profile `dsh-store-isolated`，目录在仓库 `.tmp/isolated-dsh-home`，不会改用户当前 web / `~/.dsh`。
- journal / 回滚写在该隔离 profile 的 `.dsh-store/`。
- 发现目录：`pnpm discover` 拉取 awesome / plugin-hub / npm keyword / GitHub `topic:dsh-plugin`，只写 `data/derived/catalog/`，不会把条目晋升为可安装。
- 线上 Worker 每 12 小时自动再拉一遍公开源（awesome / hub / npm），结果缓存在边缘。GitHub `topic:dsh-plugin` 全量需要本机已登录 `gh` 后跑 `pnpm discover`，再部署快照。
- 公开评价走 `POST /api/v1/reviews`，必须带 GitHub / journal 身份；跨域仍然只开放 GET。
- 域名和 npm 发布见 `docs/domain.md`、`docs/publish.md`。不要把 `$DSH_HOME/settings.yaml`、凭据或聊天上传到商店服务器。
