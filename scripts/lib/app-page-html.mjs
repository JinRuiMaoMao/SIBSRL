/** @typedef {'routes' | 'broadcast' | 'music' | 'complaints' | 'trivia' | 'updates'} AppTabId */

/** @type {Array<{ tab: AppTabId, devFile: string, publishFile: string, titleZh: string }>} */
export const APP_PAGES = [
  { tab: 'routes', devFile: 'dev.html', publishFile: 'routes.html', titleZh: '线路查询' },
  { tab: 'broadcast', devFile: 'pages/ann.html', publishFile: 'ann.html', titleZh: '广播' },
  { tab: 'music', devFile: 'pages/music.html', publishFile: 'music.html', titleZh: '音乐' },
  { tab: 'complaints', devFile: 'pages/complaints.html', publishFile: 'complaints.html', titleZh: 'NPC' },
  { tab: 'trivia', devFile: 'pages/trivia.html', publishFile: 'trivia.html', titleZh: '你知道吗' },
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

/** @param {string} html @param {string} titleZh @param {{ standalone?: boolean }} [options] */
export function adjustAppPageTitle(html, titleZh, options = {}) {
  const title = options.standalone ? titleZh : `${titleZh} · 阳光群岛线路查询`
  return html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
}

const NOSCRIPT_GUARD_HTML = `<noscript>
  <style>
    #root, .boot-hint { display: none !important; }
    .noscript-wall {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 2rem;
      box-sizing: border-box;
      font-family: system-ui, sans-serif;
      background: #0f1419;
      color: #e7e9ea;
      text-align: center;
      line-height: 1.6;
    }
    .noscript-wall h1 { font-size: 1.25rem; margin: 0 0 0.75rem; font-weight: 700; }
    .noscript-wall p { margin: 0.35rem 0; color: #8b98a5; max-width: 26rem; }
  </style>
  <div class="noscript-wall" id="noscript-wall" role="alert">
    <p><img src="./sibs-logo.png" alt="" width="48" height="48" decoding="async" /></p>
    <h1>请启用 JavaScript</h1>
    <p>阳光群岛线路查询工具需要 JavaScript 才能运行，请在浏览器设置中开启后刷新页面。</p>
    <p lang="en">This site requires JavaScript. Please enable it in your browser settings and reload.</p>
  </div>
</noscript>`

/** @param {string} html @param {string} [url] */
export function injectUserApiMeta(html, url = process.env.VITE_USER_API_URL?.trim() || 'https://sibs-user-api.onrender.com') {
  const normalized = url.replace(/\/$/, '')
  const meta = `<meta name="user-api-url" content="${normalized}" />`
  if (html.includes('name="user-api-url"')) {
    return html.replace(/name="user-api-url" content="[^"]*"/, `name="user-api-url" content="${normalized}"`)
  }
  return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`)
}

/** @param {string} html */
export function injectNoScriptGuard(html) {
  if (html.includes('id="noscript-wall"')) return html
  return html.replace('<body>', `<body>\n    ${NOSCRIPT_GUARD_HTML}`)
}

const DEVTOOLS_BLOCK_SCRIPT = `<script id="devtools-block">
(function () {
  var INDEX = './index.html';
  var href = String(window.location.href || '');
  var protocol = String(window.location.protocol || '');
  if (/^view-source:/i.test(href) || protocol === 'view-source:') {
    window.location.replace(INDEX);
    return;
  }
  function isBlocked(event) {
    var key = event.key || '';
    if (key === 'F12') return true;
    var upper = key.toUpperCase();
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && 'IJC'.indexOf(upper) >= 0) return true;
    if (upper === 'U') {
      if (event.ctrlKey && !event.shiftKey && !event.altKey) return true;
      if (event.metaKey && event.altKey) return true;
    }
    if (upper === 'S' && (event.ctrlKey || event.metaKey)) return true;
    return false;
  }
  function block(event) {
    if (!isBlocked(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    return false;
  }
  ['keydown', 'keyup', 'keypress'].forEach(function (type) {
    window.addEventListener(type, block, true);
    document.addEventListener(type, block, true);
  });
  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var link = target.closest('a[href]');
      if (!link) return;
      var linkHref = String(link.getAttribute('href') || '');
      if (/^view-source:/i.test(linkHref)) {
        event.preventDefault();
        event.stopPropagation();
        window.location.replace(INDEX);
      }
    },
    true,
  );
})();
</script>`

/** @param {string} html */
export function injectDevToolsBlock(html) {
  if (html.includes('id="devtools-block"')) return html
  return html.replace('<head>', `<head>\n    ${DEVTOOLS_BLOCK_SCRIPT}`)
}

const THEME_STORAGE_KEY = 'sibs-theme'

const THEME_BOOTSTRAP_SCRIPT = `<script id="theme-bootstrap">
(function () {
  function resolveSystemAppearance() {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'dark';
    }
  }

  try {
    var pref = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (pref !== 'light' && pref !== 'dark' && pref !== 'system') pref = 'system';
    document.documentElement.setAttribute(
      'data-theme',
      pref === 'system' ? resolveSystemAppearance() : pref,
    );
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
</script>`

/** @param {string} html */
export function injectAppSurfaceBootstrap(html) {
  if (html.includes('id="app-surface-bootstrap"')) return html
  return html.replace('</head>', `    ${APP_SURFACE_BOOTSTRAP_SCRIPT}\n  </head>`)
}

/** @param {string} html */
export function injectThemeBootstrap(html) {
  if (html.includes('id="theme-bootstrap"')) return html
  return html.replace('<head>', `<head>\n    ${THEME_BOOTSTRAP_SCRIPT}`)
}

const LOCALE_STORAGE_KEY = 'sibs-locale'

const APP_PREFERENCES_STORAGE_KEY = 'sibs-app-preferences'

const APP_SURFACE_BOOTSTRAP_SCRIPT = `<script id="app-surface-bootstrap">
(function () {
  var tab = document.querySelector('meta[name="app-tab"]');
  if (tab && tab.content) document.documentElement.setAttribute('data-app-tab', tab.content.trim());
  var page = document.querySelector('meta[name="app-page"]');
  if (page && page.content) document.documentElement.setAttribute('data-app-page', page.content.trim());
  try {
    var prefs = JSON.parse(localStorage.getItem('${APP_PREFERENCES_STORAGE_KEY}') || 'null');
    var fill = 25;
    if (prefs && typeof prefs.panelFill === 'number') {
      fill = Math.min(75, Math.max(25, Math.round(prefs.panelFill)));
    } else if (prefs && prefs.panelStyle === 'classic') {
      fill = 75;
    }
    document.documentElement.style.setProperty('--panel-fill', fill + '%');
    if (prefs && prefs.panelNoFill) {
      document.documentElement.style.setProperty('--panel-fill', '0%');
      document.documentElement.setAttribute('data-panel-no-fill', 'true');
    }
    if (prefs && prefs.desktopTabBarPinned) {
      document.documentElement.setAttribute('data-desktop-tab-bar-pinned', 'true');
    }
  } catch (e) {
    document.documentElement.style.setProperty('--panel-fill', '25%');
  }
})();
</script>`

const LOCALE_BOOTSTRAP_SCRIPT = `<script id="locale-bootstrap">
(function () {
  var key = '${LOCALE_STORAGE_KEY}';
  var langs = { vi:'vi', 'zh-Hans':'zh-Hans', 'zh-Hant':'zh-Hant', da:'da', en:'en', fil:'fil', id:'id', ko:'ko', 'pt-BR':'pt-BR', de:'de', es:'es', fr:'fr', ja:'ja', pl:'pl', sv:'sv' };
  try {
    var stored = localStorage.getItem(key);
    if (stored && Object.prototype.hasOwnProperty.call(langs, stored)) {
      document.documentElement.lang = langs[stored];
    }
  } catch (e) {}
})();
</script>`

/** @param {string} html */
export function injectLocaleBootstrap(html) {
  if (html.includes('id="locale-bootstrap"')) return html
  return html.replace('</script>\n    <meta name="app-tab"', `</script>\n    ${LOCALE_BOOTSTRAP_SCRIPT}\n    <meta name="app-tab"`)
    .replace('</script>\n    <meta name="app-build"', `</script>\n    ${LOCALE_BOOTSTRAP_SCRIPT}\n    <meta name="app-build"`)
    .replace('</script>\n    <!-- 开发入口', `</script>\n    ${LOCALE_BOOTSTRAP_SCRIPT}\n    <!-- 开发入口`)
    .replace('</script>\n    <link rel="icon"', `</script>\n    ${LOCALE_BOOTSTRAP_SCRIPT}\n    <link rel="icon"`)
}

/** @param {string} [buildTag] @param {string} [assetPrefix] */
export function buildFaviconLinks(buildTag = '', assetPrefix = './') {
  const version = buildTag ? `?v=${encodeURIComponent(buildTag)}` : ''
  const href = `${assetPrefix}sibs-logo.png${version}`
  return [
    `<link rel="icon" href="${href}" type="image/png" sizes="53x53" />`,
    `<link rel="apple-touch-icon" href="${href}" sizes="180x180" />`,
    `<link rel="apple-touch-icon-precomposed" href="${href}" />`,
  ].join('\n    ')
}

/** @param {string} html @param {string} [buildTag] */
export function syncFaviconLink(html, buildTag = '') {
  const withoutIcons = html.replace(
    /\s*<link rel="(?:icon|apple-touch-icon(?:-precomposed)?)"[^>]*>\s*/gi,
    '\n',
  )
  const links = buildFaviconLinks(buildTag)
  if (withoutIcons.includes('name="app-build"')) {
    return withoutIcons.replace(
      /(<meta name="app-build" content="[^"]*" \/>)/,
      `$1\n    ${links}`,
    )
  }
  return withoutIcons.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${links}`)
}

const SECRET_ACCESS_STORAGE_KEY = 'sibs-secret-unlock'

const SECRET_ACCESS_GUARD_SCRIPT = `<script id="secret-access-guard">
(function () {
  try {
    if (sessionStorage.getItem('${SECRET_ACCESS_STORAGE_KEY}') !== '1') {
      location.replace('./routes.html');
    }
  } catch (e) {
    location.replace('./routes.html');
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

/** @param {string} html */
export function injectSettingsPageMeta(html) {
  let out = html.replace(/<meta name="app-tab"[^>]*>\s*/g, '')
  const head = out.split('</head>')[0] ?? out
  if (/<meta name="app-page"[^>]*>/i.test(head)) {
    out = out.replace(
      /(<meta name="app-page" content=")[^"]*(")/i,
      `$1settings$2`,
    )
  } else {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-page" content="settings" />`,
    )
  }
  return out
}

const START_ROUTE_REDIRECT_SCRIPT = `<script id="start-route-redirect">
(function () {
  var q = window.location.search || '';
  if (!q) return;
  var params = new URLSearchParams(q);
  if (params.has('route') || params.has('from') || params.has('to') || params.has('q')) {
    window.location.replace('./routes.html' + q + (window.location.hash || ''));
  }
})();
</script>`

/** @param {string} html */
export function injectStartPageMeta(html) {
  let out = html.replace(/<meta name="app-tab"[^>]*>\s*/g, '')
  const head = out.split('</head>')[0] ?? out
  if (/<meta name="app-page"[^>]*>/i.test(head)) {
    out = out.replace(
      /(<meta name="app-page" content=")[^"]*(")/i,
      `$1start$2`,
    )
  } else {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-page" content="start" />`,
    )
  }
  if (!out.includes('id="start-route-redirect"')) {
    out = out.replace('<head>', `<head>\n    ${START_ROUTE_REDIRECT_SCRIPT}`)
  }
  return out
}

/** @param {string} html */
export function injectAccountPageMeta(html) {
  let out = html.replace(/<meta name="app-tab"[^>]*>\s*/g, '')
  const head = out.split('</head>')[0] ?? out
  if (/<meta name="app-page"[^>]*>/i.test(head)) {
    out = out.replace(
      /(<meta name="app-page" content=")[^"]*(")/i,
      `$1account$2`,
    )
  } else {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-page" content="account" />`,
    )
  }
  return out
}

const SERVICE_WORKER_BOOTSTRAP_SCRIPT = `<script id="sw-register">
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
}
</script>`

/** @param {string} html */
export function injectServiceWorkerBootstrap(html) {
  if (html.includes('id="sw-register"')) return html
  return html.replace('</head>', `    ${SERVICE_WORKER_BOOTSTRAP_SCRIPT}\n  </head>`)
}
