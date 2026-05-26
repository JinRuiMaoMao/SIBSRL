/** Sort key: numeric routes first (by number, then suffix), letter-prefixed routes last. */
function getRouteSortKey(number: string): { group: number; num: number; suffix: string } {
  const letterLead = /^[A-Za-z]/.test(number)
  if (letterLead) {
    const digits = number.match(/\d+/)
    return { group: 1, num: digits ? parseInt(digits[0], 10) : 0, suffix: number }
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
  if (ka.num !== kb.num) return ka.num - kb.num
  return ka.suffix.localeCompare(kb.suffix, undefined, { sensitivity: 'base' })
}
