/** Layout constants extracted from Profile / MainCtr in the NEW.rbxlx place file. */
export const REAL_PROFILE_LAYOUT = {
  /** Profile shell: Size {1,-40},{1,-25}, anchor center, Position Y offset -8 */
  outerInsetXPx: 40,
  outerInsetYPx: 25,
  outerOffsetYPx: -8,
  /** Top header bar height */
  headerHeightPx: 40,
  /** MainCtr: Size {1,0},{1,-40}, Position Y +20 */
  mainTopOffsetPx: 20,
  /** BtnCtr (tab rail): width scale 0.30, each tab height scale 0.10 */
  tabRailWidthScale: 0.3,
  tabButtonHeightScale: 0.1,
  tabLogoWidthScale: 0.15,
  tabTitleWidthScale: 0.8,
  /** License Card: 0.40 × 0.40 of MainCtr */
  cardWidthScale: 0.4,
  cardHeightScale: 0.4,
  /** Stats chalkboard block: 0.40 × 0.58 */
  statsWidthScale: 0.4,
  statsHeightScale: 0.58,
  /** Icon / Title panels */
  iconPanelWidthScale: 0.55,
  iconPanelHeightScale: 0.8,
  /** Chalkboard visual aspect (web board frame) */
  chalkboardAspect: 1.8,
  /** Tab rail share of chalkboard width (web) */
  tabsWidthPercent: 30,
} as const
