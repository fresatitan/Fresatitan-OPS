import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { RolUsuario } from '../types/database'

export interface Trabajador {
  id: string
  nombre: string
  apellidos: string
  role: RolUsuario
  activo: boolean
  puede_operar: boolean
  created_at: string
}

// -----------------------------------------------------------------------------
// Seed local para modo in-memory (fallback sin Supabase)
// -----------------------------------------------------------------------------
const now = new Date().toISOString()
const SEED_TRABAJADORES: Trabajador[] = [
  { id: 't1', nombre: 'Toni',    apellidos: '', role: 'admin',   activo: true, puede_operar: true,  created_at: now },
  { id: 't2', nombre: 'Roser',   apellidos: '', role: 'admin',   activo: true, puede_operar: false, created_at: now },
  { id: 't3', nombre: 'Gerard',  apellidos: '', role: 'tecnico', activo: true, puede_operar: true,  created_at: now },
  { id: 't4', nombre: 'Pol',     apellidos: '', role: 'tecnico', activo: true, puede_operar: true,  created_at: now },
  { id: 't5', nombre: 'Oscar',   apellidos: '', role: 'tecnico', activo: true, puede_operar: true,  created_at: now },
  { id: 't6', nombre: 'Albert',  apellidos: '', role: 'tecnico', activo: true, puede_operar: true,  created_at: now },
  { id: 't7', nombre: 'Andrea',  apellidos: '', role: 'tecnico', activo: true, puede_operar: true,  created_at: now },
  { id: 't8', nombre: 'Rosalia', apellidos: '', role: 'tecnico', activo: true, puede_operar: true,  created_at: now },
]

interface TrabajadoresState {
  trabajadores: Trabajador[]
  loading: boolean
  error: string | null
  initialized: boolean

  fetchAll: () => Promise<void>

  addTrabajador: (data: { nombre: string; apellidos: string; role: RolUsuario; puede_operar?: boolean }) => Promise<void>
  updateTrabajador: (id: string, data: Partial<Pick<Trabajador, 'nombre' | 'apellidos' | 'role' | 'puede_operar'>>) => Promise<void>
  toggleActivo: (id: string) => Promise<void>
  removeTrabajador: (id: string) => Promise<void>

  // Selectors
  getTrabajadorName: (id: string | null) => string
  getByRole: (role: RolUsuario) => Trabajador[]
}

export const useTrabajadoresStore = create<TrabajadoresState>((set, get) => ({
  trabajadores: [],
  loading: false,
  error: null,
  initialized: false,

  fetchAll: async () => {
    if (get().initialized && !get().error) return
    set({ loading: true, error: null })

    if (!isSupabaseConfigured || !supabase) {
      set({ trabajadores: SEED_TRABAJADORES, loading: false, initialized: true })
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, apellidos, role, activo, puede_operar, created_at')
      .order('nombre')

    if (error) {
      console.error('[trabajadoresStore] fetchAll error:', error)
      set({ loading: false, error: error.message, initialized: true })
      return
    }

    set({
      trabajadores: (data ?? []) as Trabajador[],
      loading: false,
      initialized: true,
    })
  },

  addTrabajador: async (data) => {
    const puedeOperar = data.puede_operar ?? data.role !== 'admin'

    if (!isSupabaseConfigured || !supabase) {
      const id = `t${Date.now()}`
      set((s) => ({
        trabajadores: [
          ...s.trabajadores,
          {
            id,
            nombre: data.nombre,
            apellidos: data.apellidos,
            role: data.role,
            activo: true,
            puede_operar: puedeOperar,
            created_at: new Date().toISOString(),
          },
        ],
      }))
      return
    }

    const { data: inserted, error } = await supabase
      .from('profiles')
      .insert({
        nombre: data.nombre,
        apellidos: data.apellidos,
        role: data.role,
        activo: true,
        puede_operar: puedeOperar,
      })
      .select()
      .single()

    if (error) {
      console.error('[addTrabajador] error:', error)
      set({ error: error.message })
      return
    }
    set((s) => ({ trabajadores: [...s.trabajadores, inserted as Trabajador] }))
  },

  updateTrabajador: async (id, data) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({
        trabajadores: s.trabajadores.map((t) => (t.id === id ? { ...t, ...data } : t)),
      }))
      return
    }
    const { error } = await supabase.from('profiles').update(data).eq('id', id)
    if (error) {
      console.error('[updateTrabajador] error:', error)
      set({ error: error.message })
      return
    }
    set((s) => ({
      trabajadores: s.trabajadores.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }))
  },

  toggleActivo: async (id) => {
    const trabajador = get().trabajadores.find((t) => t.id === id)
    if (!trabajador) return
    const newActivo = !trabajador.activo

    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({
        trabajadores: s.trabajadores.map((t) => (t.id === id ? { ...t, activo: newActivo } : t)),
      }))
      return
    }
    const { error } = await supabase.from('profiles').update({ activo: newActivo }).eq('id', id)
    if (error) {
      console.error('[toggleActivo] error:', error)
      set({ error: error.message })
      return
    }
    set((s) => ({
      trabajadores: s.trabajadores.map((t) => (t.id === id ? { ...t, activo: newActivo } : t)),
    }))
  },

  removeTrabajador: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({ trabajadores: s.trabajadores.filter((t) => t.id !== id) }))
      return
    }
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) {
      console.error('[removeTrabajador] error:', error)
      set({ error: error.message })
      return
    }
    set((s) => ({ trabajadores: s.trabajadores.filter((t) => t.id !== id) }))
  },

  getTrabajadorName: (id) => {
    if (!id) return '—'
    const t = get().trabajadores.find((t) => t.id === id)
    if (!t) return '—'
    return t.apellidos ? `${t.nombre} ${t.apellidos}` : t.nombre
  },

  getByRole: (role) => get().trabajadores.filter((t) => t.role === role && t.activo),
}))
