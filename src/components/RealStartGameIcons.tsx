type IconProps = { className?: string; size?: number }

export function RealStartPlayIcon({ className, size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  )
}

export function RealStartServersIcon({ className, size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M4 4h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m0 8h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1M6 7h.01M6 15h.01"
      />
    </svg>
  )
}

export function RealStartProfileIcon({ className, size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m0 2c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4"
      />
    </svg>
  )
}

export function RealStartLanguageIcon({ className, size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <text x="4" y="14" fill="currentColor" fontSize="11" fontWeight="800" fontFamily="Arial, sans-serif">
        A
      </text>
      <text x="13" y="17" fill="currentColor" fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">
        文
      </text>
    </svg>
  )
}

export function RealStartDockMusicIcon({ muted, className, size = 22 }: IconProps & { muted?: boolean }) {
  if (muted) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 3v10.3A4 4 0 1 0 14 17V7h6V3zm-1 14.2a2 2 0 1 1-2-2 2 2 0 0 1 2 2M4.3 3.7 3 5.1l16 16 1.3-1.4z"
        />
      </svg>
    )
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 3v10.3A4 4 0 1 0 14 17V7h6V3z" />
    </svg>
  )
}

export function RealStartDockFaqIcon({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m1 15h-2v-2h2zm2.07-7.75-.9.92A3.5 3.5 0 0 0 13 13h-2v-.5a4.5 4.5 0 0 1 1.31-3.18l1.24-1.26A1.5 1.5 0 0 0 11.5 6 1.5 1.5 0 0 0 10 7.5H8a3.5 3.5 0 0 1 7 0 3.4 3.4 0 0 1-.93 2.25"
      />
    </svg>
  )
}

export function RealStartDockAboutIcon({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m1 15h-2v-6h2zm0-8h-2V7h2z"
      />
    </svg>
  )
}

export function RealStartDockShopIcon({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4m10 0a2 2 0 1 0 .001 3.999A2 2 0 0 0 17 18M6.2 6h14.3l-1.4 7H8.1zM5 4h1.6l1 6h12.7l1.7-8H6.5z"
      />
    </svg>
  )
}

export function RealStartDockCreditIcon({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21l2.3-7-6-4.6h7.6z"
      />
    </svg>
  )
}

export function RealStartDockChangeLogIcon({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m7 1.5V8h4.5M8 12h8v2H8zm0 4h6v2H8z"
      />
    </svg>
  )
}
