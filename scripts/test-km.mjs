import { createServer } from 'vite'

const server = await createServer({ configFile: 'vite.config.ts', logLevel: 'error' })
try {
  const mod = await server.ssrLoadModule('/src/data/routes.ts')
  const { getDirectionLengthKm } = await server.ssrLoadModule('/src/utils/routeDirections.ts')
  const { routes } = mod

  for (const number of ['C01', '25', '41A']) {
    const route = routes.find((r) => r.number === number)
    if (!route) continue
    const km0 = getDirectionLengthKm(route, 0, 'zh-Hans')
    const km1 = getDirectionLengthKm(route, 1, 'zh-Hans')
    console.log(number, 'dir0=', km0, 'dir1=', km1, 'route.length=', route.length?.zh?.slice(0, 60))
    route.stops?.forEach((g, i) => console.log('  stop', i, g.length?.zh))
  }
} finally {
  await server.close()
}
