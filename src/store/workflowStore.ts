import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { toValidUuid } from '../lib/utils'
import { useAuthStore } from './authStore'
import type {
  Maquina,
  UsoEquipo,
  Incidencia,
  Mantenimiento,
  MaquinaEstado,
  EstadoMaquina,
  TipoMantenimiento,
  ResultadoUso,
  TipoMaquina,
  SeveridadAveria,
  AveriaDocumento,
  Preparacion,
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
  { id: 'm1',  codigo: 'REF-030', nombre: 'Fresadora UP3D ZR',               tipo: 'fresadora',    numero_serie: null, descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm2',  codigo: 'REF-057', nombre: 'Fresadora P53 ZR',                tipo: 'fresadora',    numero_serie: null, descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm3',  codigo: 'REF-062', nombre: 'Fresadora UP3D Disilicato',       tipo: 'fresadora',    numero_serie: null, descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm4',  codigo: 'REF-039', nombre: 'Fresadora CM Fanuc 1',            tipo: 'fresadora',    numero_serie: '188ZG886', descripcion: null, ubicacion: 'Zona CNC', estado_actual: 'parada', requiere_preparacion: false, requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm5',  codigo: 'REF-040', nombre: 'Fresadora CM Fanuc 2',            tipo: 'fresadora',    numero_serie: '229AG695', descripcion: null, ubicacion: 'Zona CNC', estado_actual: 'parada', requiere_preparacion: false, requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm6',  codigo: 'REF-042', nombre: 'Fresadora Biomill',               tipo: 'fresadora',    numero_serie: '1020',     descripcion: null, ubicacion: 'Zona CNC', estado_actual: 'parada', requiere_preparacion: false, requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm7',  codigo: 'REF-041', nombre: 'Fresadora CM Lilian',             tipo: 'fresadora',    numero_serie: '12654',    descripcion: 'Retirada del servicio', ubicacion: 'Zona CNC', estado_actual: 'inactiva', requiere_preparacion: false, requiere_lanzamiento: true, activa: false, created_at: nowIso, updated_at: nowIso },
  { id: 'm8',  codigo: 'REF-045', nombre: 'Sinterizadora Trumpf Multilaser', tipo: 'sinterizadora', numero_serie: 'S0711Q0182', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm9',  codigo: 'REF-046', nombre: 'Sinterizadora Trumpf 3D Laser',   tipo: 'sinterizadora', numero_serie: 'S0711Q0182', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm10', codigo: 'REF-047', nombre: 'Sinterizadora Trumpf',            tipo: 'sinterizadora', numero_serie: 'S0711Q0022', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm11', codigo: 'REF-048', nombre: 'Sinterizadora Sisma 1',           tipo: 'sinterizadora', numero_serie: 'LS005865',   descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm12', codigo: 'REF-049', nombre: 'Sinterizadora Sisma 2',           tipo: 'sinterizadora', numero_serie: 'LS0008790',  descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
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
  tecnico_preparacion_id: string | null
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
  estadosHistorial: MaquinaEstado[]
  averiaDocumentos: AveriaDocumento[]
  preparaciones: Preparacion[]

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

  // Preparaciones — registro de limpieza puntual
  registrarPreparacion: (input: { maquinaId: string; trabajadorId: string | null; observaciones?: string | null }) => Promise<string | null>

  // Maquinas CRUD (solo admin, desde /maquinas)
  addMaquina: (data: Pick<Maquina, 'codigo' | 'nombre' | 'tipo' | 'requiere_preparacion' | 'requiere_lanzamiento' | 'descripcion' | 'ubicacion'>) => Promise<void>
  updateMaquina: (id: string, data: Partial<Pick<Maquina, 'codigo' | 'nombre' | 'tipo' | 'requiere_preparacion' | 'requiere_lanzamiento' | 'descripcion' | 'ubicacion' | 'activa'>>) => Promise<void>
  removeMaquina: (id: string) => Promise<void>
  updateEstadoMaquina: (maquinaId: string, estado: EstadoMaquina) => Promise<void>
  reportarAveria: (maquinaId: string, motivo: string, usuarioId?: string | null, severidadPropuesta?: SeveridadAveria) => Promise<void>
  confirmarSeveridadAveria: (maquinaEstadoId: string, severidadFinal: SeveridadAveria, adminId?: string | null) => Promise<void>
  /**
   * Cierra la avería abierta de una máquina con los datos de resolución.
   * Devuelve el id de maquina_estado cerrado (para vincular documentos después).
   */
  resolverAveria: (input: {
    maquinaId: string
    adminId?: string | null
    resolucionDescripcion: string
    tecnicoIntervencion?: string | null
    fechaIntervencion?: string | null
  }) => Promise<string | null>

  // Selectors
  getUsosByMaquina: (maquinaId: string) => UsoEquipo[]
  getMantenimientosByMaquina: (maquinaId: string) => Mantenimiento[]
  getUsoActivo: (maquinaId: string) => UsoEquipo | null
  getIncidenciasByUso: (usoId: string) => Incidencia[]
  /** Último cambio de estado a 'avería' para una máquina actualmente en avería */
  getUltimaAveriaRecord: (maquinaId: string) => MaquinaEstado | null
  /** Historial completo de averías de una máquina (abiertas + cerradas), desc por timestamp */
  getAveriasByMaquina: (maquinaId: string) => MaquinaEstado[]
  /** Documentos adjuntos a una fila concreta de avería */
  getDocumentosByAveria: (maquinaEstadoId: string) => AveriaDocumento[]
  /** Fuerza recarga de averia_documentos desde Supabase (tras subir uno nuevo) */
  refetchAveriaDocumentos: () => Promise<void>
  /** Última preparación registrada de una máquina (la más reciente, si hay) */
  getUltimaPreparacion: (maquinaId: string) => Preparacion | null
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------
export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  maquinas: [],
  usos: [],
  incidencias: [],
  mantenimientos: [],
  estadosHistorial: [],
  averiaDocumentos: [],
  preparaciones: [],

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
        estadosHistorial: [],
        averiaDocumentos: [],
        preparaciones: [],
        loading: false,
        initialized: true,
      })
      return
    }

    try {
      const [maquinasRes, usosRes, incidenciasRes, mantRes, estadosRes, docsRes, prepsRes] = await Promise.all([
        supabase.from('maquinas').select('*').order('codigo'),
        supabase.from('usos_equipo').select('*').order('created_at', { ascending: false }),
        supabase.from('incidencias').select('*').order('created_at', { ascending: false }),
        supabase.from('mantenimientos').select('*').order('fecha', { ascending: false }),
        supabase.from('maquina_estados').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase.from('averia_documentos').select('*').order('subido_en', { ascending: false }),
        supabase.from('preparaciones').select('*').order('fecha', { ascending: false }).order('hora', { ascending: false }).limit(500),
      ])

      if (maquinasRes.error) throw maquinasRes.error
      if (usosRes.error) throw usosRes.error
      if (incidenciasRes.error) throw incidenciasRes.error
      if (mantRes.error) throw mantRes.error
      if (estadosRes.error) throw estadosRes.error
      if (docsRes.error) throw docsRes.error
      if (prepsRes.error) throw prepsRes.error

      set({
        maquinas: (maquinasRes.data ?? []) as Maquina[],
        usos: (usosRes.data ?? []) as UsoEquipo[],
        incidencias: (incidenciasRes.data ?? []) as Incidencia[],
        mantenimientos: (mantRes.data ?? []) as Mantenimiento[],
        estadosHistorial: (estadosRes.data ?? []) as MaquinaEstado[],
        averiaDocumentos: (docsRes.data ?? []) as AveriaDocumento[],
        preparaciones: (prepsRes.data ?? []) as Preparacion[],
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

    // Helper: refetch del historial de estados. Lo extraemos para poder llamarlo
    // desde varios listeners diferentes.
    const refetchEstados = () => {
      supabase!
        .from('maquina_estados')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)
        .then(({ data }) => {
          if (data) set({ estadosHistorial: data as MaquinaEstado[] })
        })
    }

    const channel = supabase
      .channel('workflow-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maquinas' }, () => {
        // Forzamos un refetch parcial de maquinas + su historial (para ver motivos de avería)
        supabase!
          .from('maquinas')
          .select('*')
          .order('codigo')
          .then(({ data }) => {
            if (data) set({ maquinas: data as Maquina[] })
          })
        refetchEstados()
      })
      // Escucha también directamente cambios en maquina_estados para los casos
      // en los que la máquina ya estaba en avería y se añade un nuevo evento
      // (confirmación de severidad, cierre, etc.) — el UPDATE en maquinas no
      // dispara si el estado no cambia.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maquina_estados' }, () => {
        refetchEstados()
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'averia_documentos' }, () => {
        supabase!
          .from('averia_documentos')
          .select('*')
          .order('subido_en', { ascending: false })
          .then(({ data }) => {
            if (data) set({ averiaDocumentos: data as AveriaDocumento[] })
          })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'preparaciones' }, () => {
        supabase!
          .from('preparaciones')
          .select('*')
          .order('fecha', { ascending: false })
          .order('hora', { ascending: false })
          .limit(500)
          .then(({ data }) => {
            if (data) set({ preparaciones: data as Preparacion[] })
          })
      })
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

    // Si el uso se ha cerrado en KO, notificar a los admins por email.
    // No bloqueamos ni rompemos el flujo si la notificación falla.
    if (resultado === 'ko') {
      supabase.functions
        .invoke('notify-alerta', { body: { event: 'uso_ko', uso_id } })
        .catch((e) => console.error('[cerrarUso] notify-alerta failed (non-fatal):', e))
    }
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
      requiere_preparacion: data.requiere_preparacion ?? true,
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
      // Guardamos si la máquina estaba en avería antes de resolver, para decidir
      // si disparamos el email "Avería resuelta" a los admins.
      const current = get().maquinas.find((m) => m.id === maquinaId)
      const wasAveria = current?.estado_actual === 'avería'

      const { error } = await supabase.rpc('resolve_maquina_averia', { p_maquina_id: maquinaId })
      if (error) {
        console.error('[updateEstadoMaquina] resolve error:', error)
        set({ error: error.message })
        return
      }

      if (wasAveria) {
        const resueltoPorId = useAuthStore.getState().user?.id ?? null
        supabase.functions
          .invoke('notify-alerta', {
            body: {
              event: 'averia_resuelta',
              maquina_id: maquinaId,
              resuelto_por_id: resueltoPorId,
            },
          })
          .catch((e) => console.error('[updateEstadoMaquina] notify-alerta (resuelta) failed (non-fatal):', e))
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
      return
    }
    // Si el admin marca una máquina como avería desde el panel admin,
    // también disparamos el email a Roser + Toni.
    if (estado === 'avería') {
      supabase.functions
        .invoke('notify-alerta', {
          body: {
            event: 'averia_reportada',
            maquina_id: maquinaId,
            motivo: null,
            reportado_por_id: null,
          },
        })
        .catch((e) => console.error('[updateEstadoMaquina] notify-alerta failed (non-fatal):', e))
    }
  },

  reportarAveria: async (maquinaId, motivo, usuarioId, severidadPropuesta = 'critica') => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({
        maquinas: s.maquinas.map((m) =>
          m.id === maquinaId ? { ...m, estado_actual: 'avería' as EstadoMaquina } : m
        ),
      }))
      return
    }
    // RPC SECURITY DEFINER: bloquea máquina + registra la entrada en historial
    // con la severidad propuesta por el trabajador (pendiente de confirmación
    // por admin). Ver supabase/migrations/0008_add_severidad_averia.sql
    const { error } = await supabase.rpc('report_maquina_averia', {
      p_maquina_id: maquinaId,
      p_motivo: motivo,
      p_usuario_id: usuarioId ?? null,
      p_severidad_propuesta: severidadPropuesta,
    })
    if (error) {
      console.error('[reportarAveria] error:', error)
      set({ error: error.message })
      return
    }
    // El Realtime propagará automáticamente el cambio a los dashboards admin.
    // En paralelo, disparamos el email a Roser + Toni. No bloqueamos el flujo
    // de reporte si el envío del correo falla (la avería ya quedó registrada).
    supabase.functions
      .invoke('notify-alerta', {
        body: {
          event: 'averia_reportada',
          maquina_id: maquinaId,
          motivo,
          reportado_por_id: usuarioId ?? null,
          severidad_propuesta: severidadPropuesta,
        },
      })
      .catch((e) => console.error('[reportarAveria] notify-alerta failed (non-fatal):', e))
  },

  confirmarSeveridadAveria: async (maquinaEstadoId, severidadFinal, adminId) => {
    if (!isSupabaseConfigured || !supabase) {
      // En modo fallback actualizamos solo la fila del historial; la máquina
      // se unbloquea si la severidad final es leve.
      set((s) => {
        const row = s.estadosHistorial.find((e) => e.id === maquinaEstadoId)
        const nextHistorial = s.estadosHistorial.map((e) =>
          e.id === maquinaEstadoId
            ? { ...e, severidad: severidadFinal, severidad_confirmada_por_admin: true }
            : e,
        )
        const nextMaquinas = row
          ? s.maquinas.map((m) =>
              m.id === row.maquina_id && severidadFinal === 'leve' && m.estado_actual === 'avería'
                ? { ...m, estado_actual: 'parada' as EstadoMaquina }
                : m,
            )
          : s.maquinas
        return { estadosHistorial: nextHistorial, maquinas: nextMaquinas }
      })
      return
    }
    const { error } = await supabase.rpc('confirmar_severidad_averia', {
      p_maquina_estado_id: maquinaEstadoId,
      p_severidad_final: severidadFinal,
      p_admin_id: toValidUuid(adminId),
    })
    if (error) {
      console.error('[confirmarSeveridadAveria] error:', error)
      set({ error: error.message })
    }
  },

  registrarPreparacion: async ({ maquinaId, trabajadorId, observaciones }) => {
    const fecha = todayDate()
    const hora = nowTime() + ':00'
    const payload = {
      maquina_id: maquinaId,
      trabajador_id: toValidUuid(trabajadorId),
      fecha,
      hora,
      observaciones: observaciones?.trim() || null,
    }

    if (!isSupabaseConfigured || !supabase) {
      const id = newLocalId('p')
      const nowIso = new Date().toISOString()
      const prep: Preparacion = { id, ...payload, created_at: nowIso }
      set((s) => ({ preparaciones: [prep, ...s.preparaciones] }))
      return id
    }

    const { data, error } = await supabase
      .from('preparaciones')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[registrarPreparacion] error:', error)
      set({ error: error.message })
      return null
    }
    return (data?.id as string | undefined) ?? null
  },

  resolverAveria: async ({
    maquinaId,
    adminId,
    resolucionDescripcion,
    tecnicoIntervencion,
    fechaIntervencion,
  }) => {
    if (!isSupabaseConfigured || !supabase) {
      // Modo fallback: marca la última avería abierta como cerrada localmente.
      let cerradaId: string | null = null
      set((s) => {
        const abiertas = s.estadosHistorial
          .filter((e) => e.maquina_id === maquinaId && e.estado === 'avería' && !e.cerrada_en)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        const target = abiertas[0]
        if (!target) return s
        cerradaId = target.id
        const nowIso = new Date().toISOString()
        return {
          estadosHistorial: s.estadosHistorial.map((e) =>
            e.id === target.id
              ? {
                  ...e,
                  cerrada_en: nowIso,
                  cerrada_por: adminId ?? null,
                  resolucion_descripcion: resolucionDescripcion,
                  tecnico_intervencion: tecnicoIntervencion ?? null,
                  fecha_intervencion: fechaIntervencion ?? null,
                }
              : e,
          ),
          maquinas: s.maquinas.map((m) =>
            m.id === maquinaId && m.estado_actual === 'avería'
              ? { ...m, estado_actual: 'parada' as EstadoMaquina }
              : m,
          ),
        }
      })
      return cerradaId
    }

    const { data, error } = await supabase.rpc('resolve_maquina_averia', {
      p_maquina_id: maquinaId,
      p_usuario_id: toValidUuid(adminId),
      p_resolucion_descripcion: resolucionDescripcion,
      p_tecnico_intervencion: tecnicoIntervencion ?? null,
      p_fecha_intervencion: fechaIntervencion ?? null,
    })
    if (error) {
      console.error('[resolverAveria] error:', error)
      set({ error: error.message })
      return null
    }
    // La función RPC devuelve el id de maquina_estados cerrado (uuid)
    return (data as string | null) ?? null
  },

  refetchAveriaDocumentos: async () => {
    if (!isSupabaseConfigured || !supabase) return
    const { data, error } = await supabase
      .from('averia_documentos')
      .select('*')
      .order('subido_en', { ascending: false })
    if (error) {
      console.error('[refetchAveriaDocumentos] error:', error)
      return
    }
    set({ averiaDocumentos: (data ?? []) as AveriaDocumento[] })
  },

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------
  getUsosByMaquina: (maquinaId) => get().usos.filter((u) => u.maquina_id === maquinaId),
  getMantenimientosByMaquina: (maquinaId) => get().mantenimientos.filter((m) => m.maquina_id === maquinaId),
  getUsoActivo: (maquinaId) =>
    get().usos.find((u) => u.maquina_id === maquinaId && u.resultado === 'pendiente') ?? null,
  getIncidenciasByUso: (usoId) => get().incidencias.filter((i) => i.uso_id === usoId),

  getUltimaAveriaRecord: (maquinaId) => {
    // El historial ya viene ordenado desc por timestamp — busca el primer evento
    // 'avería' de esta máquina (que es el más reciente por el order)
    const history = get().estadosHistorial.filter((e) => e.maquina_id === maquinaId)
    return history.find((e) => e.estado === 'avería') ?? null
  },

  getAveriasByMaquina: (maquinaId) =>
    get().estadosHistorial.filter((e) => e.maquina_id === maquinaId && e.estado === 'avería'),

  getDocumentosByAveria: (maquinaEstadoId) =>
    get().averiaDocumentos.filter((d) => d.maquina_estado_id === maquinaEstadoId),

  getUltimaPreparacion: (maquinaId) =>
    get().preparaciones.find((p) => p.maquina_id === maquinaId) ?? null,
}))
