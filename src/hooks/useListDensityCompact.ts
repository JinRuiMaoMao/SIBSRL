import { useAppPreferences } from '../contexts/AppPreferencesContext'

export function useListDensityCompact(): boolean {
  return useAppPreferences().listDensity === 'compact'
}
