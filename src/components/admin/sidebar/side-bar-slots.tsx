'use client'
import { createContext, useContext, useState, useCallback } from 'react'

interface SidebarSlots {
  content?: React.ReactNode
}

interface SidebarSlotsContextValue {
  slots: SidebarSlots
  setSlots: (slots: SidebarSlots) => void
}

const SidebarSlotsContext = createContext<SidebarSlotsContextValue | undefined>(
  undefined
)

export function SidebarSlotProvider({
  children,
  value
}: {
  children: React.ReactNode
  value?: SidebarSlots
}) {
  const [slots, setSlots] = useState<SidebarSlots>(value || {})

  const updateSlots = useCallback((newSlots: SidebarSlots) => {
    setSlots(newSlots)
  }, [])

  return (
    <SidebarSlotsContext.Provider value={{ slots, setSlots: updateSlots }}>
      {children}
    </SidebarSlotsContext.Provider>
  )
}

export function useSidebarSlots() {
  const context = useContext(SidebarSlotsContext)
  if (!context) {
  }
  return context?.slots || {}
}

export function useSetSidebarSlots() {
  const context = useContext(SidebarSlotsContext)
  if (!context) {
    console.warn('useSetSidebarSlots called outside of SidebarSlotProvider')
  }
  return context?.setSlots
}
