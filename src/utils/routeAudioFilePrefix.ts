/** Lowercase route id for synced PA filenames (e.g. N171 → n171, 476# → 476). */
export function routeAudioFilePrefix(routeId: string): string {
  return routeId.toLowerCase().replace(/[^a-z0-9]/g, '')
}
