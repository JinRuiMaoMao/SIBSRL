import { useLocale } from '../i18n/LocaleContext'
import type {
  IslandMapDrawInteraction,
  WorldMapVirtualNode,
  WorldMapVirtualNodeDraft,
  WorldMapVirtualNodeKind,
} from '../types/worldMapDraw'
import {
  COMPASS_ROSE_LAYOUT,
  RELATIVE_DIRECTION_KINDS,
  SURFACE_VIRTUAL_NODE_KINDS,
  virtualNodeKindLabel,
  virtualNodeKindSymbol,
} from './IslandMapVirtualNodeOverlayLayer'

interface IslandMapDrawVirtualNodePanelProps {
  interaction: IslandMapDrawInteraction
  onInteractionChange: (interaction: IslandMapDrawInteraction) => void
  nodes: readonly WorldMapVirtualNode[]
  pendingNode: WorldMapVirtualNodeDraft | null
  onPendingRouteIdChange: (routeId: string) => void
  onPendingKindChange: (kind: WorldMapVirtualNodeKind) => void
  onConfirmPendingNode: () => void
  onCancelPendingNode: () => void
  onRemoveNode: (id: string) => void
}

function KindButton({
  kind,
  activeKind,
  locale,
  onSelect,
}: {
  kind: WorldMapVirtualNodeKind
  activeKind: WorldMapVirtualNodeKind
  locale: string
  onSelect: (kind: WorldMapVirtualNodeKind) => void
}) {
  return (
    <button
      type="button"
      className={`island-map-btn island-map-draw-virtual-kind${activeKind === kind ? ' island-map-btn--active' : ''}`.trim()}
      onClick={() => onSelect(kind)}
      title={virtualNodeKindLabel(kind, locale)}
    >
      <span className="island-map-draw-virtual-kind-symbol">{virtualNodeKindSymbol(kind)}</span>
      <span className="island-map-draw-virtual-kind-text">{virtualNodeKindLabel(kind, locale)}</span>
    </button>
  )
}

export function IslandMapDrawVirtualNodePanel({
  interaction,
  onInteractionChange,
  nodes,
  pendingNode,
  onPendingRouteIdChange,
  onPendingKindChange,
  onConfirmPendingNode,
  onCancelPendingNode,
  onRemoveNode,
}: IslandMapDrawVirtualNodePanelProps) {
  const { t, locale } = useLocale()

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
            <span>{t('islandMapDrawVirtualCompassKind')}</span>
            <div className="island-map-draw-compass-grid">
              {COMPASS_ROSE_LAYOUT.map((kind, index) =>
                kind ? (
                  <KindButton
                    key={kind}
                    kind={kind}
                    activeKind={pendingNode.kind}
                    locale={locale}
                    onSelect={onPendingKindChange}
                  />
                ) : (
                  <span key={`gap-${index}`} className="island-map-draw-compass-gap" aria-hidden />
                ),
              )}
            </div>
          </div>
          <div className="island-map-draw-field">
            <span>{t('islandMapDrawVirtualTurnKind')}</span>
            <div className="island-map-draw-panel-row island-map-draw-virtual-kinds">
              {RELATIVE_DIRECTION_KINDS.map((kind) => (
                <KindButton
                  key={kind}
                  kind={kind}
                  activeKind={pendingNode.kind}
                  locale={locale}
                  onSelect={onPendingKindChange}
                />
              ))}
            </div>
          </div>
          <div className="island-map-draw-field">
            <span>{t('islandMapDrawVirtualSurfaceKind')}</span>
            <div className="island-map-draw-panel-row island-map-draw-virtual-kinds">
              {SURFACE_VIRTUAL_NODE_KINDS.map((kind) => (
                <KindButton
                  key={kind}
                  kind={kind}
                  activeKind={pendingNode.kind}
                  locale={locale}
                  onSelect={onPendingKindChange}
                />
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
                {node.routeId} · {virtualNodeKindSymbol(node.kind)} {virtualNodeKindLabel(node.kind, locale)}
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
