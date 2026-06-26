export type BootProgressMode = 'surge' | 'retract' | 'hold'

export type BootProgressSetter = (
  percent: number,
  label: string,
  mode?: BootProgressMode,
) => void

/** Stutter only between 50% and 95%. */
export const BOOT_STUTTER_MIN = 50
export const BOOT_STUTTER_MAX = 95

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
  const stutterEnd = Math.min(target, BOOT_STUTTER_MAX)
  if (stutterEnd > stutterStart) {
    segments.push({ from: stutterStart, to: stutterEnd, stutter: true })
  }

  if (target > BOOT_STUTTER_MAX) {
    const tailStart = Math.max(start, BOOT_STUTTER_MAX)
    if (target > tailStart) segments.push({ from: tailStart, to: target, stutter: false })
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
    const step = Math.max(1.2, Math.min(remaining, remaining * (0.14 + Math.random() * 0.18)))
    current = clamp(current + step, 0, target)
    set(current, label, 'surge')
    await waitMs(200 + Math.random() * 160)
  }

  set(target, label, 'hold')
  await waitMs(140 + Math.random() * 100)
  return target
}

async function stutterSegmentTo(
  set: BootProgressSetter,
  start: number,
  target: number,
  label: string,
): Promise<number> {
  let current = start
  set(current, label, 'hold')
  const floor = Math.max(BOOT_STUTTER_MIN - 4, start - 3)

  while (current < target - 1) {
    const remaining = target - current
    const roll = Math.random()

    if (roll < 0.34 && remaining > 7) {
      const forward = clamp(remaining * (0.42 + Math.random() * 0.38), 10, 30)
      const peak = clamp(current + forward, 0, 100)
      set(peak, label, 'surge')
      await waitMs(260 + Math.random() * 240)

      const back = forward * (0.8 + Math.random() * 0.32)
      current = Math.max(floor, peak - back)
      set(current, label, 'retract')
      await waitMs(170 + Math.random() * 190)

      if (Math.random() < 0.48) {
        current = clamp(current + forward * 0.2, 0, target)
        set(current, label, 'surge')
        await waitMs(110 + Math.random() * 100)
      }
      continue
    }

    if (roll < 0.74) {
      const forward = clamp(remaining * (0.05 + Math.random() * 0.13), 2, 8)
      const peak = clamp(current + forward, 0, 100)
      set(peak, label, 'surge')
      await waitMs(100 + Math.random() * 130)

      const back = forward * (0.45 + Math.random() * 0.5)
      current = Math.max(floor, peak - back)
      set(current, label, 'retract')
      await waitMs(70 + Math.random() * 110)

      if (Math.random() < 0.64) {
        current = clamp(current + forward * 0.4, 0, target)
        set(current, label, 'hold')
        await waitMs(85 + Math.random() * 90)
      }
      continue
    }

    const forward = clamp(remaining * (0.18 + Math.random() * 0.28), 5, 20)
    const peak = clamp(current + forward, 0, 100)
    set(peak, label, 'surge')
    await waitMs(190 + Math.random() * 170)

    const back = forward * (0.55 + Math.random() * 0.38)
    current = clamp(Math.max(floor, peak - back) + forward * 0.32, 0, target)
    set(current, label, 'retract')
    await waitMs(120 + Math.random() * 140)
  }

  set(target, label, 'surge')
  await waitMs(160 + Math.random() * 120)
  return target
}

/** Smooth below 50% and above 95%; stutter only in the middle band. */
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
