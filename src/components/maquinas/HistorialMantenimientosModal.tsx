import { useMemo } from 'react'
import Modal from '../ui/Modal'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore } from '../../store/trabajadoresStore'
import { TIPOS_MANTENIMIENTO } from '../../constants/estados'
import type { Maquina, Mantenimiento } from '../../types/database'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

/**
 * Listado cronológico de mantenimientos realizados a una máquina.
 *
 * Pensado para el operario/admin que necesita saber rápidamente cuándo fue
 * la última revisión, qué se hizo y quién la hizo — sin tener que ir al
 * dashboard. Se abre desde el `SeleccionTipoTrabajoModal` del panel.
 */
export default function HistorialMantenimientosModal({ open, onClose, maquina }: Props) {
  const mantenimientos = useWorkflowStore((s) => s.mantenimientos)
  const planes = useWorkflowStore((s) => s.mantenimientoPlanes)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  // Mantenimientos de esta máquina ordenados desc por fecha (los más recientes
  // primero). Lo hacemos con una clave combinada `fecha`+`created_at` para que
  // dos mantenimientos del mismo día queden en el orden correcto.
  const lista = useMemo(() => {
    return mantenimientos
      .filter((m) => m.maquina_id === maquina.id)
      .sort((a, b) => {
        const ka = `${a.fecha}T${a.created_at}`
        const kb = `${b.fecha}T${b.created_at}`
        return kb.localeCompare(ka)
      })
  }, [mantenimientos, maquina.id])

  const ultimo = lista[0] ?? null
  const planesById = useMemo(() => new Map(planes.map((p) => [p.id, p])), [planes])

  // Días desde el último mantenimiento — útil para el operario
  const diasDesdeUltimo = useMemo(() => {
    if (!ultimo) return null
    const dt = new Date(`${ultimo.fecha}T00:00:00`)
    const ahora = new Date()
    return Math.max(0, Math.floor((ahora.getTime() - dt.getTime()) / 86_400_000))
  }, [ultimo])

  return (
    <Modal open={open} onClose={onClose} title={`Mantenimientos · ${maquina.codigo}`} size="lg">
      <div className="space-y-4">
        {/* Resumen rápido — último mantenimiento destacado */}
        <div className="rounded-xl border-2 border-mantenimiento/30 bg-mantenimiento/5 p-4">
          {ultimo ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-mantenimiento">
                  Último mantenimiento
                </span>
                <span className="text-[10px] font-mono text-text-secondary">
                  {diasDesdeUltimo === 0
                    ? 'hoy'
                    : diasDesdeUltimo === 1
                    ? 'hace 1 día'
                    : `hace ${diasDesdeUltimo} días`}
                </span>
              </div>
              <div className="text-base font-bold text-text-primary mb-0.5">
                {TIPOS_MANTENIMIENTO[ultimo.tipo]}
              </div>
              <div className="text-xs text-text-secondary">
                <span className="font-mono">{ultimo.fecha}</span>
                {ultimo.persona_encargada_id && (
                  <> · {getName(ultimo.persona_encargada_id)}</>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="text-sm font-semibold text-text-primary">
                Sin mantenimientos registrados
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                Esta máquina aún no tiene ningún mantenimiento en el sistema.
              </p>
            </div>
          )}
        </div>

        {/* Listado completo */}
        {lista.length > 0 && (
          <div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold mb-2">
              Historial completo · {lista.length} {lista.length === 1 ? 'entrada' : 'entradas'}
            </div>
            <ul className="space-y-2 max-h-[400px] overflow-auto pr-1">
              {lista.map((m) => (
                <MantenimientoItem
                  key={m.id}
                  mant={m}
                  planNombre={m.plan_id ? planesById.get(m.plan_id)?.nombre ?? null : null}
                  getName={getName}
                />
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="
              w-full px-3 py-2.5 rounded text-sm font-medium
              bg-surface-3 border border-border-subtle text-text-secondary
              hover:text-text-primary transition-colors
            "
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function MantenimientoItem({
  mant,
  planNombre,
  getName,
}: {
  mant: Mantenimiento
  planNombre: string | null
  getName: (id: string | null) => string
}) {
  return (
    <li className="rounded-lg border border-border-subtle bg-surface-2 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-mantenimiento bg-mantenimiento/10 px-1.5 py-0.5 rounded">
              {TIPOS_MANTENIMIENTO[mant.tipo]}
            </span>
            {planNombre && (
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary bg-primary-muted px-1.5 py-0.5 rounded">
                Plan: {planNombre}
              </span>
            )}
            <span className="font-mono text-[10px] text-text-tertiary ml-auto">{mant.fecha}</span>
          </div>
          {mant.accion_realizada && (
            <p className="text-xs text-text-primary leading-snug whitespace-pre-wrap mb-1">
              {mant.accion_realizada}
            </p>
          )}
          <div className="text-[11px] text-text-tertiary">
            {mant.persona_encargada_id && (
              <>Realizado por <span className="text-text-secondary">{getName(mant.persona_encargada_id)}</span></>
            )}
            {mant.persona_verificadora_id && (
              <> · Verificado por <span className="text-text-secondary">{getName(mant.persona_verificadora_id)}</span></>
            )}
          </div>
          {mant.observaciones && (
            <p className="mt-1 text-[11px] text-text-tertiary italic leading-snug">
              {mant.observaciones}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}
