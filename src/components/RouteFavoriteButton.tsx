import { useEffect, useId, useRef, useState } from 'react'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'
import { useLocale } from '../i18n/LocaleContext'

interface RouteFavoriteButtonProps {
  routeId: string
  className?: string
}

function folderLabel(name: string, t: (key: 'favoriteFolderDefault') => string): string {
  return name.trim() || t('favoriteFolderDefault')
}

export function RouteFavoriteButton({ routeId, className = '' }: RouteFavoriteButtonProps) {
  const { t } = useLocale()
  const {
    folders,
    activeFolderId,
    isFavorite,
    folderContains,
    setRouteFolders,
    createFolder,
    setActiveFolderId,
  } = useFavoriteRoutes()
  const [open, setOpen] = useState(false)
  const [draftIds, setDraftIds] = useState<string[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const favorited = isFavorite(routeId)

  useEffect(() => {
    if (!open) return
    const containing = folders.filter((folder) => folderContains(folder.id, routeId)).map((f) => f.id)
    setDraftIds(containing.length > 0 ? containing : [activeFolderId])
  }, [open, folders, folderContains, routeId, activeFolderId])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggleDraftFolder = (folderId: string) => {
    setDraftIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId],
    )
  }

  const applySelection = () => {
    setRouteFolders(routeId, draftIds)
    setOpen(false)
  }

  const handleCreateAndSelect = () => {
    const name = window.prompt(t('favoriteFolderCreatePrompt'))
    if (!name?.trim()) return
    const id = createFolder(name)
    if (!id) return
    setDraftIds((prev) => [...prev, id])
    setActiveFolderId(id)
  }

  return (
    <div className={`route-favorite-picker ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`route-favorite-btn ${favorited ? 'is-active' : ''} ${className}`.trim()}
        aria-pressed={favorited}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-label={favorited ? t('favoriteManage') : t('favoriteAdd')}
        title={favorited ? t('favoriteManage') : t('favoriteAdd')}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <span aria-hidden>{favorited ? '★' : '☆'}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="route-favorite-picker-panel"
          role="dialog"
          aria-label={t('favoriteFolderPick')}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="route-favorite-picker-title">{t('favoriteFolderPick')}</p>
          <ul className="route-favorite-picker-list">
            {folders.map((folder) => (
              <li key={folder.id}>
                <label className="route-favorite-picker-option">
                  <input
                    type="checkbox"
                    checked={draftIds.includes(folder.id)}
                    onChange={() => toggleDraftFolder(folder.id)}
                  />
                  <span>{folderLabel(folder.name, t)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="route-favorite-picker-actions">
            <button type="button" className="route-favorite-picker-new" onClick={handleCreateAndSelect}>
              + {t('favoriteFolderNew')}
            </button>
            <button type="button" className="route-favorite-picker-apply" onClick={applySelection}>
              {t('favoriteFolderApply')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
