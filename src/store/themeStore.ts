import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyStatusBarTheme } from '../lib/capacitor'

export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
  initialize: () => void
}

const applyToDom = (theme: Theme) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
  // También ajustamos color-scheme para que los inputs nativos (date, time, file)
  // y la barra de scroll por defecto del navegador sigan al tema.
  root.style.colorScheme = theme

  // Si estamos en la APK Android, también ajustamos la StatusBar nativa.
  applyStatusBarTheme(theme).catch(() => {})
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyToDom(theme)
        set({ theme })
      },
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyToDom(next)
        set({ theme: next })
      },
      initialize: () => {
        applyToDom(get().theme)
      },
    }),
    {
      name: 'fresatitan-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyToDom(state.theme)
      },
    },
  ),
)
