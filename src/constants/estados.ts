import type { EstadoMaquina, RolUsuario, TipoMaquina, ResultadoUso, TipoMantenimiento } from '../types/database'

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
