/** @param {string} routeId */
export function routeIdToPageFilename(routeId) {
  return [...routeId]
    .map((ch) =>
      /[A-Za-z0-9-]/.test(ch)
        ? ch
        : `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
    )
    .join('')
}

/** @param {string} filename */
export function pageFilenameToRouteId(filename) {
  return filename.replace(/%([0-9A-F]{2})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
}
