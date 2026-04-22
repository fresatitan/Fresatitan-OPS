import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore, type Trabajador } from '../../store/trabajadoresStore'
import type { Maquina, SeveridadAveria } from '../../types/database'
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

type Step = 'preparacion' | 'lanzamiento' | 'confirmar' | 'averia'

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
  const reportarAveria = useWorkflowStore((s) => s.reportarAveria)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const candidatos = trabajadores.filter((t) => t.activo && t.puede_operar)

  const initialStep: Step = maquina.requiere_preparacion ? 'preparacion' : 'confirmar'
  const [step, setStep] = useState<Step>(initialStep)
  const [tecnicoPrep, setTecnicoPrep] = useState<Trabajador | null>(null)
  const [tecnicoLanz, setTecnicoLanz] = useState<Trabajador | null>(null)
  const [showAjustes, setShowAjustes] = useState(false)
  const [fecha, setFecha] = useState(todayDate())
  const [hora, setHora] = useState(nowTime())
  const [observaciones, setObservaciones] = useState('')
  const [averiaMotivo, setAveriaMotivo] = useState('')
  const [averiaTecnico, setAveriaTecnico] = useState<Trabajador | null>(null)
  const [averiaSeveridad, setAveriaSeveridad] = useState<SeveridadAveria>('critica')

  useEffect(() => {
    if (open) {
      setStep(maquina.requiere_preparacion ? 'preparacion' : 'confirmar')
      setTecnicoPrep(null)
      setTecnicoLanz(null)
      setShowAjustes(false)
      setFecha(todayDate())
      setHora(nowTime())
      setObservaciones('')
      setAveriaMotivo('')
      setAveriaTecnico(null)
      setAveriaSeveridad('critica')
    }
  }, [open, maquina.requiere_preparacion])

  const handleReportarAveria = async () => {
    if (!averiaMotivo.trim()) return
    await reportarAveria(
      maquina.id,
      averiaMotivo.trim(),
      averiaTecnico?.id ?? null,
      averiaSeveridad,
    )
    toast(`Aviso enviado al admin · ${maquina.codigo}`, { icon: '⚠', duration: 5000 })
    onClose()
  }

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
    if (maquina.requiere_preparacion && !tecnicoPrep) return
    if (maquina.requiere_lanzamiento && !tecnicoLanz) return
    setSubmitting(true)
    const id = await iniciarUso({
      maquina_id: maquina.id,
      fecha,
      hora_preparacion: hora,
      tecnico_preparacion_id: tecnicoPrep?.id ?? null,
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
      if (maquina.requiere_lanzamiento) setStep('lanzamiento')
      else if (maquina.requiere_preparacion) setStep('preparacion')
      // Si no requiere ni preparación ni lanzamiento, no hay paso anterior
    } else if (step === 'lanzamiento') {
      setTecnicoLanz(null)
      if (maquina.requiere_preparacion) setStep('preparacion')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${maquina.codigo} · ${maquina.nombre}`} size="lg">
      <div className="min-h-[360px]">
        {/* Link escape: reportar avería en cualquier momento (salvo si ya estás en averia) */}
        {step !== 'averia' && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setStep('averia')}
              className="text-[11px] text-averia hover:text-averia/80 transition-colors flex items-center gap-1"
            >
              <span>⚠</span>
              <span className="underline decoration-dotted">Reportar avería en esta máquina</span>
            </button>
          </div>
        )}

        {/* Progreso en pasos (solo en flujo de uso normal, y solo si hay más de 1 paso) */}
        {step !== 'averia' && (maquina.requiere_preparacion || maquina.requiere_lanzamiento) && (
          <StepIndicator
            current={step as 'preparacion' | 'lanzamiento' | 'confirmar'}
            requierePreparacion={maquina.requiere_preparacion}
            requiereLanzamiento={maquina.requiere_lanzamiento}
          />
        )}

        {/* Modo Avería */}
        {step === 'averia' && (
          <StepContent
            title="⚠ Reportar avería"
            subtitle="Describe qué ocurre y propón la gravedad. La máquina sigue operativa — el admin decidirá si bloquearla o no."
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">¿Quién reporta?</label>
                <TrabajadorGrid candidatos={candidatos} selected={averiaTecnico?.id ?? null} onSelect={setAveriaTecnico} />
              </div>
              <div>
                <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">¿Qué ha pasado?</label>
                <textarea
                  value={averiaMotivo}
                  onChange={(e) => setAveriaMotivo(e.target.value)}
                  rows={4}
                  placeholder="Ejemplo: la máquina se ha parado a mitad del trabajo. Sale un código de error en pantalla."
                  className="input-field resize-none text-base"
                  autoFocus
                />
              </div>

              {/* Propuesta de severidad */}
              <div>
                <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">
                  ¿Cómo de grave es? <span className="normal-case text-text-tertiary">(tu propuesta, el admin decide)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <SeveridadOption
                    active={averiaSeveridad === 'critica'}
                    onClick={() => setAveriaSeveridad('critica')}
                    tone="critica"
                    title="Crítica"
                    description="La máquina no se puede usar"
                  />
                  <SeveridadOption
                    active={averiaSeveridad === 'leve'}
                    onClick={() => setAveriaSeveridad('leve')}
                    tone="leve"
                    title="Leve"
                    description="Se puede seguir usando, pero hay algo raro"
                  />
                </div>
              </div>

              <button
                onClick={handleReportarAveria}
                disabled={!averiaMotivo.trim() || !averiaTecnico}
                className="w-full py-5 rounded-xl text-lg font-bold bg-averia text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-averia/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar aviso al admin
              </button>
              <button
                onClick={() => setStep('preparacion')}
                className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Volver al uso normal
              </button>
            </div>
          </StepContent>
        )}

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

        {/* Paso Confirmar / Producción directa */}
        {step === 'confirmar' && (
          <StepContent
            title={maquina.requiere_preparacion ? '¿Empezamos?' : `Iniciar ${maquina.codigo}`}
            subtitle={maquina.requiere_preparacion ? 'Revisa que todo esté bien y pulsa el botón.' : 'Pulsa para poner la máquina en marcha.'}
          >
            <div className="bg-surface-3 border border-border-subtle rounded-xl p-4 space-y-3">
              {tecnicoPrep && (
                <SummaryRow icon="🛠️" label="Prepara" trabajador={tecnicoPrep} />
              )}
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

        {/* Navegación inferior (solo si hay un paso anterior al que volver) */}
        {step !== 'averia' && (step === 'lanzamiento' || (step === 'confirmar' && (maquina.requiere_preparacion || maquina.requiere_lanzamiento))) && (
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

type FlowStep = 'preparacion' | 'lanzamiento' | 'confirmar'

function StepIndicator({ current, requierePreparacion, requiereLanzamiento }: { current: FlowStep; requierePreparacion: boolean; requiereLanzamiento: boolean }) {
  const steps: FlowStep[] = [
    ...(requierePreparacion ? ['preparacion' as FlowStep] : []),
    ...(requiereLanzamiento ? ['lanzamiento' as FlowStep] : []),
    'confirmar',
  ]
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

function SeveridadOption({
  active,
  onClick,
  tone,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  tone: 'critica' | 'leve'
  title: string
  description: string
}) {
  const palette = tone === 'critica'
    ? { border: 'border-averia', bg: 'bg-averia/10', text: 'text-averia', icon: '🔴' }
    : { border: 'border-parada', bg: 'bg-parada/10', text: 'text-parada', icon: '🟡' }

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all
        active:scale-[0.98]
        ${active
          ? `${palette.bg} ${palette.border}`
          : 'bg-surface-2 border-border-subtle hover:border-border-default hover:bg-surface-3'
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{palette.icon}</span>
        <span className={`text-base font-bold ${active ? palette.text : 'text-text-primary'}`}>{title}</span>
      </div>
      <span className="text-xs text-text-tertiary leading-snug">{description}</span>
    </button>
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
