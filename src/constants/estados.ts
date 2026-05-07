import type { EstadoMaquina, RolUsuario, TipoMaquina, ResultadoUso, TipoMantenimiento, SeveridadAveria, TipoProceso, SubtipoFresadora } from '../types/database'

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

export const TIPOS_PROCESO: Record<TipoProceso, { label: string; icon: string }> = {
  // Procesos vigentes por sub-familia (mayo 2026)
  titanio:         { label: 'Titanio',         icon: '⬢' },
  cr_co:           { label: 'Cr-Co',           icon: '⬡' },
  circonio:        { label: 'Circonio',        icon: '◆' },
  pmma:            { label: 'PMMA',            icon: '◇' },
  disilicato:      { label: 'Disilicato',      icon: '◈' },
  composite:       { label: 'Composite',       icon: '◉' },
  cr_co_rigido:    { label: 'Cr-Co rígido',    icon: '⬡' },
  cr_co_flexible:  { label: 'Cr-Co flexible',  icon: '⬡' },
  otro:            { label: 'Otro',            icon: '◇' },
  // === Históricos (deprecated, sólo para mostrar en informes pasados) ===
  fresado:         { label: 'Fresado',         icon: '⚙' },
  sinterizado:     { label: 'Sinterizado',     icon: '◎' },
  sinterofresado:  { label: 'Sinterofresado',  icon: '◈' },
  impresion3d:     { label: 'Impresión 3D',    icon: '⎙' },
  ferulas:         { label: 'Férulas',         icon: '⬢' },
  blender:         { label: 'Blender',         icon: '⬡' },
}

// Etiquetas de las sub-familias de fresadoras
export const SUBTIPOS_FRESADORA: Record<SubtipoFresadora, { label: string; short: string; description: string }> = {
  metal:  { label: 'Metal',  short: 'METAL',  description: 'Fresado en metal (Fanuc)' },
  seco:   { label: 'Seco',   short: 'SECO',   description: 'Fresado seco (UP3D, P53)' },
  humedo: { label: 'Húmedo', short: 'HÚMEDO', description: 'Fresado húmedo (Biomill, DS UP3D)' },
}

/**
 * Procesos disponibles por sub-familia.
 *  · Fresadoras: lista depende del subtipo (metal/seco/humedo)
 *  · Sinterizadoras: lista única
 *  · Impresoras 3D: placeholder con 'otro' hasta que el cliente confirme
 */
export const PROCESOS_POR_SUBFAMILIA: Record<SubtipoFresadora | 'sinterizadora' | 'impresora_3d', TipoProceso[]> = {
  metal:          ['titanio', 'cr_co'],
  seco:           ['circonio', 'pmma', 'otro'],
  humedo:         ['disilicato', 'composite'],
  sinterizadora:  ['cr_co_rigido', 'cr_co_flexible', 'titanio'],
  impresora_3d:   ['otro'],
}

/**
 * Devuelve los procesos disponibles para una máquina concreta, según tipo y
 * subtipo. Encapsula la lógica de qué clave usar en PROCESOS_POR_SUBFAMILIA
 * para no tener que repetir el switch en cada componente.
 */
export function procesosDisponibles(maquina: { tipo: TipoMaquina; subtipo: SubtipoFresadora | null }): TipoProceso[] {
  if (maquina.tipo === 'fresadora' && maquina.subtipo) {
    return PROCESOS_POR_SUBFAMILIA[maquina.subtipo]
  }
  if (maquina.tipo === 'sinterizadora') return PROCESOS_POR_SUBFAMILIA.sinterizadora
  if (maquina.tipo === 'impresora_3d')  return PROCESOS_POR_SUBFAMILIA.impresora_3d
  // Fresadora sin subtipo (no debería pasar tras backfill, pero fallback seguro)
  return ['otro']
}

/**
 * Listado de tipos de incidencia/avería más habituales por sub-familia.
 * Se muestra como desplegable cuando el operario marca "Hubo un problema" al
 * cerrar un uso. Después debe ampliar con texto libre obligatorio.
 */
export const TIPOS_INCIDENCIA_POR_SUBFAMILIA: Record<SubtipoFresadora | 'sinterizadora' | 'impresora_3d', string[]> = {
  metal:         ['Fallo en la producción', 'Rotura de herramienta', 'Sobre recorrido Z', 'Fallo de giro X-Y', 'Otros'],
  seco:          ['Fallo en la producción', 'Rotura de herramienta', 'Otros'],
  humedo:        ['Fallo en la producción', 'Rotura de herramienta', 'Otros'],
  sinterizadora: ['Fallo en la producción', 'Otros'],
  impresora_3d:  ['Fallo en la producción', 'Otros'],
}

/**
 * Devuelve los tipos de incidencia disponibles para una máquina concreta.
 */
export function tiposIncidenciaDisponibles(maquina: { tipo: TipoMaquina; subtipo: SubtipoFresadora | null }): string[] {
  if (maquina.tipo === 'fresadora' && maquina.subtipo) {
    return TIPOS_INCIDENCIA_POR_SUBFAMILIA[maquina.subtipo]
  }
  if (maquina.tipo === 'sinterizadora') return TIPOS_INCIDENCIA_POR_SUBFAMILIA.sinterizadora
  return TIPOS_INCIDENCIA_POR_SUBFAMILIA.impresora_3d
}
