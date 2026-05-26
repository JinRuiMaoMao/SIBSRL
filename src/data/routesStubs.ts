import type { BusRoute } from '../types/route'

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
]
