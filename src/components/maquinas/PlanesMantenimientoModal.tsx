import Modal from '../ui/Modal'
import PlanesMantenimientoSection from './PlanesMantenimientoSection'
import type { Maquina } from '../../types/database'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

/**
 * Modal dedicado para gestionar los planes de revisión de una máquina sin
 * pasar por la edición completa de la máquina. Punto de entrada directo
 * desde la card del dashboard admin.
 */
export default function PlanesMantenimientoModal({ open, onClose, maquina }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Planes de revisión · ${maquina.codigo}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary-muted/30 px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            {maquina.nombre}
          </h3>
          <p className="text-[11px] text-text-tertiary leading-snug">
            Define revisiones periódicas para esta máquina. El sistema avisará
            automáticamente cuando se cumpla el plazo (por tiempo o por usos).
            Cuando registres un mantenimiento que coincida con un plan, el
            contador se reinicia solo.
          </p>
        </div>

        {/* La sección reutilizada se renderiza sin su borde superior, ya que
            estamos dentro de un modal con su propio header. */}
        <div className="-mt-4">
          <PlanesMantenimientoSection maquina={maquina} />
        </div>

        <div className="pt-3 border-t border-border-subtle">
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
