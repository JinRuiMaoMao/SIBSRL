import { useCallback, useRef } from 'react'
import { grantSecretAccess } from '../utils/secretAccess'

const SECRET_CLICK_TARGET = 10
const SECRET_CLICK_RESET_MS = 2000

export function useSecretLogoClick(enabled: boolean) {
  const countRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onLogoClick = useCallback(() => {
    if (!enabled) return

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)

    countRef.current += 1
    if (countRef.current >= SECRET_CLICK_TARGET) {
      countRef.current = 0
      grantSecretAccess()
      window.location.href = './secret.html'
      return
    }

    resetTimerRef.current = setTimeout(() => {
      countRef.current = 0
    }, SECRET_CLICK_RESET_MS)
  }, [enabled])

  return onLogoClick
}
