import { OPERATORS } from '../data/routes'
import { getOperatorLogoUrl, operatorHasLogo } from '../data/operatorLogos'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'

interface OperatorLogosProps {
  operators: readonly string[]
  className?: string
  size?: 'card' | 'detail' | 'meta'
}

export function OperatorLogos({ operators, className = '', size = 'card' }: OperatorLogosProps) {
  const { locale } = useLocale()

  if (operators.length === 0) return null

  return (
    <span
      className={`operator-logos operator-logos--${size}${className ? ` ${className}` : ''}`}
      aria-label={operators
        .map((code) => {
          const label = OPERATORS[code]
          return label ? getPrimaryText(label, locale) : code
        })
        .join(', ')}
    >
      {operators.map((code) => {
        const label = OPERATORS[code]
        const alt = label ? getPrimaryText(label, locale) : code
        const logoUrl = operatorHasLogo(code) ? getOperatorLogoUrl(code) : null

        if (logoUrl) {
          return (
            <img
              key={code}
              className="operator-logo"
              src={logoUrl}
              alt={alt}
              title={alt}
              decoding="async"
            />
          )
        }

        return (
          <span key={code} className="operator-logo-fallback">
            {code}
          </span>
        )
      })}
    </span>
  )
}
