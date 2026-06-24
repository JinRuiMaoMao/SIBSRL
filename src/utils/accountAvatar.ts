export function resolveAccountAvatarInitial(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const fromName = displayName?.trim()
  if (fromName) return fromName[0]!.toUpperCase()
  if (email) return email[0]!.toUpperCase()
  return '?'
}

export function resolveAccountDisplayLabel(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const fromName = displayName?.trim()
  if (fromName) return fromName
  return email ?? ''
}
