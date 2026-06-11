import { grantSecretAccess } from '../utils/secretAccess'
import { useLogoClickNavigate } from './useLogoClickNavigate'

/** 连点巴士图标进入秘密页；切换栏目时 pageKey 变化会清零计数 */
export function useSecretLogoClick(pageKey: string) {
  return useLogoClickNavigate(pageKey, './secret.html', grantSecretAccess)
}
