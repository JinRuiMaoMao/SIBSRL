/** ISO build tag from published HTML or dev placeholder. */
export function readPublishedBuild(): string | null {
  return document.querySelector('meta[name="app-build"]')?.getAttribute('content') ?? null
}

/** Format build ISO timestamp in the visitor's local timezone. */
export function formatBuildLabel(iso: string, locale?: string | string[]): string {
  if (!iso || iso === 'development') return iso

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso.replace('T', ' ').replace(/Z$/, '').slice(0, 19)
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}
