import { useEffect, useState } from 'react'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { useLocale } from '../i18n/LocaleContext'
import { hasStartBootBeenSeen } from '../storage/startPageBootSeen'
import { runStartPageBoot } from '../utils/startPageBoot'

export function useStartPageBoot(): boolean {
  const { t } = useLocale()
  const { reduceMotion } = useAppPreferences()
  const [ready, setReady] = useState(() => hasStartBootBeenSeen())

  useEffect(() => {
    if (hasStartBootBeenSeen()) return

    let cancelled = false

    void runStartPageBoot(
      {
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

    return () => {
      cancelled = true
    }
  }, [reduceMotion, t])

  return ready
}
