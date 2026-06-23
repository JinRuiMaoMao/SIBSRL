import { useEffect } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { AppTab } from '../types/appTab'
import { isSecretPage } from '../utils/appPage'
import {
  formatDocumentTitle,
  syncFavicon,
  syncHtmlLang,
  TAB_TITLE_KEYS,
} from '../utils/documentMetadata'

export function useDocumentMetadata(activeTab: AppTab): void {
  const { locale, t } = useLocale()
  const secret = isSecretPage()

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
  }, [locale])

  useEffect(() => {
    const pageKey = secret ? 'secretPageTitle' : TAB_TITLE_KEYS[activeTab]
    document.title = formatDocumentTitle(t(pageKey), t('documentTitleSuffix'))
  }, [activeTab, locale, secret, t])
}
