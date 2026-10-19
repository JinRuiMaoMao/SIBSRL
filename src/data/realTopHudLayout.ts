/**
 * Layout constants for the Real TopHud chrome.
 * In-game HUD is script-built; values mirror AbsoluteSize / spacing used on the web shell
 * so level / XP / player card / sunshards / quick actions stay Studio-proportioned.
 */
export const REAL_TOP_HUD_LAYOUT = {
  /** Outer bar height (px at 1080p reference → rem-scaled in CSS). */
  heightPx: 54,
  horizontalPaddingPx: 12,
  gapPx: 10,
  /** Level badge */
  levelBadgeSizePx: 40,
  levelBadgeFontPx: 18,
  /** XP track */
  xpTrackWidthPx: 140,
  xpTrackHeightPx: 8,
  xpLabelFontPx: 12,
  /** Player card */
  playerCardMinWidthPx: 120,
  playerNameFontPx: 13,
  playerLevelFontPx: 11,
  friendBoostFontPx: 11,
  /** Sunshards chip */
  sunshardsHeightPx: 32,
  sunshardsIconPx: 16,
  sunshardsAddSizePx: 22,
  /** Quick action buttons */
  actionHeightPx: 32,
  actionIconPx: 18,
  iconBtnSizePx: 34,
  inviteBtnSizePx: 34,
} as const
