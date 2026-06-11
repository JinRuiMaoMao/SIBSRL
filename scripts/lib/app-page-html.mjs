/** @typedef {'routes' | 'broadcast' | 'music' | 'complaints' | 'updates'} AppTabId */

/** @type {Array<{ tab: AppTabId, devFile: string, publishFile: string, titleZh: string }>} */
export const APP_PAGES = [
  { tab: 'routes', devFile: 'dev.html', publishFile: 'index.html', titleZh: '线路查询' },
  { tab: 'broadcast', devFile: 'pages/ann.html', publishFile: 'ann.html', titleZh: '广播' },
  { tab: 'music', devFile: 'pages/music.html', publishFile: 'music.html', titleZh: '音乐' },
  { tab: 'complaints', devFile: 'pages/complaints.html', publishFile: 'complaints.html', titleZh: '抱怨' },
  { tab: 'updates', devFile: 'pages/updates.html', publishFile: 'updates.html', titleZh: '版本更新' },
]

/** @param {AppTabId} tab */
export function findAppPageByTab(tab) {
  return APP_PAGES.find((page) => page.tab === tab)
}

/** @param {string} pathOnly e.g. /ann.html */
export function findAppPageByPath(pathOnly) {
  const name = pathOnly.split('/').pop()?.toLowerCase() ?? ''
  return APP_PAGES.find((page) => page.devFile === name || page.publishFile === name)
}

/** @param {string} html @param {AppTabId} tab */
export function injectAppTabMeta(html, tab) {
  const meta = `<meta name="app-tab" content="${tab}" />`
  if (html.includes('name="app-tab"')) {
    return html.replace(/name="app-tab" content="[^"]*"/, `name="app-tab" content="${tab}"`)
  }
  return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`)
}

/** @param {string} html @param {string} titleZh */
export function adjustAppPageTitle(html, titleZh) {
  const title = `${titleZh} · 阳光群岛线路查询`
  return html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
}

const SECRET_ACCESS_STORAGE_KEY = 'sibs-secret-unlock'

const SECRET_ACCESS_GUARD_SCRIPT = `<script id="secret-access-guard">
(function () {
  try {
    if (sessionStorage.getItem('${SECRET_ACCESS_STORAGE_KEY}') !== '1') {
      location.replace('./index.html');
    }
  } catch (e) {
    location.replace('./index.html');
  }
})();
</script>`

/** @param {string} html */
export function injectSecretAccessGuard(html) {
  if (html.includes('id="secret-access-guard"')) return html
  return html.replace('<head>', `<head>\n    ${SECRET_ACCESS_GUARD_SCRIPT}`)
}

/** @param {string} html */
export function injectSecretPageMeta(html) {
  let out = html.replace(/<meta name="app-tab"[^>]*>\s*/g, '')
  const head = out.split('</head>')[0] ?? out
  if (/<meta name="app-page"[^>]*>/i.test(head)) {
    out = out.replace(
      /(<meta name="app-page" content=")[^"]*(")/i,
      `$1secret$2`,
    )
  } else {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-page" content="secret" />`,
    )
  }
  return injectSecretAccessGuard(out)
}
