const animationStartByPathKey = new Map<string, number>()

export function readRouteMapTrajectoryAnimationStart(pathKey: string): number {
  const existing = animationStartByPathKey.get(pathKey)
  if (existing != null) return existing
  const startAt = performance.now()
  animationStartByPathKey.set(pathKey, startAt)
  return startAt
}

export function resetRouteMapTrajectoryAnimationStart(pathKey: string): void {
  animationStartByPathKey.set(pathKey, performance.now())
}

export function clearRouteMapTrajectoryAnimationStart(pathKey: string): void {
  animationStartByPathKey.delete(pathKey)
}
