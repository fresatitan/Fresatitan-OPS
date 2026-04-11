import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Cliente Supabase sin typing genérico (cast a any para simplificar inserts/updates
 * dado que las tablas tienen muchos defaults y supabase-js v2 + PostgrestVersion 12
 * requiere un Database type muy específico que no estamos generando automáticamente).
 *
 * La seguridad de tipos se mantiene en el lado del store: cada store define sus
 * propias interfaces (Maquina, UsoEquipo, etc.) y hace cast a ellas al leer de la DB.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local'
    )
  }
  return supabase
}
