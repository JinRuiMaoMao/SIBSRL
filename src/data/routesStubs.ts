import type { BusRoute } from '../types/route'

function createPlaceholderRoute(number: string): BusRoute {
  return {
    id: number,
    number,
    operators: [],
    category: 'special',
    pattern: 'bidirectional',
    zones: [],
    origin: { zh: '\u5f85\u8865\u5145', en: 'To be added' },
    destination: { zh: '\u5f85\u8865\u5145', en: 'To be added' },
    notes: {
      zh: '\u4ec5\u5f55\u5165\u7ebf\u8def\u7f16\u53f7\uff0c\u7ad9\u70b9\u4e0e\u670d\u52a1\u8d44\u6599\u5f85\u8865\u5145\u3002',
      en: 'Route number added from in-game list. Stops and service details pending.',
    },
    wikiUrl: `https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_${encodeURIComponent(number)}`,
  }
}

/** Wiki ???? Wiki ?????????????? */
const GAME_ROUTE_PLACEHOLDER_NUMBERS = [
  '476SA',
  'F469A',
  'N76A',
  '25YN',
  '25YS',
  '370AW',
  '370AE',
  'N476E',
  '240A',
  '242A',
  '248A',
  '370AEM',
  'Y370A',
  '473A',
  'N146A',
  '76SN',
  '76SS',
] as const

export const routesStubs: BusRoute[] = GAME_ROUTE_PLACEHOLDER_NUMBERS.map(createPlaceholderRoute)
