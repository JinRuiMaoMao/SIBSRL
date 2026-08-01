import { useEffect, useState } from 'react'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { useLocale } from '../i18n/LocaleContext'
import { hasStartBootBeenSeen } from '../storage/startPageBootSeen'
import {
  dismissStartBootSplash,
  installStartBootSplashRecovery,
  runStartPageBoot,
  syncStartBootSplashState,
} from '../utils/startPageBoot'

export function useStartPageBoot(): boolean {
  const { t } = useLocale()
  const { reduceMotion } = useAppPreferences()
  const [ready, setReady] = useState(() => hasStartBootBeenSeen())

  useEffect(() => {
    installStartBootSplashRecovery()

    if (hasStartBootBeenSeen()) {
      dismissStartBootSplash()
      setReady(true)
      return
    }

    let cancelled = false

    void runStartPageBoot(
      {
        site: t('startBootStepSite'),
        script: t('startBootStepScript'),
        interface: t('startBootStepInterface'),
        logo: t('startBootStepLogo'),
        fonts: t('startBootStepFonts'),
        ready: t('startBootStepReady'),
      },
      { reduceMotion },
    ).finally(() => {
      if (!cancelled) setReady(true)
    })

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      if (hasStartBootBeenSeen()) {
        dismissStartBootSplash()
        setReady(true)
        return
      }
      syncStartBootSplashState()
    }
    window.addEventListener('pageshow', onPageShow)

    return () => {
      cancelled = true
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [reduceMotion, t])

  return ready
}
