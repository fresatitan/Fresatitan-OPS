import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type {
  Maquina,
  UsoEquipo,
  Incidencia,
  Mantenimiento,
  EstadoMaquina,
  TipoMantenimiento,
  ResultadoUso,
  TipoMaquina,
} from '../types/database'

// =============================================================================
// FRESATITAN OPS · workflowStore
//
// Este store es híbrido:
//   · Modo Supabase (por defecto): lee de la base de datos, escribe vía
//     supabase-js y se suscribe a cambios vía Realtime → sincroniza en tiempo
//     real entre la tablet del taller y el dashboard de Roser/Toni.
//   · Modo in-memory (fallback cuando Supabase no está configurado): seed de
//     12 máquinas y operaciones locales. Útil para desarrollo sin conexión.
//
// El trigger de Supabase `update_maquina_estado_from_uso` se encarga de
// mantener `maquinas.estado_actual` sincronizado — desde el cliente solo
// escribimos en `usos_equipo`.
// =============================================================================

// -----------------------------------------------------------------------------
// Seed para el modo in-memory (solo si no hay Supabase)
// -----------------------------------------------------------------------------
const nowIso = new Date().toISOString()

const SEED_MAQUINAS: Maquina[] = [
  { id: 'm1',  codigo: 'REF-030', nombre: 'Fresadora UP3D ZR',               tipo: 'fresadora',    numero_serie: null, descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm2',  codigo: 'REF-057', nombre: 'Fresadora P53 ZR',                tipo: 'fresadora',    numero_serie: null, descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm3',  codigo: 'REF-062', nombre: 'Fresadora UP3D Disilicato',       tipo: 'fresadora',    numero_serie: null, descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm4',  codigo: 'REF-039', nombre: 'Fresadora CM Fanuc 1',            tipo: 'fresadora',    numero_serie: '188ZG886', descripcion: null, ubicacion: 'Zona CNC', estado_actual: 'parada', requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm5',  codigo: 'REF-040', nombre: 'Fresadora CM Fanuc 2',            tipo: 'fresadora',    numero_serie: '229AG695', descripcion: null, ubicacion: 'Zona CNC', estado_actual: 'parada', requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm6',  codigo: 'REF-042', nombre: 'Fresadora Biomill',               tipo: 'fresadora',    numero_serie: '1020',     descripcion: null, ubicacion: 'Zona CNC', estado_actual: 'parada', requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm7',  codigo: 'REF-041', nombre: 'Fresadora CM Lilian',             tipo: 'fresadora',    numero_serie: '12654',    descripcion: 'Retirada del servicio', ubicacion: 'Zona CNC', estado_actual: 'inactiva', requiere_lanzamiento: true, activa: false, created_at: nowIso, updated_at: nowIso },
  { id: 'm8',  codigo: 'REF-045', nombre: 'Sinterizadora Trumpf Multilaser', tipo: 'sinterizadora', numero_serie: 'S0711Q0182', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm9',  codigo: 'REF-046', nombre: 'Sinterizadora Trumpf 3D Laser',   tipo: 'sinterizadora', numero_serie: 'S0711Q0182', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm10', codigo: 'REF-047', nombre: 'Sinterizadora Trumpf',            tipo: 'sinterizadora', numero_serie: 'S0711Q0022', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm11', codigo: 'REF-048', nombre: 'Sinterizadora Sisma 1',           tipo: 'sinterizadora', numero_serie: 'LS005865',   descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm12', codigo: 'REF-049', nombre: 'Sinterizadora Sisma 2',           tipo: 'sinterizadora', numero_serie: 'LS0008790',  descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
]

// -----------------------------------------------------------------------------
// Helpers de fecha/hora
// -----------------------------------------------------------------------------
const todayDate = () => new Date().toISOString().slice(0, 10)
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

let localIdCounter = 1000
const newLocalId = (prefix: string) => `${prefix}${++localIdCounter}`

// -----------------------------------------------------------------------------
// Tipos de entrada
// -----------------------------------------------------------------------------
export interface IniciarUsoInput {
  maquina_id: string
  fecha?: string
  hora_preparacion?: string
  tecnico_preparacion_id: string
  tecnico_lanzamiento_id?: string | null
  observaciones?: string | null
}

export interface CerrarUsoInput {
  uso_id: string
  hora_acabado?: string
  tecnico_acabado_id: string
  resultado: Exclude<ResultadoUso, 'pendiente'>
  observaciones?: string | null
  incidencias?: string[]
}

export interface NuevoMantenimientoInput {
  maquina_id: string
  fecha?: string
  tipo: TipoMantenimiento
  accion_realizada: string
  persona_encargada_id: string
  persona_verificadora_id?: string | null
  observaciones?: string | null
}

// -----------------------------------------------------------------------------
// Estado del store
// -----------------------------------------------------------------------------
interface WorkflowState {
  maquinas: Maquina[]
  usos: UsoEquipo[]
  incidencias: Incidencia[]
  mantenimientos: Mantenimiento[]

  loading: boolean
  error: string | null
  initialized: boolean

  // Lifecycle
  fetchAll: () => Promise<void>
  subscribe: () => () => void

  // Usos
  iniciarUso: (input: IniciarUsoInput) => Promise<string | null>
  cerrarUso: (input: CerrarUsoInput) => Promise<void>
  cancelarUso: (usoId: string) => Promise<void>

  // Mantenimientos
  registrarMantenimiento: (input: NuevoMantenimientoInput) => Promise<string | null>

  // Maquinas CRUD (solo admin, desde /maquinas)
  addMaquina: (data: Pick<Maquina, 'codigo' | 'nombre' | 'tipo' | 'requiere_lanzamiento' | 'descripcion' | 'ubicacion'>) => Promise<void>
  updateMaquina: (id: string, data: Partial<Pick<Maquina, 'codigo' | 'nombre' | 'tipo' | 'requiere_lanzamiento' | 'descripcion' | 'ubicacion' | 'activa'>>) => Promise<void>
  removeMaquina: (id: string) => Promise<void>
  updateEstadoMaquina: (maquinaId: string, estado: EstadoMaquina) => Promise<void>
  reportarAveria: (maquinaId: string, motivo: string, usuarioId?: string | null) => Promise<void>

  // Selectors
  getUsosByMaquina: (maquinaId: string) => UsoEquipo[]
  getMantenimientosByMaquina: (maquinaId: string) => Mantenimiento[]
  getUsoActivo: (maquinaId: string) => UsoEquipo | null
  getIncidenciasByUso: (usoId: string) => Incidencia[]
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------
export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  maquinas: [],
  usos: [],
  incidencias: [],
  mantenimientos: [],

  loading: false,
  error: null,
  initialized: false,

  // ---------------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------------
  fetchAll: async () => {
    if (get().initialized && !get().error) return
    set({ loading: true, error: null })

    if (!isSupabaseConfigured || !supabase) {
      // Fallback in-memory (modo desarrollo sin credenciales)
      set({
        maquinas: SEED_MAQUINAS,
        usos: [],
        incidencias: [],
        mantenimientos: [],
        loading: false,
        initialized: true,
      })
      return
    }

    try {
      const [maquinasRes, usosRes, incidenciasRes, mantRes] = await Promise.all([
        supabase.from('maquinas').select('*').order('codigo'),
        supabase.from('usos_equipo').select('*').order('created_at', { ascending: false }),
        supabase.from('incidencias').select('*').order('created_at', { ascending: false }),
        supabase.from('mantenimientos').select('*').order('fecha', { ascending: false }),
      ])

      if (maquinasRes.error) throw maquinasRes.error
      if (usosRes.error) throw usosRes.error
      if (incidenciasRes.error) throw incidenciasRes.error
      if (mantRes.error) throw mantRes.error

      set({
        maquinas: (maquinasRes.data ?? []) as Maquina[],
        usos: (usosRes.data ?? []) as UsoEquipo[],
        incidencias: (incidenciasRes.data ?? []) as Incidencia[],
        mantenimientos: (mantRes.data ?? []) as Mantenimiento[],
        loading: false,
        initialized: true,
      })
    } catch (err) {
      console.error('[workflowStore] fetchAll error:', err)
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error cargando datos',
        initialized: true,
      })
    }
  },

  // ---------------------------------------------------------------------------
  // Realtime — sincroniza cambios entre tabs/dispositivos
  // ---------------------------------------------------------------------------
  subscribe: () => {
    if (!isSupabaseConfigured || !supabase) return () => {}

    const refetch = () => get().fetchAll()

    const channel = supabase
      .channel('workflow-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maquinas' }, () => {
        // Forzamos un refetch parcial de maquinas (es pequeño, 12 filas)
        supabase!
          .from('maquinas')
          .select('*')
          .order('codigo')
          .then(({ data }) => {
            if (data) set({ maquinas: data as Maquina[] })
          })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usos_equipo' }, () => {
        supabase!
          .from('usos_equipo')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) set({ usos: data as UsoEquipo[] })
          })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, () => {
        supabase!
          .from('incidencias')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) set({ incidencias: data as Incidencia[] })
          })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mantenimientos' }, refetch)
      .subscribe()

    return () => {
      supabase!.removeChannel(channel)
    }
  },

  // ---------------------------------------------------------------------------
  // Usos
  // ---------------------------------------------------------------------------
  iniciarUso: async (input) => {
    const payload = {
      maquina_id: input.maquina_id,
      fecha: input.fecha ?? todayDate(),
      hora_preparacion: input.hora_preparacion ?? nowTime(),
      tecnico_preparacion_id: input.tecnico_preparacion_id,
      tecnico_lanzamiento_id: input.tecnico_lanzamiento_id ?? null,
      hora_acabado: null,
      tecnico_acabado_id: null,
      resultado: 'pendiente' as const,
      observaciones: input.observaciones ?? null,
    }

    if (!isSupabaseConfigured || !supabase) {
      // in-memory fallback
      const id = newLocalId('u')
      const ts = new Date().toISOString()
      const uso: UsoEquipo = { id, ...payload, created_at: ts, updated_at: ts }
      set((s) => ({
        usos: [uso, ...s.usos],
        maquinas: s.maquinas.map((m) =>
          m.id === input.maquina_id ? { ...m, estado_actual: 'activa' as EstadoMaquina } : m
        ),
      }))
      return id
    }

    const { data, error } = await supabase
      .from('usos_equipo')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[iniciarUso] error:', error)
      set({ error: error.message })
      return null
    }

    // Optimistic update local + el trigger server-side actualiza maquinas.estado_actual,
    // y el listener de Realtime refetcheará maquinas poco después.
    const uso = data as UsoEquipo
    set((s) => ({
      usos: [uso, ...s.usos],
      maquinas: s.maquinas.map((m) =>
        m.id === input.maquina_id ? { ...m, estado_actual: 'activa' as EstadoMaquina } : m
      ),
    }))
    return uso.id
  },

  cerrarUso: async ({ uso_id, hora_acabado, tecnico_acabado_id, resultado, observaciones, incidencias }) => {
    const patch = {
      hora_acabado: hora_acabado ?? nowTime(),
      tecnico_acabado_id,
      resultado,
      ...(observaciones !== undefined ? { observaciones } : {}),
    }

    if (!isSupabaseConfigured || !supabase) {
      set((s) => {
        const uso = s.usos.find((u) => u.id === uso_id)
        if (!uso) return s
        const incidenciasNuevas: Incidencia[] = (incidencias ?? [])
          .filter((d) => d.trim().length > 0)
          .map((descripcion) => ({
            id: newLocalId('i'),
            uso_id,
            descripcion: descripcion.trim(),
            created_at: new Date().toISOString(),
          }))
        return {
          usos: s.usos.map((u) => (u.id === uso_id ? { ...u, ...patch, updated_at: new Date().toISOString() } : u)),
          incidencias: [...incidenciasNuevas, ...s.incidencias],
          maquinas: s.maquinas.map((m) =>
            m.id === uso.maquina_id ? { ...m, estado_actual: 'parada' as EstadoMaquina } : m
          ),
        }
      })
      return
    }

    // Cerrar el uso
    const { data: updated, error: updateErr } = await supabase
      .from('usos_equipo')
      .update(patch)
      .eq('id', uso_id)
      .select()
      .single()

    if (updateErr) {
      console.error('[cerrarUso] update error:', updateErr)
      set({ error: updateErr.message })
      return
    }

    // Crear incidencias si las hay
    const descripciones = (incidencias ?? []).map((d) => d.trim()).filter(Boolean)
    if (descripciones.length > 0) {
      const { error: incErr } = await supabase
        .from('incidencias')
        .insert(descripciones.map((descripcion) => ({ uso_id, descripcion })))
      if (incErr) {
        console.error('[cerrarUso] incidencias error:', incErr)
      }
    }

    // Optimistic local update (Realtime completará)
    const uso = updated as UsoEquipo
    set((s) => ({
      usos: s.usos.map((u) => (u.id === uso_id ? uso : u)),
      maquinas: s.maquinas.map((m) =>
        m.id === uso.maquina_id ? { ...m, estado_actual: 'parada' as EstadoMaquina } : m
      ),
    }))
  },

  cancelarUso: async (usoId) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => {
        const uso = s.usos.find((u) => u.id === usoId)
        if (!uso) return s
        return {
          usos: s.usos.filter((u) => u.id !== usoId),
          maquinas: s.maquinas.map((m) =>
            m.id === uso.maquina_id ? { ...m, estado_actual: 'parada' as EstadoMaquina } : m
          ),
        }
      })
      return
    }
    const { error } = await supabase.from('usos_equipo').delete().eq('id', usoId)
    if (error) {
      console.error('[cancelarUso] error:', error)
      set({ error: error.message })
    }
  },

  // ---------------------------------------------------------------------------
  // Mantenimientos
  // ---------------------------------------------------------------------------
  registrarMantenimiento: async (input) => {
    const payload = {
      maquina_id: input.maquina_id,
      fecha: input.fecha ?? todayDate(),
      tipo: input.tipo,
      accion_realizada: input.accion_realizada,
      resultado: 'ok',
      persona_encargada_id: input.persona_encargada_id,
      persona_verificadora_id: input.persona_verificadora_id ?? null,
      validado: false,
      observaciones: input.observaciones ?? null,
    }

    if (!isSupabaseConfigured || !supabase) {
      const id = newLocalId('mt')
      const ts = new Date().toISOString()
      const mant: Mantenimiento = { id, ...payload, created_at: ts, updated_at: ts }
      set((s) => ({ mantenimientos: [mant, ...s.mantenimientos] }))
      return id
    }

    const { data, error } = await supabase
      .from('mantenimientos')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[registrarMantenimiento] error:', error)
      set({ error: error.message })
      return null
    }
    return (data as Mantenimiento).id
  },

  // ---------------------------------------------------------------------------
  // Maquinas CRUD
  // ---------------------------------------------------------------------------
  addMaquina: async (data) => {
    const payload = {
      codigo: data.codigo,
      nombre: data.nombre,
      tipo: data.tipo as TipoMaquina,
      numero_serie: null,
      descripcion: data.descripcion ?? null,
      ubicacion: data.ubicacion ?? null,
      estado_actual: 'parada' as EstadoMaquina,
      requiere_lanzamiento: data.requiere_lanzamiento,
      activa: true,
    }

    if (!isSupabaseConfigured || !supabase) {
      const id = newLocalId('m')
      const ts = new Date().toISOString()
      set((s) => ({
        maquinas: [...s.maquinas, { id, ...payload, created_at: ts, updated_at: ts }],
      }))
      return
    }

    const { error } = await supabase.from('maquinas').insert(payload)
    if (error) {
      console.error('[addMaquina] error:', error)
      set({ error: error.message })
    }
  },

  updateMaquina: async (id, data) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({
        maquinas: s.maquinas.map((m) =>
          m.id === id ? { ...m, ...data, updated_at: new Date().toISOString() } : m
        ),
      }))
      return
    }
    const { error } = await supabase.from('maquinas').update(data).eq('id', id)
    if (error) {
      console.error('[updateMaquina] error:', error)
      set({ error: error.message })
    }
  },

  removeMaquina: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({ maquinas: s.maquinas.filter((m) => m.id !== id) }))
      return
    }
    const { error } = await supabase.from('maquinas').delete().eq('id', id)
    if (error) {
      console.error('[removeMaquina] error:', error)
      set({ error: error.message })
    }
  },

  updateEstadoMaquina: async (maquinaId, estado) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({
        maquinas: s.maquinas.map((m) => (m.id === maquinaId ? { ...m, estado_actual: estado } : m)),
      }))
      return
    }
    // Caso especial: marcar avería como resuelta → RPC (funciona también para anon)
    if (estado === 'parada') {
      const { error } = await supabase.rpc('resolve_maquina_averia', { p_maquina_id: maquinaId })
      if (error) {
        console.error('[updateEstadoMaquina] resolve error:', error)
        set({ error: error.message })
      }
      return
    }
    // Resto de cambios de estado (solo admin autenticado)
    const { error } = await supabase
      .from('maquinas')
      .update({ estado_actual: estado })
      .eq('id', maquinaId)
    if (error) {
      console.error('[updateEstadoMaquina] error:', error)
      set({ error: error.message })
    }
  },

  reportarAveria: async (maquinaId, motivo, usuarioId) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({
        maquinas: s.maquinas.map((m) =>
          m.id === maquinaId ? { ...m, estado_actual: 'avería' as EstadoMaquina } : m
        ),
      }))
      return
    }
    // Llamamos a la función RPC SECURITY DEFINER que encapsula el UPDATE +
    // el INSERT en maquina_estados. Ver supabase/migrations/0005_rpc_report_averia.sql
    const { error } = await supabase.rpc('report_maquina_averia', {
      p_maquina_id: maquinaId,
      p_motivo: motivo,
      p_usuario_id: usuarioId ?? null,
    })
    if (error) {
      console.error('[reportarAveria] error:', error)
      set({ error: error.message })
    }
    // El Realtime propagará automáticamente el cambio a los dashboards admin
  },

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------
  getUsosByMaquina: (maquinaId) => get().usos.filter((u) => u.maquina_id === maquinaId),
  getMantenimientosByMaquina: (maquinaId) => get().mantenimientos.filter((m) => m.maquina_id === maquinaId),
  getUsoActivo: (maquinaId) =>
    get().usos.find((u) => u.maquina_id === maquinaId && u.resultado === 'pendiente') ?? null,
  getIncidenciasByUso: (usoId) => get().incidencias.filter((i) => i.uso_id === usoId),
}))
