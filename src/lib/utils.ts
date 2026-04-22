export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ')
}

/**
 * Construye un ISO datetime válido a partir de una fecha (YYYY-MM-DD) y una
 * hora que puede venir en formato `HH:mm` (form HTML) o `HH:mm:ss` (PostgreSQL time).
 */
export function toIsoDateTime(fecha: string, hora: string): string {
  const hms = hora.length === 5 ? `${hora}:00` : hora
  return `${fecha}T${hms}`
}

/**
 * Normaliza un string de hora a `HH:mm` (para mostrar en la UI).
 */
export function formatTime(hora: string | null | undefined): string {
  if (!hora) return '—'
  return hora.slice(0, 5)
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Devuelve el id si tiene formato UUID válido; si no, null.
 *
 * Los "admins dev" (loginAs sin Supabase Auth) tienen IDs no-UUID tipo
 * "admin-roser". Si los pasáramos tal cual a columnas `uuid` de Supabase
 * fallarían con "invalid input syntax for type uuid". Este helper se usa
 * en la frontera (store + lib de storage) para sanitizar sin que los
 * componentes tengan que preocuparse.
 */
export function toValidUuid(id: string | null | undefined): string | null {
  if (!id) return null
  return UUID_REGEX.test(id) ? id : null
}

import type { Preparacion, UsoEquipo } from '../types/database'

/**
 * Encuentra la preparación más reciente de una máquina que ocurrió ANTES o AL MISMO TIEMPO
 * que un uso dado. Se usa en informes para saber quién preparó la máquina antes de cada
 * uso concreto. Devuelve null si no hay preparación previa (p.ej. usos históricos anteriores
 * a la implementación del flujo de preparación).
 */
export function preparacionPreviaDe(
  uso: UsoEquipo,
  preparaciones: Preparacion[],
): Preparacion | null {
  const usoKey = `${uso.fecha}T${uso.hora_preparacion}`
  return (
    preparaciones
      .filter((p) => p.maquina_id === uso.maquina_id)
      .filter((p) => `${p.fecha}T${p.hora}` <= usoKey)
      .sort((a, b) => `${b.fecha}T${b.hora}`.localeCompare(`${a.fecha}T${a.hora}`))[0] ?? null
  )
}
