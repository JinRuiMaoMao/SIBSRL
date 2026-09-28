import {
  getGameFestival,
  getGameEventStatus,
  getGameEventStartEndUnix,
  unixToHktDateString,
} from '../src/utils/gameFestivalCalendar.ts'

function check(id, days) {
  const f = getGameFestival(id)
  console.log(`\n${id}:`)
  for (const day of days) {
    const at = Date.parse(`${day}T12:00:00+08:00`) / 1000
    const status = getGameEventStatus(f, at)
    const { startUnix, endUnix, active } = getGameEventStartEndUnix(f, at)
    console.log(
      day,
      status.status,
      active,
      unixToHktDateString(startUnix),
      '-',
      unixToHktDateString(endUnix),
    )
  }
}

check('ChineseNewYear', ['2026-01-15', '2026-02-10', '2026-02-17', '2026-02-20'])
check('MidAutumn', ['2026-09-20', '2026-09-25', '2026-09-26', '2026-09-28', '2026-10-01'])
check('ChongYang', ['2026-10-01', '2026-10-20', '2026-10-29'])
check('ChingMing', ['2026-03-27', '2026-04-01', '2026-04-17'])
check('ChristmasEve', ['2026-12-23', '2026-12-25', '2026-12-27'])
check('NewYear', ['2026-01-01', '2026-01-02', '2026-01-03'])
check('FTAnniversary', ['2026-06-21', '2026-06-27', '2026-06-28'])
