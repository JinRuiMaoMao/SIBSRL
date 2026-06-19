import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'
import { useLocale } from '../i18n/LocaleContext'
import { DEFAULT_FAVORITE_FOLDER_ID } from '../storage/favoriteFolders'
import { buildFavoritesExport, parseFavoritesImport } from '../storage/routeActivity'

function folderDisplayName(name: string, t: (key: 'favoriteFolderDefault') => string): string {
  return name.trim() || t('favoriteFolderDefault')
}

export function FavoritesFolderBar() {
  const { t } = useLocale()
  const { prompt, confirm } = useAppDialog()
  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    renameFolder,
    deleteFolder,
    replaceFoldersState,
  } = useFavoriteRoutes()
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [status, setStatus] = useState<'idle' | 'copied' | 'imported' | 'error'>('idle')
  const importPanelId = useId()
  const importRef = useRef<HTMLDivElement>(null)

  const handleCreateFolder = useCallback(async () => {
    const name = await prompt({ title: t('favoriteFolderCreatePrompt') })
    if (!name?.trim()) return
    createFolder(name)
  }, [createFolder, prompt, t])

  const handleRenameFolder = useCallback(
    async (folderId: string, currentName: string) => {
      const name = await prompt({
        title: t('favoriteFolderRenamePrompt'),
        defaultValue: currentName,
      })
      if (!name?.trim()) return
      renameFolder(folderId, name)
    },
    [prompt, renameFolder, t],
  )

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      const ok = await confirm({
        message: t('favoriteFolderDeleteConfirm'),
        danger: true,
      })
      if (!ok) return
      deleteFolder(folderId)
    },
    [confirm, deleteFolder, t],
  )

  const handleExport = useCallback(async () => {
    const text = buildFavoritesExport({
      version: 2,
      folders,
      activeFolderId,
    })
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setImportText(text)
      setImportOpen(true)
      setStatus('copied')
    }
    window.setTimeout(() => setStatus('idle'), 1600)
  }, [activeFolderId, folders])

  const handleImport = useCallback(() => {
    try {
      replaceFoldersState(parseFavoritesImport(importText))
      setImportText('')
      setImportOpen(false)
      setStatus('imported')
      window.setTimeout(() => setStatus('idle'), 1600)
    } catch {
      setStatus('error')
      window.setTimeout(() => setStatus('idle'), 2000)
    }
  }, [importText, replaceFoldersState])

  useEffect(() => {
    if (!importOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (importRef.current && !importRef.current.contains(event.target as Node)) {
        setImportOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [importOpen])

  return (
    <div className="favorites-folder-bar">
      <div className="favorites-folder-tabs" role="tablist" aria-label={t('favoriteRoutes')}>
        {folders.map((folder) => {
          const label = folderDisplayName(folder.name, t)
          const active = folder.id === activeFolderId
          return (
            <div key={folder.id} className="favorites-folder-tab-wrap">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className={`favorites-folder-tab ${active ? 'active' : ''}`}
                onClick={() => setActiveFolderId(folder.id)}
                onDoubleClick={() => {
                  if (folder.id !== DEFAULT_FAVORITE_FOLDER_ID || folder.name.trim()) {
                    void handleRenameFolder(folder.id, folder.name)
                  }
                }}
                title={t('favoriteFolderRenameHint')}
              >
                <span className="favorites-folder-tab-label">{label}</span>
                <span className="favorites-folder-tab-count">{folder.routeIds.length}</span>
              </button>
              {folders.length > 1 ? (
                <button
                  type="button"
                  className="favorites-folder-tab-delete"
                  aria-label={t('favoriteFolderDelete')}
                  title={t('favoriteFolderDelete')}
                  onClick={() => void handleDeleteFolder(folder.id)}
                >
                  ×
                </button>
              ) : null}
            </div>
          )
        })}
        <button
          type="button"
          className="favorites-folder-add"
          aria-label={t('favoriteFolderNew')}
          title={t('favoriteFolderNew')}
          onClick={() => void handleCreateFolder()}
        >
          +
        </button>
      </div>

      <div className="favorites-folder-tools" ref={importRef}>
        <button type="button" className="favorites-tool-btn" onClick={() => void handleExport()}>
          {status === 'copied' ? t('favoritesExportCopied') : t('favoritesExport')}
        </button>
        <button
          type="button"
          className="favorites-tool-btn"
          aria-expanded={importOpen}
          aria-controls={importPanelId}
          onClick={() => setImportOpen((open) => !open)}
        >
          {t('favoritesImport')}
        </button>
        {importOpen ? (
          <div id={importPanelId} className="favorites-import-panel">
            <textarea
              className="favorites-import-textarea sibs-scrollbar"
              rows={4}
              value={importText}
              placeholder={t('favoritesImportPlaceholder')}
              onChange={(event) => setImportText(event.target.value)}
            />
            <button
              type="button"
              className="favorites-tool-btn"
              disabled={!importText.trim()}
              onClick={handleImport}
            >
              {status === 'imported'
                ? t('favoritesImportDone')
                : status === 'error'
                  ? t('favoritesImportError')
                  : t('favoritesImportApply')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
