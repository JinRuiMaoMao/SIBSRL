import { useLocale } from '../i18n/LocaleContext'
import type { WorldMapVirtualNode, WorldMapVirtualNodeDraft } from '../types/worldMapDraw'

interface IslandMapDrawVirtualNodePanelProps {
  nodes: readonly WorldMapVirtualNode[]
  pendingNode: WorldMapVirtualNodeDraft | null
  onPendingRouteIdChange: (routeId: string) => void
  onConfirmPendingNode: () => void
  onCancelPendingNode: () => void
  onRemoveNode: (id: string) => void
}

export function IslandMapDrawVirtualNodePanel({
  nodes,
  pendingNode,
  onPendingRouteIdChange,
  onConfirmPendingNode,
  onCancelPendingNode,
  onRemoveNode,
}: IslandMapDrawVirtualNodePanelProps) {
  const { t } = useLocale()

  return (
    <div className="island-map-draw-stop-panel">
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
          {[...nodes]
            .sort((a, b) => a.order - b.order)
            .map((node) => (
              <li key={node.id}>
                <span>
                  #{node.order} · {node.routeId}
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
