import { getSiteLogoUrl } from '../data/siteBrand'
import { hasStartBootBeenSeen, markStartBootBeenSeen } from '../storage/startPageBootSeen'

export const START_PAGE_BOOT_DURATION_MS = 5000

export interface StartPageBootBridge {
  setProgress: (percent: number, label?: string) => void
  finish: () => void
}

declare global {
  interface Window {
    __SIBS_START_BOOT__?: StartPageBootBridge
  }
}

/** Remove splash + unblock #root (safe to call repeatedly). */
export function dismissStartBootSplash(): void {
  document.documentElement.classList.remove('start-boot-active')
  window.__SIBS_START_BOOT__?.finish()
  const splash = document.getElementById('start-boot-splash')
  if (!splash) return
  splash.classList.add('is-done')
  splash.setAttribute('aria-busy', 'false')
  window.setTimeout(() => {
    splash.remove()
  }, 420)
}

/** Recover from bfcache or stale splash after routes → index navigation. */
export function syncStartBootSplashState(): void {
  if (hasStartBootBeenSeen()) {
    dismissStartBootSplash()
    return
  }

  const splash = document.getElementById('start-boot-splash')
  if (splash && document.documentElement.classList.contains('start-boot-active')) {
    window.location.reload()
  }
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve()
    image.onerror = () => reject(new Error(`Failed to load ${src}`))
    image.src = src
  })
}

function waitForFonts(): Promise<void> {
  if (!document.fonts?.ready) return Promise.resolve()
  return document.fonts.ready.then(() => undefined)
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function waitUntilElapsed(startedAt: number, targetMs: number): Promise<void> {
  const remaining = targetMs - (Date.now() - startedAt)
  return remaining > 0 ? waitMs(remaining) : Promise.resolve()
}

export async function runStartPageBoot(
  labels: {
    site: string
    script: string
    interface: string
    logo: string
    fonts: string
    ready: string
  },
  options?: { reduceMotion?: boolean },
): Promise<void> {
  if (hasStartBootBeenSeen()) {
    dismissStartBootSplash()
    return
  }

  const bridge = window.__SIBS_START_BOOT__
  const set = (percent: number, label: string) => {
    bridge?.setProgress(percent, label)
  }

  void preloadImage(getSiteLogoUrl()).catch(() => undefined)
  void waitForFonts()

  const steps = options?.reduceMotion
    ? [{ at: START_PAGE_BOOT_DURATION_MS, percent: 100, label: labels.ready }]
    : [
        { at: 0, percent: 0, label: labels.site },
        { at: 1000, percent: 20, label: labels.script },
        { at: 2000, percent: 40, label: labels.interface },
        { at: 3000, percent: 60, label: labels.logo },
        { at: 4000, percent: 80, label: labels.fonts },
        { at: START_PAGE_BOOT_DURATION_MS, percent: 100, label: labels.ready },
      ]

  const startedAt = Date.now()
  for (const step of steps) {
    await waitUntilElapsed(startedAt, step.at)
    set(step.percent, step.label)
  }

  markStartBootBeenSeen()
  dismissStartBootSplash()
}

export function installStartBootSplashRecovery(): void {
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) syncStartBootSplashState()
  }
  window.addEventListener('pageshow', onPageShow)
}
