/** 数字线路升序；字母开头线路排在数字后，并按字母表 A→Z 排序 */
function getRouteSortKey(number: string): { group: number; num: number; suffix: string } {
  const letterLead = /^[A-Za-z]/.test(number)
  if (letterLead) {
    return { group: 1, num: 0, suffix: number }
  }
  const match = number.match(/^(\d+)(.*)$/)
  if (match) {
    return { group: 0, num: parseInt(match[1], 10), suffix: match[2] }
  }
  return { group: 1, num: 0, suffix: number }
}

export function compareRouteNumber(a: string, b: string): number {
  const ka = getRouteSortKey(a)
  const kb = getRouteSortKey(b)
  if (ka.group !== kb.group) return ka.group - kb.group
  if (ka.group === 1) {
    return ka.suffix.localeCompare(kb.suffix, undefined, { sensitivity: 'base' })
  }
  if (ka.num !== kb.num) return ka.num - kb.num
  return ka.suffix.localeCompare(kb.suffix, undefined, { sensitivity: 'base' })
}
