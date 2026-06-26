/** Inline start-page boot splash (shown before React paints). */

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
  width: min(100%, 18rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.15rem;
}
.start-boot-splash__logo {
  width: 3.5rem;
  height: 3.5rem;
  object-fit: contain;
}
.start-boot-splash__progress-wrap {
  position: relative;
  width: 100%;
  padding-top: 1.35rem;
  padding-bottom: 1.35rem;
}
.start-boot-splash__percent {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent, #f5b942);
  letter-spacing: 0.02em;
}
.start-boot-splash__track {
  height: 0.42rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted, #94a3b8) 22%, transparent);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border, rgba(245, 185, 66, 0.18)) 65%, transparent);
}
.start-boot-splash__fill {
  height: 100%;
  width: 0%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent, #f5b942) 82%, #fff 18%),
    var(--accent, #f5b942)
  );
  transition: width 0.28s ease;
}
.start-boot-splash__label {
  position: absolute;
  right: 0;
  bottom: 0;
  max-width: 100%;
  font-size: 0.68rem;
  color: var(--text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}
`

export const START_BOOT_SPLASH_HTML = `<div id="start-boot-splash" class="start-boot-splash" aria-live="polite" aria-busy="true">
  <div class="start-boot-splash__inner">
    <img class="start-boot-splash__logo" src="./sibs-logo.png" alt="" width="56" height="56" decoding="async" />
    <div class="start-boot-splash__progress-wrap">
      <span class="start-boot-splash__percent" id="start-boot-percent">0%</span>
      <div class="start-boot-splash__track" id="start-boot-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Loading">
        <div class="start-boot-splash__fill" id="start-boot-fill"></div>
      </div>
      <span class="start-boot-splash__label" id="start-boot-label">加载中…</span>
    </div>
  </div>
</div>`

export const START_BOOT_SPLASH_SCRIPT = `<script id="start-boot-splash-script">
(function () {
  var splash = document.getElementById('start-boot-splash');
  if (!splash) return;
  document.documentElement.classList.add('start-boot-active');
  var pctEl = document.getElementById('start-boot-percent');
  var fillEl = document.getElementById('start-boot-fill');
  var labelEl = document.getElementById('start-boot-label');
  var track = document.getElementById('start-boot-track');
  function setProgress(p, label) {
    var value = Math.max(0, Math.min(100, Math.round(p)));
    if (pctEl) pctEl.textContent = value + '%';
    if (fillEl) fillEl.style.width = value + '%';
    if (label && labelEl) labelEl.textContent = label;
    if (track) track.setAttribute('aria-valuenow', String(value));
  }
  setProgress(6, '初始化…');
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setProgress(18, '加载样式…');
    }, { once: true });
  } else {
    setProgress(18, '加载样式…');
  }
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
