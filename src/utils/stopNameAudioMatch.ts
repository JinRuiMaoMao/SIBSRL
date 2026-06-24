/** Shared with scripts/lib/stop-name-audio-match.mjs — keep aliases in sync. */

import type { BilingualText } from '../types/route'

export const STOP_NAME_ALIASES: Record<string, string[]> = {
  'Dove Estate': ['白鸽邨'],
  'Dove Hill': ['白鸽山'],
  'Third Technology Building': ['三哥大厦'],
  'Wright Shopping Center': ['赖德商场', '赖得商场'],
  'Timelapse Mall': ['时间廊'],
  'Wright Lane': ['赖德里', '赖得里'],
  'Addi Road': ['艾迪路'],
  'Roblox HQ': ['RBXHQ', '总部大楼', '路博斯总部大楼'],
  'Dove Fire Station': ['白鸽消防局', '消防局'],
  'Eddie City': ['伊迪城'],
  'Addi City': ['艾迪城'],
  'Basketball Court': ['篮球场'],
  'Roblox TV': ['RBX TV', '阿周电视'],
  'Western Hospital': ['西区医院'],
  'Bank Tower': ['银行大厦'],
}

/** 21/21A 以外：下一站为白鸽山时默认用白鸽山2；若白鸽山为第 2 站（index 1）则用白鸽山1 */
export function passIndexForStopNamePool(
  routeId: string,
  nextStop: BilingualText,
  passIndex: number,
  nextStopIndex?: number,
): number {
  if (routeId === '21A' || routeId === '21') return passIndex

  const zh = nextStop.zh?.trim() ?? ''
  const en = nextStop.en?.trim() ?? ''
  if (zh === '白鸽山' || en === 'Dove Hill') {
    if (nextStopIndex === 1) return 0
    return 1
  }

  return passIndex
}
