import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore, type Trabajador } from '../../store/trabajadoresStore'
import type { Maquina, TipoMantenimiento } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

const TIPOS_MANTENIMIENTO: { value: TipoMantenimiento; label: string; desc: string }[] = [
  { value: 'preventivo', label: 'Preventivo', desc: 'Revisión programada' },
  { value: 'correctivo', label: 'Correctivo', desc: 'Reparar un problema detectado' },
  { value: 'predictivo', label: 'Predictivo', desc: 'Basado en datos o indicadores' },
]

type Step = 'tecnico' | 'tipo' | 'descripcion' | 'confirmar'

/**
 * Modal for starting a maintenance intervention from Panel de Planta.
 *
 * Flow:
 *  1. Select technician (who does the work)
 *  2. Select maintenance type (preventivo / correctivo / predictivo)
 *  3. Describe the action
 *  4. Confirm and register
 *
 * Touch-first: large buttons, minimal friction.
 */
export default function StartMantenimientoModal({ open, onClose, maquina }: Props) {
  const registrarMantenimiento = useWorkflowStore((s) => s.registrarMantenimiento)
  const updateEstadoMaquina = useWorkflowStore((s) => s.updateEstadoMaquina)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const candidatos = trabajadores.filter((t) => t.activo && t.puede_operar)

  const [step, setStep] = useState<Step>('tecnico')
  const [tecnico, setTecnico] = useState<Trabajador | null>(null)
  const [tipo, setTipo] = useState<TipoMantenimiento | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStep('tecnico')
      setTecnico(null)
      setTipo(null)
      setDescripcion('')
    }
  }, [open])

  const handleSelectTecnico = (t: Trabajador) => {
    setTecnico(t)
    setTimeout(() => setStep('tipo'), 150)
  }

  const handleSelectTipo = (t: TipoMantenimiento) => {
    setTipo(t)
    setTimeout(() => setStep('descripcion'), 150)
  }

  const handleConfirmar = async () => {
    if (!tecnico || !tipo || !descripcion.trim()) return
    setSubmitting(true)

    const id = await registrarMantenimiento({
      maquina_id: maquina.id,
      tipo,
      accion_realizada: descripcion.trim(),
      persona_encargada_id: tecnico.id,
    })

    if (!id) {
      toast.error('No se pudo registrar el mantenimiento')
      setSubmitting(false)
      return
    }

    // Change machine state to 'mantenimiento'
    await updateEstadoMaquina(maquina.id, 'mantenimiento')

    toast.success(`${maquina.codigo} en mantenimiento`, { icon: '🔧' })
    setSubmitting(false)
    onClose()
  }

  const handleBack = () => {
    if (step === 'confirmar') setStep('descripcion')
    else if (step === 'descripcion') setStep('tipo')
    else if (step === 'tipo') setStep('tecnico')
  }

  const showBack = step !== 'tecnico'

  return (
    <Modal open={open} onClose={onClose} title={`${maquina.codigo} · Mantenimiento`} size="lg">
      <div className="min-h-[360px]">
        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Step 1: Select technician */}
        {step === 'tecnico' && (
          <StepContent
            title="¿Quién realiza el mantenimiento?"
            subtitle="Toca a la persona encargada de la intervención."
          >
            <TrabajadorGrid
              candidatos={candidatos}
              selected={tecnico?.id ?? null}
              onSelect={handleSelectTecnico}
            />
          </StepContent>
        )}

        {/* Step 2: Select type */}
        {step === 'tipo' && (
          <StepContent
            title="¿Qué tipo de mantenimiento?"
            subtitle="Selecciona la categoría que mejor se ajusta."
          >
            <div className="grid grid-cols-1 gap-3">
              {TIPOS_MANTENIMIENTO.map((t) => {
                const isSelected = tipo === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => handleSelectTipo(t.value)}
                    className={`
                      flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all
                      active:scale-[0.97]
                      ${isSelected
                        ? 'bg-mantenimiento/10 border-mantenimiento'
                        : 'bg-surface-2 border-border-subtle hover:border-mantenimiento/40 hover:bg-surface-3'
                      }
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center shrink-0
                      ${isSelected ? 'bg-mantenimiento/20' : 'bg-surface-3'}
                    `}>
                      <TypeIcon tipo={t.value} selected={isSelected} />
                    </div>
                    <div>
                      <div className={`text-base font-bold ${isSelected ? 'text-mantenimiento' : 'text-text-primary'}`}>
                        {t.label}
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </StepContent>
        )}

        {/* Step 3: Description */}
        {step === 'descripcion' && (
          <StepContent
            title="Describe la intervención"
            subtitle="Breve descripción de lo que vas a hacer o has hecho."
          >
            <div className="space-y-4">
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                placeholder="Ej: Cambio de fresa desgastada, limpieza de cabezal, calibración de ejes..."
                className="input-field resize-none text-base"
                autoFocus
              />
              <button
                onClick={() => setStep('confirmar')}
                disabled={!descripcion.trim()}
                className="w-full py-5 rounded-xl text-lg font-bold bg-mantenimiento text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-mantenimiento/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </StepContent>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirmar' && (
          <StepContent
            title="¿Todo correcto?"
            subtitle="Revisa los datos y confirma para registrar el mantenimiento."
          >
            <div className="bg-surface-3 border border-border-subtle rounded-xl p-4 space-y-3">
              {tecnico && (
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">🔧</span>
                  <span className="text-xs text-text-tertiary uppercase tracking-wider w-20">Técnico</span>
                  <div className="flex items-center gap-2 flex-1">
                    <TrabajadorAvatar trabajador={tecnico} size="sm" />
                    <span className="text-base font-semibold text-text-primary">{tecnico.nombre}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">📋</span>
                <span className="text-xs text-text-tertiary uppercase tracking-wider w-20">Tipo</span>
                <span className="text-base font-semibold text-text-primary capitalize">{tipo}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl w-8 text-center">📝</span>
                <span className="text-xs text-text-tertiary uppercase tracking-wider w-20 pt-1">Acción</span>
                <span className="text-sm text-text-secondary flex-1">{descripcion}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmar}
              disabled={submitting}
              className="w-full mt-6 py-5 rounded-xl text-lg font-bold bg-mantenimiento text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-mantenimiento/20 disabled:opacity-50 disabled:cursor-wait"
            >
              {submitting ? 'Guardando...' : 'Registrar mantenimiento'}
            </button>
          </StepContent>
        )}

        {/* Bottom navigation */}
        {showBack && (
          <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-sm text-text-tertiary hover:text-text-secondary flex items-center gap-1.5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="10,3 5,8 10,13" />
              </svg>
              Atrás
            </button>
            <button onClick={onClose} className="text-sm text-text-tertiary hover:text-averia transition-colors">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

const STEP_ORDER: Step[] = ['tecnico', 'tipo', 'descripcion', 'confirmar']

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER.indexOf(current)

  return (
    <div className="flex items-center gap-2 mb-5">
      {STEP_ORDER.map((s, idx) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={`
              w-2 h-2 rounded-full transition-all
              ${idx < currentIdx ? 'bg-mantenimiento' : idx === currentIdx ? 'bg-mantenimiento w-8' : 'bg-surface-4'}
            `}
          />
          {idx < STEP_ORDER.length - 1 && (
            <div className={`flex-1 h-px ${idx < currentIdx ? 'bg-mantenimiento/40' : 'bg-border-subtle'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function StepContent({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="animate-slide-in">
      <h3 className="text-xl font-bold text-text-primary mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-text-tertiary mb-5">{subtitle}</p>}
      {children}
    </div>
  )
}

function TrabajadorGrid({
  candidatos,
  selected,
  onSelect,
}: {
  candidatos: Trabajador[]
  selected: string | null
  onSelect: (t: Trabajador) => void
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {candidatos.map((t) => {
        const isSelected = selected === t.id
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
              active:scale-[0.96]
              ${isSelected
                ? 'bg-mantenimiento/10 border-mantenimiento'
                : 'bg-surface-2 border-border-subtle hover:border-mantenimiento/40 hover:bg-surface-3'
              }
            `}
          >
            <TrabajadorAvatar trabajador={t} size="lg" selected={isSelected} />
            <span className={`text-base font-semibold ${isSelected ? 'text-mantenimiento' : 'text-text-primary'}`}>
              {t.nombre}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TypeIcon({ tipo, selected }: { tipo: TipoMantenimiento; selected: boolean }) {
  const color = selected ? '#3B82F6' : '#888'
  const size = 24

  switch (tipo) {
    case 'preventivo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'correctivo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case 'predictivo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
  }
}
