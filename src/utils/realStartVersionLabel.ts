/** Bottom-left StartMenu.Version style label (game uses place version from server). */
export function formatRealStartMenuVersion(buildIso: string, placeBuildNumber = 259): string {
  if (!buildIso || buildIso === 'development') {
    return `V2.0 (${placeBuildNumber})`
  }

  const date = new Date(buildIso)
  if (Number.isNaN(date.getTime())) {
    return `V2.0 (${placeBuildNumber})`
  }

  const major = 2
  const minor = date.getUTCMonth() + 1
  const patch = date.getUTCDate()
  return `V${major}.${minor}.${patch} (${placeBuildNumber})`
}
