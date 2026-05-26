import { useState } from 'react'
import './App.css'
import { BroadcastPage } from './components/BroadcastPage'
import { Header } from './components/Header'
import { RouteLookupPage } from './components/RouteLookupPage'
import { useLocale } from './i18n/LocaleContext'
import type { AppTab } from './types/appTab'

function App() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<AppTab>('routes')

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main">
        {activeTab === 'routes' ? <RouteLookupPage /> : <BroadcastPage />}
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
      </footer>
    </div>
  )
}

export default App
