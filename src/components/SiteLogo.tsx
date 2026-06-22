import { SITE_LOGO_URL } from '../data/siteBrand'

interface SiteLogoProps {
  className?: string
}

export function SiteLogo({ className = '' }: SiteLogoProps) {
  return (
    <img
      src={SITE_LOGO_URL}
      alt=""
      className={`brand-logo ${className}`.trim()}
      width={32}
      height={32}
      decoding="async"
    />
  )
}
