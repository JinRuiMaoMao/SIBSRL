# June Daily Challenge 日程

> 来源：社区／Discord 公布的 ~June Daily Challenge~ 列表（已去除 emoji 自定义码）。  
> 已接入 `getTodaysDailyChallenge()`，读取 [`daily-challenge-schedule-2026-06.json`](./daily-challenge-schedule-2026-06.json)，每日 **HKT 08:00** 切换。  
> 主站线路列表折叠分组见 [`route-display-groups.json`](./route-display-groups.json)。  
> 月份假定 **2026-06**（与站点更新日期一致）；若年份不同请改 JSON 内 `month` 与各 `date`。  
> **暂无公布内容的日期**（6/29）在 JSON 中留空（`event: null`）。

## 原文

```
~June Daily Challenge~
6/1: Free Ride Day (475AW)
6/2: [Race] Safety First (473W)
6/3: Private Hire (PH1)
6/4: Rare Appearance x Private Hire (PH2)
6/5: Street light outage (74AN)
6/6: [Race] Marathon Road Closure (471W)
6/7: [Race] Rush Hour (41AN)
6/8: Private Hire (PH1)
6/9: Rare Appearance x Private Hire (PH2)
6/10: Marathon Road Closure (N) (N146A)
6/11: Foggy Day (141PE)
6/12: Private Hire (PH1)
6/13: [Race] Marathon Road Closure (N171EM)
6/14: [Race] Rush Hour (475W)
6/15: Private Hire (PH1)
6/16: Marathon Road Closure (471E)
6/17: Marathon Road Closure (240A)
6/18: Bridge Closure (whY370)
6/19: Marathon Shuttle (R370)
6/20: [Race] Street light outage (41AS)
6/21: [Race] Rush Hour (142E)
6/22: Marathon Road Closure (248A)
6/23: Marathon Road Closure at Night (N271S) — Rainbow Estate Complex → Long Island Ferry Pier via Central Western Bridge; any HK Special, CSB or FT buses; time 03:30
6/24: [Race] Urban Odyssey (77XA)
6/25: Rare appearance (U47S)
6/26: Foggy Day (74A)
6/27: [Race] Marathon Shuttle (R370)
6/28: [Race] Rush Hour (472W)
6/29:
6/30: [Race] Urban Odyssey (77XA)
```

## 字段说明

| 字段 | 含义 |
|------|------|
| `event` | 挑战名称（已去掉 `[Race]` 前缀，见 JSON `race`）；未公布则为 `null` |
| `routeCode` | 括号内线路代号，如 `141PE`、`PH1`；无括号则为 `null` |
| `directionSuffix` | 线路末尾方向字母，如 `475AW` → 线路 `475A`、方向 `W`（解析规则待与游戏对齐） |
| `race` | 是否为 `[Race]` 竞速挑战 |

结构化数据见同目录 [`daily-challenge-schedule-2026-06.json`](./daily-challenge-schedule-2026-06.json)。

## 私人租用（PH）站序

PH 站序每日随机；已知站序写入 JSON 的 `privateHireStops`，详情页与普通线路一样显示分区与报站音。

| 日期 | 活动 | 代号 | 站序 |
|------|------|------|------|
| 6/3 | 私人租用 | PH1 | 枫树里 → 叶欣邨第一座 → 海西邨 → 货柜码头岛 |
| 6/4 | 罕见外观 × 私人租用 | PH2 | 阿周电视 → 国际码头 → 叶角湾 → 东门总站 |
| 6/8 | 私人租用 | PH1 | 南环文化区公园 → 亚历山大教堂 → 伊迪城 → 时间廊 |
| 6/9 | 罕见外观 × 私人租用 | PH2 | 阳光大学运动场 → 巨石路 → 阳光殡仪馆 → 东门总站 |
| 6/12 | 私人租用 | PH1 | 仙贝广场 → 东门总站 → 白鸽邨 → 阳光殡仪馆 |
| 6/15 | 私人租用 | PH1 | 叶角湾坟场 → 北岛山顶 → 时间廊 → 四露谷车厂天台 |
