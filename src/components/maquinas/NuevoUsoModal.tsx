import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore, type Trabajador } from '../../store/trabajadoresStore'
import type { Maquina } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const todayDate = () => new Date().toISOString().slice(0, 10)

type Step = 'preparacion' | 'lanzamiento' | 'confirmar'

/**
 * Flujo rediseñado para trabajadores no-técnicos:
 *  1. "¿Quién prepara?"  → grid grande de avatares
 *  2. (opcional) "¿Quién lanza?" → si la máquina lo requiere
 *  3. Confirmación visual con resumen y botón "Empezar ahora"
 *
 * Fecha y hora se auto-rellenan con ahora. Están ocultas tras un "Ajustar datos"
 * para cuando un admin necesita corregir un registro pasado.
 */
export default function NuevoUsoModal({ open, onClose, maquina }: Props) {
  const iniciarUso = useWorkflowStore((s) => s.iniciarUso)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const candidatos = trabajadores.filter((t) => t.activo && t.puede_operar)

  const [step, setStep] = useState<Step>('preparacion')
  const [tecnicoPrep, setTecnicoPrep] = useState<Trabajador | null>(null)
  const [tecnicoLanz, setTecnicoLanz] = useState<Trabajador | null>(null)
  const [showAjustes, setShowAjustes] = useState(false)
  const [fecha, setFecha] = useState(todayDate())
  const [hora, setHora] = useState(nowTime())
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (open) {
      setStep('preparacion')
      setTecnicoPrep(null)
      setTecnicoLanz(null)
      setShowAjustes(false)
      setFecha(todayDate())
      setHora(nowTime())
      setObservaciones('')
    }
  }, [open])

  // Avanzar automáticamente cuando se elige técnico
  const handleSelectPrep = (t: Trabajador) => {
    setTecnicoPrep(t)
    // salto automático al siguiente paso
    setTimeout(() => {
      setStep(maquina.requiere_lanzamiento ? 'lanzamiento' : 'confirmar')
    }, 150)
  }

  const handleSelectLanz = (t: Trabajador) => {
    setTecnicoLanz(t)
    setTimeout(() => setStep('confirmar'), 150)
  }

  const [submitting, setSubmitting] = useState(false)

  const handleConfirmar = async () => {
    if (!tecnicoPrep) return
    if (maquina.requiere_lanzamiento && !tecnicoLanz) return
    setSubmitting(true)
    const id = await iniciarUso({
      maquina_id: maquina.id,
      fecha,
      hora_preparacion: hora,
      tecnico_preparacion_id: tecnicoPrep.id,
      tecnico_lanzamiento_id: tecnicoLanz?.id ?? null,
      observaciones: observaciones.trim() || null,
    })
    setSubmitting(false)
    if (!id) {
      toast.error('No se pudo iniciar el uso')
      return
    }
    toast.success(`${maquina.codigo} en marcha`, { icon: '✓' })
    onClose()
  }

  const handleBack = () => {
    if (step === 'confirmar') {
      setStep(maquina.requiere_lanzamiento ? 'lanzamiento' : 'preparacion')
    } else if (step === 'lanzamiento') {
      setTecnicoLanz(null)
      setStep('preparacion')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${maquina.codigo} · ${maquina.nombre}`} size="lg">
      <div className="min-h-[360px]">
        {/* Progreso en pasos */}
        <StepIndicator
          current={step}
          requiereLanzamiento={maquina.requiere_lanzamiento}
        />

        {/* Paso 1: ¿Quién prepara? */}
        {step === 'preparacion' && (
          <StepContent
            title="¿Quién prepara la máquina?"
            subtitle="Toca a la persona que está poniendo el trabajo en la máquina."
          >
            <TrabajadorGrid candidatos={candidatos} selected={tecnicoPrep?.id ?? null} onSelect={handleSelectPrep} />
          </StepContent>
        )}

        {/* Paso 2: ¿Quién lanza? */}
        {step === 'lanzamiento' && (
          <StepContent
            title="¿Quién lanza la máquina?"
            subtitle={`Esta máquina necesita que alguien pulse START después de preparar. Puede ser la misma persona que ${tecnicoPrep?.nombre}.`}
          >
            <TrabajadorGrid candidatos={candidatos} selected={tecnicoLanz?.id ?? null} onSelect={handleSelectLanz} />
          </StepContent>
        )}

        {/* Paso 3: Confirmar */}
        {step === 'confirmar' && tecnicoPrep && (
          <StepContent
            title="¿Empezamos?"
            subtitle="Revisa que todo esté bien y pulsa el botón."
          >
            <div className="bg-surface-3 border border-border-subtle rounded-xl p-4 space-y-3">
              <SummaryRow icon="🛠️" label="Prepara" trabajador={tecnicoPrep} />
              {maquina.requiere_lanzamiento && tecnicoLanz && (
                <SummaryRow icon="▶" label="Lanza" trabajador={tecnicoLanz} />
              )}
              <SummaryRow icon="🕐" label="Hora" value={hora} />
            </div>

            {/* Ajustes ocultos */}
            {!showAjustes ? (
              <button
                onClick={() => setShowAjustes(true)}
                className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary mt-4 py-2 underline decoration-dotted"
              >
                Ajustar fecha, hora o añadir nota
              </button>
            ) : (
              <div className="mt-4 space-y-3 p-4 bg-surface-2 rounded-lg border border-border-subtle">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Hora</label>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Nota (opcional)</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                    placeholder="Cualquier cosa que quieras recordar..."
                    className="input-field resize-none text-sm"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmar}
              disabled={submitting}
              className="w-full mt-6 py-5 rounded-xl text-lg font-bold bg-primary text-text-inverse hover:bg-primary-light active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-wait"
            >
              {submitting ? 'Guardando...' : 'Empezar ahora'}
            </button>
          </StepContent>
        )}

        {/* Navegación inferior */}
        {step !== 'preparacion' && (
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
// Sub-componentes
// =============================================================================

function StepIndicator({ current, requiereLanzamiento }: { current: Step; requiereLanzamiento: boolean }) {
  const steps: Step[] = requiereLanzamiento
    ? ['preparacion', 'lanzamiento', 'confirmar']
    : ['preparacion', 'confirmar']
  const currentIdx = steps.indexOf(current)

  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((s, idx) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={`
              w-2 h-2 rounded-full transition-all
              ${idx < currentIdx ? 'bg-activa' : idx === currentIdx ? 'bg-primary w-8' : 'bg-surface-4'}
            `}
          />
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-px ${idx < currentIdx ? 'bg-activa/40' : 'bg-border-subtle'}`} />
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
                ? 'bg-primary-muted border-primary'
                : 'bg-surface-2 border-border-subtle hover:border-primary/40 hover:bg-surface-3'
              }
            `}
          >
            <TrabajadorAvatar trabajador={t} size="lg" selected={isSelected} />
            <span className={`text-base font-semibold ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
              {t.nombre}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  trabajador,
  value,
}: {
  icon: string
  label: string
  trabajador?: Trabajador
  value?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl w-8 text-center">{icon}</span>
      <span className="text-xs text-text-tertiary uppercase tracking-wider w-20">{label}</span>
      {trabajador ? (
        <div className="flex items-center gap-2 flex-1">
          <TrabajadorAvatar trabajador={trabajador} size="sm" />
          <span className="text-base font-semibold text-text-primary">{trabajador.nombre}</span>
        </div>
      ) : (
        <span className="text-base font-mono text-text-primary">{value}</span>
      )}
    </div>
  )
}
