import { getSiteLogoUrl } from '../data/siteBrand'

interface SiteLogoProps {
  className?: string
}

export function SiteLogo({ className = '' }: SiteLogoProps) {
  return (
    <img
      src={getSiteLogoUrl()}
      alt=""
      className={`brand-logo ${className}`.trim()}
      width={32}
      height={32}
      decoding="async"
    />
  )
}
