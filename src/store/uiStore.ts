import { create } from 'zustand'

export type StatusFilter =
  | 'all'
  | 'wishlist'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'

type UIStore = {
  searchText: string
  statusFilter: StatusFilter
  darkMode: boolean

  setSearchText: (searchText: string) => void
  setStatusFilter: (statusFilter: StatusFilter) => void
  toggleDarkMode: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  searchText: '',
  statusFilter: 'all',
  darkMode: false,

  setSearchText: (searchText) => set({ searchText }),

  setStatusFilter: (statusFilter) => set({ statusFilter }),

  toggleDarkMode: () =>
    set((state) => ({
      darkMode: !state.darkMode,
    })),
}))