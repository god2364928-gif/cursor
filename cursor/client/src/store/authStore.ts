import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}

// Helper functions to save/load user from localStorage
const saveUserToLocalStorage = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user))
}

const loadUserFromLocalStorage = (): User | null => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUserFromLocalStorage(),
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    saveUserToLocalStorage(user)
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },
}))


