import { create } from 'zustand'

interface AdminAuthState {
  token: string | null
  setToken: (token: string) => void
  logout: () => void
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  setToken: (token) => {
    localStorage.setItem('admin_token', token)
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('admin_token')
    set({ token: null })
  },
}))
