# 作者指南 / Author guide

中文界面优先。提交时请同时提供中英文描述。

## PR 入库

新增一个文件：

```text
registry/plugins/<owner>__<repo>.yml
```

最低要求：

1. 稳定 id 使用 `github:owner/repo`，monorepo 子包写成 `github:owner/repo#subpath`。
2. 必须有 `dsh.bundle`。只有 `dsh.client` 会变成 `inert`，不能进 profile 层。
3. `versions[].id` 必须是不可变 npm 版本或 40 位 git sha。禁止 `latest` / 分支 / `HEAD`。
4. 仓库创建满 1 天，提交 ≥ 10，并带 topic `dsh-plugin`（或在 PR 里说明补上）。
5. SPDX 许可证可识别。
6. 不要给自己贴 `cap.scene.*` 或“官方认证”。

## 自动发现

扫描器可以把仓库写进 `data/derived/` 或 `registry/candidates/`。  
CI 会拒绝任何把自动发现条目直接标成 `installable` / `featured` 的提交。
