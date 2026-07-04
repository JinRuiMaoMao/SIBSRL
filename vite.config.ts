import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin, type ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
// @ts-expect-error publish script is plain .mjs without types
import { publishStandalone } from './scripts/publish-standalone.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { renderRoutePageHtml } from './scripts/lib/route-page-html.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { pageFilenameToRouteId } from './scripts/lib/route-page-filename-decode.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { APP_PAGES } from './scripts/lib/app-page-html.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { injectStartBootSplash } from './scripts/lib/start-boot-splash.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { buildRouteMapsManifest } from './scripts/build-route-maps-manifest.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { buildStopNameAudioManifest } from './scripts/build-stop-name-audio-manifest.mjs'
// @ts-expect-error build helper is plain .mjs without types
import { buildNpcManifest } from './scripts/build-npc-manifest.mjs'

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

function npcManifestPlugin(): Plugin {
  return {
    name: 'npc-manifest',
    apply: 'build',
    buildStart() {
      buildNpcManifest()
    },
  }
}

function npcManifestDevPlugin(): Plugin {
  return {
    name: 'npc-manifest-dev',
    apply: 'serve',
    configureServer() {
      buildNpcManifest()
    },
  }
}

function stopNameAudioManifestPlugin(): Plugin {
  return {
    name: 'stop-name-audio-manifest',
    apply: 'build',
    buildStart() {
      buildStopNameAudioManifest()
    },
  }
}

function stopNameAudioManifestDevPlugin(): Plugin {
  return {
    name: 'stop-name-audio-manifest-dev',
    apply: 'serve',
    configureServer() {
      buildStopNameAudioManifest()
    },
  }
}

function routeMapsManifestPlugin(): Plugin {
  return {
    name: 'route-maps-manifest',
    apply: 'build',
    buildStart() {
      buildRouteMapsManifest()
    },
  }
}

function routeMapsManifestDevPlugin(): Plugin {
  return {
    name: 'route-maps-manifest-dev',
    apply: 'serve',
    configureServer() {
      buildRouteMapsManifest()
    },
  }
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

/** 开发时 / 与 /index.html 为开始页；/routes.html 与 dev.html 为线路查询 */
interface AppPageEntry {
  tab: string
  publishFile: string
  devFile: string
}

function normalizeDevRequestPath(url: string | undefined): string {
  const pathOnly = url?.split('?')[0]?.split('#')[0] ?? '/'
  const normalized = pathOnly.replace(/\/+$/, '') || '/'
  return normalized.toLowerCase()
}

function serveTransformedDevHtml(
  server: ViteDevServer,
  _req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
  filePath: string,
  url: string,
) {
  if (!existsSync(filePath)) {
    next()
    return
  }

  const html = readFileSync(filePath, 'utf8')
  const preparedHtml = filePath.endsWith('start.html') ? injectStartBootSplash(html) : html
  void server
    .transformIndexHtml(url, preparedHtml)
    .then((transformed) => {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(transformed)
    })
    .catch((error) => {
      server.config.logger.error(error instanceof Error ? error.message : String(error))
      next(error instanceof Error ? error : new Error(String(error)))
    })
}

function devEntryRedirectPlugin(): Plugin {
  const devAppPages = (APP_PAGES as AppPageEntry[]).filter((page) => page.tab !== 'routes')

  return {
    name: 'dev-entry-redirect',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = normalizeDevRequestPath(req.url)

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
          serveTransformedDevHtml(server, req, res, next, file, req.url ?? pathOnly)
          return
        }

        if (pathOnly === '/' || pathOnly === '/index.html') {
          const file = resolve(root, 'pages/start.html')
          serveTransformedDevHtml(server, req, res, next, file, req.url ?? pathOnly)
          return
        }

        if (pathOnly === '/routes.html' || pathOnly === '/dev.html') {
          const file = resolve(root, 'dev.html')
          serveTransformedDevHtml(server, req, res, next, file, '/dev.html')
          return
        }

        if (pathOnly === '/secret.html') {
          const file = resolve(root, 'pages/secret.html')
          serveTransformedDevHtml(server, req, res, next, file, req.url ?? pathOnly)
          return
        }

        if (pathOnly === '/account.html') {
          const file = resolve(root, 'pages/account.html')
          serveTransformedDevHtml(server, req, res, next, file, req.url ?? pathOnly)
          return
        }

        if (pathOnly === '/settings.html') {
          const file = resolve(root, 'pages/settings.html')
          serveTransformedDevHtml(server, req, res, next, file, req.url ?? pathOnly)
          return
        }

        if (pathOnly === '/route-map.html') {
          const file = resolve(root, 'pages/route-map.html')
          serveTransformedDevHtml(server, req, res, next, file, req.url ?? pathOnly)
          return
        }

        if (pathOnly === '/map-draw.html') {
          const file = resolve(root, 'pages/map-draw.html')
          serveTransformedDevHtml(server, req, res, next, file, req.url ?? pathOnly)
          return
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
      routeMapsManifestPlugin(),
      routeMapsManifestDevPlugin(),
      stopNameAudioManifestPlugin(),
      stopNameAudioManifestDevPlugin(),
      npcManifestPlugin(),
      npcManifestDevPlugin(),
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
