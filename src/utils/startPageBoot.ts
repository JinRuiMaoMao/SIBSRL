export interface StartPageBootBridge {
  setProgress: (percent: number, label?: string) => void
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
  const set = (percent: number, label: string) => {
    bridge?.setProgress(percent, label)
  }
  const pause = (ms: number) => waitMs(options?.reduceMotion ? Math.min(ms, 80) : ms)

  set(Math.max(24, 28), labels.script)
  await pause(520)

  set(38, labels.script)
  await pause(480)

  set(52, labels.interface)
  await pause(560)

  try {
    set(66, labels.logo)
    await Promise.all([preloadImage('./sibs-logo.png'), pause(640)])
  } catch {
    await pause(640)
  }
  set(80, labels.logo)
  await pause(520)

  set(90, labels.fonts)
  await Promise.all([waitForFonts(), pause(560)])

  set(100, labels.ready)
  await pause(options?.reduceMotion ? 160 : 720)

  if (bridge) {
    bridge.finish()
    return
  }

  document.documentElement.classList.remove('start-boot-active')
  document.getElementById('start-boot-splash')?.remove()
}
