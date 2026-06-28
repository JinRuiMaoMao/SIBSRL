import { useUserProfile } from '../contexts/UserProfileContext'
import { useAuth } from '../contexts/AuthContext'

export function useIsMapAdmin(): boolean {
  const { isLoggedIn } = useAuth()
  const { profile, loading } = useUserProfile()
  return Boolean(isLoggedIn && !loading && profile?.isAdmin)
}
