import { useCallback, useState } from 'react'
import './App.css'
import { BroadcastPage } from './components/BroadcastPage'
import { ComplaintsPage } from './components/ComplaintsPage'
import { DailyChallengePrompt } from './components/DailyChallengePrompt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { SecretHeader } from './components/SecretHeader'
import { MusicPage } from './components/MusicPage'
import { RouteLookupPage } from './components/RouteLookupPage'
import { SecretRoutesPage } from './components/SecretRoutesPage'
import { VersionUpdatesPage } from './components/VersionUpdatesPage'
import { getTodaysDailyChallenge, isDailyChallengeAvailable } from './data/dailyChallenge'
import { useLocale } from './i18n/LocaleContext'
import { isSecretPage } from './utils/appPage'
import { hasSecretAccess, redirectToRoutesIndex } from './utils/secretAccess'
import { readTabFromLocation } from './utils/appTabNavigation'
import { shouldShowDailyChallengePrompt } from './utils/routeNavigation'
function readPublishedBuild(): string | null {
  return document.querySelector('meta[name="app-build"]')?.getAttribute('content') ?? null
}

function formatBuildLabel(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19)
}

function App() {
  const { t } = useLocale()
  const activeTab = readTabFromLocation() ?? 'routes'
  const [dailyChallengePromptOpen, setDailyChallengePromptOpen] = useState(
    () => shouldShowDailyChallengePrompt() && isDailyChallengeAvailable(getTodaysDailyChallenge()),
  )
  const [pendingDailyChallengeDetail, setPendingDailyChallengeDetail] = useState(0)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__)

  const handleDailyChallengePromptOpenDetail = () => {
    setPendingDailyChallengeDetail((count) => count + 1)
  }

  const handlePendingDailyChallengeDetailConsumed = useCallback(() => {
    setPendingDailyChallengeDetail(0)
  }, [])

  if (isSecretPage()) {
    if (!hasSecretAccess()) {
      redirectToRoutesIndex()
      return null
    }

    return (
      <div className="app sibs-scrollbar">
        <SecretHeader
          collapsed={headerCollapsed}
          onToggleCollapse={() => setHeaderCollapsed((value) => !value)}
        />

        <main className="main">
          <ErrorBoundary>
            <SecretRoutesPage />
          </ErrorBoundary>
        </main>

        <footer className="site-footer">
          <p className="build-tag" title={t('buildTagHint')}>
            {t('buildTag', { time: buildLabel })}
          </p>
        </footer>
      </div>
    )
  }

  return (
    <div className="app sibs-scrollbar">
      <Header
        activeTab={activeTab}
        collapsed={headerCollapsed}
        onToggleCollapse={() => setHeaderCollapsed((value) => !value)}
      />

      {activeTab === 'routes' ? (
        <DailyChallengePrompt
          open={dailyChallengePromptOpen}
          onClose={() => setDailyChallengePromptOpen(false)}
          onOpenDetail={handleDailyChallengePromptOpenDetail}
        />
      ) : null}

      <main className="main">
        <ErrorBoundary>
          {activeTab === 'routes' ? (
            <RouteLookupPage
              pendingDailyChallengeDetail={pendingDailyChallengeDetail}
              onPendingDailyChallengeDetailConsumed={handlePendingDailyChallengeDetailConsumed}
              onRouteCardNavigate={() => setDailyChallengePromptOpen(false)}
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
