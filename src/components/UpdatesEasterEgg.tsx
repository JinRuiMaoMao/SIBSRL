import { useLocale } from '../i18n/LocaleContext'

interface UpdatesEasterEggProps {
  hex: string
}

export function UpdatesEasterEgg({ hex }: UpdatesEasterEggProps) {
  const { t } = useLocale()

  return (
    <div className="updates-easter-egg">
      <p className="updates-easter-egg-hex">{hex}</p>
      <p className="updates-easter-egg-hint">{t('updatesEasterEggHint')}</p>
    </div>
  )
}
