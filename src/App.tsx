import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { AccountPage } from './components/AccountPage'
import { BroadcastPage } from './components/BroadcastPage'
import { ComplaintsPage } from './components/ComplaintsPage'
import { DailyChallengePrompt } from './components/DailyChallengePrompt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GuidedTour } from './components/GuidedTour'
import { Header } from './components/Header'
import { IslandMapWidget } from './components/IslandMapWidget'
import { AppTabBar } from './components/AppTabBar'
import { LiquidGlassDefs } from './components/LiquidGlassDefs'
import { SecretHeader } from './components/SecretHeader'
import { MusicPage } from './components/MusicPage'
import { TriviaPage } from './components/TriviaPage'
import { RouteLookupPage } from './components/RouteLookupPage'
import { ScrollRevealScope } from './components/ScrollRevealScope'
import { SecretRoutesPage } from './components/SecretRoutesPage'
import { SettingsPage } from './components/SettingsPage'
import { StartPage } from './components/StartPage'
import { VersionUpdatesPage } from './components/VersionUpdatesPage'
import { VersionUpdatesPrompt } from './components/VersionUpdatesPrompt'
import { getTodaysDailyChallenge, isDailyChallengeAvailable } from './data/dailyChallenge'
import { detectGuidedTourContext } from './data/guidedTourSteps'
import { useDailyChallenge } from './hooks/useDailyChallenge'
import { useDocumentMetadata } from './hooks/useDocumentMetadata'
import { useFavoritesCloudSync } from './hooks/useFavoritesCloudSync'
import { useGuidedTourControl } from './contexts/GuidedTourContext'
import { useLocale } from './i18n/LocaleContext'
import { getLatestUpdatePromptKey } from './data/versionUpdates'
import { markDailyChallengePromptSeen } from './storage/dailyChallengePrompt'
import { canAutoStartGuidedTour, getGuidedTourAutoStartDelayMs } from './storage/guidedTour'
import {
  consumePendingGuidedTourReplay,
  isGuidedTourReplaySessionActive,
} from './storage/guidedTourReplay'
import { markUpdateSeen } from './storage/updatesViewing'
import { isAccountPage, isSecretPage, isSettingsPage, isStartPage } from './utils/appPage'
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

  const showUpdates = !showDailyChallenge && shouldShowUpdatesPrompt()

  if (showUpdates) {
    const latestPromptKey = getLatestUpdatePromptKey()
    if (latestPromptKey) markUpdateSeen(latestPromptKey)
  }

  return {
    dailyChallenge: showDailyChallenge,
    updates: showUpdates,
  }
}

function App() {
  const { t, locale } = useLocale()
  const tabFromLocation = readTabFromLocation()
  const activeTab = tabFromLocation ?? 'routes'
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

  useEffect(() => {
    const open = dailyChallengePromptOpen || updatesPromptOpen
    document.documentElement.classList.toggle('overlay-prompt-open', open)
    return () => document.documentElement.classList.remove('overlay-prompt-open')
  }, [dailyChallengePromptOpen, updatesPromptOpen])

  const prepareGuidedTour = useCallback(() => {
    setHeaderCollapsed(false)
  }, [])

  const scheduleAutoStartTour = useCallback(() => {
    const mode = detectGuidedTourContext()
    if (mode === 'route-detail') return
    if (!canAutoStartGuidedTour(mode)) return

    const timer = window.setTimeout(() => {
      if (!canAutoStartGuidedTour(mode)) return
      openTour({ mode })
    }, getGuidedTourAutoStartDelayMs(mode))
    registerAutoStartTimer(timer)
  }, [openTour, registerAutoStartTimer])

  const tryOpenGuidedTour = useCallback(() => {
    const mode = detectGuidedTourContext()
    if (mode === 'route-detail') return
    if (!canAutoStartGuidedTour(mode)) return
    openTour({ mode })
  }, [openTour])

  useEffect(() => {
    if (isAccountPage() || isSecretPage() || isSettingsPage()) return
    if ((readTabFromLocation() ?? 'routes') === 'trivia') return

    const pendingReplay = consumePendingGuidedTourReplay()
    if (pendingReplay) {
      const timer = window.setTimeout(() => {
        openTour({ manual: true, mode: pendingReplay })
      }, getGuidedTourAutoStartDelayMs(pendingReplay))
      registerAutoStartTimer(timer)
      return () => cancelAutoStartTimer()
    }

    if (isGuidedTourReplaySessionActive()) {
      const mode = detectGuidedTourContext()
      const timer = window.setTimeout(() => {
        openTour({ manual: true, mode })
      }, getGuidedTourAutoStartDelayMs(mode))
      registerAutoStartTimer(timer)
      return () => cancelAutoStartTimer()
    }

    const mode = detectGuidedTourContext()
    if (
      activeTab === 'routes' &&
      mode === 'routes-list' &&
      (initialOverlays.dailyChallenge || initialOverlays.updates)
    ) {
      return
    }

    scheduleAutoStartTour()
    return () => cancelAutoStartTimer()
    // Only evaluate auto-start once on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openUpdatesPrompt = useCallback(() => {
    if (!shouldShowUpdatesPrompt()) return
    const latestPromptKey = getLatestUpdatePromptKey()
    if (latestPromptKey) markUpdateSeen(latestPromptKey)
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
    !isAccountPage() && !isSecretPage() && !isSettingsPage() && !isStartPage() ? (
      <GuidedTour
        open={guidedTourOpen}
        mode={tourMode}
        onClose={closeTour}
        onPrepare={prepareGuidedTour}
      />
    ) : null

  if (isStartPage()) {
    return (
      <>
        <LiquidGlassDefs />
        <StartPage />
      </>
    )
  }

  if (isSettingsPage()) {
    return (
      <>
        <LiquidGlassDefs />
        {favoritesSyncDialog}
        <div className="app sibs-scrollbar">
          <Header
            activeTab={activeTab}
            collapsed={headerCollapsed}
            onToggleCollapse={() => setHeaderCollapsed((value) => !value)}
          />

          <ScrollRevealScope className="main">
            <ErrorBoundary>
              <SettingsPage />
            </ErrorBoundary>
          </ScrollRevealScope>

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
        <AppTabBar activeTab={tabFromLocation} />
      </>
    )
  }

  if (isAccountPage()) {
    return (
      <>
        <LiquidGlassDefs />
        {favoritesSyncDialog}
        <div className="app sibs-scrollbar">
        <Header
          activeTab={activeTab}
          collapsed={headerCollapsed}
          onToggleCollapse={() => setHeaderCollapsed((value) => !value)}
        />

        <ScrollRevealScope className="main">
          <ErrorBoundary>
            <AccountPage />
          </ErrorBoundary>
        </ScrollRevealScope>

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
        <AppTabBar activeTab={tabFromLocation} />
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
        <LiquidGlassDefs />
        {favoritesSyncDialog}
        <div className="app sibs-scrollbar">
          <SecretHeader
          collapsed={headerCollapsed}
          onToggleCollapse={() => setHeaderCollapsed((value) => !value)}
        />

        <ScrollRevealScope className="main">
          <ErrorBoundary>
            <SecretRoutesPage />
          </ErrorBoundary>
        </ScrollRevealScope>

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
      <LiquidGlassDefs />
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

      <ScrollRevealScope className="main">
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
          ) : activeTab === 'trivia' ? (
            <TriviaPage />
          ) : (
            <VersionUpdatesPage />
          )}
        </ErrorBoundary>
      </ScrollRevealScope>

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
      <IslandMapWidget />
      <AppTabBar activeTab={tabFromLocation} />
    </>
  )
}

export default App
