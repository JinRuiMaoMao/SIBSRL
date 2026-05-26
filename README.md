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
| 开发调试 | `npm run dev`，浏览器访问 http://localhost:5173/（**不要**看旧的 `index.html`） |
| 仍显示旧内容 | Ctrl+F5；确认页脚构建时间是否为刚才构建的时刻 |

## 开发调试

```bash
npm install
npm run dev
```

在浏览器打开 http://localhost:5173/（使用 `dev.html` 作为入口，支持热更新）。

## 添加线路数据

编辑 `src/data/routes.ts`。类型定义见 `src/types/route.ts`。

### 多方向线路（如 25 南行 / 北行）

同一条线若有多个行车方向，请统一按线路 **25** 的写法录入：

- 线路号字段只写 `25`，方向用 `stops` 数组区分（不要拆成多条 `25N`、`25S` 记录）。
- `stops` 中每个方向一项，建议带 `directionKey: 'S' | 'N'` 等；站序写在对应 `list` 里。
- 各方向的 `serviceTime` 只写该方向起点首末班（如 `05:30 – 00:30`），勿在路线级写「A 站 … / B 站 …」合并字符串。
- 界面会自动：切换按钮 **北/西优先**（N、W 在 S、E 前）；卡片/详情随方向更新起终点、分站与服务时间。

完整说明见 `src/data/routes.ts` 文件顶部的注释。

## GitHub Pages 子路径

若站点地址为 `https://用户名.github.io/仓库名/`，构建前设置环境变量：

```bash
# PowerShell
$env:VITE_BASE="/仓库名/"; npm run build
```

并在 `vite.config.ts` 中将 `base` 改为 `process.env.VITE_BASE ?? './'`（按需）。

## 免责声明

非官方粉丝工具。线路信息以游戏内及 [Wiki](https://sunshine-islands-roblox.fandom.com/) 为准。
