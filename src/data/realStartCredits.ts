import type { BilingualText } from '../types/route'

export type RealStartCreditLayout = 'featured' | 'compact' | 'tag'

export interface RealStartCreditMember {
  userId: number
  displayName: string
  role?: BilingualText
}

export interface RealStartCreditSection {
  title: BilingualText
  layout: RealStartCreditLayout
  members: RealStartCreditMember[]
}

/** From StartScreen.Credit / CreditList in the rbxlx place file. */
export const REAL_START_CREDIT_SECTIONS: RealStartCreditSection[] = [
  {
    title: { zh: '游戏开发', en: 'Game Developers' },
    layout: 'featured',
    members: [
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: '项目负责人', en: 'Project Lead' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: '游戏设计', en: 'Game Designer' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: '游戏程序', en: 'Game Programmer' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: '巴士程序', en: 'Bus Programmer' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: 'UI 设计', en: 'UI Designer' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: 'UI 开发', en: 'UI Developer' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: '地图设计', en: 'Map Designer' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: '地图搭建', en: 'Map Builder' } },
      { userId: 23651717, displayName: 'addisonshiu', role: { zh: '路线设计', en: 'Route Designer' } },
    ],
  },
  {
    title: { zh: '巴士建模', en: 'Bus Modelers' },
    layout: 'compact',
    members: [
      { userId: 75537160, displayName: 'NLB11A' },
      { userId: 228401896, displayName: 'Awesome90752903' },
      { userId: 66366295, displayName: 'GYVolvo' },
      { userId: 469478817, displayName: 'EdgarChun73' },
      { userId: 49963087, displayName: 'Kanna898' },
      { userId: 22827563, displayName: 'likehkbusman' },
      { userId: 45031838, displayName: 'BusDriverKLN' },
      { userId: 62628442, displayName: 'kmb5' },
      { userId: 64664624, displayName: 'GS9019' },
    ],
  },
  {
    title: { zh: '巴士运营商', en: 'Bus Operators' },
    layout: 'featured',
    members: [
      { userId: 62628442, displayName: 'kmb5', role: { zh: 'Horizon Bus', en: 'Horizon Bus' } },
      { userId: 64664624, displayName: 'GS9019', role: { zh: 'City Scape Bus', en: 'City Scape Bus' } },
      { userId: 45031838, displayName: 'BusDriverKLN', role: { zh: 'Forever Transit', en: 'Forever Transit' } },
      { userId: 22827563, displayName: 'likehkbusman', role: { zh: 'REBC', en: 'REBC' } },
      { userId: 45031838, displayName: 'BusDriverKLN', role: { zh: 'Sunshine Bus', en: 'Sunshine Bus' } },
    ],
  },
  {
    title: { zh: '翻译', en: 'Translator' },
    layout: 'tag',
    members: [
      { userId: 1964930886, displayName: 'Cute_Tom05', role: { zh: '越南语', en: 'Vietnamese' } },
      { userId: 907362880, displayName: 'TheRealKraka', role: { zh: '瑞典语', en: 'Swedish' } },
      { userId: 4044819590, displayName: 'Sugarqawsedrf', role: { zh: '德语', en: 'German' } },
      { userId: 2419957129, displayName: 'Stevencehak', role: { zh: '德语', en: 'German' } },
      { userId: 1467395817, displayName: 'bowieggg', role: { zh: '韩语', en: 'Korean' } },
      { userId: 1467395817, displayName: 'bowieggg', role: { zh: '日语', en: 'Japanese' } },
      { userId: 2024891839, displayName: 'trulyaidvn', role: { zh: '法语', en: 'French' } },
      { userId: 1407018660, displayName: 'emoke3000', role: { zh: '丹麦语', en: 'Danish' } },
      { userId: 3895858825, displayName: '1x_Almo', role: { zh: '波兰语', en: 'Polish' } },
      { userId: 198263866, displayName: 'feiliver', role: { zh: '葡萄牙语', en: 'Portuguese' } },
      { userId: 167309348, displayName: 'HealthyIamanoob', role: { zh: '葡萄牙语', en: 'Portuguese' } },
    ],
  },
  {
    title: { zh: '目的地牌（社区）', en: 'Destination Sign (Community)' },
    layout: 'tag',
    members: [
      { userId: 658480530, displayName: 'Carcar_Lok' },
      { userId: 1478213043, displayName: 'AviaCharlesss' },
      { userId: 1201592636, displayName: 'KF8311' },
    ],
  },
  {
    title: { zh: '车辆模型（社区）', en: 'Cars Model (Community)' },
    layout: 'tag',
    members: [{ userId: 2349382521, displayName: 'ATENU_VL7899' }],
  },
]
