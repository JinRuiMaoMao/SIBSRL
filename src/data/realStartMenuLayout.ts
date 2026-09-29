/** Layout constants extracted from StartScreen.StartMenu / StartMenuRB in the rbxlx place file. */
export const REAL_START_MENU_LAYOUT = {
  /** StartMenu: Size {1, 0}, {0, 0.7} — full width, 70% parent height, centered. */
  menuHeightScale: 0.7,
  /** Top frame: Size.Y scale 0.32 */
  topHeightScale: 0.32,
  /** Main frame: Position.Y 0.35, Size.Y 0.62 */
  mainTopScale: 0.35,
  mainHeightScale: 0.62,
  /** Main.L: anchor (1,0), position X 0.5, Size.X 0.32 */
  leftColumnWidthScale: 0.32,
  /** Main.R: position X 0.5, Size.X 0.35, Size.Y 0.9 */
  rightColumnWidthScale: 0.35,
  rightColumnHeightScale: 0.9,
  /** Menu buttons: Size {0.88, 0.20}, UICorner 8px, UIListLayout padding 10 */
  buttonWidthScale: 0.88,
  buttonHeightScale: 0.2,
  buttonCornerPx: 8,
  buttonListPaddingPx: 10,
  /** Top UIListLayout padding 15 */
  topListPaddingPx: 15,
  /** Version: anchor (0,1), Size.Y 0.045 */
  versionHeightScale: 0.045,
  /** StartMenuRB: anchor (1,1), position offset (-15,-15) from bottom-right */
  menuRbInsetPx: 15,
  /** MainButtons: width 60, UIGridLayout cell 60×40, padding 15×15, buttons 45×45 */
  mainButtonsWidthPx: 60,
  mainButtonsCellPx: { x: 60, y: 40 },
  mainButtonsPaddingPx: { x: 15, y: 15 },
  mainButtonSizePx: 45,
  /** AboutButtons: position (-75,-75) from anchor, width 60 */
  aboutButtonsOffsetPx: { x: 75, y: 75 },
  aboutButtonsWidthPx: 60,
  /** StartMenuRB.UIScale = ceil(StartMenu.AbsoluteSize.Y * 0.10875) / 40 */
  uiScaleFactor: 0.10875,
  uiScaleCellPx: 40,
  /** PlayBtn Title TextColor3 ≈ rgb(85, 170, 0) */
  playTextRgb: 'rgb(85 170 0)',
  serverTextRgb: 'rgb(85 170 0)',
  profileTextRgb: 'rgb(109 40 217)',
  languageTextRgb: 'rgb(109 40 217)',
  /** ChangeLog.R panel (new players — HasFinishedAnyRoute false). */
  changeLogTitleHeightScale: 0.122,
  changeLogThumbHeightScale: 0.61,
  changeLogEnterHeightScale: 0.122,
  changeLogThumbBg: '#193242',
  changeLogEnterBg: '#162b39',
  /** ComingEvent / DailyChallenge shared R panel proportions. */
  eventPanelPaddingScale: 0.05,
  eventPanelCornerScale: 0.03,
  eventDateHeightScale: 0.105,
  eventThumbHeightScale: 0.7,
  eventTitleHeightScale: 0.1,
  /** DaysLater badge turns yellow when ≤10 days (864000s in game). */
  eventCountdownUrgentDays: 10,
} as const

export function computeRealStartMenuUiScale(menuHeightPx: number): number {
  const { uiScaleFactor, uiScaleCellPx } = REAL_START_MENU_LAYOUT
  if (menuHeightPx <= 0) return 1
  return Math.ceil(menuHeightPx * uiScaleFactor) / uiScaleCellPx
}
