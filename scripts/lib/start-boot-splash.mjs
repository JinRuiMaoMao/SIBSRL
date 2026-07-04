/** Inline start-page boot splash (shown before React paints). */

export const START_PAGE_BOOT_DURATION_MS = 5000

export const START_BOOT_SPLASH_CRITICAL_CSS = `
html.start-boot-active #root {
  visibility: hidden;
}
.start-boot-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--page-background, linear-gradient(160deg, #070b14 0%, #101829 100%));
  transition: opacity 0.38s ease, visibility 0.38s ease;
}
.start-boot-splash.is-done {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.start-boot-splash__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  width: min(100%, 16rem);
  text-align: center;
}
.start-boot-splash__logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
}
.start-boot-splash__logo {
  width: 3.5rem;
  height: 3.5rem;
  object-fit: contain;
  animation: start-boot-logo-spin 1.15s linear infinite;
}
@keyframes start-boot-logo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
html[data-reduce-motion='true'] .start-boot-splash__logo {
  animation: none;
}
.start-boot-splash__label {
  margin: 0;
  max-width: 100%;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-muted, #94a3b8);
}
.start-boot-splash__percent {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent, #f5b942);
  letter-spacing: 0.04em;
}
`

export const START_BOOT_SPLASH_HTML = `<div id="start-boot-splash" class="start-boot-splash" aria-live="polite" aria-busy="true" role="status" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
  <div class="start-boot-splash__inner">
    <div class="start-boot-splash__logo-wrap">
      <img class="start-boot-splash__logo" src="./sibs-logo.png" alt="" width="56" height="56" decoding="async" />
    </div>
    <p class="start-boot-splash__label" id="start-boot-label">本站加载中…</p>
    <p class="start-boot-splash__percent" id="start-boot-percent">0%</p>
  </div>
</div>`

export const START_BOOT_SPLASH_SCRIPT = `<script id="start-boot-splash-script">
(function () {
  var splash = document.getElementById('start-boot-splash');
  if (!splash) return;
  var BOOT_SEEN_KEY = 'sibs-start-boot-seen';
  function isBootSeen() {
    try { return localStorage.getItem(BOOT_SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  if (isBootSeen()) {
    splash.remove();
    window.__SIBS_START_BOOT__ = {
      setProgress: function () {},
      finish: function () {},
    };
    return;
  }
  document.documentElement.classList.add('start-boot-active');
  var pctEl = document.getElementById('start-boot-percent');
  var labelEl = document.getElementById('start-boot-label');
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function setProgress(p, label) {
    var value = clamp(Math.round(p), 0, 100);
    if (label && labelEl) labelEl.textContent = label;
    if (pctEl) pctEl.textContent = value + '%';
    splash.setAttribute('aria-valuenow', String(value));
    if (label) splash.setAttribute('aria-valuetext', label + ' ' + value + '%');
  }
  window.__SIBS_START_BOOT__ = {
    setProgress: setProgress,
    finish: function () {
      document.documentElement.classList.remove('start-boot-active');
      splash.classList.add('is-done');
      splash.setAttribute('aria-busy', 'false');
      window.setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 420);
    },
  };
  setProgress(0, '本站加载中…');
})();
</script>`

/** @param {string} html */
export function injectStartBootSplash(html) {
  if (html.includes('id="start-boot-splash"')) return html
  let out = html
  if (!out.includes('id="start-boot-critical"')) {
    out = out.replace('</head>', `    <style id="start-boot-critical">${START_BOOT_SPLASH_CRITICAL_CSS}</style>\n  </head>`)
  }
  if (!out.includes('id="start-boot-splash-script"')) {
    out = out.replace('</body>', `    ${START_BOOT_SPLASH_SCRIPT}\n  </body>`)
  }
  return out.replace('<body>', `<body>\n    ${START_BOOT_SPLASH_HTML}`)
}
