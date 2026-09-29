/** True when the real shell is showing the routes layer (not the start menu). */
export function isRealShellRoutesActive(): boolean {
  const stack = document.querySelector('.real-shell-home-stack')
  if (!stack) return true
  return stack.getAttribute('data-routes-phase') === 'routes'
}
