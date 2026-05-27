import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
// @ts-expect-error publish script is plain .mjs without types
import { publishStandalone } from './scripts/publish-standalone.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))

function publishStandalonePlugin(buildTag: string): Plugin {
  return {
    name: 'publish-standalone-root',
    apply: 'build',
    closeBundle() {
      publishStandalone({ buildTag })
    },
  }
}

/** 开发时 / 与 /index.html 指向 dev.html，避免误加载根目录的构建版 index.html */
function devEntryRedirectPlugin(): Plugin {
  return {
    name: 'dev-entry-redirect',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (path === '/' || path === '/index.html') {
          const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          req.url = `/dev.html${qs}`
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(() => {
  const appBuild = new Date().toISOString()

  return {
    plugins: [
      react(),
      viteSingleFile({ useRecommendedBuildConfig: true }),
      devEntryRedirectPlugin(),
      publishStandalonePlugin(appBuild),
    ],
    base: './',
    define: {
      __APP_BUILD__: JSON.stringify(appBuild),
    },
    server: {
      port: 5173,
      strictPort: false,
      open: '/dev.html',
    },
    preview: {
      port: 4173,
      open: '/dev.html',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(root, 'dev.html'),
      },
    },
  }
})
