import type { EstadoMaquina, RolUsuario, TipoMaquina, ResultadoUso, TipoMantenimiento, SeveridadAveria } from '../types/database'

export const ESTADOS_MAQUINA: Record<EstadoMaquina, { label: string; color: string; bg: string }> = {
  activa: { label: 'En uso', color: 'text-activa', bg: 'bg-activa' },
  parada: { label: 'Disponible', color: 'text-activa', bg: 'bg-activa' },
  'avería': { label: 'Avería', color: 'text-averia', bg: 'bg-averia' },
  mantenimiento: { label: 'Mantenimiento', color: 'text-mantenimiento', bg: 'bg-mantenimiento' },
  inactiva: { label: 'Inactiva', color: 'text-inactiva', bg: 'bg-inactiva' },
}

export const ROLES: Record<RolUsuario, string> = {
  operario: 'Operario',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  admin: 'Administrador',
}

export const TIPOS_MAQUINA: Record<TipoMaquina, string> = {
  fresadora: 'Fresadora',
  sinterizadora: 'Sinterizadora',
  impresora_3d: 'Impresora 3D',
}

// Plural para cabeceras de grupo (Panel, Informes, etc.)
export const TIPOS_MAQUINA_PLURAL: Record<TipoMaquina, string> = {
  fresadora: 'Fresadoras',
  sinterizadora: 'Sinterizadoras',
  impresora_3d: 'Impresoras 3D',
}

export const RESULTADOS_USO: Record<ResultadoUso, { label: string; color: string }> = {
  pendiente: { label: 'En curso', color: 'text-parada' },
  ok: { label: 'OK', color: 'text-activa' },
  ko: { label: 'KO', color: 'text-averia' },
}

export const TIPOS_MANTENIMIENTO: Record<TipoMantenimiento, string> = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
  predictivo: 'Predictivo',
}

export const SEVERIDADES: Record<SeveridadAveria, { label: string; short: string; description: string }> = {
  critica: {
    label: 'Crítica',
    short: 'CRÍTICA',
    description: 'La máquina no se puede utilizar.',
  },
  leve: {
    label: 'Leve',
    short: 'LEVE',
    description: 'Hay algo raro pero la máquina se puede seguir usando.',
  },
}
