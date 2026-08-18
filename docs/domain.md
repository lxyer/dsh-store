# 公共目录域名

当前公网目录是 **`https://dsh.yibishe.com`**（Cloudflare Worker，Zone `yibishe.com`）。合同里的 `store.dsh.dev` 仍是协议 Schema `$id` 占位，不是这台站的主机名。

## 这个域名用来干什么

网站只负责发现和治理，不替用户安装：

- 好 123 式目录：搜索、插件详情、作者页、护照、兼容矩阵、徽章
- 只读 `/api/v1`（评价写入是唯一的身份例外）
- `/open?target=...&version=...` 深链，打开本机宿主插件
- `dsh-store://` 协议的 https 对照页

真正安装只发生在本机 `@dsh-store/plugin`。没有这个域名，本地 `http://127.0.0.1:4173` 也能跑同一套站。

## 为什么现在申请不了 `store.sh.edu`

`store.sh.edu` **不是**这份合同里的占位名，也**不能**当普通域名去注册。

| 名字 | 实际情况 |
| --- | --- |
| `store.dsh.dev` | 合同占位。要先买到 `dsh.dev`，再加 `store` 子域 |
| `store.sh.edu` | `.edu` 由 Educause 管，只给美国受认可的高等教育机构。个人 / 开源商店申请不了 |
| `*.edu.cn` | 中国教育网，只给学校走主管部门。同样不是商店能自行注册的 |
| `dsh.yibishe.com` | 已部署的公共目录。Cloudflare Worker `dsh-store`，自定义域绑在 Zone `yibishe.com` |

本机查到的 Cloudflare Zone 是 `yibishe.com`，里面没有 `dsh.dev`，也没有 `sh.edu`。所以我不能在这里“申请成功”`store.sh.edu` 或 `store.dsh.dev`。

## 申请真正可用的目录域名要什么资料

### 若走合同占位 `store.dsh.dev`

1. 一个域名注册商账号（Cloudflare Registrar / Porkbun / Namecheap 等）
2. 支付方式，用来买 **`dsh.dev`**（`.dev` 是公开可注册后缀，不是学校后缀）
3. 把该域加进 Cloudflare Zone，NS 切过去
4. 加 `store` 的 CNAME / A，指到 Pages 或 Workers
5. TLS 由 Cloudflare 自动签，不必另买证书
6. 可选：GitHub org `dsh-store`，用来挂仓库和 Pages

个人开发站一般**不需要**营业执照、商标、学校证明。商标和公司主体合同里仍是占位，不是上线目录的前置条件。

### 若你其实想要学校子域 `store.sh.edu` / `store.xxx.edu.cn`

这不是买域名，是找**该校信息化 / 网络中心**开子域。他们通常要：

- 申请人校园身份（工号 / 学号）
- 业务说明：这是插件目录站，不托管用户安装、不收集 `$DSH_HOME`
- 负责人老师或院系盖章
- 指向的 CNAME 目标（Cloudflare Pages / 自有服务器）
- 安全承诺：不钓鱼、不挂恶意安装器

没有学校主体，这条路走不通。

### 若先用你已经有的 `yibishe.com`

资料已经齐了：Cloudflare Zone + API Token。缺的只是你确认主机名，例如 `store.yibishe.com`，以及 Pages/Workers 部署目标。确认后我可以按 Cloudflare 本地流程先 dry-run、再写入 DNS。

## 上线后还要改的代码占位

协议 Schema `$id`、深链示例、站点页脚现在仍写 `https://store.dsh.dev`。域名落地后替换这些字符串，不改安装协议。
