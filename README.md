# SIBS 巴士线路查询

Sunshine Islands Bus Simulator（阳光群岛巴士模拟器）非官方巴士线路查询网站。

## 直接使用（GitHub / 本地双击）

仓库根目录的 **`index.html`** 是**单文件静态页**（已内嵌全部 JS/CSS）：

- 本地：双击项目根目录的 **`index.html`**（必须是 `npm run build` 之后生成的那一份）
- GitHub Pages：将 `index.html` 放在网站根目录即可（无需 Node.js）

**改完 `src/` 后必须重新构建**，否则双击打开的仍是旧版界面（例如仍会看到已删除的「线路编号规则」）：

```bash
npm install
npm run build
# 或仅构建页面：npm run build:only
```

`vite build` 会生成 `dist/dev.html`，并**自动同步**到根目录的 `index.html`（勿只跑一半、也勿把 `dev.html` 当发布页双击）。页脚 **构建时间** 应与刚构建一致；不一致请 **Ctrl+F5** 或换无痕窗口，并确认打开的是**本仓库根目录**的 `index.html`。

### 界面没更新？

| 打开方式 | 正确做法 |
|----------|----------|
| 双击 `index.html` | 先执行 `npm run build` 或 `npm run build:only`，再打开**项目根目录**的 `index.html` |
| 开发调试 | `npm run dev` → 终端里的地址（默认 http://localhost:5173/，**不是** build 后的 index.html） |
| 仍显示旧内容 | Ctrl+F5；确认页脚构建时间是否为刚才构建的时刻 |

## 开发调试 vs 构建发布（不要混用）

| 你想做什么 | 命令 | 打开哪个地址 |
|------------|------|----------------|
| **改代码、热更新** | `npm run dev` | http://localhost:5173/ 或 /dev.html（勿在 dev 时打开根目录构建版 index.html） |
| **测刚构建的单文件页** | `npm run build:only` | 双击项目根目录 **`index.html`**（不是 5173） |
| **本地预览构建结果** | `npm run build:only` 后 `npm run preview` | http://localhost:4173/dev.html |

**`npm run build:only` 不会更新 `localhost:5173`**。5173 只有在你运行 `npm run dev` 时才是「源码开发版」；构建产物在根目录 `index.html`。

若 5173 白屏或不对，先看终端是否写了 `Port 5173 is in use`（会改到 5174），或关掉占用 5173 的旧进程后重新 `npm run dev`。

```bash
npm install
npm run dev
```

浏览器访问终端显示的 Local 地址（带 `/dev.html`）。

## 添加线路数据

编辑 `src/data/routes.ts`。类型定义见 `src/types/route.ts`。

### 多方向线路（如 25 南行 / 北行）

同一条线若有多个行车方向，请统一按线路 **25** 的写法录入：

- 线路号字段只写 `25`，方向用 `stops` 数组区分（不要拆成多条 `25N`、`25S` 记录）。
- `stops` 中每个方向一项，建议带 `directionKey: 'S' | 'N'` 等；站序写在对应 `list` 里。
- 各方向的 `serviceTime` 只写该方向起点首末班（如 `05:30 – 00:30`），勿在路线级写「A 站 … / B 站 …」合并字符串。
- 界面会自动：切换按钮 **北/西优先**（N、W 在 S、E 前）；卡片/详情随方向更新起终点、分站与服务时间。

完整说明见 `src/data/routes.ts` 文件顶部的注释。

## Discord Daily Challenge 自动同步

仓库内置一个 Node.js Discord bot，可监听指定频道中 Ena Bot 发出的 Daily Challenge 消息，解析 `Route` / `Type` / `RtInfoBoard` 字段，写入本地 JSON，并通过 HTTP API 给网站读取。

### 1. 准备 Discord bot

先在 Discord Developer Portal：

1. 新建一个 application / bot。
2. 在 **Bot** 页面开启 **Message Content Intent**。
3. 复制 bot token，保存到部署平台的 `DISCORD_TOKEN`。
4. 邀请 bot 进入服务器，并确保它能读取 Daily Challenge 频道。
5. 复制 Daily Challenge 频道 ID，保存到 `DAILY_CHALLENGE_CHANNEL_ID`。
6. 可选但建议：复制 Ena Bot 的用户 ID，保存到 `ENA_BOT_USER_ID`，这样只接受 Ena Bot 发出的消息。

### 2. 真实部署（Render）

仓库已包含 `Dockerfile` 和 `render.yaml`。推荐部署成 Render Web Service，因为它可以同时跑 Discord bot 和 HTTP API。

1. 登录 Render，选择 **New +** → **Blueprint**。
2. 选择这个 GitHub 仓库。
3. Render 会读取 `render.yaml`，创建 `sibs-daily-challenge-bot` 服务。
4. 在 Render 的环境变量里填写：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DISCORD_TOKEN` | 是 | Discord bot token |
| `DAILY_CHALLENGE_CHANNEL_ID` | 是 | 要监听的频道 ID |
| `ENA_BOT_USER_ID` | 建议 | 只接受 Ena Bot 消息 |
| `DAILY_CHALLENGE_CORS_ORIGIN` | 否 | 网站域名；不确定可先用 `*` |

`render.yaml` 已配置：

- `healthCheckPath: /healthz`
- 持久磁盘：`/var/data`
- JSON 存储：`/var/data/daily-challenge-live.json`
- API 会自动使用 Render 提供的 `PORT`

部署完成后，Render 会给一个域名，例如：

```text
https://sibs-daily-challenge-bot.onrender.com
```

API 地址就是：

```text
https://sibs-daily-challenge-bot.onrender.com/api/daily-challenge/latest
```

### 3. 本地运行 bot + API

本地调试时用 `.env.example` 作为环境变量参考。运行服务时用环境变量配置密钥和频道：

```bash
export DISCORD_TOKEN="你的 Discord bot token"
export DAILY_CHALLENGE_CHANNEL_ID="Daily Challenge 频道 ID"
# 可选：只接受 Ena Bot 的消息，强烈建议填写
export ENA_BOT_USER_ID="Ena Bot 用户 ID"

npm run bot:daily
```

默认会：

- 监听 `DAILY_CHALLENGE_CHANNEL_ID`
- 处理普通消息和 embed message
- 防重复写入相同 message / 相同内容
- 本地写入 `data/daily-challenge-live.json`（已被 `.gitignore` 忽略）
- 提供 `http://localhost:8787/api/daily-challenge/latest`

只启动 API（读取已有 JSON，不连接 Discord）：

```bash
npm run bot:daily:api
```

可选环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DAILY_CHALLENGE_STORE_PATH` | `data/daily-challenge-live.json` | 本地 JSON 存储位置 |
| `PORT` | 无 | 部署平台端口，优先于 `DAILY_CHALLENGE_API_PORT` |
| `DAILY_CHALLENGE_API_PORT` | `8787` | 本地 API 端口 |
| `DAILY_CHALLENGE_CORS_ORIGIN` | `*` | 允许读取 API 的网站来源 |
| `DAILY_CHALLENGE_HISTORY_LIMIT` | `90` | 保留历史记录数量 |

API：

```text
GET /healthz
GET /api/daily-challenge/latest
GET /api/daily-challenge/history
```

返回的 `latest` 会包含：

```json
{
  "date": "2026-06-17",
  "event": "Daily Challenge",
  "routeCode": "240A",
  "race": false,
  "rtInfoBoard": null
}
```

### 4. 让网站读取真实 API

构建网站前设置 API URL，然后重新构建并推送 `index.html` 等 standalone 页面：

```bash
VITE_DAILY_CHALLENGE_API_URL="https://你的-api-domain/api/daily-challenge/latest" npm run build:only
```

可选轮询间隔（毫秒，默认 5000）：

```bash
VITE_DAILY_CHALLENGE_POLL_MS=3000 npm run build:only
```

如果 API 不可用、返回日期不是今天，或没有配置 API URL，网站会自动回退到 `data/daily-challenge-schedule-2026-06.json` 的静态排期。

如果网站部署在 GitHub Pages，请确保构建后的根目录 `index.html` 已提交并推送到 `master`。

## 用户登录 API（Render + GitHub Pages）

GitHub Pages **只能放静态页面**，注册/登录需要单独部署 `sibs-user-api`（仓库已含 `Dockerfile.user-api` 与 `render.yaml`）。

### 1. 在 Render 部署用户 API

1. Render 控制台 → **New +** → **Blueprint** → 选择本仓库。
2. Blueprint 会创建 `sibs-user-api`（默认 **Free**，$0；休眠后首次访问需等待唤醒）。
3. 在 `sibs-user-api` 的环境变量中填写（**Secret**）：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | 随机长字符串（与本地 `.env` 类似） |
| `RESEND_API_KEY` | [Resend](https://resend.com) API Key（Render 上 **不要用 Outlook SMTP**，云端 IP 常被微软拦截） |
| `MAIL_FROM` | 发件人。未验证域名时用 `SIBS Route Lookup <onboarding@resend.dev>`；验证自有域名后改为 `SIBS Route Lookup <noreply@你的域名>` |
| `USER_API_CORS_ORIGIN` | 你的 GitHub Pages 来源，默认 `https://jinruimaomao.github.io` |

**邮件说明（Resend）**

- 在 [resend.com](https://resend.com) 注册 → **API Keys** → 创建 Key → 粘贴到 Render 的 `RESEND_API_KEY`。
- 使用默认 `onboarding@resend.dev` 时，**只能把验证码发到你在 Resend 注册用的那个邮箱**（用于自测）。
- 要让任意用户收到验证码，请在 Resend **Domains** 添加并验证你的域名，然后把 `MAIL_FROM` 改成该域名下的地址。
- 本地开发仍可用 Outlook SMTP（见 `.env.example` 的 `SMTP_*`）；未设置 `RESEND_API_KEY` 时 API 会走 SMTP。

4. 部署完成后记下域名，例如：

```text
https://sibs-user-api.onrender.com
```

5. 浏览器打开 `https://sibs-user-api.onrender.com/healthz` 应返回 `{"ok":true,"service":"user-api"}`。

> **Free 档说明**：用户数据库在容器内 `data/users.db`，**重新部署可能清空账号**；需要持久化可改为 Starter 并挂载磁盘。

### 2. 重新构建网站并推送

把 Render 域名写进构建（不要带末尾 `/`）：

```bash
VITE_USER_API_URL="https://sibs-user-api.onrender.com" npm run build:only
```

然后 `git add` 根目录 `index.html`、`account.html` 等 → `commit` → `push origin master`。

之后 GitHub Pages 上的注册/登录会请求 Render，而不是 `localhost`。

### 3. 本地开发

```bash
# 终端 1
npm run user-api

# 终端 2
npm run dev
```

`npm run dev` 会把 `/api/*` 代理到 `localhost:8788`，无需在 `.env` 里写 `VITE_USER_API_URL`。

## GitHub Pages 子路径

若站点地址为 `https://用户名.github.io/仓库名/`，构建前设置环境变量：

```bash
# PowerShell
$env:VITE_BASE="/仓库名/"; npm run build
```

并在 `vite.config.ts` 中将 `base` 改为 `process.env.VITE_BASE ?? './'`（按需）。

## 免责声明

非官方粉丝工具。线路信息以游戏内及 [Wiki](https://sunshine-islands-roblox.fandom.com/) 为准。
