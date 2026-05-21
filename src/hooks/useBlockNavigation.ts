import { useEffect } from 'react'
import { useBlocker, type Blocker } from 'react-router-dom'

/**
 * Blocks in-app navigation (React Router) and browser close/refresh
 * when `shouldBlock` is true.
 *
 * Returns the blocker so the caller can render a custom confirmation dialog.
 */
export function useBlockNavigation(shouldBlock: boolean): Blocker {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  )

  // Block browser close / refresh (browser native dialog — can't be customized)
  useEffect(() => {
    if (!shouldBlock) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldBlock])

  return blocker
}
