import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
// @ts-expect-error publish script is plain .mjs without types
import { publishStandalone } from './scripts/publish-standalone.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { renderRoutePageHtml } from './scripts/lib/route-page-html.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { pageFilenameToRouteId } from './scripts/lib/route-page-filename-decode.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { APP_PAGES } from './scripts/lib/app-page-html.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const routePagesCacheFile = resolve(root, '.cache/route-pages-data.json')
const routePagesDistFile = resolve(root, 'dist/route-pages-data.json')

async function writeRoutePagesManifest(outFile: string) {
  const { routes } = await import('./src/data/routes.ts')
  const { mergeRoutesByBaseNumber } = await import('./src/utils/routeMerge.ts')
  const { busRouteToPageData } = await import('./src/utils/routePageDataFormat.ts')

  const merged = mergeRoutesByBaseNumber(routes)
  const manifest = Object.fromEntries(
    merged.map((route) => [route.id, busRouteToPageData(route)]),
  )

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

function routePagesDataPlugin(): Plugin {
  return {
    name: 'route-pages-data',
    apply: 'build',
    async buildStart() {
      await writeRoutePagesManifest(routePagesCacheFile)
      await writeRoutePagesManifest(routePagesDistFile)
    },
  }
}

function routePagesDataDevPlugin(): Plugin {
  return {
    name: 'route-pages-data-dev',
    apply: 'serve',
    async configureServer() {
      await writeRoutePagesManifest(routePagesCacheFile)
    },
  }
}

function publishStandalonePlugin(buildTag: string): Plugin {
  return {
    name: 'publish-standalone-root',
    apply: 'build',
    closeBundle() {
      publishStandalone({ buildTag })
    },
  }
}

/** 开发时 / 与 /index.html 指向 dev.html；根目录 ann.html 等作为独立栏目入口 */
function devEntryRedirectPlugin(): Plugin {
  const devAppPages = APP_PAGES.filter((page) => page.tab !== 'routes')

  return {
    name: 'dev-entry-redirect',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = req.url?.split('?')[0] ?? ''
        const routePage = pathOnly.match(/^\/routes\/(.+)\.html$/)
        if (routePage) {
          const routeId = pageFilenameToRouteId(decodeURIComponent(routePage[1]!))
          void writeRoutePagesManifest(routePagesCacheFile)
            .then((manifest) => {
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(renderRoutePageHtml(routeId, manifest[routeId] ?? { id: routeId }))
            })
            .catch(() => {
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(renderRoutePageHtml(routeId, { id: routeId }))
            })
          return
        }

        const appPage = devAppPages.find((page) => pathOnly === `/${page.publishFile}`)
        if (appPage) {
          const file = resolve(root, appPage.devFile)
          if (existsSync(file)) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(readFileSync(file, 'utf8'))
            return
          }
        }

        if (pathOnly === '/' || pathOnly === '/index.html') {
          const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          req.url = `/dev.html${qs}`
        }

        if (pathOnly === '/secret.html') {
          const file = resolve(root, 'pages/secret.html')
          if (existsSync(file)) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(readFileSync(file, 'utf8'))
            return
          }
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
      routePagesDataPlugin(),
      routePagesDataDevPlugin(),
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
      proxy: {
        '/api/auth': { target: 'http://localhost:8788', changeOrigin: true },
        '/api/user': { target: 'http://localhost:8788', changeOrigin: true },
      },
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
