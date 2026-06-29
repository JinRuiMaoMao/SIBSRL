import { useLocale } from '../i18n/LocaleContext'
import type { WorldMapDrawPathNodeDraft } from '../types/worldMapDraw'

interface IslandMapDrawPathNodePanelProps {
  pendingNode: WorldMapDrawPathNodeDraft | null
  nodeCount: number
  onLabelChange: (label: string) => void
  onConfirm: () => void
  onRemove: () => void
}

export function IslandMapDrawPathNodePanel({
  pendingNode,
  nodeCount,
  onLabelChange,
  onConfirm,
  onRemove,
}: IslandMapDrawPathNodePanelProps) {
  const { t } = useLocale()
  if (!pendingNode) {
    return (
      <p className="island-map-draw-help">
        {t('islandMapDrawPathNodeHelp', { count: nodeCount })}
      </p>
    )
  }

  return (
    <div className="island-map-draw-stop-panel">
      <label className="island-map-draw-field">
        <span>{t('islandMapDrawPathNodeLabel')}</span>
        <input
          value={pendingNode.label ?? ''}
          onChange={(event) => onLabelChange(event.target.value)}
          placeholder={t('islandMapDrawPathNodeLabelPlaceholder')}
          spellCheck={false}
        />
      </label>
      <div className="island-map-draw-panel-row">
        <button type="button" className="island-map-btn island-map-btn--active" onClick={onConfirm}>
          {pendingNode.editingNodeId ? t('islandMapDrawPathNodeUpdate') : t('islandMapDrawPathNodeConfirm')}
        </button>
        <button type="button" className="island-map-btn" onClick={onRemove}>
          {t('islandMapDrawPathNodeRemove')}
        </button>
      </div>
    </div>
  )
}
