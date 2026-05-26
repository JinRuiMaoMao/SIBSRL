import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
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

// https://vite.dev/config/
export default defineConfig(() => {
  const appBuild = new Date().toISOString()

  return {
    plugins: [react(), viteSingleFile(), publishStandalonePlugin(appBuild)],
    base: './',
    define: {
      __APP_BUILD__: JSON.stringify(appBuild),
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
