import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { GuidedTourProvider } from './contexts/GuidedTourContext.tsx'
import { AppDialogProvider } from './contexts/AppDialogContext.tsx'
import { CustomContextMenu } from './components/CustomContextMenu.tsx'
import { AppPreferencesProvider } from './contexts/AppPreferencesContext.tsx'
import { FavoriteRoutesProvider } from './contexts/FavoriteRoutesContext.tsx'
import { RecentRoutesProvider } from './contexts/RecentRoutesContext.tsx'
import { LocaleProvider } from './i18n/LocaleContext.tsx'
import { ThemeProvider } from './theme/ThemeContext.tsx'
import { applyAppPreferences, readAppPreferences } from './storage/appPreferences.ts'
import { installDevToolsBlock } from './utils/blockDevToolsShortcuts.ts'

applyAppPreferences(readAppPreferences())

if (!import.meta.env.DEV) {
  installDevToolsBlock()
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('找不到 #root 容器')
}

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <GuidedTourProvider>
            <AppDialogProvider>
              <AppPreferencesProvider>
                <FavoriteRoutesProvider>
                  <RecentRoutesProvider>
                    <App />
                    <CustomContextMenu />
                  </RecentRoutesProvider>
                </FavoriteRoutesProvider>
              </AppPreferencesProvider>
            </AppDialogProvider>
          </GuidedTourProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
)
