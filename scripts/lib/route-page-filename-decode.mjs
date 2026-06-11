/** @param {string} filename */
export function pageFilenameToRouteId(filename) {
  return filename.replace(/%([0-9A-F]{2})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
}
