/** Layout constants extracted from RouteSelection in the rbxlx place file. */
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
  /** MainCtr below Top */
  mainTopOffsetPx: 40,
  /** RouteCtr fixed width; InfoCtr at X=260, width calc(100% - 260) */
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
  /** PlayCtrBtn height 25, green SelectedFrame rgb(54, 179, 104) */
  playBarHeightPx: 25,
  playGreenRgb: 'rgb(54 179 104)',
  /** ScrollingFrame scrollbar ≈ rgb(255, 170, 0) */
  scrollThumbRgb: 'rgb(255 170 0)',
  mapBorderRgb: 'rgb(163 197 232)',
} as const
