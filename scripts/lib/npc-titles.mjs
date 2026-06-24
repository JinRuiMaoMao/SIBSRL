/** @param {string} stem */
export function cleanNpcRawTitle(stem) {
  return stem
    .replace(/^抱怨\d+/i, '')
    .replace(/^感谢[：:]/, '')
    .replace(/抱怨/g, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}

/** @type {Record<string, { zh: string, en: string }>} */
export const NPC_CATEGORY_TEXTS = {
  行车抱怨: { zh: '行车', en: 'Driving' },
  下车抱怨: { zh: '下车', en: 'Alighting' },
  服务抱怨: { zh: '服务', en: 'Service' },
  '打招呼，感谢': { zh: '感谢', en: 'Thanks' },
}

/** @param {string} category */
export function npcCategoryText(category) {
  return NPC_CATEGORY_TEXTS[category] ?? { zh: cleanNpcRawTitle(category) || category, en: category }
}

/** @type {Record<string, { zh: string, en: string }>} */
const NPC_TITLE_OVERRIDES = {
  '行车抱怨/啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊.ogg': { zh: '啊啊啊……', en: 'Screaming' },
  '行车抱怨/抱怨1OMG.ogg': { zh: '我的天', en: 'OMG' },
  '行车抱怨/抱怨3IsThisBus.mp3': {
    zh: '这巴士是在试镜好莱坞动作片吗？',
    en: 'Is this bus auditioning for a Hollywood action movie?',
  },
  '行车抱怨/抱怨4SpendMoreTime.mp3': {
    zh: '我的天，我觉得你应该多上点驾驶课',
    en: 'OMG, I think u should spend more time in driving lessons',
  },
  '行车抱怨/抱怨5Stop right there.ogg': { zh: '站住', en: 'Stop right there' },
  '行车抱怨/抱怨6i am reporting u right now.ogg': { zh: '我要举报你', en: "I'm reporting you right now" },
  '行车抱怨/抱怨8.mp3': { zh: '不满', en: 'Dissatisfied' },
  '行车抱怨/超级大声叫.ogg': { zh: '超级大声叫', en: 'Super loud shout' },
  '行车抱怨/来人啊来人啊.ogg': { zh: '来人啊', en: 'Help! Help!' },
  '行车抱怨/AHHHHHHHHHHHH.ogg': { zh: '啊——', en: 'AHHHHHHHHHHHH' },
  '行车抱怨/what r u doing.ogg': { zh: '你在干什么', en: 'What are you doing?' },
  '行车抱怨/why did u do this to me.ogg': { zh: '你为什么要这样对我', en: 'Why did you do this to me?' },
  '下车抱怨/WhatsWrong.mp3': { zh: '怎么回事', en: "What's wrong?" },
  '打招呼，感谢/感谢：ThankYou.ogg': { zh: '谢谢', en: 'Thank you' },
  '打招呼，感谢/男hello.ogg': { zh: '男声 Hello', en: 'Male hello' },
  '打招呼，感谢/男hi.ogg': { zh: '男声 Hi', en: 'Male hi' },
  '打招呼，感谢/女hello.ogg': { zh: '女声 Hello', en: 'Female hello' },
  '打招呼，感谢/女hi.ogg': { zh: '女声 Hi', en: 'Female hi' },
  '打招呼，感谢/谢谢你.ogg': { zh: '谢谢你', en: 'Thank you' },
  '打招呼，感谢/byebye.ogg': { zh: '再见', en: 'Bye bye' },
}

/** @param {string} category @param {string} filename */
export function npcItemTitle(category, filename) {
  const key = `${category}/${filename}`
  const override = NPC_TITLE_OVERRIDES[key]
  if (override) return override

  const stem = filename.replace(/\.(mp3|ogg)$/i, '')
  const cleaned = cleanNpcRawTitle(stem)
  const fallback = cleaned || stem

  if (/^[\x00-\x7F]+$/.test(fallback)) {
    return { zh: fallback, en: fallback }
  }

  return { zh: fallback, en: fallback }
}
