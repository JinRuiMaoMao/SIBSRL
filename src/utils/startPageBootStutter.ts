export type BootProgressMode = 'smooth' | 'surge' | 'retract' | 'hold'

export type BootProgressSetter = (
  percent: number,
  label: string,
  mode?: BootProgressMode,
) => void

/** Stutter only while bar position is in [50, 95). */
export const BOOT_STUTTER_MIN = 50
export const BOOT_STUTTER_TAIL = 95

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function buildBootSegments(
  start: number,
  target: number,
): Array<{ from: number; to: number; stutter: boolean }> {
  if (start >= target) return []

  const segments: Array<{ from: number; to: number; stutter: boolean }> = []

  if (start < BOOT_STUTTER_MIN) {
    const end = Math.min(target, BOOT_STUTTER_MIN)
    if (end > start) segments.push({ from: start, to: end, stutter: false })
  }

  const stutterStart = Math.max(start, BOOT_STUTTER_MIN)
  const stutterEnd = Math.min(target, BOOT_STUTTER_TAIL - 1)
  if (stutterEnd >= BOOT_STUTTER_MIN && stutterEnd > stutterStart) {
    segments.push({ from: stutterStart, to: stutterEnd, stutter: true })
  }

  const tailStart = Math.max(start, BOOT_STUTTER_TAIL)
  if (target > tailStart) {
    segments.push({ from: tailStart, to: target, stutter: false })
  }

  return segments
}

async function smoothProgressTo(
  set: BootProgressSetter,
  start: number,
  target: number,
  label: string,
): Promise<number> {
  let current = start
  set(current, label, 'hold')

  while (current < target - 0.5) {
    const remaining = target - current
    const step = Math.max(0.8, Math.min(remaining, remaining * (0.12 + Math.random() * 0.14)))
    current = clamp(current + step, 0, target)
    set(current, label, 'smooth')
    await waitMs(240 + Math.random() * 180)
  }

  set(target, label, 'hold')
  await waitMs(160 + Math.random() * 120)
  return target
}

async function stutterSegmentTo(
  set: BootProgressSetter,
  start: number,
  target: number,
  label: string,
): Promise<number> {
  let bar = start
  let locked = start
  set(locked, label, 'hold')
  const barFloor = Math.max(BOOT_STUTTER_MIN - 2, start - 1)

  while (locked < target - 1) {
    const remaining = target - locked
    const roll = Math.random()

    if (roll < 0.34 && remaining > 7) {
      const forward = clamp(remaining * (0.42 + Math.random() * 0.38), 10, 30)
      const peak = clamp(bar + forward, 0, 100)
      set(peak, label, 'surge')
      await waitMs(260 + Math.random() * 240)

      bar = Math.max(barFloor, peak - forward * (0.8 + Math.random() * 0.32))
      set(bar, label, 'retract')
      await waitMs(170 + Math.random() * 190)

      if (Math.random() < 0.48) {
        locked = clamp(locked + forward * 0.2, 0, target)
        bar = Math.max(bar, locked)
        set(locked, label, 'surge')
        await waitMs(110 + Math.random() * 100)
      }
      continue
    }

    if (roll < 0.74) {
      const forward = clamp(remaining * (0.05 + Math.random() * 0.13), 2, 8)
      const peak = clamp(bar + forward, 0, 100)
      set(peak, label, 'surge')
      await waitMs(100 + Math.random() * 130)

      bar = Math.max(barFloor, peak - forward * (0.45 + Math.random() * 0.5))
      set(bar, label, 'retract')
      await waitMs(70 + Math.random() * 110)

      if (Math.random() < 0.64) {
        locked = clamp(locked + forward * 0.4, 0, target)
        bar = Math.max(bar, locked)
        set(locked, label, 'surge')
        await waitMs(85 + Math.random() * 90)
      }
      continue
    }

    const forward = clamp(remaining * (0.18 + Math.random() * 0.28), 5, 20)
    const peak = clamp(bar + forward, 0, 100)
    set(peak, label, 'surge')
    await waitMs(190 + Math.random() * 170)

    bar = Math.max(barFloor, peak - forward * (0.55 + Math.random() * 0.38))
    set(bar, label, 'retract')
    await waitMs(120 + Math.random() * 140)

    locked = clamp(locked + forward * 0.32, 0, target)
    bar = Math.max(bar, locked)
    set(locked, label, 'surge')
    await waitMs(100 + Math.random() * 100)
  }

  set(target, label, 'hold')
  await waitMs(160 + Math.random() * 120)
  return target
}

/** Smooth below 50% and from 95%; stutter only in [50, 95). */
export async function bootProgressTo(
  set: BootProgressSetter,
  start: number,
  target: number,
  label: string,
  options?: { reduceMotion?: boolean },
): Promise<number> {
  if (options?.reduceMotion) {
    set(target, label, 'hold')
    return target
  }

  let current = start
  for (const segment of buildBootSegments(start, target)) {
    current = segment.stutter
      ? await stutterSegmentTo(set, segment.from, segment.to, label)
      : await smoothProgressTo(set, segment.from, segment.to, label)
  }

  return current
}

/** @deprecated use bootProgressTo */
export const stutterProgressTo = bootProgressTo
