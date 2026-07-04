import { IslandMapDrawEditor } from './IslandMapDrawEditor'
import { useLocale } from '../i18n/LocaleContext'

/** 独立路线图编辑器页（map-draw.html）。 */
export function MapDrawPage() {
  const { t } = useLocale()

  return (
    <div className="map-draw-app">
      <header className="map-draw-app-header">
        <div className="map-draw-app-header-left">
          <h1 className="map-draw-app-title">{t('mapDrawPageTitle')}</h1>
          <p className="map-draw-app-subtitle">{t('mapDrawPageSubtitle')}</p>
        </div>
        <div className="map-draw-app-header-actions">
          <a className="map-draw-app-back" href="./routes.html">
            {t('mapDrawPageBack')}
          </a>
        </div>
      </header>
      <div className="map-draw-app-body">
        <IslandMapDrawEditor />
      </div>
    </div>
  )
}
