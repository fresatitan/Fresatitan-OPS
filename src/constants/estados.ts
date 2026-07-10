import type { EstadoMaquina, RolUsuario, TipoMaquina, ResultadoUso, TipoMantenimiento, SeveridadAveria, TipoProceso, SubtipoFresadora, SubtipoSinterizadora, SubtipoMaquina } from '../types/database'

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

// Etiquetas de las unidades de planes de revisión
export const UNIDADES_PLAN: Record<import('../types/database').PlanUnidad, { label: string; labelSingular: string }> = {
  dias:    { label: 'días',    labelSingular: 'día' },
  semanas: { label: 'semanas', labelSingular: 'semana' },
  meses:   { label: 'meses',   labelSingular: 'mes' },
  usos:    { label: 'usos',    labelSingular: 'uso' },
}

// Etiquetas de las sub-familias de fresadoras
export const SUBTIPOS_FRESADORA: Record<SubtipoFresadora, { label: string; short: string; description: string }> = {
  metal:  { label: 'Metal',  short: 'METAL',  description: 'Fresado en metal (Fanuc)' },
  seco:   { label: 'Seco',   short: 'SECO',   description: 'Fresado seco (UP3D, P53)' },
  humedo: { label: 'Húmedo', short: 'HÚMEDO', description: 'Fresado húmedo (Biomill, DS UP3D)' },
}

// Etiquetas de las sub-familias de sinterizadoras (Cr-Co → N2 · titanio → Ar)
export const SUBTIPOS_SINTERIZADORA: Record<SubtipoSinterizadora, { label: string; short: string; description: string }> = {
  cr_co:   { label: 'Cr-Co',   short: 'CR-CO',   description: 'Sinterizado Cr-Co (aportación N₂)' },
  titanio: { label: 'Titanio', short: 'TITANIO', description: 'Sinterizado titanio (aportación Ar)' },
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
export function procesosDisponibles(maquina: { tipo: TipoMaquina; subtipo: SubtipoMaquina | null }): TipoProceso[] {
  if (maquina.tipo === 'fresadora' && maquina.subtipo && maquina.subtipo in SUBTIPOS_FRESADORA) {
    return PROCESOS_POR_SUBFAMILIA[maquina.subtipo as SubtipoFresadora]
  }
  if (maquina.tipo === 'sinterizadora') return PROCESOS_POR_SUBFAMILIA.sinterizadora
  if (maquina.tipo === 'impresora_3d')  return PROCESOS_POR_SUBFAMILIA.impresora_3d
  // Fresadora sin subtipo (no debería pasar tras backfill, pero fallback seguro)
  return ['otro']
}

/**
 * Opción de incidencia que exige texto libre obligatorio (el resto de tipos
 * lo dejan opcional — acuerdo con el cliente, julio 2026).
 */
export const INCIDENCIA_OTROS = 'Otros'

/**
 * Listado oficial de averías más habituales por sub-familia (documento del
 * cliente, julio 2026). Se muestra como desplegable cuando el operario marca
 * "Hubo un problema" al cerrar un uso.
 *
 * En sinterizadoras, el documento agrupa las tres primeras causas bajo
 * "Fallo en la producción"; se muestran aplanadas para ahorrar un nivel de
 * navegación en la tablet. Cr-Co usa aportación de N₂ y titanio de Ar.
 */
export const TIPOS_INCIDENCIA_POR_SUBFAMILIA: Record<SubtipoMaquina | 'impresora_3d', string[]> = {
  // Fresadoras
  metal:   ['Fallo en la producción', 'Desgaste de herramienta', 'Salto de herramienta', 'Sobre recorrido Z', 'Fallo de giro X-Y', INCIDENCIA_OTROS],
  seco:    ['Fallo en la producción', 'Rotura de herramienta', INCIDENCIA_OTROS],
  humedo:  ['Fallo en la producción', 'Rotura de herramienta', INCIDENCIA_OTROS],
  // Sinterizadoras
  cr_co:   ['Error del sistema', 'Defecto en la preparación', 'Fallo en la aportación de N₂', INCIDENCIA_OTROS],
  titanio: ['Error del sistema', 'Defecto en la preparación', 'Fallo en la aportación de Ar', INCIDENCIA_OTROS],
  // Impresoras 3D
  impresora_3d: ['Fallo en la producción', INCIDENCIA_OTROS],
}

/**
 * Devuelve los tipos de incidencia disponibles para una máquina concreta.
 */
export function tiposIncidenciaDisponibles(maquina: { tipo: TipoMaquina; subtipo: SubtipoMaquina | null }): string[] {
  if (maquina.tipo === 'fresadora' && maquina.subtipo) {
    return TIPOS_INCIDENCIA_POR_SUBFAMILIA[maquina.subtipo]
  }
  if (maquina.tipo === 'sinterizadora') {
    // Default cr_co: 5 de las 6 sinterizadoras lo son; cubre máquinas sin backfill
    return TIPOS_INCIDENCIA_POR_SUBFAMILIA[maquina.subtipo === 'titanio' ? 'titanio' : 'cr_co']
  }
  return TIPOS_INCIDENCIA_POR_SUBFAMILIA.impresora_3d
}
