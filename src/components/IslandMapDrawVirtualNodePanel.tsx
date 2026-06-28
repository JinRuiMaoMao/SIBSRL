import { useMemo } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type {
  IslandMapDrawInteraction,
  WorldMapVirtualNode,
  WorldMapVirtualNodeDraft,
  WorldMapVirtualNodeKind,
} from '../types/worldMapDraw'
import { DIR_LABELS, virtualNodeKindLabel } from './IslandMapVirtualNodeOverlayLayer'

interface IslandMapDrawVirtualNodePanelProps {
  interaction: IslandMapDrawInteraction
  onInteractionChange: (interaction: IslandMapDrawInteraction) => void
  nodes: readonly WorldMapVirtualNode[]
  pendingNode: WorldMapVirtualNodeDraft | null
  roadDirections: readonly number[]
  onPendingRouteIdChange: (routeId: string) => void
  onPendingKindChange: (kind: WorldMapVirtualNodeKind) => void
  onPendingOutDirChange: (outDir: number) => void
  onConfirmPendingNode: () => void
  onCancelPendingNode: () => void
  onRemoveNode: (id: string) => void
}

export function IslandMapDrawVirtualNodePanel({
  interaction,
  onInteractionChange,
  nodes,
  pendingNode,
  roadDirections,
  onPendingRouteIdChange,
  onPendingKindChange,
  onPendingOutDirChange,
  onConfirmPendingNode,
  onCancelPendingNode,
  onRemoveNode,
}: IslandMapDrawVirtualNodePanelProps) {
  const { t, locale } = useLocale()
  const allowedDirs = useMemo(() => {
    if (roadDirections.length === 0) return [0, 2, 4, 6]
    return roadDirections
  }, [roadDirections])

  return (
    <div className="island-map-draw-stop-panel">
      <div className="island-map-draw-panel-row">
        <button
          type="button"
          className={`island-map-btn${interaction === 'route' ? ' island-map-btn--active' : ''}`.trim()}
          onClick={() => onInteractionChange('route')}
          aria-pressed={interaction === 'route'}
        >
          {t('islandMapDrawRouteMode')}
        </button>
        <button
          type="button"
          className={`island-map-btn${interaction === 'virtual' ? ' island-map-btn--active' : ''}`.trim()}
          onClick={() => onInteractionChange('virtual')}
          aria-pressed={interaction === 'virtual'}
        >
          {t('islandMapDrawVirtualMode')}
        </button>
        <button
          type="button"
          className={`island-map-btn${interaction === 'catalog' ? ' island-map-btn--active' : ''}`.trim()}
          onClick={() => onInteractionChange('catalog')}
          aria-pressed={interaction === 'catalog'}
        >
          {t('islandMapDrawCatalogMode')}
        </button>
      </div>

      <p className="island-map-draw-help">{t('islandMapDrawVirtualHelp')}</p>

      {pendingNode ? (
        <div className="island-map-draw-stop-form">
          <label className="island-map-draw-field">
            <span>{t('islandMapDrawVirtualRouteId')}</span>
            <input
              value={pendingNode.routeId}
              onChange={(event) => onPendingRouteIdChange(event.target.value.trim())}
              placeholder="21A"
              spellCheck={false}
              autoFocus
            />
          </label>
          <div className="island-map-draw-field">
            <span>{t('islandMapDrawVirtualKind')}</span>
            <div className="island-map-draw-panel-row">
              {(['straight', 'turn', 'u-turn'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`island-map-btn${pendingNode.kind === kind ? ' island-map-btn--active' : ''}`.trim()}
                  onClick={() => onPendingKindChange(kind)}
                >
                  {virtualNodeKindLabel(kind, locale)}
                </button>
              ))}
            </div>
          </div>
          <div className="island-map-draw-field">
            <span>{t('islandMapDrawVirtualOutDir')}</span>
            <div className="island-map-draw-virtual-dirs">
              {DIR_LABELS.map((label, dir) => (
                <button
                  key={dir}
                  type="button"
                  className={`island-map-btn island-map-draw-virtual-dir${pendingNode.outDir === dir ? ' island-map-btn--active' : ''}${allowedDirs.includes(dir) ? '' : ' island-map-draw-virtual-dir--disabled'}`.trim()}
                  disabled={!allowedDirs.includes(dir)}
                  onClick={() => onPendingOutDirChange(dir)}
                  title={label}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="island-map-draw-panel-row">
            <button
              type="button"
              className="island-map-btn"
              onClick={onConfirmPendingNode}
              disabled={!pendingNode.routeId.trim()}
            >
              {t('islandMapDrawVirtualConfirm')}
            </button>
            <button type="button" className="island-map-btn" onClick={onCancelPendingNode}>
              {t('islandMapDrawStopCancel')}
            </button>
          </div>
        </div>
      ) : null}

      {nodes.length > 0 ? (
        <ul className="island-map-draw-stop-list">
          {nodes.map((node) => (
            <li key={node.id}>
              <span>
                {node.routeId} · {virtualNodeKindLabel(node.kind, locale)} · {DIR_LABELS[node.outDir]}
              </span>
              <button
                type="button"
                className="island-map-draw-stop-remove"
                onClick={() => onRemoveNode(node.id)}
                aria-label={t('islandMapDrawVirtualRemove')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
