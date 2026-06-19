import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocale } from '../i18n/LocaleContext'

interface AlertOptions {
  message: string
  detail?: string
}

interface ConfirmOptions {
  message: string
  danger?: boolean
}

interface PromptOptions {
  title: string
  defaultValue?: string
}

interface AppDialogContextValue {
  alert: (options: AlertOptions) => Promise<void>
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

type DialogState =
  | {
      kind: 'alert'
      message: string
      detail?: string
      resolve: () => void
    }
  | {
      kind: 'confirm'
      message: string
      danger?: boolean
      resolve: (confirmed: boolean) => void
    }
  | {
      kind: 'prompt'
      title: string
      defaultValue: string
      resolve: (value: string | null) => void
    }

const AppDialogContext = createContext<AppDialogContextValue | null>(null)

function AppDialogHost({
  dialog,
  onClose,
}: {
  dialog: DialogState
  onClose: () => void
}) {
  const { t } = useLocale()
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [promptValue, setPromptValue] = useState(
    dialog.kind === 'prompt' ? dialog.defaultValue : '',
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (dialog.kind !== 'prompt') return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [dialog.kind])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (dialog.kind === 'alert') {
          dialog.resolve()
          onClose()
        } else if (dialog.kind === 'confirm') {
          dialog.resolve(false)
          onClose()
        } else {
          dialog.resolve(null)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog, onClose])

  const handleBackdrop = () => {
    if (dialog.kind === 'alert') {
      dialog.resolve()
    } else if (dialog.kind === 'confirm') {
      dialog.resolve(false)
    } else {
      dialog.resolve(null)
    }
    onClose()
  }

  const handlePromptSubmit = () => {
    if (dialog.kind !== 'prompt') return
    dialog.resolve(promptValue)
    onClose()
  }

  return (
    <div className="app-dialog-root">
      <button
        type="button"
        className="app-dialog-backdrop"
        aria-label={t('dialogCancel')}
        onClick={handleBackdrop}
      />
      <div
        className="app-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {dialog.kind === 'prompt' ? (
          <>
            <h2 id={titleId} className="app-dialog-title">
              {dialog.title}
            </h2>
            <input
              ref={inputRef}
              type="text"
              className="app-dialog-input"
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handlePromptSubmit()
                }
              }}
            />
            <div className="app-dialog-actions">
              <button type="button" className="app-dialog-btn" onClick={handleBackdrop}>
                {t('dialogCancel')}
              </button>
              <button
                type="button"
                className="app-dialog-btn app-dialog-btn--primary"
                onClick={handlePromptSubmit}
              >
                {t('dialogConfirm')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p id={titleId} className="app-dialog-message">
              {dialog.message}
            </p>
            {dialog.kind === 'alert' && dialog.detail ? (
              <textarea
                className="app-dialog-detail sibs-scrollbar"
                readOnly
                rows={3}
                value={dialog.detail}
                onFocus={(event) => event.currentTarget.select()}
              />
            ) : null}
            {dialog.kind === 'confirm' ? (
              <div className="app-dialog-actions">
                <button type="button" className="app-dialog-btn" onClick={handleBackdrop}>
                  {t('dialogCancel')}
                </button>
                <button
                  type="button"
                  className={`app-dialog-btn ${dialog.danger ? 'app-dialog-btn--danger' : 'app-dialog-btn--primary'}`}
                  onClick={() => {
                    dialog.resolve(true)
                    onClose()
                  }}
                >
                  {t('dialogConfirm')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="app-dialog-btn app-dialog-btn--primary app-dialog-btn--block"
                onClick={() => {
                  dialog.resolve()
                  onClose()
                }}
              >
                {t('dialogOk')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const alert = useCallback(
    (options: AlertOptions) =>
      new Promise<void>((resolve) => {
        setDialog({
          kind: 'alert',
          message: options.message,
          detail: options.detail,
          resolve: () => resolve(),
        })
      }),
    [],
  )

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({
          kind: 'confirm',
          message: options.message,
          danger: options.danger,
          resolve,
        })
      }),
    [],
  )

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setDialog({
          kind: 'prompt',
          title: options.title,
          defaultValue: options.defaultValue ?? '',
          resolve,
        })
      }),
    [],
  )

  const value: AppDialogContextValue = { alert, confirm, prompt }

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {dialog ? (
        <AppDialogHost
          dialog={dialog}
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
    </AppDialogContext.Provider>
  )
}

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext)
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider')
  }
  return ctx
}
