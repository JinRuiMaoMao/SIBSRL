export function robloxHeadshotUrl(userId: number, size = 150): string {
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=${size}&height=${size}&format=png`
}

export function robloxProfileUrl(userId: number): string {
  return `https://www.roblox.com/users/${userId}/profile`
}

export function robloxUserIdFromProfileUrl(url: string): number | null {
  const match = url.match(/roblox\.com\/users\/(\d+)/i)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}
