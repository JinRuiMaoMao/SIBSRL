const HEADSHOT_BATCH_SIZE = 100

interface RobloxThumbnailEntry {
  targetId: number
  state: string
  imageUrl?: string
}

interface RobloxThumbnailResponse {
  data?: RobloxThumbnailEntry[]
}

const headshotCache = new Map<number, string>()
let headshotInflight: Promise<void> | null = null
const headshotPending = new Set<number>()
const headshotWaiters = new Set<() => void>()

export function robloxAssetThumbnailUrl(assetId: number, width = 420, height = 420): string {
  return `https://www.roblox.com/asset-thumbnail/image?assetId=${assetId}&width=${width}&height=${height}&format=png`
}

export function robloxLegacyHeadshotUrl(userId: number, size = 150): string {
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=${size}&height=${size}&format=png`
}

export function getCachedRobloxHeadshot(userId: number): string | null {
  return headshotCache.get(userId) ?? null
}

export async function fetchRobloxHeadshots(userIds: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(userIds.filter((id) => id > 0))]
  const missing = unique.filter((id) => !headshotCache.has(id))
  if (missing.length === 0) {
    return new Map(headshotCache)
  }

  for (const id of missing) headshotPending.add(id)

  if (!headshotInflight) {
    headshotInflight = (async () => {
      const queue = [...headshotPending]
      headshotPending.clear()
      for (let i = 0; i < queue.length; i += HEADSHOT_BATCH_SIZE) {
        const batch = queue.slice(i, i + HEADSHOT_BATCH_SIZE)
        try {
          const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${batch.join(',')}&size=150x150&format=Png&isCircular=true`
          const res = await fetch(url)
          if (!res.ok) continue
          const json = (await res.json()) as RobloxThumbnailResponse
          for (const entry of json.data ?? []) {
            if (entry.state === 'Completed' && entry.imageUrl) {
              headshotCache.set(entry.targetId, entry.imageUrl)
            }
          }
        } catch {
          // Fall back to legacy URLs in the image component.
        }
      }
    })().finally(() => {
      headshotInflight = null
      for (const notify of headshotWaiters) notify()
      headshotWaiters.clear()
    })
  }

  await headshotInflight

  return new Map(headshotCache)
}

export function subscribeRobloxHeadshotBatch(userIds: number[], onUpdate: () => void): () => void {
  const unique = [...new Set(userIds.filter((id) => id > 0))]
  const missing = unique.filter((id) => !headshotCache.has(id))
  if (missing.length === 0) {
    onUpdate()
    return () => {}
  }

  for (const id of missing) headshotPending.add(id)
  headshotWaiters.add(onUpdate)

  if (!headshotInflight) {
    void fetchRobloxHeadshots(missing)
  }

  return () => {
    headshotWaiters.delete(onUpdate)
  }
}
