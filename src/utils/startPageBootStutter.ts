export type BootProgressMode = 'surge' | 'retract' | 'hold'

export type BootProgressSetter = (
  percent: number,
  label: string,
  mode?: BootProgressMode,
) => void

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Game-style loading bar: surge forward, snap back (sometimes more than gained). */
export async function stutterProgressTo(
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
  set(current, label, 'hold')
  const floor = Math.max(0, start - 3)

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
