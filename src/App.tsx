import { useCallback, useState } from 'react'
import './App.css'
import { BroadcastPage } from './components/BroadcastPage'
import { ComplaintsPage } from './components/ComplaintsPage'
import { DailyChallengePrompt } from './components/DailyChallengePrompt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { MusicPage } from './components/MusicPage'
import { RouteLookupPage } from './components/RouteLookupPage'
import { VersionUpdatesPage } from './components/VersionUpdatesPage'
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
  const [dailyChallengePromptOpen, setDailyChallengePromptOpen] = useState(true)
  const [pendingDailyChallengeDetail, setPendingDailyChallengeDetail] = useState(0)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__)

  const handleDailyChallengePromptOpenDetail = () => {
    setActiveTab('routes')
    setPendingDailyChallengeDetail((count) => count + 1)
  }

  const handlePendingDailyChallengeDetailConsumed = useCallback(() => {
    setPendingDailyChallengeDetail(0)
  }, [])

  return (
    <div className="app sibs-scrollbar">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={headerCollapsed}
        onToggleCollapse={() => setHeaderCollapsed((value) => !value)}
      />

      <DailyChallengePrompt
        open={dailyChallengePromptOpen}
        onClose={() => setDailyChallengePromptOpen(false)}
        onOpenDetail={handleDailyChallengePromptOpenDetail}
      />

      <main className="main">
        <ErrorBoundary>
          {activeTab === 'routes' ? (
            <RouteLookupPage
              pendingDailyChallengeDetail={pendingDailyChallengeDetail}
              onPendingDailyChallengeDetailConsumed={handlePendingDailyChallengeDetailConsumed}
            />
          ) : activeTab === 'broadcast' ? (
            <BroadcastPage />
          ) : activeTab === 'music' ? (
            <MusicPage />
          ) : activeTab === 'complaints' ? (
            <ComplaintsPage />
          ) : (
            <VersionUpdatesPage />
          )}
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
