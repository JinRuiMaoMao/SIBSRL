import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { GUIDED_TOUR_STEPS, type GuidedTourStep } from '../data/guidedTourSteps'
import { useLocale } from '../i18n/LocaleContext'
import { shouldReduceMotion } from '../storage/appPreferences'
import { markGuidedTourSeen } from '../storage/guidedTour'
import { lockPageScroll } from '../utils/pageScrollLock'

const SPOTLIGHT_PADDING = 10
const SPOTLIGHT_RADIUS = 12
const TOUR_Z_INDEX = 1300

interface SpotlightRect {
  x: number
  y: number
  width: number
  height: number
}

interface TooltipPosition {
  top: number
  left: number
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface GuidedTourProps {
  open: boolean
  onClose: () => void
  onPrepare?: () => void
}

function isCenterStep(step: GuidedTourStep): boolean {
  return !step.target || step.placement === 'center'
}

function measureTarget(selector: string): SpotlightRect | null {
  const element = document.querySelector(selector)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  return {
    x: Math.max(0, rect.left - SPOTLIGHT_PADDING),
    y: Math.max(0, rect.top - SPOTLIGHT_PADDING),
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  }
}

function scrollTargetIntoView(selector: string): void {
  const element = document.querySelector(selector)
  if (!element) return
  element.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: shouldReduceMotion() ? 'auto' : 'smooth',
  })
}

function resolveActiveSteps(): GuidedTourStep[] {
  return GUIDED_TOUR_STEPS.filter((step) => {
    if (!step.optional || !step.target) return true
    return Boolean(document.querySelector(step.target))
  })
}

function computeTooltipPosition(
  rect: SpotlightRect | null,
  panelSize: { width: number; height: number },
  preferred: GuidedTourStep['placement'],
): TooltipPosition {
  const margin = 14
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  if (!rect || preferred === 'center') {
    return {
      top: Math.max(margin, (viewportH - panelSize.height) / 2),
      left: Math.max(margin, (viewportW - panelSize.width) / 2),
      placement: 'center',
    }
  }

  const candidates: Array<'top' | 'bottom' | 'left' | 'right'> =
    preferred && preferred !== 'center'
      ? [preferred, 'bottom', 'top', 'right', 'left']
      : ['bottom', 'top', 'right', 'left']

  for (const placement of candidates) {
    let top = 0
    let left = 0

    if (placement === 'bottom') {
      top = rect.y + rect.height + margin
      left = rect.x + rect.width / 2 - panelSize.width / 2
    } else if (placement === 'top') {
      top = rect.y - panelSize.height - margin
      left = rect.x + rect.width / 2 - panelSize.width / 2
    } else if (placement === 'left') {
      top = rect.y + rect.height / 2 - panelSize.height / 2
      left = rect.x - panelSize.width - margin
    } else {
      top = rect.y + rect.height / 2 - panelSize.height / 2
      left = rect.x + rect.width + margin
    }

    const fits =
      top >= margin &&
      left >= margin &&
      top + panelSize.height <= viewportH - margin &&
      left + panelSize.width <= viewportW - margin

    if (fits) {
      return {
        top,
        left,
        placement,
      }
    }
  }

  return {
    top: Math.max(margin, (viewportH - panelSize.height) / 2),
    left: Math.max(margin, (viewportW - panelSize.width) / 2),
    placement: 'center',
  }
}

export function GuidedTour({ open, onClose, onPrepare }: GuidedTourProps) {
  const { t } = useLocale()
  const maskId = useId().replace(/:/g, '')
  const panelRef = useRef<HTMLDivElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [activeSteps, setActiveSteps] = useState(GUIDED_TOUR_STEPS)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: 'center',
  })

  const step = activeSteps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex >= activeSteps.length - 1

  const onPrepareRef = useRef(onPrepare)
  onPrepareRef.current = onPrepare

  const finish = useCallback(() => {
    markGuidedTourSeen()
    onClose()
  }, [onClose])

  const remeasure = useCallback(() => {
    if (!step) return

    if (isCenterStep(step)) {
      setSpotlight(null)
      const panel = panelRef.current
      const panelSize = panel
        ? { width: panel.offsetWidth, height: panel.offsetHeight }
        : { width: 320, height: 220 }
      setTooltipPos(computeTooltipPosition(null, panelSize, 'center'))
      return
    }

    const rect = measureTarget(step.target!)
    setSpotlight(rect)
    const panel = panelRef.current
    const panelSize = panel
      ? { width: panel.offsetWidth, height: panel.offsetHeight }
      : { width: 320, height: 220 }
    setTooltipPos(computeTooltipPosition(rect, panelSize, step.placement))
  }, [step])

  const goToStep = useCallback(
    async (index: number) => {
      const steps = resolveActiveSteps()
      setActiveSteps(steps)

      let targetIndex = index
      while (targetIndex < steps.length) {
        const nextStep = steps[targetIndex]!
        nextStep.beforeShow?.()

        if (nextStep.target) {
          scrollTargetIntoView(nextStep.target)
          await new Promise((resolve) =>
            window.setTimeout(resolve, shouldReduceMotion() ? 0 : 280),
          )
          if (!document.querySelector(nextStep.target)) {
            if (nextStep.optional) {
              targetIndex += 1
              continue
            }
          }
        }

        setStepIndex(targetIndex)
        return
      }

      finish()
    },
    [finish],
  )

  useEffect(() => {
    if (!open) return
    onPrepareRef.current?.()
    void goToStep(0)
    // Only restart the tour when it opens — not when parent callbacks change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useLayoutEffect(() => {
    if (!open || !step) return
    remeasure()
  }, [open, step, stepIndex, remeasure])

  useEffect(() => {
    if (!open) return
    return lockPageScroll()
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }

    const onLayoutChange = () => remeasure()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange, true)
    }
  }, [open, finish, remeasure])

  if (!open || !step) return null

  const handleNext = () => {
    if (isLast) {
      finish()
      return
    }
    void goToStep(stepIndex + 1)
  }

  const handleBack = () => {
    if (isFirst) return
    void goToStep(stepIndex - 1)
  }

  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  return (
    <div className="guided-tour-root" style={{ zIndex: TOUR_Z_INDEX }}>
      <svg
        className="guided-tour-mask"
        width={viewportW}
        height={viewportH}
        viewBox={`0 0 ${viewportW} ${viewportH}`}
        aria-hidden
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={viewportW} height={viewportH} fill="white" />
            {spotlight ? (
              <rect
                x={spotlight.x}
                y={spotlight.y}
                width={spotlight.width}
                height={spotlight.height}
                rx={SPOTLIGHT_RADIUS}
                ry={SPOTLIGHT_RADIUS}
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={viewportW}
          height={viewportH}
          fill="rgba(8, 12, 22, 0.78)"
          mask={`url(#${maskId})`}
        />
      </svg>

      {spotlight ? (
        <div
          className="guided-tour-spotlight-ring"
          style={{
            top: spotlight.y,
            left: spotlight.x,
            width: spotlight.width,
            height: spotlight.height,
          }}
          aria-hidden
        />
      ) : null}

      <div
        ref={panelRef}
        className={`guided-tour-panel ${tooltipPos.placement === 'center' ? 'guided-tour-panel--center' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <p className="guided-tour-progress">
          {t('guidedTourProgress', { current: stepIndex + 1, total: activeSteps.length })}
        </p>
        <h2 id="guided-tour-title" className="guided-tour-title">
          {t(step.titleKey)}
        </h2>
        <p className="guided-tour-body">{t(step.bodyKey)}</p>
        <div className="guided-tour-actions">
          <button type="button" className="guided-tour-btn guided-tour-btn--ghost" onClick={finish}>
            {t('guidedTourSkip')}
          </button>
          <div className="guided-tour-actions-main">
            {!isFirst ? (
              <button type="button" className="guided-tour-btn" onClick={handleBack}>
                {t('guidedTourBack')}
              </button>
            ) : null}
            <button
              type="button"
              className="guided-tour-btn guided-tour-btn--primary"
              onClick={handleNext}
            >
              {isLast ? t('guidedTourDone') : t('guidedTourNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
