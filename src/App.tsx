import { useState } from 'react'
import './App.css'
import { BroadcastPage } from './components/BroadcastPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { RouteLookupPage } from './components/RouteLookupPage'
import { useLocale } from './i18n/LocaleContext'
import type { AppTab } from './types/appTab'

function readPublishedBuild(): string | null {
  return document.querySelector('meta[name="app-build"]')?.getAttribute('content') ?? null
}

function formatBuildLabel(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19)
}

function App() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<AppTab>('routes')
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__)

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main">
        <ErrorBoundary>
          {activeTab === 'routes' ? <RouteLookupPage /> : <BroadcastPage />}
        </ErrorBoundary>
      </main>

      <footer className="site-footer">
        <p>
          {t('footer')} ·{' '}
          <a
            href="https://www.roblox.com/games/1588965415"
            target="_blank"
            rel="noreferrer"
          >
            {t('playGame')}
          </a>
        </p>
        <p className="build-tag" title={t('buildTagHint')}>
          {t('buildTag', { time: buildLabel })}
        </p>
      </footer>
    </div>
  )
}

export default App
