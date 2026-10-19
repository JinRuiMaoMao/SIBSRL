import type { CSSProperties } from 'react'

/** Layout constants extracted from RouteSelection in the NEW.rbxlx place file. */
export const REAL_ROUTE_SELECTION_LAYOUT = {
  /** RouteSelection: Size {1,-40}, {1,-25}, anchor center, Position Y offset -8 */
  outerInsetXPx: 40,
  outerInsetYPx: 25,
  outerOffsetYPx: -8,
  /** Top: full width, height 40 — ExitBtn + title */
  topBarHeightPx: 40,
  topExitBtnPx: 25,
  topExitInsetPx: 10,
  topTitleOffsetPx: 45,
  topTitleSizePx: 26,
  /** MainCtr below Top (Y offset 40) */
  mainTopOffsetPx: 40,
  /** RouteCtr fixed width; InfoCtr Size.X {1,-260} */
  routeListWidthPx: 250,
  infoOffsetPx: 260,
  columnGapPx: 10,
  /** RouteCtr.TopBar: Y+5, height 27 */
  sidebarTopBarOffsetPx: 5,
  sidebarTopBarHeightPx: 27,
  searchBoxWidthPx: 200,
  searchBoxHeightPx: 25,
  searchCornerPx: 8,
  topBarListPaddingPx: 10,
  /** InfoCtr.DescCtr: anchor bottom center, Y -20, width {1,-50}, UICorner 8 */
  descBottomInsetPx: 20,
  descHorizontalInsetPx: 50,
  descCornerPx: 8,
  /** StartBtn / Play bar height 25, green rgb(54, 179, 104) */
  playBarHeightPx: 25,
  playGreenRgb: 'rgb(54 179 104)',
  /** ScrollingFrame scrollbar ≈ rgb(255, 170, 0) */
  scrollThumbRgb: 'rgb(255 170 0)',
  /** InfoCtr.Map BackgroundColor3 */
  mapBorderRgb: 'rgb(163 197 232)',
} as const

/** CSS custom properties for `.app--real-routes` (single source from rbxlx extract). */
export function getRealRouteSelectionLayoutVars(): CSSProperties {
  const L = REAL_ROUTE_SELECTION_LAYOUT
  return {
    '--real-route-outer-inset-x': `${L.outerInsetXPx}px`,
    '--real-route-outer-inset-y': `${L.outerInsetYPx}px`,
    '--real-route-outer-offset-y': `${L.outerOffsetYPx}px`,
    '--real-route-top-h': `${L.topBarHeightPx}px`,
    '--real-route-exit-size': `${L.topExitBtnPx}px`,
    '--real-route-exit-inset': `${L.topExitInsetPx}px`,
    '--real-route-list-width': `${L.routeListWidthPx}px`,
    '--real-route-column-gap': `${L.columnGapPx}px`,
    '--real-route-sidebar-top-h': `${L.sidebarTopBarHeightPx}px`,
    '--real-route-search-w': `${L.searchBoxWidthPx}px`,
    '--real-route-search-h': `${L.searchBoxHeightPx}px`,
    '--real-route-search-radius': `${L.searchCornerPx}px`,
    '--real-route-scroll-thumb': L.scrollThumbRgb,
    '--real-route-map-border': L.mapBorderRgb,
    '--real-route-play-green': L.playGreenRgb,
    '--real-route-desc-bottom': `${L.descBottomInsetPx}px`,
    '--real-route-desc-x': `${L.descHorizontalInsetPx}px`,
  } as CSSProperties
}
