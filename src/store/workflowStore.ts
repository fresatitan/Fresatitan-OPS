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
  TipoProceso,
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
  // Fresadoras SECO
  { id: 'm1',  codigo: 'REF-030', nombre: 'Fresadora UP3D ZR1',              tipo: 'fresadora',    subtipo: 'seco',   numero_serie: '20222065', descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm2',  codigo: 'REF-057', nombre: 'Fresadora UP P53 ZR2',            tipo: 'fresadora',    subtipo: 'seco',   numero_serie: '20244451', descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm13', codigo: 'REF-064', nombre: 'Fresadora UP P53 DC ZR3',         tipo: 'fresadora',    subtipo: 'seco',   numero_serie: '20244497', descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  // Fresadoras HÚMEDO
  { id: 'm3',  codigo: 'REF-062', nombre: 'Fresadora UP3D P42 DS2',          tipo: 'fresadora',    subtipo: 'humedo', numero_serie: '20244135', descripcion: null, ubicacion: 'Zona CAD-CAM', estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm6',  codigo: 'REF-042', nombre: 'Fresadora BIO1000 DS1',           tipo: 'fresadora',    subtipo: 'humedo', numero_serie: 'DF100-1020', descripcion: null, ubicacion: 'Zona CNC',     estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: false, activa: true,  created_at: nowIso, updated_at: nowIso },
  // Fresadoras METAL (CNC con lanzamiento)
  { id: 'm4',  codigo: 'REF-039', nombre: 'Fresadora FANUC1',                tipo: 'fresadora',    subtipo: 'metal',  numero_serie: 'P188ZG886', descripcion: null, ubicacion: 'Zona CNC',    estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm5',  codigo: 'REF-040', nombre: 'Fresadora FANUC2',                tipo: 'fresadora',    subtipo: 'metal',  numero_serie: 'P229AG695', descripcion: null, ubicacion: 'Zona CNC',    estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm14', codigo: 'REF-066', nombre: 'Fresadora FANUC3',                tipo: 'fresadora',    subtipo: 'metal',  numero_serie: 'P246AG322', descripcion: null, ubicacion: 'Zona CNC',    estado_actual: 'parada',   requiere_preparacion: false, requiere_lanzamiento: true,  activa: true,  created_at: nowIso, updated_at: nowIso },
  { id: 'm7',  codigo: 'REF-041', nombre: 'Fresadora CM Lilian',             tipo: 'fresadora',    subtipo: 'metal',  numero_serie: '12654',    descripcion: 'Retirada del servicio', ubicacion: 'Zona CNC', estado_actual: 'inactiva', requiere_preparacion: false, requiere_lanzamiento: true, activa: false, created_at: nowIso, updated_at: nowIso },
  // Sinterizadoras
  { id: 'm8',  codigo: 'REF-045', nombre: 'Sinterizadora TRUMPF MULTILASER', tipo: 'sinterizadora', subtipo: null, numero_serie: 'S0711Q0182', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm9',  codigo: 'REF-046', nombre: 'Sinterizadora TRUMPF 3D LASER',   tipo: 'sinterizadora', subtipo: null, numero_serie: 'S0711Q069',  descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm10', codigo: 'REF-047', nombre: 'Sinterizadora TRUMPF',            tipo: 'sinterizadora', subtipo: null, numero_serie: 'S0711Q0022', descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm11', codigo: 'REF-048', nombre: 'Sinterizadora SISMA 2 MYSINT',    tipo: 'sinterizadora', subtipo: null, numero_serie: 'LS0005866',  descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm12', codigo: 'REF-049', nombre: 'Sinterizadora SISMA 1 MYSINT',    tipo: 'sinterizadora', subtipo: null, numero_serie: 'LS0008790',  descripcion: null, ubicacion: 'Zona Sinter.', estado_actual: 'parada', requiere_preparacion: true, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  // Impresoras 3D
  { id: 'm15', codigo: 'REF-063', nombre: 'Impresora PROZEN SONIC XL 4K',    tipo: 'impresora_3d', subtipo: null, numero_serie: 'LCSXFT11003', descripcion: null, ubicacion: 'Zona Impresión 3D', estado_actual: 'parada', requiere_preparacion: false, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
  { id: 'm16', codigo: 'REF-067', nombre: 'Impresora MIICRAFT',              tipo: 'impresora_3d', subtipo: null, numero_serie: 'LM300G003',   descripcion: null, ubicacion: 'Zona Impresión 3D', estado_actual: 'parada', requiere_preparacion: false, requiere_lanzamiento: false, activa: true, created_at: nowIso, updated_at: nowIso },
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
  tipo_proceso?: TipoProceso | null
}

export interface IncidenciaInput {
  tipo: string | null   // categoría del desplegable, p.ej. 'Rotura de herramienta'
  descripcion: string   // texto libre obligatorio
}

export interface CerrarUsoInput {
  uso_id: string
  hora_acabado?: string
  tecnico_acabado_id: string
  resultado: Exclude<ResultadoUso, 'pendiente'>
  observaciones?: string | null
  /** Lista de incidencias. Cada una tiene su tipo (categoría) + descripción libre. */
  incidencias?: IncidenciaInput[]
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
  addMaquina: (data: Pick<Maquina, 'codigo' | 'nombre' | 'tipo' | 'subtipo' | 'requiere_preparacion' | 'requiere_lanzamiento' | 'descripcion' | 'ubicacion'>) => Promise<void>
  updateMaquina: (id: string, data: Partial<Pick<Maquina, 'codigo' | 'nombre' | 'tipo' | 'subtipo' | 'requiere_preparacion' | 'requiere_lanzamiento' | 'descripcion' | 'ubicacion' | 'activa'>>) => Promise<void>
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
  /**
   * True si la máquina necesita una preparación ANTES de poder iniciar un uso.
   * Regla: la última preparación debe ser posterior al último uso cerrado
   * (fecha + hora_acabado). Sin preparación registrada → siempre true.
   */
  maquinaNecesitaPrep: (maquinaId: string) => boolean
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
      tipo_proceso: input.tipo_proceso ?? null,
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
          .filter((d) => d.descripcion.trim().length > 0)
          .map((d) => ({
            id: newLocalId('i'),
            uso_id,
            descripcion: d.descripcion.trim(),
            tipo: d.tipo ?? null,
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
    const incidenciasLimpias = (incidencias ?? [])
      .map((d) => ({ tipo: d.tipo ?? null, descripcion: d.descripcion.trim() }))
      .filter((d) => d.descripcion.length > 0)
    if (incidenciasLimpias.length > 0) {
      const { error: incErr } = await supabase
        .from('incidencias')
        .insert(incidenciasLimpias.map(({ tipo, descripcion }) => ({ uso_id, tipo, descripcion })))
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

    // Si el uso se ha cerrado en KO:
    //   1. Crear automáticamente una "avería pendiente de revisar" (severidad
    //      propuesta = leve por defecto, ya que la máquina llegó a completar
    //      el trabajo). Así aparece en /alertas en la sección Pendientes con
    //      el badge rojo pulsante, y deja de quedar enterrada en el histórico.
    //      La máquina NO se bloquea — el admin decide al revisar.
    //   2. Notificar a los admins por email (best-effort).
    if (resultado === 'ko') {
      const incidenciaPrincipal = incidenciasLimpias[0]
      const motivoAveria = incidenciaPrincipal
        ? `Cierre KO · ${incidenciaPrincipal.tipo ? `[${incidenciaPrincipal.tipo}] ` : ''}${incidenciaPrincipal.descripcion}`
        : 'Cierre KO sin detalle'

      supabase
        .rpc('report_maquina_averia', {
          p_maquina_id: uso.maquina_id,
          p_motivo: motivoAveria,
          p_usuario_id: toValidUuid(tecnico_acabado_id),
          p_severidad_propuesta: 'leve',
        })
        .then(({ error }) => {
          if (error) console.error('[cerrarUso] RPC report_maquina_averia (KO) failed (non-fatal):', error)
        })

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

    // Optimistic local update — agrega el mantenimiento al store
    // inmediatamente (la UI lo refleja sin esperar Realtime).
    const mant = data as Mantenimiento
    set((s) => ({
      mantenimientos: [mant, ...s.mantenimientos.filter((m) => m.id !== mant.id)],
    }))
    return mant.id
  },

  // ---------------------------------------------------------------------------
  // Maquinas CRUD
  // ---------------------------------------------------------------------------
  addMaquina: async (data) => {
    const payload = {
      codigo: data.codigo,
      nombre: data.nombre,
      tipo: data.tipo as TipoMaquina,
      subtipo: data.tipo === 'fresadora' ? data.subtipo ?? null : null,
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

    const { data: inserted, error } = await supabase
      .from('maquinas')
      .insert(payload)
      .select()
      .single()
    if (error) {
      console.error('[addMaquina] error:', error)
      set({ error: error.message })
      return
    }
    // Optimistic local update — añade la máquina inmediatamente al store
    const nueva = inserted as Maquina
    set((s) => ({
      maquinas: [...s.maquinas.filter((m) => m.id !== nueva.id), nueva].sort((a, b) =>
        a.codigo.localeCompare(b.codigo),
      ),
    }))
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
    // Optimistic local update + rollback on error
    const prevMaquinas = get().maquinas
    set((s) => ({
      maquinas: s.maquinas.map((m) =>
        m.id === id ? { ...m, ...data, updated_at: new Date().toISOString() } : m,
      ),
    }))
    const { error } = await supabase.from('maquinas').update(data).eq('id', id)
    if (error) {
      console.error('[updateMaquina] error:', error)
      set({ maquinas: prevMaquinas, error: error.message })
    }
  },

  removeMaquina: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({ maquinas: s.maquinas.filter((m) => m.id !== id) }))
      return
    }
    // Optimistic local update + rollback on error
    const prevMaquinas = get().maquinas
    set((s) => ({ maquinas: s.maquinas.filter((m) => m.id !== id) }))
    const { error } = await supabase.from('maquinas').delete().eq('id', id)
    if (error) {
      console.error('[removeMaquina] error:', error)
      set({ maquinas: prevMaquinas, error: error.message })
    }
  },

  updateEstadoMaquina: async (maquinaId, estado) => {
    if (!isSupabaseConfigured || !supabase) {
      set((s) => ({
        maquinas: s.maquinas.map((m) => (m.id === maquinaId ? { ...m, estado_actual: estado } : m)),
      }))
      return
    }

    // Optimistic local update — refleja el cambio inmediatamente en la UI
    // sin esperar el round-trip de Realtime. Guardamos el estado previo
    // por si necesitamos hacer rollback en caso de error.
    const prevEstado = get().maquinas.find((m) => m.id === maquinaId)?.estado_actual
    set((s) => ({
      maquinas: s.maquinas.map((m) => (m.id === maquinaId ? { ...m, estado_actual: estado } : m)),
    }))

    // Caso especial: marcar avería como resuelta → RPC (funciona también para anon)
    if (estado === 'parada') {
      const wasAveria = prevEstado === 'avería'

      const { error } = await supabase.rpc('resolve_maquina_averia', { p_maquina_id: maquinaId })
      if (error) {
        console.error('[updateEstadoMaquina] resolve error:', error)
        // Rollback del optimistic update
        if (prevEstado) {
          set((s) => ({
            maquinas: s.maquinas.map((m) => (m.id === maquinaId ? { ...m, estado_actual: prevEstado } : m)),
          }))
        }
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
      // Rollback del optimistic update
      if (prevEstado) {
        set((s) => ({
          maquinas: s.maquinas.map((m) => (m.id === maquinaId ? { ...m, estado_actual: prevEstado } : m)),
        }))
      }
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

    // Optimistic local update — refleja el reporte de avería inmediatamente:
    //   1. Crítica → bloquea la máquina visualmente (estado_actual = 'avería')
    //   2. Leve     → la máquina sigue operativa, pero se añade una entrada
    //      provisional al historial para que el banner "AVERÍA PENDIENTE
    //      DE REVISAR" aparezca de inmediato en el panel y dashboard.
    // El listener de Realtime hará refetch completo del historial y de
    // máquinas, sobreescribiendo estas entradas provisionales con la verdad
    // de la BD (incluyendo IDs reales).
    const prevEstado = get().maquinas.find((m) => m.id === maquinaId)?.estado_actual
    const provisionalEstado: MaquinaEstado = {
      id: newLocalId('me'),
      maquina_id: maquinaId,
      estado: 'avería',
      motivo: motivo,
      timestamp: new Date().toISOString(),
      usuario_id: usuarioId ?? null,
      severidad: severidadPropuesta,
      severidad_confirmada_por_admin: false,
      cerrada_en: null,
      cerrada_por: null,
      resolucion_descripcion: null,
      tecnico_intervencion: null,
      fecha_intervencion: null,
    }

    set((s) => ({
      maquinas: severidadPropuesta === 'critica'
        ? s.maquinas.map((m) =>
            m.id === maquinaId ? { ...m, estado_actual: 'avería' as EstadoMaquina } : m
          )
        : s.maquinas,
      estadosHistorial: [provisionalEstado, ...s.estadosHistorial],
    }))

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
      // Rollback del optimistic update
      set((s) => ({
        maquinas: prevEstado
          ? s.maquinas.map((m) => (m.id === maquinaId ? { ...m, estado_actual: prevEstado } : m))
          : s.maquinas,
        estadosHistorial: s.estadosHistorial.filter((e) => e.id !== provisionalEstado.id),
      }))
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
    // Optimistic local update — refleja la confirmación inmediatamente:
    //   · severidad final 'leve'    → desbloquea la máquina si estaba en avería
    //   · severidad final 'critica' → mantiene la máquina en avería
    // El listener de Realtime sobrescribirá con la verdad de la BD.
    const prevHistorial = get().estadosHistorial
    const prevMaquinas = get().maquinas
    const targetRow = prevHistorial.find((e) => e.id === maquinaEstadoId)
    set((s) => ({
      estadosHistorial: s.estadosHistorial.map((e) =>
        e.id === maquinaEstadoId
          ? { ...e, severidad: severidadFinal, severidad_confirmada_por_admin: true }
          : e,
      ),
      maquinas: targetRow
        ? s.maquinas.map((m) =>
            m.id === targetRow.maquina_id && severidadFinal === 'leve' && m.estado_actual === 'avería'
              ? { ...m, estado_actual: 'parada' as EstadoMaquina }
              : m,
          )
        : s.maquinas,
    }))

    const { error } = await supabase.rpc('confirmar_severidad_averia', {
      p_maquina_estado_id: maquinaEstadoId,
      p_severidad_final: severidadFinal,
      p_admin_id: toValidUuid(adminId),
    })
    if (error) {
      console.error('[confirmarSeveridadAveria] error:', error)
      // Rollback del optimistic update
      set({ estadosHistorial: prevHistorial, maquinas: prevMaquinas, error: error.message })
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

    // Optimistic local update — la UI refleja la preparación inmediatamente,
    // sin esperar el round-trip de Realtime. El listener Realtime después
    // hará un refetch que es idempotente y termina sincronizando.
    const prep = data as Preparacion
    set((s) => ({ preparaciones: [prep, ...s.preparaciones.filter((p) => p.id !== prep.id)] }))
    return prep.id
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

    // Optimistic local update — cierra la avería abierta y desbloquea la máquina
    // de inmediato. El listener de Realtime sobrescribirá con la verdad de BD.
    const prevHistorial = get().estadosHistorial
    const prevMaquinas = get().maquinas
    const abiertas = prevHistorial
      .filter((e) => e.maquina_id === maquinaId && e.estado === 'avería' && !e.cerrada_en)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const target = abiertas[0]
    if (target) {
      const nowIsoLocal = new Date().toISOString()
      set((s) => ({
        estadosHistorial: s.estadosHistorial.map((e) =>
          e.id === target.id
            ? {
                ...e,
                cerrada_en: nowIsoLocal,
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
      }))
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
      // Rollback del optimistic update
      set({ estadosHistorial: prevHistorial, maquinas: prevMaquinas, error: error.message })
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

  maquinaNecesitaPrep: (maquinaId) => {
    const state = get()

    // Si la máquina no requiere preparación por configuración (ej. fresadoras),
    // nunca se considera que la necesite. La regla del ciclo solo aplica a
    // las máquinas marcadas como requiere_preparacion=true.
    const maquina = state.maquinas.find((m) => m.id === maquinaId)
    if (!maquina || !maquina.requiere_preparacion) return false

    // Última preparación de esta máquina (store ya viene ordenado desc)
    const lastPrep = state.preparaciones.find((p) => p.maquina_id === maquinaId) ?? null

    // Último uso cerrado (con hora_acabado rellena)
    const lastUsoClosed = state.usos
      .filter(
        (u) => u.maquina_id === maquinaId && u.resultado !== 'pendiente' && !!u.hora_acabado,
      )
      .sort((a, b) => {
        const aKey = `${a.fecha}T${a.hora_acabado ?? '00:00'}`
        const bKey = `${b.fecha}T${b.hora_acabado ?? '00:00'}`
        return bKey.localeCompare(aKey)
      })[0]

    if (!lastPrep) return true             // nunca se ha preparado
    if (!lastUsoClosed) return false       // se ha preparado y no se ha usado → ok

    // Comparar: si la prep fue antes del último cierre, hay que preparar de nuevo
    const prepKey = `${lastPrep.fecha}T${lastPrep.hora}`
    const usoKey = `${lastUsoClosed.fecha}T${lastUsoClosed.hora_acabado ?? '00:00'}`
    return prepKey < usoKey
  },
}))
