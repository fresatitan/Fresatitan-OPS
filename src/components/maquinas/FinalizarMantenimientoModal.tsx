import { useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore, type Trabajador } from '../../store/trabajadoresStore'
import { TIPOS_MANTENIMIENTO } from '../../constants/estados'
import type { Maquina } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

/**
 * Cuando una máquina está en estado 'mantenimiento', el operario / admin
 * abre este modal para marcar el mantenimiento como terminado y devolverla
 * a operativa.
 *
 * Muestra resumen del mantenimiento abierto (tipo, acción inicial, técnico)
 * y permite añadir observaciones de cierre + verificador opcional.
 */
export default function FinalizarMantenimientoModal({ open, onClose, maquina }: Props) {
  const mantenimientos = useWorkflowStore((s) => s.mantenimientos)
  const finalizarMantenimiento = useWorkflowStore((s) => s.finalizarMantenimiento)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  const candidatosVerif = useMemo(
    () => trabajadores.filter((t) => t.activo && t.puede_operar),
    [trabajadores],
  )

  const mantenimientoAbierto = useMemo(() => {
    return mantenimientos
      .filter((m) => m.maquina_id === maquina.id && !m.validado)
      .sort((a, b) => `${b.fecha}T${b.created_at}`.localeCompare(`${a.fecha}T${a.created_at}`))[0] ?? null
  }, [mantenimientos, maquina.id])

  const [observaciones, setObservaciones] = useState('')
  const [verificador, setVerificador] = useState<Trabajador | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFinalizar = async () => {
    if (submitting) return
    setSubmitting(true)
    await finalizarMantenimiento({
      maquinaId: maquina.id,
      observacionesFin: observaciones.trim() ? observaciones.trim() : null,
      verificadoPorId: verificador?.id ?? null,
    })
    setSubmitting(false)
    toast.success(`${maquina.codigo} vuelve a estar operativa`, { icon: '✅' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Finalizar mantenimiento · ${maquina.codigo}`} size="lg">
      <div className="space-y-5">
        {/* Resumen del mantenimiento abierto */}
        {mantenimientoAbierto ? (
          <div className="rounded-xl border-2 border-mantenimiento/30 bg-mantenimiento/5 p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-mantenimiento mb-2">
              Mantenimiento abierto
            </div>
            <div className="text-base font-bold text-text-primary mb-0.5">
              {TIPOS_MANTENIMIENTO[mantenimientoAbierto.tipo]}
            </div>
            <div className="text-xs text-text-secondary mb-3">
              Iniciado el <span className="font-mono">{mantenimientoAbierto.fecha}</span>
              {mantenimientoAbierto.persona_encargada_id && (
                <> por <strong>{getName(mantenimientoAbierto.persona_encargada_id)}</strong></>
              )}
            </div>
            <p className="text-xs text-text-primary bg-surface-3 rounded px-3 py-2 leading-relaxed">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider mr-1">Acción:</span>
              {mantenimientoAbierto.accion_realizada}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border-subtle bg-surface-2 p-4 text-center">
            <p className="text-sm text-text-secondary">
              No se ha encontrado un mantenimiento abierto para esta máquina.
            </p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Al continuar se devolverá igualmente a operativa.
            </p>
          </div>
        )}

        {/* Observaciones de cierre (opcional) */}
        <div>
          <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">
            Observaciones de cierre <span className="normal-case tracking-normal text-text-tertiary/70">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Ej: Cambio de fresa completado, calibración correcta tras prueba de testigo."
            className="input-field resize-none text-sm"
          />
        </div>

        {/* Verificador (opcional) */}
        <div>
          <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">
            Verificado por <span className="normal-case tracking-normal text-text-tertiary/70">(opcional)</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {candidatosVerif.map((t) => {
              const isSelected = verificador?.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setVerificador(isSelected ? null : t)}
                  className={`
                    flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all
                    active:scale-[0.96]
                    ${isSelected
                      ? 'bg-mantenimiento/10 border-mantenimiento'
                      : 'bg-surface-2 border-border-subtle hover:border-mantenimiento/40 hover:bg-surface-3'
                    }
                  `}
                >
                  <TrabajadorAvatar trabajador={t} size="sm" selected={isSelected} />
                  <span className={`text-xs font-semibold truncate max-w-full ${isSelected ? 'text-mantenimiento' : 'text-text-primary'}`}>
                    {t.nombre}
                  </span>
                </button>
              )
            })}
          </div>
          {verificador && (
            <p className="text-[11px] text-text-tertiary mt-1.5">
              Toca de nuevo el avatar para deseleccionarlo.
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t border-border-subtle">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-3 py-2.5 rounded text-sm font-medium bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalizar}
            disabled={submitting}
            className="flex-1 px-3 py-2.5 rounded text-sm font-bold bg-activa text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando…' : 'Marcar como finalizado'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
