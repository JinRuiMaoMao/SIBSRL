import { createServer } from 'vite'

const server = await createServer({ configFile: 'vite.config.ts', logLevel: 'error' })
try {
  const { routes } = await server.ssrLoadModule('/src/data/routes.ts')
  const { getDirectionLengthKm, getDirectionServiceTime, routeHasDirectionVariants } =
    await server.ssrLoadModule('/src/utils/routeDirections.ts')
  const { splitLengthSegments } = await server.ssrLoadModule('/src/utils/routeLength.ts')

  let kmIssues = 0
  let serviceIssues = 0

  for (const route of routes) {
    if (!routeHasDirectionVariants(route)) continue
    const lenRaw = route.length?.zh ?? ''
    const segments = splitLengthSegments(lenRaw)
    if (segments.length < 2) continue

    const km0 = getDirectionLengthKm(route, 0, 'zh-Hans')
    const km1 = getDirectionLengthKm(route, 1, 'zh-Hans')
    if (km0 && km1 && km0 === km1) {
      kmIssues++
      console.log('[KM same]', route.number, km0, '|', lenRaw.slice(0, 80))
    }

    const st0 = getDirectionServiceTime(route, 0, 'zh-Hans')
    const st1 = getDirectionServiceTime(route, 1, 'zh-Hans')
    if (st0 && !st1) {
      serviceIssues++
      console.log('[S time missing]', route.number, 'dir0=', st0?.slice(0, 50))
    }
  }

  console.log('---')
  console.log('bidirectional km same:', kmIssues)
  console.log('missing south/east serviceTime:', serviceIssues)
} finally {
  await server.close()
}
