import { useState } from 'react'

interface OperatorLogoImageProps {
  code: string
  logoUrl: string
  alt: string
}

/** Operator PNG with text fallback when the asset fails to load (path/MIME/cache issues on some devices). */
export function OperatorLogoImage({ code, logoUrl, alt }: OperatorLogoImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className="operator-logo-fallback" title={alt}>
        {code}
      </span>
    )
  }

  return (
    <img
      className="operator-logo"
      src={logoUrl}
      alt={alt}
      title={alt}
      decoding="async"
      loading="eager"
      onError={() => setFailed(true)}
    />
  )
}
