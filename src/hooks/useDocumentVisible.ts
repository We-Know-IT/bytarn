'use client'

import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

/** Whether the tab is visible (true during server rendering). */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === 'visible',
    () => true
  )
}
