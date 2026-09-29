import type { BilingualText } from '../types/route'

export interface RealStartFaqItem {
  question: BilingualText
  answer: BilingualText
}

export interface RealStartFaqSection {
  title: BilingualText
  items: RealStartFaqItem[]
}

/** Subset of FaqList / Questions from the rbxlx place file. */
export const REAL_START_FAQ_SECTIONS: RealStartFaqSection[] = [
  {
    title: { zh: '路线选择', en: 'Route Selection' },
    items: [
      {
        question: { zh: '如何选择巴士路线的发车时间？', en: 'How do I select the start time for the bus route?' },
        answer: {
          zh: '乘客数量会随时间变化。高峰时段取决于站点类型与路线目的地。可在路线详情查看服务时间。',
          en: 'Passenger numbers vary depending on the time. Peak hours depend on the type of stop and the bus route\'s destination.',
        },
      },
      {
        question: { zh: '什么是 Pro 模式？如何进入？', en: 'What is Pro Mode? How to enter Pro Mode?' },
        answer: {
          zh: 'Pro 模式下需自行启动引擎并用真实仪表设置目的地，路上没有辅助箭头，需记路或看 GPS。要求：驾驶等级至少 10 级，且曾在普通模式完成同一条路线至少一次。',
          en: 'In Pro mode, you take full control of the bus, including starting the engine and setting the destination using the actual bus controls. Help arrows will not be available. You must be at least Level 10 and have completed the same route at least once in Normal mode.',
        },
      },
      {
        question: { zh: '阳光碎片有什么用？', en: 'What are Sunshards used for?' },
        answer: {
          zh: '阳光碎片主要用于解锁新巴士路线。部分解锁等级设有上限，需要消耗阳光碎片继续升级。',
          en: 'Sunshards are primarily used to unlock new bus routes. For certain levels that unlock new routes, there is a level cap, and you must use sunshards to level up.',
        },
      },
      {
        question: {
          zh: '什么是巴士运营商？为什么选车时有公司限制？',
          en: 'What are bus operators, and why is there a bus company restriction when I choose a bus?',
        },
        answer: {
          zh: '巴士运营商是经营路线的公司，不同公司通常负责不同区域。部分路线由特定公司独家经营，因此选车时会有限制。可在路线列表查看各路线运营商。',
          en: 'Bus operators are the companies that run bus routes. Different companies operate different routes, often grouped by district. Certain routes are exclusively operated by specific companies. You can find which operator runs a route from the route list.',
        },
      },
    ],
  },
  {
    title: { zh: '乘客抱怨', en: 'Passengers Complaint' },
    items: [
      {
        question: {
          zh: '为什么轮椅乘客抱怨巴士没有降低？',
          en: 'Why do wheelchair passengers complain that buses are not lowered?',
        },
        answer: {
          zh: '坡道过陡会导致轮椅乘客无法上车。请使用仪表板上的 kneel（降低）功能。移动端会自动降低；降低后需等待数秒再开门。',
          en: 'The ramp is too steep for wheelchair passengers to board. You should always lower the bus using the kneel function on the dashboard. Kneeling is automatic on mobile. Wait a few seconds after lowering before opening the door.',
        },
      },
      {
        question: {
          zh: '乘客为什么在下车？是因为撞车了吗？',
          en: 'Why are the passengers getting off the bus? Is it because I crashed the bus?',
        },
        answer: {
          zh: '不是。他们只是因为到达目的地而下车。乘客不会因为撞车而离开巴士。',
          en: 'No — they\'ve reached their destination. Passengers never leave the bus just because you crashed it.',
        },
      },
    ],
  },
  {
    title: { zh: '镜头控制', en: 'Camera Controls' },
    items: [
      {
        question: {
          zh: '如何从第一人称 zoom  out 到第三人称？',
          en: 'How do I zoom out from the first-person viewpoint to a third-person camera view?',
        },
        answer: {
          zh: '与其他游戏相同：鼠标滚轮向下，或触摸屏双指 pinch 放大视角。',
          en: 'Scroll the mouse wheel down, or pinch out on a touchscreen to zoom out.',
        },
      },
    ],
  },
  {
    title: { zh: '其他', en: 'Misc' },
    items: [
      {
        question: { zh: '本游戏以哪里为原型？', en: 'Where is this game based on?' },
        answer: {
          zh: '阳光群岛巴士模拟器以香港巴士文化为灵感，地图与路线为虚构的阳光群岛。',
          en: 'Sunshine Islands Bus Simulator is inspired by Hong Kong bus culture; the map and routes are set on the fictional Sunshine Islands.',
        },
      },
    ],
  },
]
