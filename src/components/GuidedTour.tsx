import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { GUIDED_TOUR_STEPS, type GuidedTourStep } from '../data/guidedTourSteps'
import { useLocale } from '../i18n/LocaleContext'
import { shouldReduceMotion } from '../storage/appPreferences'
import { markGuidedTourSeen } from '../storage/guidedTour'
import { lockPageScroll } from '../utils/pageScrollLock'

const SPOTLIGHT_PADDING = 12
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

function roundPx(value: number): number {
  const dpr = window.devicePixelRatio || 1
  return Math.round(value * dpr) / dpr
}

function readViewportSize(): { width: number; height: number } {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }
}

function readViewportOffset(): { left: number; top: number } {
  const viewport = window.visualViewport
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
  }
}

function measureTarget(selector: string): SpotlightRect | null {
  const element = document.querySelector(selector)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const offset = readViewportOffset()
  const x = rect.left - offset.left - SPOTLIGHT_PADDING
  const y = rect.top - offset.top - SPOTLIGHT_PADDING

  return {
    x: roundPx(Math.max(0, x)),
    y: roundPx(Math.max(0, y)),
    width: roundPx(rect.width + SPOTLIGHT_PADDING * 2),
    height: roundPx(rect.height + SPOTLIGHT_PADDING * 2),
  }
}

function scrollTargetIntoView(selector: string): void {
  const element = document.querySelector(selector)
  if (!element) return
  element.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: 'auto',
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
  const { width: viewportW, height: viewportH } = readViewportSize()

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

function scheduleRemeasure(callback: () => void): () => void {
  let frame1 = 0
  let frame2 = 0
  frame1 = window.requestAnimationFrame(() => {
    frame2 = window.requestAnimationFrame(callback)
  })
  return () => {
    window.cancelAnimationFrame(frame1)
    window.cancelAnimationFrame(frame2)
  }
}

function useTargetObserver(
  open: boolean,
  selector: string | undefined,
  onChange: () => void,
): void {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!open || !selector) return

    const element = document.querySelector(selector)
    if (!element) return

    const observer = new ResizeObserver(() => onChangeRef.current())
    observer.observe(element)

    let parent: Element | null = element.parentElement
    let depth = 0
    while (parent && depth < 4) {
      observer.observe(parent)
      parent = parent.parentElement
      depth += 1
    }

    return () => observer.disconnect()
  }, [open, selector])
}

export function GuidedTour({ open, onClose, onPrepare }: GuidedTourProps) {
  const { t } = useLocale()
  const maskId = useId().replace(/:/g, '')
  const panelRef = useRef<HTMLDivElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [activeSteps, setActiveSteps] = useState(GUIDED_TOUR_STEPS)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [viewportSize, setViewportSize] = useState(readViewportSize)
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
    setViewportSize(readViewportSize())

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

  const remeasureRef = useRef(remeasure)
  remeasureRef.current = remeasure

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
            window.setTimeout(resolve, shouldReduceMotion() ? 0 : 120),
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

  useEffect(() => {
    if (open) return
    setStepIndex(0)
    setActiveSteps(GUIDED_TOUR_STEPS)
    setSpotlight(null)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !step) return
    return scheduleRemeasure(() => remeasureRef.current())
  }, [open, step, stepIndex])

  useTargetObserver(open, step?.target, remeasure)

  useEffect(() => {
    if (!open) return
    return lockPageScroll()
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }

    const onLayoutChange = () => scheduleRemeasure(() => remeasureRef.current())
    const viewport = window.visualViewport

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, true)
    viewport?.addEventListener('resize', onLayoutChange)
    viewport?.addEventListener('scroll', onLayoutChange)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange, true)
      viewport?.removeEventListener('resize', onLayoutChange)
      viewport?.removeEventListener('scroll', onLayoutChange)
    }
  }, [open, finish])

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

  const { width: viewportW, height: viewportH } = viewportSize

  return createPortal(
    <div className="guided-tour-root" style={{ zIndex: TOUR_Z_INDEX }}>
      <svg
        className="guided-tour-mask"
        viewBox={`0 0 ${viewportW} ${viewportH}`}
        preserveAspectRatio="none"
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
          fill="var(--guided-tour-mask-fill, rgba(8, 12, 22, 0.78))"
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
    </div>,
    document.body,
  )
}
