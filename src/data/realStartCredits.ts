import type { BilingualText } from '../types/route'

export type RealStartCreditLayout = 'featured' | 'compact' | 'tag'

export interface RealStartCreditMember {
  displayName: string
  role?: BilingualText
  profileUrl?: string
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
      { displayName: 'SFOMOD', role: { zh: '项目负责人', en: 'Project Lead' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: '游戏设计', en: 'Game Designer' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: '游戏程序', en: 'Game Programmer' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: '巴士程序', en: 'Bus Programmer' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: 'UI 设计', en: 'UI Designer' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: 'UI 开发', en: 'UI Developer' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: '地图设计', en: 'Map Designer' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: '地图搭建', en: 'Map Builder' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
      { displayName: 'SFOMOD', role: { zh: '路线设计', en: 'Route Designer' }, profileUrl: 'https://www.roblox.com/users/23651717/profile' },
    ],
  },
  {
    title: { zh: '巴士建模', en: 'Bus Modelers' },
    layout: 'compact',
    members: [
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/75537160/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/228401896/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/66366295/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/469478817/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/49963087/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/22827563/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/45031838/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/62628442/profile' },
      { displayName: 'Bus Modeler', profileUrl: 'https://www.roblox.com/users/64664624/profile' },
    ],
  },
  {
    title: { zh: '巴士运营商', en: 'Bus Operators' },
    layout: 'featured',
    members: [
      { displayName: 'Horizon Bus', role: { zh: 'Horizon Bus', en: 'Horizon Bus' }, profileUrl: 'https://www.roblox.com/users/62628442/profile' },
      { displayName: 'City Scape Bus', role: { zh: 'City Scape Bus', en: 'City Scape Bus' }, profileUrl: 'https://www.roblox.com/users/64664624/profile' },
      { displayName: 'Forever Transit', role: { zh: 'Forever Transit', en: 'Forever Transit' }, profileUrl: 'https://www.roblox.com/users/45031838/profile' },
      { displayName: 'REBC', role: { zh: 'REBC', en: 'REBC' }, profileUrl: 'https://www.roblox.com/users/22827563/profile' },
      { displayName: 'Sunshine Bus', role: { zh: 'Sunshine Bus', en: 'Sunshine Bus' }, profileUrl: 'https://www.roblox.com/users/45031838/profile' },
    ],
  },
  {
    title: { zh: '翻译', en: 'Translator' },
    layout: 'tag',
    members: [
      { displayName: 'Translator', role: { zh: '越南语', en: 'Vietnamese' }, profileUrl: 'https://www.roblox.com/users/1964930886/profile' },
      { displayName: 'Translator', role: { zh: '瑞典语', en: 'Swedish' }, profileUrl: 'https://www.roblox.com/users/907362880/profile' },
      { displayName: 'Translator', role: { zh: '德语', en: 'German' }, profileUrl: 'https://www.roblox.com/users/4044819590/profile' },
      { displayName: 'Translator', role: { zh: '德语', en: 'German' }, profileUrl: 'https://www.roblox.com/users/2419957129/profile' },
      { displayName: 'Translator', role: { zh: '韩语', en: 'Korean' }, profileUrl: 'https://www.roblox.com/users/1467395817/profile' },
      { displayName: 'Translator', role: { zh: '日语', en: 'Japanese' }, profileUrl: 'https://www.roblox.com/users/1467395817/profile' },
      { displayName: 'Translator', role: { zh: '法语', en: 'French' }, profileUrl: 'https://www.roblox.com/users/2024891839/profile' },
      { displayName: 'Translator', role: { zh: '丹麦语', en: 'Danish' }, profileUrl: 'https://www.roblox.com/users/1407018660/profile' },
      { displayName: 'Translator', role: { zh: '波兰语', en: 'Polish' }, profileUrl: 'https://www.roblox.com/users/3895858825/profile' },
      { displayName: 'Translator', role: { zh: '葡萄牙语', en: 'Portuguese' }, profileUrl: 'https://www.roblox.com/users/198263866/profile' },
      { displayName: 'Translator', role: { zh: '葡萄牙语', en: 'Portuguese' }, profileUrl: 'https://www.roblox.com/users/167309348/profile' },
    ],
  },
  {
    title: { zh: '目的地牌（社区）', en: 'Destination Sign (Community)' },
    layout: 'tag',
    members: [
      { displayName: 'Contributor', profileUrl: 'https://www.roblox.com/users/658480530/profile' },
      { displayName: 'Contributor', profileUrl: 'https://www.roblox.com/users/1478213043/profile' },
      { displayName: 'Contributor', profileUrl: 'https://www.roblox.com/users/1201592636/profile' },
    ],
  },
  {
    title: { zh: '车辆模型（社区）', en: 'Cars Model (Community)' },
    layout: 'tag',
    members: [{ displayName: 'Contributor', profileUrl: 'https://www.roblox.com/users/2349382521/profile' }],
  },
]
