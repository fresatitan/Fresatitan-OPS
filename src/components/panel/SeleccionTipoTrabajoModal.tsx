import Modal from '../ui/Modal'
import { MaquinaModalTitle } from '../ui/EtiquetaTag'
import { IconBroom, IconPlay, IconWrench, IconHistory, IconAlert } from '../ui/icons'
import type { Maquina } from '../../types/database'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
  /** La máquina necesita preparación antes de iniciar producción */
  needsPrep: boolean
  onSelectProduccion: () => void
  onSelectMantenimiento: () => void
  onSelectPreparacion: () => void
  onSelectAveria: () => void
  /** Abre el historial de mantenimientos de la máquina (modo solo-lectura) */
  onVerHistorialMantenimientos: () => void
}

/**
 * Modal selector: when a worker taps a free machine, they choose between
 * Preparation, Production, Maintenance, or report a Breakdown.
 *
 * El flujo es estricto: Preparación → Producción → Cierre → Preparación…
 * Si la máquina no se ha preparado después del último cierre, Producción
 * queda deshabilitada hasta que alguien la prepare.
 *
 * Touch-first: large cards (56px+ height), industrial premium dark theme.
 */
export default function SeleccionTipoTrabajoModal({
  open,
  onClose,
  maquina,
  needsPrep,
  onSelectProduccion,
  onSelectMantenimiento,
  onSelectPreparacion,
  onSelectAveria,
  onVerHistorialMantenimientos,
}: Props) {
  // La máquina solo ofrece opción de Preparación si está marcada como
  // requiere_preparacion en su ficha (se configura desde Máquinas → Editar).
  const mostrarPreparacion = maquina.requiere_preparacion

  return (
    <Modal open={open} onClose={onClose} title={<MaquinaModalTitle maquina={maquina} />} size="lg">
      <div className="min-h-[280px]">
        <h3 className="text-[19px] font-bold text-text-primary tracking-tight mb-1">
          ¿Qué vas a hacer?
        </h3>
        <p className="text-[13px] text-text-tertiary mb-5">
          Elige el tipo de trabajo que vas a realizar en esta máquina.
        </p>

        {/* Aviso si hay que preparar primero */}
        {needsPrep && mostrarPreparacion && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-activa-muted flex items-start gap-3">
            <span className="text-activa mt-0.5"><IconBroom size={18} /></span>
            <div className="flex-1 leading-snug">
              <div className="text-[13.5px] font-semibold text-activa">Primero hay que preparar</div>
              <div className="text-[12px] text-text-secondary mt-0.5">
                Esta máquina necesita preparación antes de iniciar una nueva producción.
              </div>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-3 ${mostrarPreparacion ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {mostrarPreparacion && (
            <WorkOption
              onClick={onSelectPreparacion}
              tone="activa"
              icon={<IconBroom size={22} />}
              title="Preparación"
              subtitle="Limpiar / acondicionar"
            />
          )}
          <WorkOption
            onClick={onSelectProduccion}
            disabled={needsPrep}
            tone="primary"
            icon={<IconPlay size={22} />}
            title="Producción"
            subtitle={needsPrep ? 'Prepara primero' : 'Iniciar un trabajo'}
          />
          <WorkOption
            onClick={onSelectMantenimiento}
            tone="mantenimiento"
            icon={<IconWrench size={22} />}
            title="Mantenimiento"
            subtitle="Intervención técnica"
          />
        </div>

        {/* Acciones secundarias: historial de mantenimientos + reportar avería */}
        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-5 flex-wrap">
            <button
              onClick={onVerHistorialMantenimientos}
              className="text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <IconHistory size={14} />
              Historial de mantenimientos
            </button>
            <button
              onClick={onSelectAveria}
              className="text-[12px] font-medium text-averia hover:opacity-80 transition-opacity flex items-center gap-1.5"
            >
              <IconAlert size={14} />
              Reportar avería
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Card de opción de trabajo: superficie neutra, icono en cápsula tintada y
 * texto en el color del tono. El color señala, la superficie no grita.
 */
function WorkOption({
  onClick,
  disabled = false,
  tone,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void
  disabled?: boolean
  tone: 'activa' | 'primary' | 'mantenimiento'
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  const MAP = {
    activa:        { chip: 'bg-activa-muted text-activa',            text: 'text-activa' },
    primary:       { chip: 'bg-primary-muted text-primary-ink',      text: 'text-primary-ink' },
    mantenimiento: { chip: 'bg-mantenimiento-muted text-mantenimiento', text: 'text-mantenimiento' },
  }[tone]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center gap-3 min-h-[136px] p-5
        rounded-xl border bg-surface-2 transition-all
        ${disabled
          ? 'border-border-subtle opacity-40 cursor-not-allowed'
          : 'border-border-subtle shadow-card hover:shadow-card-hover hover:border-border-default active:scale-[0.98]'
        }
      `}
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${disabled ? 'bg-surface-3 text-text-tertiary' : MAP.chip}`}>
        {icon}
      </div>
      <div className="text-center">
        <div className={`text-[16px] font-bold tracking-tight ${disabled ? 'text-text-tertiary' : MAP.text}`}>
          {title}
        </div>
        <div className="text-[11.5px] text-text-tertiary mt-0.5">{subtitle}</div>
      </div>
    </button>
  )
}
