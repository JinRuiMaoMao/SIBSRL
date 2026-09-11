/** 演示占位；游戏数据接入后从此处读取驾驶等级与经验。 */
export function useRealDriverProgress(): {
  level: number
  xpCurrent: number
  xpMax: number
} {
  return {
    level: 0,
    xpCurrent: 0,
    xpMax: 0,
  }
}
