# June Daily Challenge 日程

> 来源：社区／游戏内公布的 ~June Daily Challenge~ 列表（Discord 格式，已去除 emoji 自定义码）。  
> 已接入 `getTodaysDailyChallenge()`，读取 [`daily-challenge-schedule-2026-06.json`](./daily-challenge-schedule-2026-06.json)，每日 **HKT 08:00** 切换。  
> 主站线路列表折叠分组见 [`route-display-groups.json`](./route-display-groups.json)。  
> 月份假定 **2026-06**（与站点更新日期一致）；若年份不同请改 JSON 内 `month` 与各 `date`。  
> **暂无公布内容的日期**（6/18–19、6/22–23、6/26、6/29）暂时填为 **Private Hire (PH1)**，待官方数据后再改。

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
6/17: Daily Challenge (240A)
6/18:
6/19:
6/20: [Race] Street Light Outage
6/21: [Race] Rush Hour
6/22:
6/23:
6/24: [Race] Urban Odyssey (77XA)
6/25: Rare appearance
6/26:
6/27: [Race] Marathon Shuttle
6/28: [Race] Rush Hour
6/29:
6/30: [Race] Urban Odyssey (77XA)
```

## 字段说明

| 字段 | 含义 |
|------|------|
| `event` | 挑战名称（已去掉 `[Race]` 前缀，见 JSON `race`） |
| `routeCode` | 括号内线路代号，如 `141PE`、`PH1`；无括号则为 `null` |
| `directionSuffix` | 线路末尾方向字母，如 `475AW` → 线路 `475A`、方向 `W`（解析规则待与游戏对齐） |
| `race` | 是否为 `[Race]` 竞速挑战 |

结构化数据见同目录 [`daily-challenge-schedule-2026-06.json`](./daily-challenge-schedule-2026-06.json)。
