import { routeIdToPageFilename, buildRouteLandingUrl } from './route-page-filename.mjs'
import { ROUTE_DATA_SCRIPT_ID } from './extract-route-page-data.mjs'

/**
 * @param {string} routeId
 * @param {Record<string, unknown>} routeData
 */
/** 旧编号跳转页（如 21A → 21） */
export function renderRouteAliasRedirectHtml(aliasId, displayId) {
  const landing = buildRouteLandingUrl(displayId, true)
  const safeTitle = aliasId.replace(/[<>&"]/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch] ?? ch,
  )
  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} · 阳光群岛线路查询</title>
  <link rel="canonical" href="${landing}" />
  <meta http-equiv="refresh" content="0;url=${landing}" />
</head>
<body>
  <p>此线路已改为 <a href="${landing}">${displayId}</a>，正在跳转…</p>
</body>
</html>
`
}

export function renderRoutePageHtml(routeId, routeData) {
  const landing = buildRouteLandingUrl(routeId, true)
  const safeTitle = routeId.replace(/[<>&"]/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch] ?? ch,
  )
  const json = JSON.stringify(routeData, null, 2)

  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} · 阳光群岛线路查询</title>
  <link rel="canonical" href="${landing}" />
  <meta http-equiv="refresh" content="0;url=${landing}" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
    a { color: #3b82f6; }
    pre { display: none; }
  </style>
</head>
<body>
  <!--
    线路数据（可编辑）
    - 修改下方 JSON 中的 stops、fare、notes、audio 等字段
    - 保存后刷新 index.html 详情即可生效，无需改 routes.ts
    - 重新 build 时会保留此处已有 JSON，不会覆盖你的修改
    - 分站简写：{ "zh": "中文", "en": "English", "zone": 1 }
    - 报站音频：在分站加 "audio": { "audioUrl": "./audio/...", "nextStop": { "zh": "...", "en": "..." } }
  -->
  <script type="application/json" id="${ROUTE_DATA_SCRIPT_ID}">
${json}
  </script>
  <script>location.replace(${JSON.stringify(landing)});</script>
  <p>正在打开线路 <strong>${safeTitle}</strong>…</p>
  <p><a href="${landing}">若未自动跳转，请点击此处</a></p>
</body>
</html>
`
}

export { routeIdToPageFilename }
