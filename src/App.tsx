import { useCallback, useEffect, useState } from 'react'
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
import { VersionUpdatesPrompt } from './components/VersionUpdatesPrompt'
import { getTodaysDailyChallenge, isDailyChallengeAvailable } from './data/dailyChallenge'
import { useDailyChallenge } from './hooks/useDailyChallenge'
import { useLocale } from './i18n/LocaleContext'
import { getLatestUpdateId } from './data/versionUpdates'
import { markUpdateSeen } from './storage/updatesViewing'
import { markDailyChallengePromptSeen } from './storage/dailyChallengePrompt'
import { isSecretPage } from './utils/appPage'
import { hasSecretAccess, redirectToRoutesIndex } from './utils/secretAccess'
import { readTabFromLocation } from './utils/appTabNavigation'
import { shouldShowDailyChallengePrompt } from './utils/routeNavigation'
import { shouldShowUpdatesPrompt } from './utils/updatesPrompt'
function readPublishedBuild(): string | null {
  return document.querySelector('meta[name="app-build"]')?.getAttribute('content') ?? null
}

function formatBuildLabel(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19)
}

function readInitialDailyChallengePromptOpen(): boolean {
  if (!shouldShowDailyChallengePrompt()) return false
  if (!isDailyChallengeAvailable(getTodaysDailyChallenge())) return false
  markDailyChallengePromptSeen()
  return true
}

function App() {
  const { t } = useLocale()
  const activeTab = readTabFromLocation() ?? 'routes'
  const dailyChallenge = useDailyChallenge()
  const [dailyChallengePromptOpen, setDailyChallengePromptOpen] = useState(
    readInitialDailyChallengePromptOpen,
  )
  const [updatesPromptOpen, setUpdatesPromptOpen] = useState(false)
  const [pendingDailyChallengeDetail, setPendingDailyChallengeDetail] = useState(0)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__)

  const openUpdatesPrompt = useCallback(() => {
    if (!shouldShowUpdatesPrompt()) return
    setUpdatesPromptOpen(true)
  }, [])

  const closeUpdatesPrompt = useCallback(() => {
    const latestId = getLatestUpdateId()
    if (latestId) markUpdateSeen(latestId)
    setUpdatesPromptOpen(false)
  }, [])

  const closeDailyChallengePrompt = useCallback(() => {
    setDailyChallengePromptOpen(false)
    openUpdatesPrompt()
  }, [openUpdatesPrompt])

  useEffect(() => {
    if (!dailyChallengePromptOpen) {
      openUpdatesPrompt()
    }
  }, [dailyChallengePromptOpen, openUpdatesPrompt])

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
        <>
          <DailyChallengePrompt
            open={dailyChallengePromptOpen}
            onClose={closeDailyChallengePrompt}
            onOpenDetail={handleDailyChallengePromptOpenDetail}
            challenge={dailyChallenge}
          />
          <VersionUpdatesPrompt
            open={updatesPromptOpen}
            onClose={closeUpdatesPrompt}
          />
        </>
      ) : null}

      <main className="main">
        <ErrorBoundary>
          {activeTab === 'routes' ? (
            <RouteLookupPage
              pendingDailyChallengeDetail={pendingDailyChallengeDetail}
              onPendingDailyChallengeDetailConsumed={handlePendingDailyChallengeDetailConsumed}
              onRouteCardNavigate={closeDailyChallengePrompt}
              dailyChallenge={dailyChallenge}
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
