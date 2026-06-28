import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchUserData, updateUserProfile, type UserProfilePayload } from '../api/userApi'
import { useAuth } from './AuthContext'
import { resolveAccountAvatarInitial, resolveAccountDisplayLabel } from '../utils/accountAvatar'

interface UserProfileContextValue {
  profile: UserProfilePayload | null
  loading: boolean
  displayLabel: string
  avatarInitial: string
  refreshProfile: () => Promise<void>
  applyProfile: (profile: UserProfilePayload) => void
  saveProfile: (patch: { displayName?: string | null; avatarDataUrl?: string | null }) => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { token, email, isLoggedIn } = useAuth()
  const [profile, setProfile] = useState<UserProfilePayload | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setProfile(null)
      return
    }
    setLoading(true)
    try {
      const data = await fetchUserData(token)
      if (data.profile) {
        setProfile({
          email: data.profile.email ?? email ?? '',
          oauthOnly: Boolean(data.profile.oauthOnly),
          isAdmin: Boolean(data.profile.isAdmin),
          displayName: data.profile.displayName ?? null,
          avatarDataUrl: data.profile.avatarDataUrl ?? null,
        })
      } else {
        setProfile({ email: email ?? '', oauthOnly: false, isAdmin: false, displayName: null, avatarDataUrl: null })
      }
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [token, email])

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setProfile(null)
      setLoading(false)
      return
    }
    void refreshProfile()
  }, [isLoggedIn, token, refreshProfile])

  const applyProfile = useCallback((next: UserProfilePayload) => {
    setProfile(next)
  }, [])

  const saveProfile = useCallback(
    async (patch: { displayName?: string | null; avatarDataUrl?: string | null }) => {
      if (!token) return
      const result = await updateUserProfile(token, patch)
      setProfile(result.profile)
    },
    [token],
  )

  const displayLabel = useMemo(
    () => resolveAccountDisplayLabel(profile?.displayName, profile?.email ?? email),
    [profile, email],
  )

  const avatarInitial = useMemo(
    () => resolveAccountAvatarInitial(profile?.displayName, profile?.email ?? email),
    [profile, email],
  )

  const value = useMemo(
    () => ({
      profile,
      loading,
      displayLabel,
      avatarInitial,
      refreshProfile,
      applyProfile,
      saveProfile,
    }),
    [profile, loading, displayLabel, avatarInitial, refreshProfile, applyProfile, saveProfile],
  )

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext)
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider')
  return ctx
}
