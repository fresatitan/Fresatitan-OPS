import type { TipoMaquina, SubtipoFresadora, PlanUnidad } from '../types/database'

/**
 * Catálogo de acciones de mantenimiento por familia/subtipo de máquina.
 *
 * El cliente FRESATITAN nos pasó las listas el 13/05/2026. Cada acción puede
 * ser de tres tipos:
 *   · simple → un solo concepto (Calibrat, Spindle, Filtres…)
 *   · eina   → cambio de herramienta numerada del cargador (1..N)
 *   · otros  → entrada libre para casos no contemplados (rotura de cable,
 *              imprevistos, etc.)
 *
 * El operario podrá elegir varias acciones en una misma intervención.
 * El resultado se serializa como texto legible en `mantenimientos.accion_realizada`
 * para mantener compatibilidad con el resto del sistema.
 */
export type AccionDef = {
  id: string
  label: string
  /** Si está definido, esta acción tiene N sub-opciones numeradas (cambio de eina) */
  einas?: number
  /** Marca para distinguir el ítem "Otros" que abre un textarea libre */
  esOtros?: boolean
}

// -----------------------------------------------------------------------------
// FRESADORAS METAL
//
// Los ids se mantienen estables (independientes del idioma de la UI) para que
// la auto-vinculación a planes y los registros históricos no se rompan si en
// el futuro se cambian las etiquetas. La UI siempre va en castellano.
// -----------------------------------------------------------------------------
export const ACCIONES_FRESADORA_METAL: AccionDef[] = [
  { id: 'calibrat',        label: 'Calibrado' },
  { id: 'reposicio_oli',   label: 'Reposición de aceite' },
  { id: 'diposit',         label: 'Depósito (agua + aditivo)' },
  { id: 'viruta',          label: 'Contenedor de viruta' },
  { id: 'canvi_eina',      label: 'Cambio de herramienta', einas: 21 },
  { id: 'otros',           label: 'Otros', esOtros: true },
]

// -----------------------------------------------------------------------------
// FRESADORAS SECO
// -----------------------------------------------------------------------------
export const ACCIONES_FRESADORA_SECO: AccionDef[] = [
  { id: 'calibrat_eixos',  label: 'Calibrado de ejes' },
  { id: 'spindle',         label: 'Spindle' },
  { id: 'neteja_interior', label: 'Limpieza interior' },
  { id: 'canvi_eina',      label: 'Cambio de herramienta', einas: 6 },
  { id: 'otros',           label: 'Otros', esOtros: true },
]

// -----------------------------------------------------------------------------
// FRESADORAS HÚMEDO
// -----------------------------------------------------------------------------
export const ACCIONES_FRESADORA_HUMEDO: AccionDef[] = [
  { id: 'calibrat',        label: 'Calibrado' },
  { id: 'spindle',         label: 'Spindle' },
  { id: 'diposit',         label: 'Depósito (agua + aditivo)' },
  { id: 'filtres',         label: 'Filtros' },
  { id: 'canal_chorro',    label: 'Canal de chorro' },
  { id: 'neteja_interior', label: 'Limpieza interior' },
  { id: 'canvi_eina',      label: 'Cambio de herramienta', einas: 12 },
  { id: 'otros',           label: 'Otros', esOtros: true },
]

// -----------------------------------------------------------------------------
// SINTERIZADORAS
// -----------------------------------------------------------------------------
export const ACCIONES_SINTERIZADORA: AccionDef[] = [
  { id: 'cutter',           label: 'Cutter' },
  { id: 'filtre',           label: 'Filtro' },
  { id: 'filtre_posterior', label: 'Filtro posterior' },
  { id: 'piab',             label: 'PIAB' },
  { id: 'sensor_oxigen',    label: 'Sensor de oxígeno' },
  { id: 'calibrat',         label: 'Calibrado' },
  { id: 'otros',            label: 'Otros', esOtros: true },
]

// -----------------------------------------------------------------------------
// IMPRESORAS 3D
// -----------------------------------------------------------------------------
export const ACCIONES_IMPRESORA_3D: AccionDef[] = [
  { id: 'calibrat',          label: 'Calibrado' },
  { id: 'canvi_base_safata', label: 'Cambio de base de bandeja' },
  { id: 'neteja',            label: 'Limpieza' },
  { id: 'otros',             label: 'Otros', esOtros: true },
]

/**
 * Selector que devuelve el catálogo correcto según la familia/subfamilia de la
 * máquina. Para fresadoras, el subtipo es obligatorio para diferenciar.
 */
export function accionesParaMaquina(
  tipo: TipoMaquina,
  subtipo: SubtipoFresadora | null,
): AccionDef[] {
  if (tipo === 'fresadora') {
    if (subtipo === 'metal')  return ACCIONES_FRESADORA_METAL
    if (subtipo === 'seco')   return ACCIONES_FRESADORA_SECO
    if (subtipo === 'humedo') return ACCIONES_FRESADORA_HUMEDO
    // Fallback razonable si por algún motivo no hay subtipo
    return ACCIONES_FRESADORA_METAL
  }
  if (tipo === 'sinterizadora') return ACCIONES_SINTERIZADORA
  if (tipo === 'impresora_3d')  return ACCIONES_IMPRESORA_3D
  return []
}

// =============================================================================
// PLANTILLAS DE PLANES DE REVISIÓN (sugerencias industria)
//
// Valores conservadores basados en recomendaciones de fabricantes CAD-CAM
// dental (Roland DG, vhf camfacture, Dentsply Sirona, Carbon, Formlabs).
// Sirven como "punto de partida" para el cliente; cada plantilla se puede
// editar a mano antes de guardar.
//
// El campo `accionId` permite que, al registrar un mantenimiento que contenga
// esa acción, el contador del plan se reinicie automáticamente (si el cliente
// optó por el vínculo por nombre).
// =============================================================================

export type PlantillaPlan = {
  /** Identificador estable de la plantilla */
  id: string
  /** Familia/subfamilia donde es aplicable */
  aplicaA: Array<{ tipo: TipoMaquina; subtipo?: SubtipoFresadora }>
  nombre: string
  descripcion: string
  unidad: PlanUnidad
  cada_n: number
  /** ID de la acción del catálogo que corresponde a este plan (para auto-vinculación) */
  accionId?: string
  /** Fuente/justificación del valor */
  fuente: string
}

export const PLANTILLAS_PLAN: PlantillaPlan[] = [
  // -- Fresadoras METAL --------------------------------------------------------
  { id: 't-metal-calibrat',     aplicaA: [{ tipo: 'fresadora', subtipo: 'metal' }],
    nombre: 'Calibrado', descripcion: 'Calibración periódica de ejes y verificación de precisión.',
    unidad: 'meses', cada_n: 6, accionId: 'calibrat',
    fuente: 'Fabricantes CNC dental (cada 6 meses recomendado).' },
  { id: 't-metal-oli',          aplicaA: [{ tipo: 'fresadora', subtipo: 'metal' }],
    nombre: 'Reposición de aceite', descripcion: 'Comprobar y rellenar nivel de aceite del cabezal/CNC.',
    unidad: 'meses', cada_n: 3, accionId: 'reposicio_oli',
    fuente: 'Mantenimiento preventivo CNC industrial (250h o 3 meses).' },
  { id: 't-metal-diposit',      aplicaA: [{ tipo: 'fresadora', subtipo: 'metal' }],
    nombre: 'Depósito (agua + aditivo)', descripcion: 'Renovar mezcla refrigerante del depósito.',
    unidad: 'meses', cada_n: 3, accionId: 'diposit',
    fuente: 'Vida media de refrigerantes sintéticos: 2-4 meses.' },
  { id: 't-metal-viruta',       aplicaA: [{ tipo: 'fresadora', subtipo: 'metal' }],
    nombre: 'Contenedor de viruta', descripcion: 'Vaciar y limpiar el contenedor de virutas.',
    unidad: 'semanas', cada_n: 1, accionId: 'viruta',
    fuente: 'Recomendación uso diario/semanal según volumen.' },
  { id: 't-metal-eina',         aplicaA: [{ tipo: 'fresadora', subtipo: 'metal' }],
    nombre: 'Cambio de herramienta', descripcion: 'Sustitución de fresa por desgaste según material.',
    unidad: 'usos', cada_n: 150, accionId: 'canvi_eina',
    fuente: 'Vida media fresa en titanio/CoCr: 100-200 usos.' },

  // -- Fresadoras SECO ---------------------------------------------------------
  { id: 't-seco-calibrat',      aplicaA: [{ tipo: 'fresadora', subtipo: 'seco' }],
    nombre: 'Calibrado de ejes', descripcion: 'Calibración de los ejes y verificación de precisión.',
    unidad: 'meses', cada_n: 6, accionId: 'calibrat_eixos',
    fuente: 'Roland/vhf recomienda calibración semestral.' },
  { id: 't-seco-spindle',       aplicaA: [{ tipo: 'fresadora', subtipo: 'seco' }],
    nombre: 'Spindle', descripcion: 'Revisión del cabezal (rodamientos, lubricación, runout).',
    unidad: 'meses', cada_n: 12, accionId: 'spindle',
    fuente: 'Vida útil rodamientos spindle dental: 5000h ~ 1 año.' },
  { id: 't-seco-neteja',        aplicaA: [{ tipo: 'fresadora', subtipo: 'seco' }],
    nombre: 'Limpieza interior', descripcion: 'Limpieza del interior de la cabina y aspiración.',
    unidad: 'semanas', cada_n: 1, accionId: 'neteja_interior',
    fuente: 'Limpieza semanal recomendada para zirconia/PMMA.' },
  { id: 't-seco-eina',          aplicaA: [{ tipo: 'fresadora', subtipo: 'seco' }],
    nombre: 'Cambio de herramienta', descripcion: 'Sustitución de fresas por desgaste (zirconia/PMMA).',
    unidad: 'usos', cada_n: 250, accionId: 'canvi_eina',
    fuente: 'Fresas dentales en zirconia: 200-300 piezas típicas.' },

  // -- Fresadoras HÚMEDO -------------------------------------------------------
  { id: 't-hum-calibrat',       aplicaA: [{ tipo: 'fresadora', subtipo: 'humedo' }],
    nombre: 'Calibrado', descripcion: 'Calibración periódica de ejes y precisión.',
    unidad: 'meses', cada_n: 6, accionId: 'calibrat',
    fuente: 'Fabricantes CAD-CAM dental: 6 meses.' },
  { id: 't-hum-spindle',        aplicaA: [{ tipo: 'fresadora', subtipo: 'humedo' }],
    nombre: 'Spindle', descripcion: 'Revisión del cabezal (lubricación + runout).',
    unidad: 'meses', cada_n: 12, accionId: 'spindle',
    fuente: 'Vida útil rodamientos spindle dental: 5000h ~ 1 año.' },
  { id: 't-hum-diposit',        aplicaA: [{ tipo: 'fresadora', subtipo: 'humedo' }],
    nombre: 'Depósito (agua + aditivo)', descripcion: 'Renovar mezcla refrigerante del depósito.',
    unidad: 'meses', cada_n: 3, accionId: 'diposit',
    fuente: 'Refrigerantes sintéticos: 2-4 meses.' },
  { id: 't-hum-filtres',        aplicaA: [{ tipo: 'fresadora', subtipo: 'humedo' }],
    nombre: 'Filtros', descripcion: 'Sustitución de filtros del circuito de refrigerante.',
    unidad: 'meses', cada_n: 6, accionId: 'filtres',
    fuente: 'Filtros papel/malla en CAM húmedo: 3-6 meses.' },
  { id: 't-hum-canal',          aplicaA: [{ tipo: 'fresadora', subtipo: 'humedo' }],
    nombre: 'Canal de chorro', descripcion: 'Limpieza del canal del chorro de refrigerante.',
    unidad: 'meses', cada_n: 1, accionId: 'canal_chorro',
    fuente: 'Limpieza mensual estándar.' },
  { id: 't-hum-neteja',         aplicaA: [{ tipo: 'fresadora', subtipo: 'humedo' }],
    nombre: 'Limpieza interior', descripcion: 'Limpieza del interior de la cabina y aspiración.',
    unidad: 'semanas', cada_n: 1, accionId: 'neteja_interior',
    fuente: 'Limpieza semanal recomendada.' },
  { id: 't-hum-eina',           aplicaA: [{ tipo: 'fresadora', subtipo: 'humedo' }],
    nombre: 'Cambio de herramienta', descripcion: 'Sustitución de fresas por desgaste (vidrio/cerámica).',
    unidad: 'usos', cada_n: 100, accionId: 'canvi_eina',
    fuente: 'Fresas diamantadas en disilicato/feldespato: 80-150 piezas.' },

  // -- Sinterizadoras ----------------------------------------------------------
  { id: 't-sint-cutter',        aplicaA: [{ tipo: 'sinterizadora' }],
    nombre: 'Cutter', descripcion: 'Sustitución de la cuchilla de recubrimiento (recoater).',
    unidad: 'meses', cada_n: 12, accionId: 'cutter',
    fuente: 'Recoater blade SLM dental: anual o por degradación.' },
  { id: 't-sint-filtre',        aplicaA: [{ tipo: 'sinterizadora' }],
    nombre: 'Filtro', descripcion: 'Sustitución del filtro principal de gas/proceso.',
    unidad: 'meses', cada_n: 6, accionId: 'filtre',
    fuente: 'Filtro proceso SLM: 500-1000h o 6 meses.' },
  { id: 't-sint-filtre-post',   aplicaA: [{ tipo: 'sinterizadora' }],
    nombre: 'Filtro posterior', descripcion: 'Sustitución del filtro posterior/HEPA.',
    unidad: 'meses', cada_n: 12, accionId: 'filtre_posterior',
    fuente: 'Filtro HEPA cabina: anual.' },
  { id: 't-sint-piab',          aplicaA: [{ tipo: 'sinterizadora' }],
    nombre: 'PIAB', descripcion: 'Mantenimiento del sistema de vacío/aspiración PIAB.',
    unidad: 'meses', cada_n: 3, accionId: 'piab',
    fuente: 'Aspiradores PIAB industrial: 3-6 meses según uso.' },
  { id: 't-sint-o2',            aplicaA: [{ tipo: 'sinterizadora' }],
    nombre: 'Sensor de oxígeno', descripcion: 'Verificación/sustitución del sensor de oxígeno.',
    unidad: 'meses', cada_n: 12, accionId: 'sensor_oxigen',
    fuente: 'Vida útil típica sensor O2: 12-18 meses.' },
  { id: 't-sint-calibrat',      aplicaA: [{ tipo: 'sinterizadora' }],
    nombre: 'Calibrado', descripcion: 'Calibración del láser y verificación de potencia.',
    unidad: 'meses', cada_n: 6, accionId: 'calibrat',
    fuente: 'Calibración SLM dental: semestral.' },

  // -- Impresoras 3D -----------------------------------------------------------
  { id: 't-imp-calibrat',       aplicaA: [{ tipo: 'impresora_3d' }],
    nombre: 'Calibrado', descripcion: 'Calibración de la plataforma de impresión y nivelado.',
    unidad: 'meses', cada_n: 6, accionId: 'calibrat',
    fuente: 'DLP/LCD dental: 6 meses o tras movimiento del equipo.' },
  { id: 't-imp-base',           aplicaA: [{ tipo: 'impresora_3d' }],
    nombre: 'Cambio de base de bandeja', descripcion: 'Sustitución del FEP / base de la cubeta.',
    unidad: 'usos', cada_n: 100, accionId: 'canvi_base_safata',
    fuente: 'Vida útil FEP en DLP dental: 50-150 impresiones.' },
  { id: 't-imp-neteja',         aplicaA: [{ tipo: 'impresora_3d' }],
    nombre: 'Limpieza', descripcion: 'Limpieza de la cubeta, pantalla LCD y plataforma.',
    unidad: 'semanas', cada_n: 1, accionId: 'neteja',
    fuente: 'Limpieza semanal o tras cada lote.' },
]

/**
 * Filtra las plantillas aplicables a una máquina concreta según su familia
 * y subfamilia.
 */
export function plantillasParaMaquina(
  tipo: TipoMaquina,
  subtipo: SubtipoFresadora | null,
): PlantillaPlan[] {
  return PLANTILLAS_PLAN.filter((p) =>
    p.aplicaA.some((a) => {
      if (a.tipo !== tipo) return false
      if (tipo === 'fresadora') return a.subtipo === subtipo
      return true
    }),
  )
}
