import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LocaleProvider } from './i18n/LocaleContext.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('找不到 #root 容器')
}

createRoot(rootEl).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
