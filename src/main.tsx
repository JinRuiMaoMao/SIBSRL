import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CustomContextMenu } from './components/CustomContextMenu.tsx'
import { LocaleProvider } from './i18n/LocaleContext.tsx'
import { ThemeProvider } from './theme/ThemeContext.tsx'
import { installDevToolsBlock } from './utils/blockDevToolsShortcuts.ts'

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
        <App />
        <CustomContextMenu />
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
)
