// Tipos sincronizados con supabase/migrations/0001_fresatitan_ops_schema.sql

export type EstadoMaquina = 'activa' | 'parada' | 'avería' | 'mantenimiento' | 'inactiva'
export type RolUsuario = 'operario' | 'supervisor' | 'tecnico' | 'admin'
export type TipoMaquina = 'fresadora' | 'sinterizadora'
export type ResultadoUso = 'ok' | 'ko' | 'pendiente'
export type TipoMantenimiento = 'preventivo' | 'correctivo' | 'predictivo'

export interface Profile {
  id: string
  user_id: string | null
  nombre: string
  apellidos: string
  role: RolUsuario
  activo: boolean
  puede_operar: boolean
  created_at: string
  updated_at: string
}

export interface Maquina {
  id: string
  codigo: string                    // ej. REF-039
  nombre: string
  tipo: TipoMaquina
  numero_serie: string | null
  descripcion: string | null
  ubicacion: string | null
  estado_actual: EstadoMaquina
  requiere_lanzamiento: boolean     // catalán "punxat" → lanzamiento del programa
  activa: boolean                   // false = retirada del servicio
  created_at: string
  updated_at: string
}

export interface MaquinaEstado {
  id: string
  maquina_id: string
  estado: EstadoMaquina
  motivo: string | null
  usuario_id: string | null
  timestamp: string
}

// Un "uso de equipo" = una tanda preparación → acabado sobre una máquina
export interface UsoEquipo {
  id: string
  maquina_id: string
  fecha: string                            // ISO date (YYYY-MM-DD)
  hora_preparacion: string                 // HH:mm
  tecnico_preparacion_id: string
  tecnico_lanzamiento_id: string | null    // solo si maquina.requiere_lanzamiento
  hora_acabado: string | null              // HH:mm, null mientras en curso
  tecnico_acabado_id: string | null
  resultado: ResultadoUso
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface Incidencia {
  id: string
  uso_id: string
  descripcion: string
  created_at: string
}

export interface Mantenimiento {
  id: string
  maquina_id: string
  fecha: string
  tipo: TipoMantenimiento
  accion_realizada: string
  resultado: string | null
  persona_encargada_id: string | null
  persona_verificadora_id: string | null
  validado: boolean
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface Alerta {
  id: string
  maquina_id: string | null
  tipo: string
  mensaje: string
  leida: boolean
  destinatario_role: RolUsuario | null
  created_at: string
}

// Estructura compatible con supabase-js v2 generic Database type
type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile, Omit<Profile, 'id' | 'created_at' | 'updated_at'>, Partial<Omit<Profile, 'id'>>>
      maquinas: TableDef<Maquina, Omit<Maquina, 'id' | 'created_at' | 'updated_at'>, Partial<Omit<Maquina, 'id'>>>
      maquina_estados: TableDef<MaquinaEstado, Omit<MaquinaEstado, 'id'>, Partial<Omit<MaquinaEstado, 'id'>>>
      usos_equipo: TableDef<UsoEquipo, Omit<UsoEquipo, 'id' | 'created_at' | 'updated_at'>, Partial<Omit<UsoEquipo, 'id'>>>
      incidencias: TableDef<Incidencia, Omit<Incidencia, 'id' | 'created_at'>, Partial<Omit<Incidencia, 'id'>>>
      mantenimientos: TableDef<Mantenimiento, Omit<Mantenimiento, 'id' | 'created_at' | 'updated_at'>, Partial<Omit<Mantenimiento, 'id'>>>
      alertas: TableDef<Alerta, Omit<Alerta, 'id' | 'created_at'>, Partial<Omit<Alerta, 'id'>>>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
