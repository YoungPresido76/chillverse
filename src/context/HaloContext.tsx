// src/context/HaloContext.tsx
import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

export interface HaloContextType {
  isOpen: boolean
  openHalo: () => void
  closeHalo: () => void
  toggleHalo: () => void
}

const HaloContext = createContext<HaloContextType | undefined>(undefined)

export function HaloProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openHalo = useCallback(() => setIsOpen(true), [])
  const closeHalo = useCallback(() => setIsOpen(false), [])
  const toggleHalo = useCallback(() => setIsOpen(prev => !prev), [])

  const value = useMemo<HaloContextType>(
    () => ({ isOpen, openHalo, closeHalo, toggleHalo }),
    [isOpen, openHalo, closeHalo, toggleHalo]
  )

  return <HaloContext.Provider value={value}>{children}</HaloContext.Provider>
}

export function useHalo(): HaloContextType {
  const ctx = useContext(HaloContext)
  if (!ctx) {
    throw new Error('useHalo must be used within a HaloProvider')
  }
  return ctx
}
