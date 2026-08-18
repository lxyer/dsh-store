# npm 发布清单

合同默认安装命令是：

```bash
dsh plugin --profile web add @dsh-store/plugin@<immutable-version>
```

在 org 和包名都还没发布前，用 git + commit，禁止 `latest` / 分支。

## 这个清单做什么

把开源核打成可安装的 npm 包，让别人用不可变版本装宿主插件。**不是**云端替用户安装，也不是把注册表搬进 npm。

## 发布前需要你本人提供的资料

我不能替你登录 npm 或创建 org。需要：

1. npm 账号，并创建 org **`@dsh-store`**（或你指定的另一个 scope）
2. 该账号已登录：`npm whoami` 能看到用户名
3. 确认要发的包：`@dsh-store/protocol`、`@dsh-store/registry`、`@dsh-store/scanner`、`@dsh-store/plugin`
4. 不可变版本号，例如 `0.1.0`，不要 `latest` 标签当安装目标
5. 可选：GitHub org `dsh-store`，用来写 `repository` 字段

站点 `@dsh-store/site` 是目录服务，默认不发 npm。

## 发布前检查

```bash
pnpm install
pnpm validate
pnpm test
pnpm --filter @dsh-store/protocol pack --dry-run
pnpm --filter @dsh-store/registry pack --dry-run
pnpm --filter @dsh-store/scanner pack --dry-run
pnpm --filter @dsh-store/plugin pack --dry-run
```

确认 tarball 不含 `.env`、Keychain、用户 `$DSH_HOME`、`.tmp/`。

## 真正发布（等你明确说“发布”再跑）

```bash
pnpm --filter @dsh-store/protocol publish --access public
pnpm --filter @dsh-store/registry publish --access public
pnpm --filter @dsh-store/scanner publish --access public
pnpm --filter @dsh-store/plugin publish --access public
```

发布后安装命令必须钉死版本，例如 `@dsh-store/plugin@0.1.0`。

在 npm org 还没登录前，对外安装走 GitHub Release 的预构建 tarball：

```bash
dsh plugin --profile web add https://github.com/lxyer/dsh-store/releases/download/v0.1.0/dsh-store-plugin-0.1.0.tgz
```

打包：

```bash
node scripts/pack-plugin-release.mjs
```
