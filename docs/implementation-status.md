# 实现状态

对照 `docs/DSH-Store-开发文档.md` 第 13 章与第 15.6 节。

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| 0 协议与空壳 | 完成 | `protocol/` Schema 校验第 4.6 节包和第 6.2 节安装目标；MIT；中英 README；默认不改用户 `$DSH_HOME` |
| 1 可信目录网站 | 切片完成 | 20 条种子注册表仍是可安装源真相；站点列出 awesome / hub / npm / GitHub topic 自动发现；数字口径分离；blocked 无安装按钮 |
| 2 本机商店插件 | 切片完成 | 只注册 `settings.plugins.tab`；`/dsh-store/*` 含 installed / updates / uninstall / update / rollback / status / cancel / approve-builds / logs / backup / restore；四态单测；Desktop 无重启 |
| 2b 隔离执行 + journal 写盘 | 完成 | 默认拒绝用户 `~/.dsh` 和当前 `web`；`dsh-store-isolated` + Fake/注入 runner 跑 `dsh plugin --profile … add`；journal / 下载包写到隔离 state dir；回滚读盘上的 before 快照 |
| 3 能力诊断 | 黄金反例完成 | 本机已有 Vision Toolkit 时不推荐第二个视觉插件；`xai` 只报配置问题；推荐带 why / alreadyCovered / rejectedAlternatives |
| 4 插件包 | 合同 + 示例 | 官方 / 社区 / 用户包共用 lockfile；`pack:dsh-store/we-media-starter` 标 partial，视觉为 alreadyCovered；含 blocked 条目的包不能一键安装；主题互斥；TUI 默认 headless；分享包剥离密钥和本机路径 |
| 5 评价 / 榜单 | 身份协议已接通 | `POST /api/v1/reviews` 需要 GitHub / journal 身份；冷却、一版本一条、作者不能自评、同词进审核、举报入口；无安装证据的五星不进评分榜；身份榜仍读物化快照；公开 `star_growth` 榜按日 star 账本物化，首日只记账次日开榜 |
| 6 自托管商业层 | 指南 + 发布清单 | `docs/self-host.md`、`docs/domain.md`、`docs/publish.md`；未发 npm；未注册 `store.dsh.dev` / `store.sh.edu` |

仍未做（需要你的账号或明确授权，不是代码漏做）：

- 公共目录已绑 `https://dsh.yibishe.com`（Cloudflare Worker）
- `store.sh.edu`：`.edu` 学校后缀，商店申请不了；合同占位 `store.dsh.dev` 未买
- `npm publish`（须你登录 `@dsh-store` org）
- 商店插件已用本地 `link:` 装进当前 web profile（`@dsh-store/plugin`）；未发 npm。重启 `dsh web` 后才会出现 Settings 里的 DSH Store 页。页内「本机安装」默认对当前 web profile 执行 `dsh plugin add`。设 `DSH_STORE_LIVE=0` 可退回只规划不落盘。

发现入口：`pnpm discover`。线上 `dsh.yibishe.com` 每 12 小时自动拉公开源。自动发现不能写成可安装。

隔离执行入口：`pnpm isolate:init`，再 `pnpm --filter @dsh-store/plugin isolate -- add github:renpengfei1027/dsh-web-notify`。只写仓库 `.tmp/isolated-dsh-home`。
