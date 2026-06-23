import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { AccountPage } from './components/AccountPage'
import { BroadcastPage } from './components/BroadcastPage'
import { ComplaintsPage } from './components/ComplaintsPage'
import { DailyChallengePrompt } from './components/DailyChallengePrompt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GuidedTour } from './components/GuidedTour'
import { Header } from './components/Header'
import { SecretHeader } from './components/SecretHeader'
import { MusicPage } from './components/MusicPage'
import { RouteLookupPage } from './components/RouteLookupPage'
import { SecretRoutesPage } from './components/SecretRoutesPage'
import { VersionUpdatesPage } from './components/VersionUpdatesPage'
import { VersionUpdatesPrompt } from './components/VersionUpdatesPrompt'
import { getTodaysDailyChallenge, isDailyChallengeAvailable } from './data/dailyChallenge'
import { detectGuidedTourMode } from './data/guidedTourSteps'
import { useDailyChallenge } from './hooks/useDailyChallenge'
import { useDocumentMetadata } from './hooks/useDocumentMetadata'
import { useFavoritesCloudSync } from './hooks/useFavoritesCloudSync'
import { useGuidedTourControl } from './contexts/GuidedTourContext'
import { useLocale } from './i18n/LocaleContext'
import { getLatestUpdatePromptKey } from './data/versionUpdates'
import { markDailyChallengePromptSeen } from './storage/dailyChallengePrompt'
import { canAutoStartGuidedTour, getGuidedTourAutoStartDelayMs } from './storage/guidedTour'
import { markUpdateSeen } from './storage/updatesViewing'
import { isAccountPage, isSecretPage } from './utils/appPage'
import { hasSecretAccess, redirectToRoutesIndex } from './utils/secretAccess'
import { readTabFromLocation } from './utils/appTabNavigation'
import { shouldShowDailyChallengePrompt } from './utils/routeNavigation'
import { shouldShowUpdatesPrompt } from './utils/updatesPrompt'
import { formatBuildLabel, readPublishedBuild } from './utils/buildLabel'

function readInitialOverlayState(): { dailyChallenge: boolean; updates: boolean } {
  const showDailyChallenge =
    shouldShowDailyChallengePrompt() && isDailyChallengeAvailable(getTodaysDailyChallenge())

  if (showDailyChallenge) {
    markDailyChallengePromptSeen()
  }

  return {
    dailyChallenge: showDailyChallenge,
    updates: !showDailyChallenge && shouldShowUpdatesPrompt(),
  }
}

function App() {
  const { t, locale } = useLocale()
  const activeTab = readTabFromLocation() ?? 'routes'
  const {
    open: guidedTourOpen,
    tourMode,
    openTour,
    closeTour,
    registerAutoStartTimer,
    cancelAutoStartTimer,
  } = useGuidedTourControl()
  useDocumentMetadata(activeTab)
  const favoritesSyncDialog = useFavoritesCloudSync()
  const dailyChallenge = useDailyChallenge()
  const initialOverlays = readInitialOverlayState()
  const [dailyChallengePromptOpen, setDailyChallengePromptOpen] = useState(
    initialOverlays.dailyChallenge,
  )
  const [updatesPromptOpen, setUpdatesPromptOpen] = useState(initialOverlays.updates)
  const [pendingDailyChallengeDetail, setPendingDailyChallengeDetail] = useState(0)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__, locale)

  const prepareGuidedTour = useCallback(() => {
    setHeaderCollapsed(false)
  }, [])

  const scheduleAutoStartTour = useCallback(() => {
    if (!canAutoStartGuidedTour()) return

    const mode = detectGuidedTourMode()
    const timer = window.setTimeout(() => {
      if (!canAutoStartGuidedTour()) return
      openTour({ mode })
    }, getGuidedTourAutoStartDelayMs(mode))
    registerAutoStartTimer(timer)
  }, [openTour, registerAutoStartTimer])

  const tryOpenGuidedTour = useCallback(() => {
    if (!canAutoStartGuidedTour()) return
    openTour({ mode: detectGuidedTourMode() })
  }, [openTour])

  useEffect(() => {
    if (isAccountPage() || isSecretPage()) return
    if (activeTab === 'routes' && (initialOverlays.dailyChallenge || initialOverlays.updates)) {
      return
    }

    scheduleAutoStartTour()
    return () => cancelAutoStartTimer()
    // Only evaluate auto-start once on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openUpdatesPrompt = useCallback(() => {
    if (!shouldShowUpdatesPrompt()) return
    setUpdatesPromptOpen(true)
  }, [])

  const closeUpdatesPrompt = useCallback(() => {
    const latestPromptKey = getLatestUpdatePromptKey()
    if (latestPromptKey) markUpdateSeen(latestPromptKey)
    setUpdatesPromptOpen(false)
    tryOpenGuidedTour()
  }, [tryOpenGuidedTour])

  const closeDailyChallengePrompt = useCallback(() => {
    setDailyChallengePromptOpen(false)
    if (shouldShowUpdatesPrompt()) {
      openUpdatesPrompt()
      return
    }
    tryOpenGuidedTour()
  }, [openUpdatesPrompt, tryOpenGuidedTour])

  const handleDailyChallengePromptOpenDetail = () => {
    setPendingDailyChallengeDetail((count) => count + 1)
  }

  const handlePendingDailyChallengeDetailConsumed = useCallback(() => {
    setPendingDailyChallengeDetail(0)
  }, [])

  const guidedTourLayer =
    !isAccountPage() && !isSecretPage() ? (
      <GuidedTour
        open={guidedTourOpen}
        mode={tourMode}
        onClose={closeTour}
        onPrepare={prepareGuidedTour}
      />
    ) : null

  if (isAccountPage()) {
    return (
      <>
        {favoritesSyncDialog}
        <div className="app sibs-scrollbar">
        <Header
          activeTab={activeTab}
          collapsed={headerCollapsed}
          onToggleCollapse={() => setHeaderCollapsed((value) => !value)}
        />

        <main className="main">
          <ErrorBoundary>
            <AccountPage />
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
      </>
    )
  }

  if (isSecretPage()) {
    if (!hasSecretAccess()) {
      redirectToRoutesIndex()
      return null
    }

    return (
      <>
        {favoritesSyncDialog}
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
      </>
    )
  }

  return (
    <>
      {favoritesSyncDialog}
      {guidedTourLayer}
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
    </>
  )
}

export default App
