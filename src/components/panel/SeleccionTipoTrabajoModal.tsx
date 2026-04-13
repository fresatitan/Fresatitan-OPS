import Modal from '../ui/Modal'
import type { Maquina } from '../../types/database'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
  onSelectProduccion: () => void
  onSelectMantenimiento: () => void
  onSelectAveria: () => void
}

/**
 * Modal selector: when a worker taps a free machine, they choose between
 * Production, Maintenance, or report a Breakdown.
 *
 * Touch-first: large cards (56px+ height), industrial premium dark theme.
 */
export default function SeleccionTipoTrabajoModal({
  open,
  onClose,
  maquina,
  onSelectProduccion,
  onSelectMantenimiento,
  onSelectAveria,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`${maquina.codigo} · ${maquina.nombre}`} size="lg">
      <div className="min-h-[280px]">
        <h3 className="text-xl font-bold text-text-primary mb-1">
          ¿Qué vas a hacer?
        </h3>
        <p className="text-sm text-text-tertiary mb-6">
          Elige el tipo de trabajo que vas a realizar en esta máquina.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Production card */}
          <button
            onClick={onSelectProduccion}
            className="
              group relative flex flex-col items-center justify-center gap-3
              min-h-[140px] p-6 rounded-2xl border-2
              bg-primary/5 border-primary/30
              hover:bg-primary/10 hover:border-primary/60
              active:scale-[0.97] transition-all
            "
          >
            <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D09A40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">Producción</div>
              <div className="text-xs text-text-tertiary mt-1">Iniciar un trabajo de producción</div>
            </div>
          </button>

          {/* Maintenance card */}
          <button
            onClick={onSelectMantenimiento}
            className="
              group relative flex flex-col items-center justify-center gap-3
              min-h-[140px] p-6 rounded-2xl border-2
              bg-mantenimiento/5 border-mantenimiento/30
              hover:bg-mantenimiento/10 hover:border-mantenimiento/60
              active:scale-[0.97] transition-all
            "
          >
            <div className="w-14 h-14 rounded-xl bg-mantenimiento/15 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-mantenimiento">Mantenimiento</div>
              <div className="text-xs text-text-tertiary mt-1">Registrar una intervención técnica</div>
            </div>
          </button>
        </div>

        {/* Report breakdown link */}
        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between">
          <button
            onClick={onSelectAveria}
            className="text-[11px] text-averia hover:text-averia/80 transition-colors flex items-center gap-1"
          >
            <span>⚠</span>
            <span className="underline decoration-dotted">Reportar avería en esta máquina</span>
          </button>
          <button
            onClick={onClose}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )
}
