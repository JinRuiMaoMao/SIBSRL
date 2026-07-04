import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'

const BOOT_DURATION_MS = 5000

interface BootStep {
  at: number
  percent: number
  labelKey:
    | 'mapDrawBootStepInit'
    | 'mapDrawBootStepMap'
    | 'mapDrawBootStepRoad'
    | 'mapDrawBootStepTools'
    | 'mapDrawBootStepUi'
    | 'mapDrawBootStepReady'
}

const BOOT_STEPS: BootStep[] = [
  { at: 0, percent: 0, labelKey: 'mapDrawBootStepInit' },
  { at: 0.12, percent: 18, labelKey: 'mapDrawBootStepMap' },
  { at: 0.32, percent: 42, labelKey: 'mapDrawBootStepRoad' },
  { at: 0.52, percent: 64, labelKey: 'mapDrawBootStepTools' },
  { at: 0.72, percent: 86, labelKey: 'mapDrawBootStepUi' },
  { at: 1, percent: 100, labelKey: 'mapDrawBootStepReady' },
]

function resolveBootStep(progress: number): BootStep {
  let current = BOOT_STEPS[0]!
  for (const step of BOOT_STEPS) {
    if (progress >= step.at) current = step
    else break
  }
  return current
}

function interpolatePercent(progress: number): number {
  for (let index = 0; index < BOOT_STEPS.length - 1; index += 1) {
    const left = BOOT_STEPS[index]!
    const right = BOOT_STEPS[index + 1]!
    if (progress <= right.at) {
      const span = right.at - left.at || 1
      const t = (progress - left.at) / span
      return Math.round(left.percent + (right.percent - left.percent) * t)
    }
  }
  return 100
}

interface MapDrawBootSplashProps {
  onDone: () => void
}

/** map-draw.html 初始化加载（固定 5 秒）。 */
export function MapDrawBootSplash({ onDone }: MapDrawBootSplashProps) {
  const { t } = useLocale()
  const [percent, setPercent] = useState(0)
  const [labelKey, setLabelKey] = useState<BootStep['labelKey']>('mapDrawBootStepInit')

  useEffect(() => {
    document.documentElement.classList.add('map-draw-boot-active')
    const start = performance.now()
    let frame = 0
    let doneTimer = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / BOOT_DURATION_MS)
      const step = resolveBootStep(progress)
      setPercent(interpolatePercent(progress))
      setLabelKey(step.labelKey)

      if (progress >= 1) {
        doneTimer = window.setTimeout(() => {
          document.documentElement.classList.remove('map-draw-boot-active')
          onDone()
        }, 360)
        return
      }

      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(doneTimer)
      document.documentElement.classList.remove('map-draw-boot-active')
    }
  }, [onDone])

  return (
    <div className="map-draw-boot-splash" aria-live="polite" aria-busy="true">
      <div className="map-draw-boot-splash__inner">
        <div className="map-draw-boot-splash__row">
          <img
            className="map-draw-boot-splash__logo"
            src="./sibs-logo.png"
            alt=""
            width={44}
            height={44}
            decoding="async"
          />
          <div className="map-draw-boot-splash__progress-wrap">
            <span className="map-draw-boot-splash__percent">{percent}%</span>
            <div
              className="map-draw-boot-splash__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={t('mapDrawBootProgressAria')}
            >
              <div className="map-draw-boot-splash__fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="map-draw-boot-splash__label">{t(labelKey)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
