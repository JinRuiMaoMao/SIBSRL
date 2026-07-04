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
  width: min(100%, 22rem);
}
.start-boot-splash__row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
}
.start-boot-splash__logo {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  object-fit: contain;
}
.start-boot-splash__progress-wrap {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
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
  transition: width 0.42s ease;
}
.start-boot-splash__fill.is-smooth {
  transition: width 0.46s ease;
}
.start-boot-splash__fill.is-surging {
  transition: width 0.28s steps(8);
}
.start-boot-splash__fill.is-retracting {
  transition: width 0.12s steps(4);
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
    <div class="start-boot-splash__row">
      <img class="start-boot-splash__logo" src="./sibs-logo.png" alt="" width="44" height="44" decoding="async" />
      <div class="start-boot-splash__progress-wrap">
        <span class="start-boot-splash__percent" id="start-boot-percent">0%</span>
        <div class="start-boot-splash__track" id="start-boot-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Loading">
          <div class="start-boot-splash__fill" id="start-boot-fill"></div>
        </div>
        <span class="start-boot-splash__label" id="start-boot-label">本站加载中…</span>
      </div>
    </div>
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
  var fillEl = document.getElementById('start-boot-fill');
  var labelEl = document.getElementById('start-boot-label');
  var track = document.getElementById('start-boot-track');
  var displayedPercent = 0;
  var displayedLabel = '';
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function wait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }
  function setProgress(p, label, mode) {
    var value = clamp(Math.round(p), 0, 100);
    if (fillEl) {
      fillEl.classList.remove('is-smooth', 'is-surging', 'is-retracting');
      if (mode === 'smooth') fillEl.classList.add('is-smooth');
      else if (mode === 'surge') fillEl.classList.add('is-surging');
      else if (mode === 'retract') fillEl.classList.add('is-retracting');
      fillEl.style.width = value + '%';
    }
    if (mode === 'retract' || mode === 'surge') return;
    if (mode === 'hold') {
      if (label) {
        displayedLabel = label;
        if (labelEl) labelEl.textContent = label;
      }
      if (value >= displayedPercent) {
        displayedPercent = value;
        if (pctEl) pctEl.textContent = value + '%';
        if (track) track.setAttribute('aria-valuenow', String(value));
      }
      return;
    }
    if (value > displayedPercent) {
      displayedPercent = value;
      if (pctEl) pctEl.textContent = value + '%';
      if (track) track.setAttribute('aria-valuenow', String(value));
    }
  }
  var STUTTER_MIN = 50;
  var STUTTER_TAIL = 95;
  function buildBootSegments(start, target) {
    if (start >= target) return [];
    var segments = [];
    if (start < STUTTER_MIN) {
      var headEnd = Math.min(target, STUTTER_MIN);
      if (headEnd > start) segments.push({ from: start, to: headEnd, stutter: false });
    }
    var stutterStart = Math.max(start, STUTTER_MIN);
    var stutterEnd = Math.min(target, STUTTER_TAIL - 1);
    if (stutterEnd >= STUTTER_MIN && stutterEnd > stutterStart) {
      segments.push({ from: stutterStart, to: stutterEnd, stutter: true });
    }
    var tailStart = Math.max(start, STUTTER_TAIL);
    if (target > tailStart) segments.push({ from: tailStart, to: target, stutter: false });
    return segments;
  }
  async function smoothProgressTo(start, target, label) {
    var current = start;
    setProgress(current, label, 'hold');
    while (current < target - 0.5) {
      var remaining = target - current;
      var step = Math.max(0.8, Math.min(remaining, remaining * (0.12 + Math.random() * 0.14)));
      current = clamp(current + step, 0, target);
      setProgress(current, label, 'smooth');
      await wait(240 + Math.random() * 180);
    }
    setProgress(target, label, 'hold');
    await wait(160 + Math.random() * 120);
    return target;
  }
  async function stutterSegmentTo(start, target, label) {
    var bar = start;
    var locked = start;
    setProgress(locked, label, 'hold');
    var barFloor = Math.max(STUTTER_MIN - 2, start - 1);
    while (locked < target - 1) {
      var remaining = target - locked;
      var roll = Math.random();
      if (roll < 0.34 && remaining > 7) {
        var bigFwd = clamp(remaining * (0.42 + Math.random() * 0.38), 10, 30);
        var bigPeak = clamp(bar + bigFwd, 0, 100);
        setProgress(bigPeak, label, 'surge');
        await wait(260 + Math.random() * 240);
        bar = Math.max(barFloor, bigPeak - bigFwd * (0.8 + Math.random() * 0.32));
        setProgress(bar, label, 'retract');
        await wait(170 + Math.random() * 190);
        if (Math.random() < 0.48) {
          locked = clamp(locked + bigFwd * 0.2, 0, target);
          bar = Math.max(bar, locked);
          setProgress(locked, label, 'surge');
          await wait(110 + Math.random() * 100);
        }
        continue;
      }
      if (roll < 0.74) {
        var smallFwd = clamp(remaining * (0.05 + Math.random() * 0.13), 2, 8);
        var smallPeak = clamp(bar + smallFwd, 0, 100);
        setProgress(smallPeak, label, 'surge');
        await wait(100 + Math.random() * 130);
        bar = Math.max(barFloor, smallPeak - smallFwd * (0.45 + Math.random() * 0.5));
        setProgress(bar, label, 'retract');
        await wait(70 + Math.random() * 110);
        if (Math.random() < 0.64) {
          locked = clamp(locked + smallFwd * 0.4, 0, target);
          bar = Math.max(bar, locked);
          setProgress(locked, label, 'surge');
          await wait(85 + Math.random() * 90);
        }
        continue;
      }
      var medFwd = clamp(remaining * (0.18 + Math.random() * 0.28), 5, 20);
      var medPeak = clamp(bar + medFwd, 0, 100);
      setProgress(medPeak, label, 'surge');
      await wait(190 + Math.random() * 170);
      bar = Math.max(barFloor, medPeak - medFwd * (0.55 + Math.random() * 0.38));
      setProgress(bar, label, 'retract');
      await wait(120 + Math.random() * 140);
      locked = clamp(locked + medFwd * 0.32, 0, target);
      bar = Math.max(bar, locked);
      setProgress(locked, label, 'surge');
      await wait(100 + Math.random() * 100);
    }
    setProgress(target, label, 'hold');
    await wait(160 + Math.random() * 120);
    return target;
  }
  async function bootProgressTo(start, target, label) {
    var current = start;
    var segments = buildBootSegments(start, target);
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      current = seg.stutter
        ? await stutterSegmentTo(seg.from, seg.to, label)
        : await smoothProgressTo(seg.from, seg.to, label);
    }
    return current;
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
  void (async function () {
    var current = await bootProgressTo(0, 10, '初始化…');
    if (document.readyState === 'loading') {
      await new Promise(function (resolve) {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }
    await bootProgressTo(current, 18, '加载样式…');
  })();
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
