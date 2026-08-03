/** @typedef {'routes' | 'broadcast' | 'music' | 'complaints' | 'trivia' | 'updates'} AppTabId */

/** @type {Array<{ tab: AppTabId, devFile: string, publishFile: string, titleZh: string, seoTitleZh?: string }>} */
export const APP_PAGES = [
  {
    tab: 'routes',
    devFile: 'dev.html',
    publishFile: 'routes.html',
    titleZh: '线路查询',
    seoTitleZh:
      '阳光群岛 Roblox 巴士模拟器 (SIBS) 官方线路查询工具 | 站序、车费、群岛地图与报站音频',
  },
  {
    tab: 'broadcast',
    devFile: 'pages/ann.html',
    publishFile: 'ann.html',
    titleZh: '广播',
    seoTitleZh: '阳光群岛 SIBS 广播与报站资源 | Roblox 巴士模拟器线路音频参考',
  },
  {
    tab: 'music',
    devFile: 'pages/music.html',
    publishFile: 'music.html',
    titleZh: '音乐',
    seoTitleZh: '阳光群岛巴士线路音乐与车厂音乐试听 | SIBS Roblox 巴士模拟器',
  },
  {
    tab: 'complaints',
    devFile: 'pages/complaints.html',
    publishFile: 'complaints.html',
    titleZh: 'NPC',
    seoTitleZh: '阳光群岛 NPC 乘客语音试听 | SIBS Roblox 巴士模拟器投诉与互动音频',
  },
  {
    tab: 'trivia',
    devFile: 'pages/trivia.html',
    publishFile: 'trivia.html',
    titleZh: '你知道吗',
    seoTitleZh: '阳光群岛巴士冷知识与你知道吗 | SIBS Roblox 巴士模拟器趣味资料',
  },
  {
    tab: 'updates',
    devFile: 'pages/updates.html',
    publishFile: 'updates.html',
    titleZh: '版本更新',
    seoTitleZh: '阳光群岛线路查询版本更新日志 | SIBS Route Lookup 功能与数据更新',
  },
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

export {
  injectSocialMeta,
  socialMetaForAppPage,
  socialMetaForRoutePage,
  buildCanonicalSiteUrl,
  buildOgImageUrl,
  readOgImageContentVersion,
  SITE_SOCIAL_DEFAULTS,
} from './site-social-meta.mjs'

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
    #start-boot-splash { display: none !important; }
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

const PORTRAIT_REAL_LAYOUT_CHECK = `function isRealLayoutSite() {
    var path = String(window.location.pathname || '').replace(/\\\\/g, '/');
    if (/\\/real(?:\\/|$)/i.test(path)) return true;
    if (/\\/normal(?:\\/|$)/i.test(path)) return false;
    var meta = document.querySelector('meta[name="app-layout-mode"]');
    return !!(meta && meta.content && meta.content.trim() === 'real');
  }`

const PORTRAIT_BLOCK_BOOTSTRAP_SCRIPT = `<script id="portrait-block-bootstrap">
(function () {
  ${PORTRAIT_REAL_LAYOUT_CHECK}
  var mq = window.matchMedia('(orientation: portrait) and (max-width: 1024px), (max-aspect-ratio: 1/1) and (max-width: 1024px)');
  function apply() {
    if (!isRealLayoutSite()) {
      document.documentElement.removeAttribute('data-portrait-blocked');
      return;
    }
    document.documentElement.setAttribute('data-portrait-blocked', mq.matches ? 'true' : 'false');
  }
  apply();
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', apply);
  else if (typeof mq.addListener === 'function') mq.addListener(apply);
  window.addEventListener('orientationchange', function () { window.setTimeout(apply, 120); });
  window.addEventListener('resize', apply);
})();
</script>`

/** @param {string} html */
export function injectPortraitBlockBootstrap(html) {
  if (html.includes('id="portrait-block-bootstrap"')) return html
  return html.replace('<head>', `<head>\n    ${PORTRAIT_BLOCK_BOOTSTRAP_SCRIPT}`)
}

const PORTRAIT_ORIENTATION_FALLBACK = `<div id="portrait-orientation-fallback" class="portrait-orientation-gate portrait-orientation-gate--static" aria-live="assertive">
  <div class="portrait-orientation-gate-card">
    <p><img src="./sibs-logo.png" alt="" width="56" height="56" decoding="async" /></p>
    <h1>请旋转设备至横屏</h1>
    <p>分屏模式仅支持横屏。请将手机或平板转至横屏后再继续。</p>
    <p lang="en">Split layout requires landscape. Please rotate your device to continue.</p>
  </div>
</div>`

/** @param {string} html */
export function stripPortraitOrientationBlocks(html) {
  let out = html.replace(/<script id="portrait-block-bootstrap">[\s\S]*?<\/script>\s*/gi, '')
  if (out.includes('id="portrait-orientation-fallback"')) {
    out = out.replace(`${PORTRAIT_ORIENTATION_FALLBACK}\n    `, '').replace(PORTRAIT_ORIENTATION_FALLBACK, '')
  }
  return out
}

/** @param {string} html */
export function injectPortraitOrientationFallback(html) {
  if (html.includes('id="portrait-orientation-fallback"')) return html
  return html.replace(
    '<div id="root">',
    `${PORTRAIT_ORIENTATION_FALLBACK}\n    <div id="root">`,
  )
}

const LOCALE_STORAGE_KEY = 'sibs-locale'

/** @type {Array<{ dir: string, mode: 'normal' | 'real' }>} */
export const APP_LAYOUT_PUBLISH = [
  { dir: 'normal', mode: 'normal' },
  { dir: 'real', mode: 'real' },
]

/** @param {string} html @param {'normal' | 'real'} mode */
export function injectAppLayoutModeMeta(html, mode) {
  const meta = `<meta name="app-layout-mode" content="${mode}" />`
  if (/<meta name="app-layout-mode"/i.test(html)) {
    return html.replace(/name="app-layout-mode" content="[^"]*"/, `name="app-layout-mode" content="${mode}"`)
  }
  if (/<meta name="app-tab"/i.test(html)) {
    return html.replace(
      /(<meta name="app-tab" content="[^"]*" \/>)/,
      `$1\n    ${meta}`,
    )
  }
  return html.replace(/<meta charset="UTF-8"\s*\/>/, (match) => `${match}\n    ${meta}`)
}

/** @param {string} html */
export function rewritePublishedHtmlForLayoutSubdir(html) {
  return html
    .replace(/"\.\/assets\//g, '"../assets/')
    .replace(/'\.\/assets\//g, "'../assets/")
    .replace(/src="\.\/assets\//g, 'src="../assets/')
    .replace(/"\.\/maps\//g, '"../maps/')
    .replace(/"\.\/audio\//g, '"../audio/')
    .replace(/"\.\/route-maps\//g, '"../route-maps/')
    .replace(/href="\.\/sibs-logo/g, 'href="../sibs-logo')
    .replace(/src="\.\/sibs-logo/g, 'src="../sibs-logo')
    .replace(/"\.\/company-logos\//g, '"../company-logos/')
    .replace(/'\.\/company-logos\//g, "'../company-logos/")
    .replace(/var INDEX = '\.\/index\.html';/g, "var INDEX = '../index.html';")
    .replace(/register\('\.\/sw\.js'/g, "register('../sw.js'")
}

/** @param {string} targetPath e.g. normal/routes.html */
export function buildLegacyLayoutRedirectHtml(targetPath) {
  const clean = targetPath.replace(/^\.\//, '')
  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8" />
  <script>location.replace('./${clean}'+location.search+location.hash);</script>
  <meta http-equiv="refresh" content="0;url=./${clean}" />
  <title>Redirecting…</title>
</head>
<body><p><a href="./${clean}">Continue</a></p></body>
</html>`
}

/** @param {string} html @param {'normal' | 'real'} layoutMode @param {boolean} forSubdir */
export function prepareLayoutScopedHtml(html, layoutMode, forSubdir) {
  let out = injectAppLayoutModeMeta(html, layoutMode)
  if (layoutMode === 'normal') {
    out = stripPortraitOrientationBlocks(out)
  }
  if (forSubdir) out = rewritePublishedHtmlForLayoutSubdir(out)
  return out
}

const APP_PREFERENCES_STORAGE_KEY = 'sibs-app-preferences'

const APP_SURFACE_BOOTSTRAP_SCRIPT = `<script id="app-surface-bootstrap">
(function () {
  var tab = document.querySelector('meta[name="app-tab"]');
  if (tab && tab.content) document.documentElement.setAttribute('data-app-tab', tab.content.trim());
  var page = document.querySelector('meta[name="app-page"]');
  if (page && page.content) document.documentElement.setAttribute('data-app-page', page.content.trim());
  var layout = document.querySelector('meta[name="app-layout-mode"]');
  if (layout && layout.content) {
    document.documentElement.setAttribute('data-app-layout-mode', layout.content.trim());
    document.documentElement.setAttribute('data-route-lookup-layout', layout.content.trim() === 'real' ? 'split' : 'grid');
  }
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

export const BOOT_HINT_DEFAULT = '本站加载中…'

const LOCALE_BOOTSTRAP_SCRIPT = `<script id="locale-bootstrap">
(function () {
  var key = '${LOCALE_STORAGE_KEY}';
  var langs = { vi:'vi', 'zh-Hans':'zh-Hans', 'zh-Hant':'zh-Hant', da:'da', en:'en', fil:'fil', id:'id', ko:'ko', 'pt-BR':'pt-BR', de:'de', es:'es', fr:'fr', ja:'ja', pl:'pl', sv:'sv' };
  var bootHints = {
    vi: 'Đang tải trang…',
    'zh-Hans': '${BOOT_HINT_DEFAULT}',
    'zh-Hant': '本站載入中…',
    da: 'Indlæser websted…',
    en: 'Loading site…',
    fil: 'Naglo-load ng site…',
    id: 'Memuat situs…',
    ko: '사이트 불러오는 중…',
    'pt-BR': 'Carregando o site…',
    de: 'Website wird geladen…',
    es: 'Cargando el sitio…',
    fr: 'Chargement du site…',
    ja: 'サイトを読み込み中…',
    pl: 'Wczytywanie witryny…',
    sv: 'Laddar webbplatsen…',
  };
  try {
    var stored = localStorage.getItem(key);
    if (stored && Object.prototype.hasOwnProperty.call(langs, stored)) {
      document.documentElement.lang = langs[stored];
    }
  } catch (e) {}
  var hint = document.querySelector('.boot-hint');
  if (hint) {
    var lang = document.documentElement.lang || 'zh-Hans';
    hint.textContent = bootHints[lang] || bootHints['zh-Hans'];
  }
})();
</script>`

/** @param {string} html */
export function injectLocaleBootstrap(html) {
  if (html.includes('bootHints')) return html
  if (html.includes('id="locale-bootstrap"')) {
    return html.replace(/<script id="locale-bootstrap">[\s\S]*?<\/script>/, LOCALE_BOOTSTRAP_SCRIPT)
  }
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
      location.replace('./normal/routes.html');
    }
  } catch (e) {
    location.replace('./normal/routes.html');
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
    window.location.replace('./normal/routes.html' + q + (window.location.hash || ''));
  }
})();
</script>`

const REAL_LAYOUT_MUSIC_EARLY_BOOTSTRAP = `<script id="real-layout-music-early-bootstrap">
(function () {
  var layoutMeta = document.querySelector('meta[name="app-layout-mode"]');
  if (!layoutMeta || layoutMeta.content.trim() !== 'real') return;
  var pageMeta = document.querySelector('meta[name="app-page"]');
  var tabMeta = document.querySelector('meta[name="app-tab"]');
  var page = pageMeta && pageMeta.content ? pageMeta.content.trim() : '';
  var tab = tabMeta && tabMeta.content ? tabMeta.content.trim() : '';
  var track = page === 'start'
    ? '../audio/broadcasts/music/music-main-menu.ogg'
    : (tab === 'routes' ? '../audio/broadcasts/music/music-map-menu-intro.ogg' : '');
  if (!track) return;
  try { if (sessionStorage.getItem('sibs-real-music-muted') === '1') return; } catch (e) {}
  var audio = new Audio(track);
  audio.loop = false;
  audio.preload = 'auto';
  if (tab === 'routes') {
    var introUrl = '../audio/broadcasts/music/music-map-menu-intro.ogg';
    var bridgeUrl = '../audio/broadcasts/music/music-map-menu-bridge.ogg';
    var loopUrl = '../audio/broadcasts/music/music-map-menu-loop.ogg';
    var introFadeAt = 30;
    var fadeMs = 900;
    var fadeLead = fadeMs / 1000;
    var targetVolume = 1;
    var phase = 'intro';
    var crossfadeStarted = false;
    var bridgeAudio = new Audio(bridgeUrl);
    var loopAudio = new Audio(loopUrl);
    bridgeAudio.preload = 'auto';
    loopAudio.preload = 'auto';
    bridgeAudio.load();
    loopAudio.load();
    window.__SIBS_REAL_LAYOUT_AUDIO_EXTRA__ = bridgeAudio;
    function rampVolume(el, currentTime, fadeAt) {
      var fadeEnd = fadeAt + fadeLead;
      if (currentTime <= fadeAt) {
        el.volume = targetVolume;
        return;
      }
      if (currentTime >= fadeEnd) {
        el.volume = 0;
        return;
      }
      var progress = (currentTime - fadeAt) / fadeLead;
      el.volume = targetVolume * (1 - progress);
    }
    function resolveNext() {
      if (phase === 'intro') return { el: bridgeAudio, nextPhase: 'bridge' };
      if (phase === 'bridge') return { el: loopAudio, nextPhase: 'loop' };
      if (audio === loopAudio) return { el: new Audio(loopUrl), nextPhase: 'loop' };
      return { el: loopAudio, nextPhase: 'loop' };
    }
    function startBridgeOverlap() {
      if (crossfadeStarted) return;
      crossfadeStarted = true;
      bridgeAudio.currentTime = 0;
      bridgeAudio.volume = targetVolume;
      bridgeAudio.muted = audio.muted;
      if (bridgeAudio.paused) bridgeAudio.play().catch(function () {});
    }
    function handoffToBridge() {
      audio.pause();
      audio.removeEventListener('timeupdate', onIntroTime);
      audio.removeEventListener('ended', onIntroEnded);
      audio = bridgeAudio;
      phase = 'bridge';
      crossfadeStarted = false;
      window.__SIBS_REAL_LAYOUT_AUDIO__ = audio;
      window.__SIBS_REAL_LAYOUT_AUDIO_EXTRA__ = loopAudio;
      audio.addEventListener('ended', onSegmentEnded);
    }
    function handoffToNext() {
      if (window.__SIBS_REAL_LAYOUT_MUSIC_ADOPTED__) return;
      var next = resolveNext();
      var nextEl = next.el;
      if (phase === 'loop') loopAudio = nextEl;
      audio.pause();
      audio.removeEventListener('ended', onSegmentEnded);
      audio = nextEl;
      phase = next.nextPhase;
      window.__SIBS_REAL_LAYOUT_AUDIO__ = audio;
      if (phase === 'bridge') window.__SIBS_REAL_LAYOUT_AUDIO_EXTRA__ = loopAudio;
      if (phase === 'loop') window.__SIBS_REAL_LAYOUT_AUDIO_EXTRA__ = bridgeAudio;
      nextEl.currentTime = 0;
      nextEl.volume = targetVolume;
      nextEl.muted = audio.muted;
      nextEl.addEventListener('ended', onSegmentEnded);
      try { if (sessionStorage.getItem('sibs-real-music-muted') !== '1') nextEl.play().catch(function () {}); } catch (e) {}
    }
    function onIntroTime() {
      if (window.__SIBS_REAL_LAYOUT_MUSIC_ADOPTED__) return;
      if (audio.currentTime >= introFadeAt) startBridgeOverlap();
      rampVolume(audio, audio.currentTime, introFadeAt);
      if (audio.currentTime >= introFadeAt + fadeLead) handoffToBridge();
    }
    function onIntroEnded() {
      if (window.__SIBS_REAL_LAYOUT_MUSIC_ADOPTED__) return;
      if (!crossfadeStarted) startBridgeOverlap();
      handoffToBridge();
    }
    function onSegmentEnded() {
      handoffToNext();
    }
    audio.addEventListener('timeupdate', onIntroTime);
    audio.addEventListener('ended', onIntroEnded);
  }
  window.__SIBS_REAL_LAYOUT_AUDIO__ = audio;
  function tryPlay() {
    if (window.__SIBS_REAL_LAYOUT_MUSIC_ADOPTED__) return;
    if (!audio.paused) return;
    audio.muted = false;
    var attempt = audio.play();
    if (attempt && attempt.catch) {
      attempt.catch(function () {
        if (window.__SIBS_REAL_LAYOUT_MUSIC_ADOPTED__) return;
        audio.muted = true;
        audio.play().catch(function () {});
      });
    }
  }
  tryPlay();
  audio.addEventListener('canplaythrough', tryPlay, { once: true });
})();
</script>`

/** @param {string} html */
export function injectRealLayoutMusicEarlyBootstrap(html) {
  if (html.includes('id="real-layout-music-early-bootstrap"')) return html
  return html.replace('</head>', `    ${REAL_LAYOUT_MUSIC_EARLY_BOOTSTRAP}\n  </head>`)
}

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
export function injectMapDrawPageMeta(html) {
  let out = html.replace(/<meta name="app-tab"[^>]*>\s*/g, '')
  const head = out.split('</head>')[0] ?? out
  if (/<meta name="app-page"[^>]*>/i.test(head)) {
    out = out.replace(
      /(<meta name="app-page" content=")[^"]*(")/i,
      `$1map-draw$2`,
    )
  } else {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-page" content="map-draw" />`,
    )
  }
  return out
}

/** @param {string} html */
export function injectRouteMapPageMeta(html) {
  let out = html.replace(/<meta name="app-tab"[^>]*>\s*/g, '')
  const head = out.split('</head>')[0] ?? out
  if (/<meta name="app-page"[^>]*>/i.test(head)) {
    out = out.replace(
      /(<meta name="app-page" content=")[^"]*(")/i,
      `$1route-map$2`,
    )
  } else {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-page" content="route-map" />`,
    )
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

const BOOT_FAILURE_GUARD_SCRIPT = `<script id="boot-failure-guard">
(function () {
  var root = document.getElementById('root');
  if (!root || document.getElementById('start-boot-splash')) return;
  var ghPagesHint = 'GitHub Pages 请访问 https://jinruimaomao.github.io/SIBSRL/normal/routes.html ，并 Ctrl+F5 强制刷新。';
  var retryKey = 'sibs-boot-cache-reload';
  function showFailure(title, detail, extra) {
    if (!root.querySelector('.boot-hint') && !root.querySelector('.boot-failure')) return;
    root.innerHTML =
      '<div class="boot-failure" style="margin:2rem auto;max-width:28rem;padding:1.25rem;font-family:system-ui,sans-serif;color:#eef2f8;line-height:1.6">' +
      '<h1 style="font-size:1.05rem;margin:0 0 .75rem">' + title + '</h1>' +
      '<p style="margin:0 0 .5rem;opacity:.9">' + detail + '</p>' +
      '<p style="margin:0 0 .75rem;font-size:.82rem;opacity:.65">' + (extra || ghPagesHint) + '</p>' +
      '<button type="button" id="boot-cache-retry" style="margin-top:.25rem;padding:.45rem .85rem;border-radius:.5rem;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:inherit;cursor:pointer">清除缓存并重试</button>' +
      '</div>';
    var btn = document.getElementById('boot-cache-retry');
    if (btn) btn.addEventListener('click', function () {
      try { sessionStorage.removeItem(retryKey); localStorage.removeItem('sibs-sw-version'); } catch (e) {}
      clearSiteCaches().finally(function () { location.reload(); });
    });
  }
  function clearSiteCaches() {
    var tasks = [];
    if ('serviceWorker' in navigator) {
      tasks.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }));
    }
    if ('caches' in window) {
      tasks.push(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }));
    }
    return Promise.all(tasks);
  }
  function recoverFromStaleCache(title, detail) {
    var retries = parseInt(sessionStorage.getItem(retryKey) || '0', 10) || 0;
    if (retries >= 3) {
      showFailure(title, detail + ' 若仍失败，请点击下方按钮或清除浏览器站点数据。');
      return;
    }
    sessionStorage.setItem(retryKey, String(retries + 1));
    try { localStorage.removeItem('sibs-sw-version'); } catch (e) {}
    showFailure(title, detail + ' 正在尝试清除 Service Worker 缓存（' + (retries + 1) + '/3）…');
    clearSiteCaches().finally(function () { location.reload(); });
  }
  if (location.protocol === 'file:') {
    showFailure('无法直接打开 HTML 文件', '请使用 npm run dev 或 GitHub Pages 在线地址访问。', ghPagesHint);
    return;
  }
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target.tagName === 'SCRIPT') {
      var src = String(target.src || target.getAttribute('src') || '');
      if (src.indexOf('/assets/') >= 0 || src.indexOf('/src/main.tsx') >= 0) {
        recoverFromStaleCache('应用脚本加载失败', '可能是缓存了旧版本资源。');
      }
    }
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var message = reason && reason.message ? reason.message : String(reason || '');
    if (/preamble|Failed to fetch dynamically imported module|Loading chunk/i.test(message)) {
      recoverFromStaleCache('应用启动失败', message);
    }
  });
  window.setTimeout(function () {
    if (!root.querySelector('.boot-hint')) return;
    recoverFromStaleCache('页面加载时间过长', '请稍候或强制刷新；若刚更新过站点，可能需要清除旧缓存。');
  }, 15000);
})();
</script>`

/** @param {string} html @param {string} swVersion */
export function injectSwVersionBootstrap(html, swVersion) {
  const script = `<script id="sw-version-bootstrap">
(function () {
  var VERSION = ${JSON.stringify(swVersion)};
  var KEY = 'sibs-sw-version';
  try {
    var prev = localStorage.getItem(KEY);
    if (prev && prev !== VERSION) {
      localStorage.setItem(KEY, VERSION);
      try { sessionStorage.removeItem('sibs-boot-cache-reload'); } catch (e) {}
      var tasks = [];
      if ('serviceWorker' in navigator) {
        tasks.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }));
      }
      if ('caches' in window) {
        tasks.push(caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }));
      }
      Promise.all(tasks).finally(function () { location.reload(); });
      return;
    }
    localStorage.setItem(KEY, VERSION);
  } catch (e) {}
})();
</script>`
  if (html.includes('id="sw-version-bootstrap"')) {
    return html.replace(/<script id="sw-version-bootstrap">[\s\S]*?<\/script>/, script)
  }
  return html.replace('</head>', `    ${script}\n  </head>`)
}

/** @param {string} html */
export function relocateAppBundleScript(html) {
  const scriptMatch = html.match(
    /\s*<script type="module" crossorigin src="[^"]*\/assets\/[^"]+\.js"><\/script>\s*/,
  )
  if (!scriptMatch) return html
  const scriptTag = scriptMatch[0].trim()
  const withoutScript = html.replace(scriptMatch[0], '\n')
  return withoutScript.replace('</body>', `    ${scriptTag}\n  </body>`)
}

/** @param {string} html */
export function injectBootFailureGuard(html) {
  if (html.includes('id="boot-failure-guard"')) {
    return html.replace(/<script id="boot-failure-guard">[\s\S]*?<\/script>/, BOOT_FAILURE_GUARD_SCRIPT)
  }
  return html.replace('</body>', `    ${BOOT_FAILURE_GUARD_SCRIPT}\n  </body>`)
}

/** @param {string} html */
export function injectServiceWorkerBootstrap(html) {
  if (html.includes('id="sw-register"')) return html
  return html.replace('</head>', `    ${SERVICE_WORKER_BOOTSTRAP_SCRIPT}\n  </head>`)
}
