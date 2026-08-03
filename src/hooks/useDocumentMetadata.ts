import { useEffect } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { AppTab } from '../types/appTab'
import { isAccountPage, isMapDrawPage, isSecretPage, isSettingsPage, isStartPage } from '../utils/appPage'
import { isRealLayoutMode } from '../utils/appLayoutMode'
import {
  formatDocumentTitle,
  syncFavicon,
  syncHtmlLang,
  syncSocialShareMeta,
  TAB_TITLE_KEYS,
} from '../utils/documentMetadata'

export function useDocumentMetadata(activeTab: AppTab): void {
  const { locale, t } = useLocale()
  const start = isStartPage()
  const secret = isSecretPage()
  const account = isAccountPage()
  const mapDraw = isMapDrawPage()
  const settings = isSettingsPage()

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
  }, [locale])

  useEffect(() => {
    if (start) {
      const title = t(isRealLayoutMode() ? 'realStartPageDocumentTitle' : 'startPageDocumentTitle')
      document.title = title
      syncSocialShareMeta({ title })
      return
    }
    const pageKey = secret
      ? 'secretPageTitle'
      : mapDraw
        ? 'mapDrawPageTitle'
        : account
          ? 'authProfileTitle'
          : settings
            ? 'settings'
            : TAB_TITLE_KEYS[activeTab]
    const title = formatDocumentTitle(t(pageKey), t('documentTitleSuffix'))
    document.title = title
    syncSocialShareMeta({ title })
  }, [activeTab, account, locale, mapDraw, secret, settings, start, t])
}
