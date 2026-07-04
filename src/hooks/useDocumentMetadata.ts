import { useEffect } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { AppTab } from '../types/appTab'
import { isAccountPage, isMapDrawPage, isSecretPage, isSettingsPage, isStartPage } from '../utils/appPage'
import {
  formatDocumentTitle,
  syncFavicon,
  syncHtmlLang,
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
      document.title = t('startPageDocumentTitle')
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
    document.title = formatDocumentTitle(t(pageKey), t('documentTitleSuffix'))
  }, [activeTab, account, locale, mapDraw, secret, settings, start, t])
}
