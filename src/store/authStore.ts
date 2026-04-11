import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

/**
 * Auth store híbrido:
 *  · Modo Supabase (si VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están definidas):
 *    usa `supabase.auth.signInWithPassword` y carga el perfil desde la tabla `profiles`.
 *    Solo permite entrar a perfiles con role = 'admin'.
 *  · Modo DEV (sin Supabase configurado): permite seleccionar un admin del seed sin password.
 *    El DEV mode también está disponible con Supabase activo para pruebas rápidas.
 */

export interface AdminUser {
  id: string
  nombre: string
  email: string
  role: 'admin'
}

const DEV_ADMINS: AdminUser[] = [
  { id: 'admin-toni',  nombre: 'Toni',  email: 'toni@fresatitan.com',  role: 'admin' },
  { id: 'admin-roser', nombre: 'Roser', email: 'roser@fresatitan.com', role: 'admin' },
]

interface AuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  loginAs: (adminId: string) => Promise<void>     // DEV: entrada sin password
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>

  getDevAdmins: () => AdminUser[]
  hasSupabase: () => boolean
}

// Convierte una sesión de Supabase a nuestro AdminUser cargando el perfil asociado
async function sessionToAdminUser(session: Session | null): Promise<AdminUser | null> {
  if (!session || !supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, role')
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) return null
  const profile = data as { id: string; nombre: string; apellidos: string; role: string }
  if (profile.role !== 'admin') return null    // solo admins pasan

  return {
    id: profile.id,
    nombre: profile.nombre,
    email: session.user.email ?? '',
    role: 'admin',
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      initialized: false,

      /**
       * Inicializa el store: si Supabase está configurado, recupera la sesión activa
       * y se suscribe a cambios. Debe llamarse una vez al arrancar la app.
       */
      initialize: async () => {
        if (get().initialized) return
        set({ initialized: true })

        if (!supabase) return

        // Recuperar sesión existente
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const user = await sessionToAdminUser(session)
          if (user) set({ user, isAuthenticated: true })
          else {
            // sesión válida pero no es admin — cerramos
            await supabase.auth.signOut()
            set({ user: null, isAuthenticated: false })
          }
        }

        // Suscripción a cambios (login/logout en otra pestaña, refresh de token, etc.)
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!session) {
            set({ user: null, isAuthenticated: false })
            return
          }
          const user = await sessionToAdminUser(session)
          if (user) set({ user, isAuthenticated: true })
          else set({ user: null, isAuthenticated: false })
        })
      },

      loginAs: async (adminId) => {
        const admin = DEV_ADMINS.find((a) => a.id === adminId)
        if (!admin) return
        set({ user: admin, isAuthenticated: true, loading: false })
      },

      login: async (email, password) => {
        if (!isSupabaseConfigured || !supabase) {
          return {
            ok: false,
            error: 'Supabase no está configurado. Usa los botones de MODO DESARROLLO o define las variables de entorno.',
          }
        }

        set({ loading: true })
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          set({ loading: false })
          return { ok: false, error: traducirError(error.message) }
        }

        const user = await sessionToAdminUser(data.session)
        if (!user) {
          await supabase.auth.signOut()
          set({ loading: false, user: null, isAuthenticated: false })
          return {
            ok: false,
            error: 'Esta cuenta existe pero no tiene rol de administrador.',
          }
        }

        set({ user, isAuthenticated: true, loading: false })
        return { ok: true }
      },

      logout: async () => {
        if (supabase) {
          await supabase.auth.signOut()
        }
        set({ user: null, isAuthenticated: false })
      },

      getDevAdmins: () => DEV_ADMINS,
      hasSupabase: () => isSupabaseConfigured,
    }),
    {
      name: 'fresatitan_auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)

function traducirError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos'
  if (/email not confirmed/i.test(msg)) return 'Confirma el email antes de entrar'
  if (/too many requests/i.test(msg)) return 'Demasiados intentos. Espera un momento.'
  return msg
}
