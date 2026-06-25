import { useEffect } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { AppTab } from '../types/appTab'
import { isAccountPage, isSecretPage, isSettingsPage } from '../utils/appPage'
import {
  formatDocumentTitle,
  syncFavicon,
  syncHtmlLang,
  TAB_TITLE_KEYS,
} from '../utils/documentMetadata'

export function useDocumentMetadata(activeTab: AppTab): void {
  const { locale, t } = useLocale()
  const secret = isSecretPage()
  const account = isAccountPage()
  const settings = isSettingsPage()

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
  }, [locale])

  useEffect(() => {
    const pageKey = secret
      ? 'secretPageTitle'
      : account
        ? 'authProfileTitle'
        : settings
          ? 'settings'
          : TAB_TITLE_KEYS[activeTab]
    document.title = formatDocumentTitle(t(pageKey), t('documentTitleSuffix'))
  }, [activeTab, account, locale, secret, settings, t])
}
