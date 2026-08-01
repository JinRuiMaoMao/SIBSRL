/** Decode the last path segment of a relative audio URL for use as a download filename. */
export function audioDownloadFilename(src: string, fallback = 'audio'): string {
  try {
    const path = src.split('?')[0] ?? ''
    const raw = path.split('/').pop() ?? fallback
    const decoded = decodeURIComponent(raw)
    return decoded.trim() || fallback
  } catch {
    return fallback
  }
}

export function triggerAudioDownload(src: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = src
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
