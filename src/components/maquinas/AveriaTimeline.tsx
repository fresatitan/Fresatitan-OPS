import { useMemo, useState } from 'react'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore } from '../../store/trabajadoresStore'
import { useAuthStore } from '../../store/authStore'
import type { AveriaPaso } from '../../types/database'

/**
 * Timeline cronológico de pasos seguidos para resolver una avería.
 * Aparece dentro de la card de cada avería en /alertas.
 *
 * Cada paso queda registrado con su autor y momento. Inmutable: si hay un
 * error en un paso, se añade otro que lo corrija (el cliente quiere
 * trazabilidad completa para auditoría sanitaria).
 *
 * Permite ver TODOS los pasos siempre (no se ocultan), y añadir un paso
 * nuevo si la avería sigue abierta. Si está cerrada, sólo lectura.
 */
export default function AveriaTimeline({
  maquinaEstadoId,
  averiaCerrada,
}: {
  maquinaEstadoId: string
  /** Si la avería ya está cerrada, se muestra solo lectura (no se permiten más pasos) */
  averiaCerrada: boolean
}) {
  const getPasos = useWorkflowStore((s) => s.getPasosByAveria)
  const agregarPaso = useWorkflowStore((s) => s.agregarPasoAveria)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const adminUser = useAuthStore((s) => s.user)

  const pasos = useMemo(() => getPasos(maquinaEstadoId), [getPasos, maquinaEstadoId])

  const [nuevoTexto, setNuevoTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddPaso = async () => {
    const limpio = nuevoTexto.trim()
    if (limpio.length === 0 || enviando) return
    setEnviando(true)
    setError(null)
    const id = await agregarPaso(maquinaEstadoId, limpio, adminUser?.id ?? null)
    setEnviando(false)
    if (id) {
      setNuevoTexto('')
    } else {
      setError('No se pudo guardar el paso. Revisa la conexión y reintenta.')
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">
          Seguimiento
        </h5>
        <span className="text-[10px] font-mono text-text-tertiary">
          {pasos.length} {pasos.length === 1 ? 'paso' : 'pasos'}
        </span>
      </div>

      {/* Timeline de pasos */}
      {pasos.length === 0 ? (
        <p className="text-[11px] italic text-text-tertiary mb-3">
          Aún no hay pasos registrados.
        </p>
      ) : (
        <ol className="relative ml-2 mb-3 space-y-2.5">
          {pasos.map((paso, idx) => (
            <PasoItem
              key={paso.id}
              paso={paso}
              indice={idx + 1}
              autorNombre={getName(paso.autor_id)}
              esUltimo={idx === pasos.length - 1}
            />
          ))}
        </ol>
      )}

      {/* Form para añadir paso — sólo si la avería está abierta */}
      {!averiaCerrada && (
        <div className="space-y-1.5">
          <textarea
            value={nuevoTexto}
            onChange={(e) => setNuevoTexto(e.target.value)}
            placeholder="Escribe un paso de seguimiento (ej. 'Llamado al técnico, viene mañana')…"
            rows={2}
            disabled={enviando}
            className="
              w-full px-2.5 py-2 rounded text-xs
              bg-surface-3 border border-border-subtle text-text-primary
              placeholder:text-text-tertiary
              focus:border-primary/50 focus:outline-none
              disabled:opacity-50 resize-none
            "
          />
          <div className="flex items-center justify-between gap-2">
            {error ? (
              <span className="text-[10px] text-averia">{error}</span>
            ) : (
              <span className="text-[10px] text-text-tertiary italic">
                Visible solo para el equipo admin. No se puede editar después.
              </span>
            )}
            <button
              onClick={handleAddPaso}
              disabled={nuevoTexto.trim().length === 0 || enviando}
              className="
                shrink-0 px-3 py-1.5 rounded text-[11px] font-semibold
                bg-primary text-text-inverse hover:bg-primary-light
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {enviando ? 'Guardando…' : '+ Añadir paso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PasoItem({
  paso,
  indice,
  autorNombre,
  esUltimo,
}: {
  paso: AveriaPaso
  indice: number
  autorNombre: string
  esUltimo: boolean
}) {
  const fecha = new Date(paso.created_at)
  const fechaCorta = fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li className="relative pl-5">
      {/* Punto del timeline */}
      <span
        className="
          absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-primary
          ring-2 ring-surface-2
        "
      />
      {/* Línea vertical conectora */}
      {!esUltimo && (
        <span className="absolute left-[5px] top-3.5 bottom-[-10px] w-px bg-border-subtle" />
      )}

      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
        <span className="font-mono text-[10px] text-text-tertiary">#{indice}</span>
        <span className="text-[11px] font-semibold text-text-primary">{autorNombre}</span>
        <span className="font-mono text-[10px] text-text-tertiary ml-auto">{fechaCorta}</span>
      </div>
      <p className="text-xs text-text-secondary leading-snug whitespace-pre-wrap">
        {paso.contenido}
      </p>
    </li>
  )
}
