import { bootProgressTo } from './startPageBootStutter'

export interface StartPageBootBridge {
  setProgress: (percent: number, label?: string, mode?: 'smooth' | 'surge' | 'retract' | 'hold') => void
  finish: () => void
}

declare global {
  interface Window {
    __SIBS_START_BOOT__?: StartPageBootBridge
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

export async function runStartPageBoot(
  labels: {
    script: string
    interface: string
    logo: string
    fonts: string
    ready: string
  },
  options?: { reduceMotion?: boolean },
): Promise<void> {
  const bridge = window.__SIBS_START_BOOT__
  const set = (percent: number, label: string, mode?: 'smooth' | 'surge' | 'retract' | 'hold') => {
    bridge?.setProgress(percent, label, mode)
  }

  let current = 18

  current = await bootProgressTo(set, current, 36, labels.script, options)
  current = await bootProgressTo(set, current, 52, labels.interface, options)

  const logoPromise = preloadImage('./sibs-logo.png').catch(() => undefined)
  current = await bootProgressTo(set, current, 72, labels.logo, options)
  await logoPromise
  current = await bootProgressTo(set, current, 88, labels.logo, options)

  const fontsPromise = waitForFonts()
  current = await bootProgressTo(set, current, 96, labels.fonts, options)
  await fontsPromise

  current = await bootProgressTo(set, current, 100, labels.ready, options)
  await waitMs(options?.reduceMotion ? 160 : 520)

  if (bridge) {
    bridge.finish()
    return
  }

  document.documentElement.classList.remove('start-boot-active')
  document.getElementById('start-boot-splash')?.remove()
}
