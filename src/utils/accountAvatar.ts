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

/** Real 执照 / 对外展示名：无昵称时用邮箱 @ 前本地名，避免整串邮箱撑破布局。 */
export function resolveAccountLicenseName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const fromName = displayName?.trim()
  if (fromName) return fromName
  if (!email) return ''
  const localPart = email.split('@')[0]?.trim()
  if (localPart) return localPart
  return resolveAccountAvatarInitial(displayName, email)
}
