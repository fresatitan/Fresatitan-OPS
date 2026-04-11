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
