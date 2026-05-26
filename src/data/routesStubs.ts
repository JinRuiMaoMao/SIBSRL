import type { BusRoute } from '../types/route'
import { routesSibsTypes } from './routesSibsTypes'

/** 从已导入 Wiki 线路克隆并覆盖（避免占位「自己到自己」） */
function cloneFromSibs(
  sourceId: string,
  id: string,
  number: string,
  patch: Partial<BusRoute> = {},
): BusRoute {
  const base = routesSibsTypes.find((r) => r.id === sourceId)
  if (!base) throw new Error(`Missing source route ${sourceId}`)
  return {
    ...structuredClone(base),
    ...patch,
    id,
    number,
    wikiUrl:
      patch.wikiUrl ??
      `https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_${encodeURIComponent(number)}`,
  }
}

/**
 * Wiki 无页面或仅占位数据的线路（完整站序参考同系列主线）。
 */
export const routesStubs: BusRoute[] = [
  {
    id: '73A',
    number: '73A',
    operators: ['CSB', 'HZ'],
    category: 'inner',
    pattern: 'circular',
    zones: [7, 8],
    origin: { zh: '东厂', en: 'East Factory' },
    destination: { zh: '东厂', en: 'East Factory' },
    via: {
      zh: '叶欣、叶角湾、东门、海西',
      en: 'YiYan, Leafy Bay, East Door, Haisey',
    },
    serviceTime: { zh: '07:20 – 18:00', en: '07:20 – 18:00' },
    interval: { zh: '30 – 90 分钟', en: '30 – 90 mins' },
    journeyTime: { zh: '约 18 分钟', en: 'approx. 18 mins' },
    fare: '$9.4',
    levelRequired: 72,
    length: { zh: '约 15.7 km（环线）', en: 'approx. 15.7 km (loop)' },
    stops: [
      {
        direction: {
          zh: '环线（东厂 → 东门 → 东厂）',
          en: 'Circular (East Factory → East Door → East Factory)',
        },
        serviceTime: { zh: '07:20 – 18:00', en: '07:20 – 18:00' },
        list: [
          { name: { zh: '东厂', en: 'East Factory' }, zone: 7 },
          { name: { zh: '叶欣公园', en: 'YiYan Park' }, zone: 7 },
          { name: { zh: '钻石交易塔', en: 'Diamond Trading Tower' }, zone: 7 },
          { name: { zh: '新地花园', en: 'Sindy Garden' }, zone: 7 },
          { name: { zh: '叶角湾', en: 'Leafy Bay' }, zone: 7 },
          { name: { zh: '叶角湾坟场', en: 'Leafy Bay Cemetery' }, zone: 7 },
          { name: { zh: '叶角医院', en: 'Leafy Hospital' }, zone: 7 },
          { name: { zh: '东门总站', en: 'East Door Bus Terminus' }, zone: 7 },
          { name: { zh: '海西角', en: 'Haisey Point' }, zone: 8 },
          { name: { zh: '海西邨', en: 'Haisey Estate' }, zone: 8 },
          { name: { zh: '叶角医院', en: 'Leafy Hospital' }, zone: 7 },
          { name: { zh: '叶角湾坟场', en: 'Leafy Bay Cemetery' }, zone: 7 },
          { name: { zh: '叶角湾', en: 'Leafy Bay' }, zone: 7 },
          { name: { zh: '新地花园', en: 'Sindy Garden' }, zone: 7 },
          { name: { zh: '叶欣海旁道', en: 'Praya YiYan Road' }, zone: 7 },
          { name: { zh: '南洋大厦', en: 'Southern Building' }, zone: 7 },
          { name: { zh: '彩虹广场', en: 'Rainbow Plaza' }, zone: 7 },
          { name: { zh: '东厂', en: 'East Factory' }, zone: 7 },
        ],
      },
    ],
    notes: {
      zh: '73 系列环线（CSB · HZ），东厂 ↺ 东门，走线与 73 相同；班次较疏。',
      en: 'Route 73 family loop (CSB · HZ), East Factory ↺ East Door; same routing as route 73. Infrequent service.',
    },
    wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_673',
  },
  {
    id: '246XA',
    number: '246XA',
    operators: ['REBC', 'FTCC'],
    category: 'express',
    pattern: 'circular',
    zones: [1, 4],
    origin: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' },
    destination: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' },
    via: {
      zh: '北环、白鸽岛、货柜码头、中区',
      en: 'Northern, Dove Island, Containers Terminal, Central',
    },
    interval: { zh: '7 – 30 分钟', en: '7 – 30 mins' },
    journeyTime: { zh: '约 31–33 分钟（环线）', en: 'approx. 31–33 mins (loop)' },
    fare: '$11.4',
    levelRequired: 74,
    length: { zh: '约 19 km（环线）', en: 'approx. 19 km (loop)' },
    stops: [
      {
        directionKey: 'W',
        direction: {
          zh: '西行（东锦葵海傍路 → 时间廊）',
          en: 'Westbound (Eastmallow Praya Road → Timelapse Mall)',
        },
        serviceTime: {
          zh: '平日 07:00 – 08:55 / 17:40 – 18:35',
          en: 'Mon–Fri 07:00 – 08:55 / 17:40 – 18:35',
        },
        list: [
          { name: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' }, zone: 4 },
          {
            name: { zh: '东锦葵邨－阳葵屋', en: 'Eastmallow Estate - Sunny House' },
            zone: 4,
          },
          { name: { zh: '东锦葵大街', en: 'Eastmallow Main Street' }, zone: 4 },
          { name: { zh: '中环桥', en: 'Central Bridge' }, zone: 4 },
          { name: { zh: '北环中心', en: 'Northern Plaza' }, zone: 4 },
          {
            name: { zh: '西区海底隧道转车站', en: 'Western Harbour Tunnel Interchange' },
            zone: 4,
          },
          { name: { zh: '时间廊', en: 'Timelapse Mall' }, zone: 1 },
        ],
      },
      {
        directionKey: 'E',
        direction: {
          zh: '东行（时间廊 → 东锦葵海傍路）',
          en: 'Eastbound (Timelapse Mall → Eastmallow Praya Road)',
        },
        serviceTime: {
          zh: '平日 07:00 – 08:55 / 17:40 – 18:35',
          en: 'Mon–Fri 07:00 – 08:55 / 17:40 – 18:35',
        },
        list: [
          { name: { zh: '时间廊', en: 'Timelapse Mall' }, zone: 1 },
          { name: { zh: '银行大厦', en: 'Bank Tower' }, zone: 1 },
          { name: { zh: '三哥大厦', en: 'Third Technology Building' }, zone: 1 },
          { name: { zh: '购物廊', en: 'Shopping Corridor' }, zone: 1 },
          { name: { zh: '白鸽消防局', en: 'Dove Fire Station' }, zone: 1 },
          { name: { zh: '艾迪城', en: 'Addi City' }, zone: 1 },
          { name: { zh: '伊迪城', en: 'Eddie City' }, zone: 1 },
          { name: { zh: '货柜码头', en: 'Containers Terminal' }, zone: 1 },
          { name: { zh: '中西转车站', en: 'Central-Western Interchange' }, zone: 1 },
          { name: { zh: '南环街市', en: 'Southern Market' }, zone: 4 },
          { name: { zh: '中环桥', en: 'Central Bridge' }, zone: 4 },
          { name: { zh: '东锦葵大街', en: 'Eastmallow Main Street' }, zone: 4 },
          { name: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' }, zone: 4 },
        ],
      },
    ],
    notes: {
      zh: '246X 系列繁忙时间环线（REBC · FTCC），东锦葵海傍路 ↺ 时间廊。',
      en: '246X family peak-hour loop (REBC · FTCC), Eastmallow Praya Road ↺ Timelapse Mall.',
    },
    wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_246X',
  },
  cloneFromSibs('376S', '376', '376', {
    category: 'special',
    origin: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    destination: { zh: '安灵台', en: 'Ambling Peak Columbarium' },
    via: {
      zh: '长岛东、白鸽岛、医院岛、中西转车站、叶角湾',
      en: 'Long Island East, Dove Island, Hospital Island, Central-Western Interchange, Leafy Bay',
    },
    notes: {
      zh: '节日特快（走线与 376S 相同）。',
      en: 'Festival peak express (same routing as 376S).',
    },
  }),
  {
    id: '475A',
    number: '475A',
    operators: ['FT'],
    category: 'express',
    pattern: 'bidirectional',
    zones: [4, 7, 8],
    origin: { zh: '仙贝广场', en: 'Senpai Shopping Centre' },
    destination: { zh: '北顿市中心', en: 'Norton Town Center' },
    via: { zh: '东门、彩虹、东锦葵、北岛', en: 'East Door, Rainbow, Eastmallow, North Island' },
    interval: { zh: '繁忙时间 5 – 8 分钟', en: 'Peak 5 – 8 mins' },
    journeyTime: { zh: '约 35 分钟', en: 'approx. 35 mins' },
    fare: '$12.1',
    length: { zh: '约 20 km', en: 'approx. 20 km' },
    serviceTime: { zh: '周一至五繁忙时间', en: 'Mon–Fri peak hours' },
    stops: [
      {
        directionKey: 'N',
        direction: { zh: '北行（仙贝广场 → 北顿市中心）', en: 'Northbound (Senpai → Norton Town Center)' },
        serviceTime: { zh: '周一至五 07:00 – 09:00', en: 'Mon–Fri 07:00 – 09:00' },
        list: [
          { name: { zh: '仙贝广场', en: 'Senpai Shopping Centre' }, zone: 7 },
          { name: { zh: '东门总站', en: 'East Door Bus Terminus' }, zone: 7 },
          { name: { zh: '彩虹中心', en: 'Rainbow Estate Complex' }, zone: 7 },
          { name: { zh: '东锦葵大街', en: 'Eastmallow Main Street' }, zone: 4 },
          { name: { zh: '阳光大学', en: 'Sunshine University' }, zone: 4 },
          { name: { zh: '北岛花园', en: 'North Island Estate' }, zone: 4 },
          { name: { zh: '北顿市中心', en: 'Norton Town Center' }, zone: 4 },
        ],
      },
      {
        directionKey: 'S',
        direction: { zh: '南行（北顿市中心 → 仙贝广场）', en: 'Southbound (Norton Town Center → Senpai Shopping Centre)' },
        serviceTime: { zh: '周一至五 17:00 – 19:00', en: 'Mon–Fri 17:00 – 19:00' },
        list: [
          { name: { zh: '北顿市中心', en: 'Norton Town Center' }, zone: 4 },
          { name: { zh: '北岛花园', en: 'North Island Estate' }, zone: 4 },
          { name: { zh: '阳光大学', en: 'Sunshine University' }, zone: 4 },
          { name: { zh: '彩虹中心', en: 'Rainbow Estate Complex' }, zone: 7 },
          { name: { zh: '仙贝广场', en: 'Senpai Shopping Centre' }, zone: 7 },
        ],
      },
    ],
    wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_475A',
  },
  (() => {
    const g476 = routesSibsTypes.find((r) => r.id === '476')!
    const loopList = g476.stops?.[0]?.list ?? []
    return {
      id: '476SA',
      number: '476SA',
      operators: ['FT'],
      category: 'special',
      pattern: 'circular' as const,
      zones: [4, 7],
      origin: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
      destination: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
      via: { zh: '东门、Normal Gap、叶角大学、中环', en: 'East Door, Normal Gap, Leafy University, Central' },
      interval: { zh: '节日繁忙时间 7 – 15 分钟', en: 'Festival peak 7 – 15 mins' },
      journeyTime: { zh: '约 30 分钟（环线）', en: 'approx. 30 mins (loop)' },
      fare: '$12.1',
      length: { zh: '约 15 km（环线）', en: 'approx. 15 km (loop)' },
      serviceTime: { zh: '节日及繁忙时间', en: 'Festival & peak hours' },
      stops: [
        {
          direction: {
            zh: '环线（彩虹中心 ↺ 东锦葵）',
            en: 'Loop (Rainbow Estate Complex ↺ Eastmallow)',
          },
          serviceTime: { zh: '节日及繁忙时间', en: 'Festival & peak hours' },
          list: loopList.length ? [...loopList, loopList[0]!] : [],
        },
      ],
      notes: {
        zh: '476 节日特快环线（FT）。',
        en: 'Route 476 festival peak loop (FT).',
      },
      wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_476SA',
    }
  })(),
  cloneFromSibs('U47', 'U47*', 'U47*', {
    origin: { zh: '旭涛荟', en: 'Hotel Symbol' },
    destination: { zh: '阳光大学北', en: 'North Sunshine University' },
    via: { zh: '阳光大学南环校园、阳光大学', en: 'Sunshine University Southern Campus, Sunshine University' },
    interval: { zh: '繁忙时间 5 – 10 分钟', en: 'Peak 5 – 10 mins' },
    serviceTime: { zh: '周一至五 07:30 – 09:00 / 17:00 – 19:00', en: 'Mon–Fri 07:30 – 09:00 / 17:00 – 19:00' },
    stops: [
      {
        directionKey: 'N',
        direction: { zh: '北行（旭涛荟 → 阳光大学北）', en: 'Northbound (Hotel Symbol → North Sunshine University)' },
        serviceTime: { zh: '周一至五 07:30 – 09:00', en: 'Mon–Fri 07:30 – 09:00' },
        list: [
          { name: { zh: '旭涛荟', en: 'Hotel Symbol' }, zone: 4 },
          { name: { zh: '阳光大学中', en: 'Central Sunshine University' }, zone: 4 },
          { name: { zh: '阳光大学北', en: 'North Sunshine University' }, zone: 4 },
        ],
      },
      {
        directionKey: 'S',
        direction: { zh: '南行（阳光大学北 → 旭涛荟）', en: 'Southbound (North Sunshine University → Hotel Symbol)' },
        serviceTime: { zh: '周一至五 17:00 – 19:00', en: 'Mon–Fri 17:00 – 19:00' },
        list: [
          { name: { zh: '阳光大学北', en: 'North Sunshine University' }, zone: 4 },
          { name: { zh: '阳光大学南环校园', en: 'Sunshine University Southern Campus' }, zone: 4 },
          { name: { zh: '旭涛荟', en: 'Hotel Symbol' }, zone: 4 },
        ],
      },
    ],
    notes: { zh: 'U47 繁忙时间特快（大学线）。', en: 'U47 peak-hour express (university).' },
  }),
  {
    id: 'N76A',
    number: 'N76A',
    operators: ['FT'],
    category: 'special',
    pattern: 'circular',
    zones: [7],
    origin: { zh: '仙贝广场', en: 'Senpai Shopping Center' },
    destination: { zh: '仙贝广场', en: 'Senpai Shopping Center' },
    via: { zh: '北叶角、安灵台、叶角湾', en: 'North Leafy, Ambling Peak, Leafy Bay' },
    interval: { zh: '节日 15 – 30 分钟', en: 'Festival 15 – 30 mins' },
    journeyTime: { zh: '约 20 分钟（环线）', en: 'approx. 20 mins (loop)' },
    fare: '$6.3',
    length: { zh: '约 9 km（环线）', en: 'approx. 9 km (loop)' },
    serviceTime: { zh: '08:00 – 19:30（节日）', en: '08:00 – 19:30 (festival)' },
    stops: [
      {
        direction: {
          zh: '环线（仙贝广场 ↺ 安灵台）',
          en: 'Loop (Senpai Shopping Center ↺ Ambling Peak)',
        },
        serviceTime: { zh: '08:00 – 19:30（节日）', en: '08:00 – 19:30 (festival)' },
        list: [
          { name: { zh: '仙贝广场', en: 'Senpai Shopping Center' }, zone: 7 },
          { name: { zh: '仙贝图书馆', en: 'Senpai Library' }, zone: 7 },
          { name: { zh: '北叶花园', en: 'North Leafy Garden' }, zone: 7 },
          { name: { zh: '安灵台', en: 'Ambling Peak' }, zone: 7 },
          { name: { zh: '叶角湾邨', en: 'Leafy Bay Estate' }, zone: 7 },
          { name: { zh: '叶欣海旁道', en: 'Praya YiYan Road' }, zone: 7 },
          { name: { zh: '仙贝广场', en: 'Senpai Shopping Center' }, zone: 7 },
        ],
      },
    ],
    notes: { zh: '76 节日环线（FT）。', en: 'Route 76 festival loop (FT).' },
    wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_N76A',
  },
  {
    id: 'F469A',
    number: 'F469A',
    operators: ['FT'],
    category: 'special',
    pattern: 'circular',
    zones: [1, 4],
    origin: { zh: '浅水湾车厂', en: 'FT Shallow Valley Depot' },
    destination: { zh: '浅水湾车厂', en: 'FT Shallow Valley Depot' },
    via: { zh: '雀鸟桥、中环、北顿', en: 'Bird Bridge, Central, Norton' },
    interval: { zh: '开放日视班次', en: 'Open day as scheduled' },
    journeyTime: { zh: '约 40 分钟（环线）', en: 'approx. 40 mins (loop)' },
    fare: '$12.1',
    length: { zh: '约 18 km（环线）', en: 'approx. 18 km (loop)' },
    serviceTime: { zh: '永巴开放日', en: 'FT open day' },
    stops: [
      {
        direction: {
          zh: '环线（浅水湾车厂 ↺ 北顿）',
          en: 'Loop (Shallow Valley Depot ↺ Norton)',
        },
        serviceTime: { zh: '永巴开放日', en: 'FT open day' },
        list: [
          { name: { zh: '浅水湾车厂', en: 'FT Shallow Valley Depot' }, zone: 1 },
          { name: { zh: '雀鸟桥', en: 'Bird Bridge' }, zone: 4 },
          { name: { zh: '北顿市中心', en: 'Norton Town Center' }, zone: 4 },
          { name: { zh: '浅水湾车厂', en: 'FT Shallow Valley Depot' }, zone: 1 },
        ],
      },
    ],
    notes: { zh: 'F469 节日观光环线。', en: 'F469 festival sightseeing loop.' },
    wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_F469A',
  },
  {
    id: 'S1A',
    number: 'S1A',
    operators: ['FT', 'FTCC'],
    category: 'special',
    pattern: 'circular',
    zones: [1],
    origin: { zh: '白鸽公园', en: 'Dove Park' },
    destination: { zh: '白鸽公园', en: 'Dove Park' },
    via: { zh: '白鸽邨、医院岛、购物廊', en: 'Dove Estate, Hospital Island, Shopping Corridor' },
    interval: { zh: '观光班次 20 – 30 分钟', en: 'Sightseeing 20 – 30 mins' },
    journeyTime: { zh: '约 25 分钟（环线）', en: 'approx. 25 mins (loop)' },
    fare: '$8.1',
    length: { zh: '约 8 km（环线）', en: 'approx. 8 km (loop)' },
    serviceTime: { zh: '09:00 – 18:00', en: '09:00 – 18:00' },
    stops: [
      {
        direction: {
          zh: '环线（白鸽公园 ↺ 白鸽邨）',
          en: 'Loop (Dove Park ↺ Dove Estate)',
        },
        serviceTime: { zh: '09:00 – 18:00', en: '09:00 – 18:00' },
        list: [
          { name: { zh: '白鸽公园', en: 'Dove Park' }, zone: 1 },
          { name: { zh: '白鸽邨', en: 'Dove Estate' }, zone: 1 },
          { name: { zh: '西区医院', en: 'Western Hospital' }, zone: 1 },
          { name: { zh: '购物廊', en: 'Shopping Corridor' }, zone: 1 },
          { name: { zh: '白鸽公园', en: 'Dove Park' }, zone: 1 },
        ],
      },
    ],
    notes: { zh: '观光半直通环线 S1。', en: 'Sightseeing semi-direct loop S1.' },
    wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_S1A',
  },
  {
    id: 'S2A',
    number: 'S2A',
    operators: ['FT', 'FTCC'],
    category: 'special',
    pattern: 'circular',
    zones: [1],
    origin: { zh: '时间廊', en: 'Timelapse Mall' },
    destination: { zh: '时间廊', en: 'Timelapse Mall' },
    via: { zh: '白鸽山、艾迪城、货柜码头', en: 'Dove Hill, Addi City, Containers Terminal' },
    interval: { zh: '观光班次 20 – 30 分钟', en: 'Sightseeing 20 – 30 mins' },
    journeyTime: { zh: '约 22 分钟（环线）', en: 'approx. 22 mins (loop)' },
    fare: '$8.1',
    length: { zh: '约 7 km（环线）', en: 'approx. 7 km (loop)' },
    serviceTime: { zh: '09:00 – 18:00', en: '09:00 – 18:00' },
    stops: [
      {
        direction: {
          zh: '环线（时间廊 ↺ 货柜码头）',
          en: 'Loop (Timelapse Mall ↺ Containers Terminal)',
        },
        serviceTime: { zh: '09:00 – 18:00', en: '09:00 – 18:00' },
        list: [
          { name: { zh: '时间廊', en: 'Timelapse Mall' }, zone: 1 },
          { name: { zh: '白鸽山', en: 'Dove Hill' }, zone: 1 },
          { name: { zh: '艾迪城', en: 'Addi City' }, zone: 1 },
          { name: { zh: '货柜码头', en: 'Containers Terminal' }, zone: 1 },
          { name: { zh: '时间廊', en: 'Timelapse Mall' }, zone: 1 },
        ],
      },
    ],
    notes: { zh: '观光半直通环线 S2。', en: 'Sightseeing semi-direct loop S2.' },
    wikiUrl: 'https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_S2A',
  },
]
