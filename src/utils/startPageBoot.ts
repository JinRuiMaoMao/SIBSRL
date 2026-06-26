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

  set(Math.max(28, 32), labels.script)
  await waitMs(options?.reduceMotion ? 0 : 80)

  set(48, labels.interface)
  await waitMs(options?.reduceMotion ? 0 : 60)

  try {
    set(62, labels.logo)
    await preloadImage('./sibs-logo.png')
  } catch {
    // Logo missing should not block the start page.
  }
  set(78, labels.logo)

  set(88, labels.fonts)
  await waitForFonts()

  set(100, labels.ready)
  await waitMs(options?.reduceMotion ? 120 : 320)

  if (bridge) {
    bridge.finish()
    return
  }

  document.documentElement.classList.remove('start-boot-active')
  document.getElementById('start-boot-splash')?.remove()
}
